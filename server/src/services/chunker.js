const MAX_CHARS = 15000; // about 4,000 tokens per chunk

// One line of the prompt. The id (m12) lets the AI point back to the original message.
function formatMessage(m) {
  const text = m.text.replace(/\n+/g, ' ').slice(0, 500);
  return `[m${m.i} ${m.ts.replace('T', ' ')}] ${m.sender}: ${text}`;
}

// Splits messages into chunks, preferably at the end of a day.
function makeChunks(messages) {
  const chunks = [];
  let current = [];
  let size = 0;

  messages.forEach((m, idx) => {
    const newDay = idx > 0 && m.ts.slice(0, 10) !== messages[idx - 1].ts.slice(0, 10);
    const reachedLimit = size > MAX_CHARS && newDay; // clean cut at a day boundary
    const wayTooBig = size > MAX_CHARS * 1.5;        // busy day: cut anyway

    if (current.length && (reachedLimit || wayTooBig)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(m);
    size += formatMessage(m).length + 1;
  });

  if (current.length) chunks.push(current);
  return chunks;
}

module.exports = { formatMessage, makeChunks };