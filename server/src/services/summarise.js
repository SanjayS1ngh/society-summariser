const { formatMessage, makeChunks } = require('./chunker');
const { askJson } = require('./llm');

const CONTEXT = 10; // messages shown before and after each chunk, for understanding only
const CATEGORIES = ['decisions', 'payments', 'complaints', 'events', 'unanswered'];

const RULES = `You read part of a residents' WhatsApp group chat and extract facts.
Rules:
- Only report what the messages clearly say. Never guess or invent.
- A DECISION needs a clear agreement or approval, for example "okay, done", "approved", "everyone agreed", or an admin announcing the outcome. A suggestion that nobody agreed to has status "proposed", not "decided".
- Every item MUST have "sources": the ids of the messages it comes from, like ["m12","m15"].
- For payments, put in "owedBy" only people or flats that the chat clearly names as not having paid. Leave it empty if the chat does not say.
- Messages in CONTEXT sections are only for understanding. You may cite them, but do not report items that appear only there.
- Write in simple English, one sentence per item. Copy names exactly as they appear in the chat.
- Phone numbers are already masked. Keep them masked.`;

const SHAPE = `Return ONLY JSON in exactly this shape. Use empty arrays when nothing is found.
{
  "decisions": [{ "text": "", "status": "decided or proposed", "sources": [] }],
  "payments": [{ "text": "", "amount": "", "dueDate": "", "owedBy": [], "status": "pending or paid or unclear", "sources": [] }],
  "complaints": [{ "text": "", "raisedBy": "", "status": "open or resolved or unclear", "sources": [] }],
  "events": [{ "text": "", "when": "", "sources": [] }],
  "unanswered": [{ "question": "", "askedBy": "", "sources": [] }]
}
"unanswered" means a question that nobody answered in the messages you can see, including the CONTEXT messages after the chunk.`;

function section(label, list) {
  if (!list.length) return '';
  return `--- ${label} (CONTEXT ONLY) ---\n${list.map(formatMessage).join('\n')}\n`;
}

function chunkPrompt(main, before, after) {
  return (
    `${RULES}\n\n${SHAPE}\n\n` +
    section('EARLIER MESSAGES', before) +
    `--- MESSAGES TO ANALYSE ---\n${main.map(formatMessage).join('\n')}\n` +
    section('LATER MESSAGES', after)
  );
}

function mergePrompt(items) {
  return `Below are items extracted from different parts of one group chat. Clean them up:
- Merge duplicates into one item and combine their "sources".
- If a later item shows that an earlier one changed (a payment was paid, a complaint was resolved, a proposal was decided), keep ONE item with the latest status.
- Do not add anything new. Do not change or drop source ids.
- Keep the same JSON shape.

${SHAPE}

ITEMS:
${JSON.stringify(items)}`;
}

// Runs async tasks with at most "limit" running at the same time.
async function runPool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const idx = next++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function concat(parts) {
  const merged = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const part of parts) {
    if (!part) continue; // this chunk failed
    for (const c of CATEGORIES) if (Array.isArray(part[c])) merged[c].push(...part[c]);
  }
  return merged;
}

// "m12", "12" or "[m12]" all become "m12"
const normaliseId = (id) => {
  const digits = String(id).replace(/[^0-9]/g, '');
  return digits ? 'm' + digits : '';
};

// The anti-hallucination check: no real source message means the item is deleted.
function verify(raw, validIds) {
  const result = {};
  for (const c of CATEGORIES) {
    result[c] = (Array.isArray(raw[c]) ? raw[c] : [])
      .map((item) => ({
        ...item,
        sources: [...new Set((Array.isArray(item.sources) ? item.sources : []).map(normaliseId))].filter((id) => validIds.has(id)),
      }))
      .filter((item) => item.sources.length > 0);
    // oldest first
    const first = (item) => Math.min(...item.sources.map((s) => parseInt(s.slice(1), 10)));
    result[c].sort((a, b) => first(a) - first(b));
  }
  return result;
}

async function summariseMessages(messages) {
  const usage = { inputTokens: 0, outputTokens: 0, calls: 0 };

  // 1 and 2. Chunk, then read every chunk (3 at a time)
  const chunks = makeChunks(messages);
  let offset = 0;
  const tasks = chunks.map((main) => {
    const start = offset;
    offset += main.length;
    const before = messages.slice(Math.max(0, start - CONTEXT), start);
    const after = messages.slice(offset, offset + CONTEXT);
    return async () => {
      try {
        return await askJson(chunkPrompt(main, before, after), usage);
      } catch (err) {
        console.error('A chunk failed:', err.message);
        return null;
      }
    };
  });
  const parts = await runPool(tasks, 3);
  const failed = parts.filter((p) => p === null).length;
  if (failed === parts.length) throw new Error('The AI could not read any part of this chat');

  // 3. Merge duplicates and update statuses. If this step fails, keep the unmerged items.
  let merged = concat(parts);
  const total = CATEGORIES.reduce((n, c) => n + merged[c].length, 0);
  if (chunks.length > 1 && total > 0) {
    try {
      merged = await askJson(mergePrompt(merged), usage);
    } catch (err) {
      console.error('Merge step failed, using unmerged items:', err.message);
    }
  }

  // 4. Verify
  const validIds = new Set(messages.map((m) => 'm' + m.i));
  const result = verify(merged, validIds);
  result.warnings = failed
    ? [`${failed} of ${parts.length} parts of the chat could not be read, so this summary may be incomplete.`]
    : [];

  // 5. Collect the original messages that the items cite
  const cited = new Set(CATEGORIES.flatMap((c) => result[c].flatMap((item) => item.sources)));
  const sources = {};
  for (const m of messages) {
    if (cited.has('m' + m.i)) sources['m' + m.i] = { ts: m.ts, sender: m.sender, text: m.text.slice(0, 400) };
  }

  // Cost of this run (prices come from .env, in USD per million tokens)
  const priceIn = Number(process.env.PRICE_IN_PER_M || 0);
  const priceOut = Number(process.env.PRICE_OUT_PER_M || 0);
  usage.costUSD = (usage.inputTokens * priceIn + usage.outputTokens * priceOut) / 1e6;
  usage.chunks = chunks.length;

  return { result, sources, usage };
}

module.exports = { summariseMessages };