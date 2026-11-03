const PHONE = /\+?\d[\d ()\-]{8,}\d/g;

function maskPhones(text) {
  return text.replace(PHONE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 10) return match; 
    return 'XXXXXX' + digits.slice(-2);
  });
}

function maskMessages(messages) {
  return messages.map((m) => ({
    ...m,
    sender: maskPhones(m.sender),
    text: maskPhones(m.text),
  }));
}

module.exports = { maskPhones, maskMessages };