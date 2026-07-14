const express = require('express');
const router = express.Router();
const cuponesController = require('../controllers/cuponesController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas — no requieren JWT
router.get('/',             cuponesController.getAll);
router.post('/validate',    authMiddleware, cuponesController.validateByCode);
router.get('/:id',          cuponesController.getById);

module.exports = router;
