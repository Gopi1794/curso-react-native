const express = require('express');
const router = express.Router();
const restaurantsController = require('../controllers/restaurantsController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas — no requieren JWT
router.get('/',                      restaurantsController.getAll);
router.get('/:id',                   restaurantsController.getById);
router.get('/:id/menu',              restaurantsController.getMenu);
router.get('/:id/menu/:itemId',      restaurantsController.getMenuItem);
router.get('/:id/ruleta',            authMiddleware, restaurantsController.getRuleta);
router.post('/:id/ruleta/girar',      authMiddleware, restaurantsController.girarRuleta);

module.exports = router;
