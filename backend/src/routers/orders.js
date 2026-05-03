const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/',              ordersController.createOrder);
router.get('/',               ordersController.getMyOrders);
router.get('/:id',            ordersController.getOrderById);
router.get('/:id/tracking',   ordersController.getTracking);
router.put('/:id/cancel',     ordersController.cancelOrder);
router.put('/:id/status',     ordersController.updateStatus);

module.exports = router;
