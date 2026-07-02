const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Rate limiting para auth (5 intentos por minuto por IP)
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: 'Demasiados intentos. Esperá 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rutas públicas
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/google', authLimiter, authController.googleLogin);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/resend-verification', authLimiter, authController.resendVerification);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Rutas protegidas
router.get('/me', authMiddleware, authController.getUserProfile);

module.exports = router;
