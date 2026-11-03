const router = require('express').Router();
const mongoose = require('mongoose');
const Summary = require('../models/summary');

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid summary id' });
  }
  const s = await Summary.findById(req.params.id).lean();
  if (!s) return res.status(404).json({ error: 'Summary not found or expired' });
  res.json({
    id: s._id,
    from: s.from,
    to: s.to,
    messageCount: s.messageCount,
    result: s.result,
    sources: s.sources,
    usage: s.usage,
  });
});

module.exports = router;