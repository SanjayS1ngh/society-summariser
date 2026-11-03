const router = require('express').Router();
const multer = require('multer');
const Chat = require('../models/chat');
const { parseChat } = require('../services/parser');
const { maskMessages } = require('../services/privacy');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Summary = require('../models/summary');
const { summariseMessages } = require('../services/summarise');

// protects your free Gemini quota
const summariseLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  message: { error: 'Too many summaries. Please try again in an hour.' },
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) =>
    file.originalname.toLowerCase().endsWith('.txt')
      ? cb(null, true)
      : cb(new Error('Please upload the .txt file from WhatsApp Export chat')),
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // parse, then mask phone numbers, then cap very long messages
    const messages = maskMessages(parseChat(req.file.buffer.toString('utf8'))).map((m) => ({
      ...m,
      text: m.text.slice(0, 1000),
    }));

    if (messages.length < 5) {
      return res.status(400).json({ error: 'No chat messages found. Is this a WhatsApp export?' });
    }
    if (messages.length > 30000) {
      return res.status(400).json({ error: 'Chat too large for this demo (max 30,000 messages).' });
    }

    const chat = await Chat.create({
      messages,
      messageCount: messages.length,
      participants: new Set(messages.map((m) => m.sender)).size,
      firstDate: messages[0].ts.slice(0, 10),
      lastDate: messages[messages.length - 1].ts.slice(0, 10),
    });

    res.status(201).json({
      id: chat._id,
      messageCount: chat.messageCount,
      participants: chat.participants,
      firstDate: chat.firstDate,
      lastDate: chat.lastDate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not read this file' });
  }
});

router.post('/:id/summarise', summariseLimit, async (req, res) => {
  try {
    const { from, to } = req.body;
    const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isDate(from) || !isDate(to) || from > to) {
      return res.status(400).json({ error: 'Choose a valid date range' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid chat id' });
    }
    const chat = await Chat.findById(req.params.id).lean();
    if (!chat) return res.status(404).json({ error: 'This upload has expired. Please upload the chat again.' });

    // the date-range filter
    const inRange = chat.messages.filter((m) => {
      const day = m.ts.slice(0, 10);
      return day >= from && day <= to;
    });
    if (inRange.length < 5) return res.status(400).json({ error: 'Fewer than 5 messages in this date range' });

    const { result, sources, usage } = await summariseMessages(inRange);
    const saved = await Summary.create({ from, to, messageCount: inRange.length, result, sources, usage });
    res.status(201).json({ id: saved._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create the summary. Please try again.' });
  }
});
module.exports = router;