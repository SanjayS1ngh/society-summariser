// Turns a WhatsApp "Export chat" .txt file into a clean list of messages.
const HEADER = /^\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s?([APap]\.?[Mm]\.?)?\]?\s*(?:-\s*)?(.*)$/;

const SKIP_TEXT = [
  /^<?media omitted>?$/i,
  /^(image|video|audio|sticker|gif|document) omitted$/i,
  /^this message was deleted\.?$/i,
  /^you deleted this message\.?$/i,
];

// Exports contain invisible characters. Remove them before matching.
function clean(line) {
  return line
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/[\u202f\u00a0]/g, ' ');
}

const pad = (n) => String(n).padStart(2, '0');

function parseChat(raw) {
  // 1. Group lines into entries. A line without a date continues the previous message.
  const entries = [];
  for (const line of raw.replace(/\r/g, '').split('\n').map(clean)) {
    const m = line.match(HEADER);
    if (m) {
      entries.push({ a: +m[1], b: +m[2], y: +m[3], h: +m[4], min: +m[5], ampm: m[6], rest: m[7] });
    } else if (entries.length) {
      entries[entries.length - 1].rest += '\n' + line;
    }
  }

  // 2. Day/month or month/day? India normally uses day/month.
  const monthFirst = entries.some((e) => e.b > 12) && !entries.some((e) => e.a > 12);

  // 3. Build the messages.
  const messages = [];
  for (const e of entries) {
    const colon = e.rest.indexOf(': ');
    if (colon === -1) continue; // system line such as "Priya joined"
    const sender = e.rest.slice(0, colon).trim();
    const text = e.rest.slice(colon + 2).trim();
    if (!text || SKIP_TEXT.some((re) => re.test(text))) continue;

    const day = monthFirst ? e.b : e.a;
    const month = monthFirst ? e.a : e.b;
    const year = e.y < 100 ? 2000 + e.y : e.y;
    let hour = e.h;
    if (e.ampm) hour = (hour % 12) + (/p/i.test(e.ampm) ? 12 : 0);

    messages.push({
      ts: `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(e.min)}`,
      sender,
      text,
    });
  }

  // 4. Give every message an index. The AI will cite messages as m0, m1, m2...
  return messages.map((m, i) => ({ i, ...m }));
}

module.exports = { parseChat };