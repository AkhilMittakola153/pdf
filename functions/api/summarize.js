// Cloudflare Pages Function: POST /api/summarize
// Runs only on Cloudflare (not with `npm run dev`). Receives extracted PDF text,
// asks Workers AI for a summary, returns it. Nothing is stored.
//
// Setup (one time): Cloudflare dashboard → Workers & Pages → your project →
// Settings → Bindings → Add → Workers AI → Variable name: AI → Save, then redeploy.

// Tried in order: if one model fails or is retired, the next is used.
const MODELS = ["@cf/meta/llama-3.1-8b-instruct-fast", "@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.2-3b-instruct"];
const MAX_CHARS = 12000; // keeps each request small and inside the free daily allowance

// Only your own site may call this. Put your Cloudflare Pages project name here
// (the part before ".pages.dev"), so preview deployments work too.
const PAGES_PROJECT = "https://pdfsuite-ey2.pages.dev";
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
  const host = new URL(request.url).hostname;
  if (host !== "pdfsuite.in" && host !== "www.pdfsuite.in") return json({ error: "Not allowed." }, 403);
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

  const messages = [
    {
      role: "system",
      content:
        "You summarise documents accurately and concisely. Use only facts stated in the document; never invent details. Write in the same language as the document.",
    },
    { role: "user", content: `${instruction}\n\nDOCUMENT:\n"""\n${text}\n"""` },
  ];

  let lastError = "";
  for (const model of MODELS) {
    try {
      const result = await env.AI.run(model, { messages, max_tokens: 600 });
      const summary = readText(result);
      if (summary) return json({ summary });
      lastError = `${model}: empty response ${JSON.stringify(result).slice(0, 200)}`;
    } catch (err) {
      lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
    }
    console.error("summarize failed", lastError); // visible in Cloudflare's real-time logs
  }

  const limit = /limit|quota|neuron|429|capacity/i.test(lastError);
  return json(
    {
      error: limit
        ? "Today's free AI limit has been reached. Please try again tomorrow."
        : "The AI service couldn't create a summary right now. Please try again later.",
      detail: lastError.slice(0, 300),
    },
    503,
  );
}

// Workers AI models return text in slightly different shapes; accept all of them.
function readText(result) {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  const r = result.response ?? result.result?.response ?? result.choices?.[0]?.message?.content;
  if (typeof r === "string") return r.trim();
  if (r && typeof r === "object") return JSON.stringify(r);
  return "";
}
