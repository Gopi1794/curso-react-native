const express = require('express');
const router = express.Router();
const restaurantsController = require('../controllers/restaurantsController');

// Rutas públicas — no requieren JWT
router.get('/',                      restaurantsController.getAll);
router.get('/:id',                   restaurantsController.getById);
router.get('/:id/menu',              restaurantsController.getMenu);
router.get('/:id/menu/:itemId',      restaurantsController.getMenuItem);

module.exports = router;
