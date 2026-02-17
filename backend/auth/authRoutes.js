const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para registrar usuario
router.post('/register', authController.register);

// Otras rutas que podrías necesitar:
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getUserProfile);

module.exports = router;