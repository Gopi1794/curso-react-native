const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas las rutas requieren JWT
router.use(authMiddleware);

router.get('/methods',          paymentsController.getMethods);
router.post('/methods',         paymentsController.addMethod);
router.delete('/methods/:id',   paymentsController.deleteMethod);
router.post('/pay',             paymentsController.pay);
router.get('/history',          paymentsController.getHistory);

module.exports = router;
