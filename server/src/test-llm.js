require('dotenv').config();
const { askJson } = require('./services/llm');

(async () => {
  const usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
  const out = await askJson('Return JSON: {"ok": true, "word": "hello"}', usage);
  console.log(out, usage);
})();