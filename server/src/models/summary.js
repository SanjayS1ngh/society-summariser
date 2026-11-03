const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  from: String,
  to: String,
  messageCount: Number,
  result: mongoose.Schema.Types.Mixed,  // decisions, payments, complaints, events, unanswered
  sources: mongoose.Schema.Types.Mixed, // the original messages that the items point to
  usage: mongoose.Schema.Types.Mixed,   // tokens used and cost of this run
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // deleted after 7 days
});

module.exports = mongoose.model('Summary', summarySchema);