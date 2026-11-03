const { parseChat } = require('./services/parser');
const { maskMessages, maskPhones } = require('./services/privacy');

const sample = `12/03/2026, 9:41 pm - Messages and calls are end-to-end encrypted.
12/03/2026, 9:42 pm - Rahul Sharma: Water tank cleaning is on Sunday
please keep buckets ready
12/03/2026, 9:45 pm - +91 98765 43210: <Media omitted>
13/03/2026, 7:10 am - +91 98765 43210: Call me on +91 91234 56789, maintenance is Rs 2,500
13/03/2026, 7:12 am - Priya Mehta: Who has not paid the March maintenance?`;

const messages = maskMessages(parseChat(sample));
console.log(messages);
console.log(maskPhones('Rs 12000 due, call 9876543210'));