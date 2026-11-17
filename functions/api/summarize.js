// Cloudflare Pages Function: POST /api/summarize
// Runs only on Cloudflare (not with `npm run dev`). Receives extracted PDF text,
// asks Workers AI for a summary, returns it. Nothing is stored.
//
// Setup (one time): Cloudflare dashboard → Workers & Pages → your project →
// Settings → Bindings → Add → Workers AI → Variable name: AI → Save, then redeploy.

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_CHARS = 12000; // keeps each request small and inside the free daily allowance

// Only your own site may call this. Put your Cloudflare Pages project name here
// (the part before ".pages.dev"), so preview deployments work too.
const PAGES_PROJECT = "https://pdfsuite-ey2.pages.dev/";
const ALLOWED = ["https://pdfsuite.in", "https://www.pdfsuite.in"];

function allowed(origin) {
  const o = origin.toLowerCase();
  if (ALLOWED.includes(o)) return true;
  const m = o.match(/^https:\/\/(?:[a-z0-9-]+\.)?([a-z0-9-]+)\.pages\.dev$/);
  return Boolean(m && m[1] === PAGES_PROJECT.toLowerCase());
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!allowed(request.headers.get("Origin") || "")) return json({ error: "Not allowed." }, 403);
  if (!env.AI) return json({ error: "Cloud AI is not set up on this site yet." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  const text = typeof body.text === "string" ? body.text.slice(0, MAX_CHARS) : "";
  if (text.trim().length < 200) return json({ error: "There isn't enough text to summarise." }, 400);

  const type = body.type === "tldr" ? "tldr" : "key-points";
  const length = ["short", "medium", "long"].includes(body.length) ? body.length : "medium";
  const instruction =
    type === "key-points"
      ? `Summarise the document below as exactly ${{ short: 3, medium: 5, long: 7 }[length]} concise bullet points. Start each bullet with "- ". Output only the bullets.`
      : `Summarise the document below in ${{ short: 1, medium: 3, long: 5 }[length]} sentence(s). Output only the summary.`;

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You summarise documents accurately and concisely. Use only facts stated in the document; never invent details. Write in the same language as the document.",
        },
        { role: "user", content: `${instruction}\n\nDOCUMENT:\n"""\n${text}\n"""` },
      ],
      max_tokens: 600,
    });
    const summary = typeof result?.response === "string" ? result.response.trim() : "";
    if (!summary) throw new Error("empty");
    return json({ summary });
  } catch {
    // On the free plan, requests fail (no charge) once the daily allowance is used up
    return json({ error: "The AI service is busy or today's free limit has been reached. Please try again later." }, 503);
  }
}
