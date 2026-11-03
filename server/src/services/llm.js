const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Take everything from the first { to the last } and parse it.
function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(text.slice(start, end + 1));
}

// Asks Gemini for JSON. Retries when rate-limited or when the JSON is broken.
// "usage" is a counter object we fill in, so we can report the cost of a run.
async function askJson(prompt, usage) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.CHAT_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      const u = response.usageMetadata || {};
      usage.inputTokens += u.promptTokenCount || 0;
      usage.outputTokens += (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0);
      usage.calls += 1;
      return parseJson(response.text);
    } catch (err) {
      lastError = err;
      if ([400, 401, 403, 404].includes(err.status)) throw err; // bad key or model name: retrying won't help
      await sleep(attempt * 4000); // wait 4s, 8s, 12s...
    }
  }
  throw lastError;
}

module.exports = { askJson };