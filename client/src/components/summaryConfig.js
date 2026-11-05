// Shared definitions for the summary view: sections, sorting, searching and text export.

export const SECTIONS = [
  { id: 'decided',    title: 'Decisions made',            short: 'Decisions',  key: 'decisions',  tone: 'teal',   keep: (i) => i.status === 'decided' },
  { id: 'discussed',  title: 'Discussed, not decided',    short: 'Discussed',  key: 'decisions',  tone: 'slate',  keep: (i) => i.status !== 'decided' },
  { id: 'payments',   title: 'Pending payments',          short: 'Payments',   key: 'payments',   tone: 'ochre' },
  { id: 'complaints', title: 'Complaints',                short: 'Complaints', key: 'complaints', tone: 'brick' },
  { id: 'events',     title: 'Upcoming events',           short: 'Events',     key: 'events',     tone: 'indigo' },
  { id: 'unanswered', title: 'Questions nobody answered', short: 'Unanswered', key: 'unanswered', tone: 'plum' },
];

export const SORTS = [
  { value: 'chat',    label: 'Summary order' },
  { value: 'latest',  label: 'Latest first' },
  { value: 'oldest',  label: 'Oldest first' },
  { value: 'amount',  label: 'Highest amount' },
  { value: 'sources', label: 'Most discussed' },
];

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function itemText(item) {
  return item.text || item.question || '';
}

// Label/value pairs shown under each item.
export function facts(item) {
  const out = [];
  if (item.amount) out.push(['Amount', item.amount]);
  if (item.dueDate) out.push(['Due', item.dueDate]);
  if (item.owedBy?.length) out.push(['Owed by', item.owedBy.join(', ')]);
  if (item.raisedBy) out.push(['Raised by', item.raisedBy]);
  if (item.askedBy) out.push(['Asked by', item.askedBy]);
  if (item.when) out.push(['When', item.when]);
  if (item.status && item.status !== 'decided') out.push(['Status', item.status]);
  return out;
}

function firstTimestamp(item, sources) {
  const times = (item.sources || [])
    .map((id) => sources[id] && new Date(sources[id].ts).getTime())
    .filter((t) => Number.isFinite(t));
  return times.length ? Math.min(...times) : null;
}

// "Rs. 1,200/-" -> 1200, "₹5,000" -> 5000, anything else -> null
function parseAmount(value) {
  if (!value) return null;
  const m = String(value).match(/\d[\d,]*(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function sortItems(items, mode, sources) {
  if (mode === 'chat') return items;
  const rows = items.map((item, i) => ({
    item,
    i,
    t: firstTimestamp(item, sources),
    amount: parseAmount(item.amount),
    n: (item.sources || []).length,
  }));

  // Items without a value always sink to the bottom.
  const byNumber = (key, dir) => (a, b) => {
    if (a[key] == null && b[key] == null) return a.i - b.i;
    if (a[key] == null) return 1;
    if (b[key] == null) return -1;
    return (a[key] - b[key]) * dir || a.i - b.i;
  };

  const sorters = {
    latest: byNumber('t', -1),
    oldest: byNumber('t', 1),
    amount: byNumber('amount', -1),
    sources: byNumber('n', -1),
  };
  return rows.sort(sorters[mode] || ((a, b) => a.i - b.i)).map((r) => r.item);
}

function matchesQuery(item, words, sources) {
  const haystack = [
    itemText(item),
    ...facts(item).map((f) => f[1]),
    ...(item.sources || []).flatMap((id) => (sources[id] ? [sources[id].text, sources[id].sender] : [])),
  ]
    .join(' ')
    .toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export function buildSections(result, sources, { query = '', sort = 'chat' } = {}) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return SECTIONS.map((s) => {
    let items = (result[s.key] || []).map((item, k) => ({ ...item, _k: k })).filter(s.keep || (() => true));
    if (words.length) items = items.filter((item) => matchesQuery(item, words, sources));
    return { ...s, items: sortItems(items, sort, sources) };
  });
}

// Plain text formatted for pasting back into WhatsApp (*bold* headings).
export function toWhatsAppText(data, sections) {
  const lines = [`*Group summary: ${fmtDate(data.from)} to ${fmtDate(data.to)}*`, ''];
  sections.forEach((s) => {
    if (!s.items.length) return;
    lines.push(`*${s.title}*`);
    s.items.forEach((item) => {
      const f = facts(item).map(([k, v]) => `${k}: ${v}`).join(', ');
      lines.push(`• ${itemText(item)}${f ? ` (${f})` : ''}`);
    });
    lines.push('');
  });
  return lines.join('\n').trim();
}