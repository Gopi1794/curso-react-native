const express = require('express');
const router = express.Router();
const cuponesController = require('../controllers/cuponesController');

// Rutas públicas — no requieren JWT
router.get('/',    cuponesController.getAll);
router.get('/:id', cuponesController.getById);

module.exports = router;
