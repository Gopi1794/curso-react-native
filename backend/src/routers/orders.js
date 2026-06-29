const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

// Máx 30 pedidos por minuto por IP. Protege contra spam y DoS.
const createOrderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Demasiadas solicitudes. Esperá un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(authMiddleware);

router.post('/',              createOrderLimiter, ordersController.createOrder);
router.get('/',               ordersController.getMyOrders);
router.get('/:id',            ordersController.getOrderById);
router.get('/:id/tracking',   ordersController.getTracking);
router.put('/:id/cancel',     ordersController.cancelOrder);
router.put('/:id/status',     ordersController.updateStatus);

module.exports = router;
