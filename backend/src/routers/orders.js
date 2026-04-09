const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas las rutas requieren JWT
router.use(authMiddleware);

router.post('/',              ordersController.createOrder);
router.get('/',               ordersController.getMyOrders);
router.get('/:id',            ordersController.getOrderById);
router.put('/:id/cancel',     ordersController.cancelOrder);

module.exports = router;
