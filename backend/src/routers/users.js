const express = require('express');
const router = express.Router();
const multer = require('multer');
const usersController = require('../controllers/usersController');
const notificationsController = require('../controllers/notificationsController');
const authMiddleware = require('../middleware/authMiddleware');

// Multer en memoria (max 5MB)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, ALLOWED_MIME.includes(file.mimetype)),
});

// Todas las rutas de este módulo requieren JWT
router.use(authMiddleware);

router.get('/profile',         usersController.getProfile);
router.put('/profile',         usersController.updateProfile);
router.put('/change-password', usersController.changePassword);
router.get('/stats',           usersController.getStats);
router.post('/avatar',         upload.single('avatar'), usersController.uploadAvatar);
router.get('/addresses',       usersController.getAddresses);
router.post('/addresses',      usersController.createAddress);
router.delete('/addresses/:id', usersController.deleteAddress);
router.delete('/account',       usersController.deleteAccount);

router.get('/notifications/feed',          notificationsController.getFeed);
router.put('/push-token',                  notificationsController.savePushToken);
router.get('/notification-preferences',    notificationsController.getPreferences);
router.put('/notification-preferences',    notificationsController.updatePreferences);

module.exports = router;
