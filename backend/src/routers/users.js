const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas las rutas de este módulo requieren JWT
router.use(authMiddleware);

router.get('/profile',         usersController.getProfile);
router.put('/profile',         usersController.updateProfile);
router.put('/change-password', usersController.changePassword);

module.exports = router;
