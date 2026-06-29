const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/authMiddleware');

// Máx 10 intentos de pago por minuto por IP. Protege contra fraude por fuerza bruta.
const payLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'Demasiados intentos de pago. Esperá un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Webhook de MercadoPago — sin JWT (MP lo llama directamente)
router.post('/webhook', paymentsController.mpWebhook);

// Todas las demás rutas requieren JWT
router.use(authMiddleware);

router.get('/methods',              paymentsController.getMethods);
router.post('/methods',             paymentsController.addMethod);
router.delete('/methods/:id',       paymentsController.deleteMethod);
router.post('/pay',                 payLimiter, paymentsController.pay);
router.post('/mp-preference',       payLimiter, paymentsController.createPreference);
router.get('/history',              paymentsController.getHistory);

module.exports = router;
