const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  messages: [{ _id: false, i: Number, ts: String, sender: String, text: String }],
  messageCount: Number,
  participants: Number,
  firstDate: String,
  lastDate: String,
  // MongoDB deletes this document by itself 24 hours after it was created
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

module.exports = mongoose.model('Chat', chatSchema);