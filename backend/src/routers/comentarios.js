const express = require('express');
const router = express.Router({ mergeParams: true }); // para acceder a :menuItemId
const comentariosController = require('../controllers/comentariosController');
const authMiddleware = require('../middleware/authMiddleware');

// GET  /api/menu-items/:menuItemId/comentarios — público
router.get('/', comentariosController.getByMenuItem);

// POST /api/menu-items/:menuItemId/comentarios — requiere auth
router.post('/', authMiddleware, comentariosController.createOrUpdate);

// DELETE /api/menu-items/:menuItemId/comentarios — requiere auth
router.delete('/', authMiddleware, comentariosController.remove);

module.exports = router;
