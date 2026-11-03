const router = require('express').Router();
const multer = require('multer');
const Chat = require('../models/chat');
const { parseChat } = require('../services/parser');
const { maskMessages } = require('../services/privacy');

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

module.exports = router;