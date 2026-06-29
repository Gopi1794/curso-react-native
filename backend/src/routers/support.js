const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const supportController = require('../controllers/supportController');

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, message: 'Demasiadas consultas. Esperá un momento.' },
});

router.use(authMiddleware);
router.post('/chat', chatLimiter, supportController.chat);

module.exports = router;
