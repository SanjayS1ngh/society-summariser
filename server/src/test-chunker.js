const { makeChunks } = require('./services/chunker');

const messages = Array.from({ length: 2500 }, (_, i) => ({
  i,
  ts: `2026-03-${String(1 + Math.floor(i / 100)).padStart(2, '0')}T10:00`,
  sender: 'Member ' + (i % 20),
  text: 'This is a test message number ' + i + ' about the society maintenance and water supply',
}));

const chunks = makeChunks(messages);
console.log('chunks:', chunks.length, 'sizes:', chunks.map((c) => c.length).join(', '));
console.log('total messages:', chunks.reduce((n, c) => n + c.length, 0));