const express = require('express');
const router = express.Router();
const multer = require('multer');
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

// Multer en memoria (max 5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    }
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

module.exports = router;
