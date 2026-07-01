const { Router } = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const uploadCtrl   = require('../controllers/adminUploadController');
const cuponesCtrl  = require('../controllers/adminCuponesController');
const platosCtrl   = require('../controllers/adminPlatosController');
const stockCtrl    = require('../controllers/adminStockController');
const ingCtrl      = require('../controllers/ingredientesController');
const recetasCtrl  = require('../controllers/adminRecetasController');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const requireAdmin = (req, res, next) => {
    if (req.user?.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
    }
    next();
};

router.use(authMiddleware, requireAdmin);

// ── Upload ────────────────────────────────────────────────
router.post('/upload', upload.single('image'), uploadCtrl.uploadImage);

// ── Cupones ───────────────────────────────────────────────
router.get('/cupones',       cuponesCtrl.getAll);
router.post('/cupones',      cuponesCtrl.create);
router.put('/cupones/:id',   cuponesCtrl.update);
router.delete('/cupones/:id', cuponesCtrl.remove);

// ── Platos ────────────────────────────────────────────────
router.get('/platos/:restauranteId',          platosCtrl.getAll);
router.post('/platos/:restauranteId',         platosCtrl.create);
router.put('/platos/:id/toggle',              platosCtrl.toggleDisponible);
router.put('/platos/:id',                     platosCtrl.update);
router.delete('/platos/:id',                  platosCtrl.remove);

// ── Stock ─────────────────────────────────────────────────
router.get('/stock/:restauranteId',           stockCtrl.getStock);
router.get('/stock/platos/:restauranteId',    stockCtrl.getIngredientesMenuItems);
router.put('/stock/item/:id',                 stockCtrl.updateStock);

// ── Recetas ───────────────────────────────────────────────
router.get('/recetas/:restauranteId',      recetasCtrl.getByRestaurante);
router.put('/recetas/item/:id',            recetasCtrl.updateCantidad);

// ── Ingredientes ──────────────────────────────────────────
router.get('/ingredientes',       ingCtrl.getAll);
router.post('/ingredientes',      ingCtrl.create);
router.put('/ingredientes/:id',   ingCtrl.update);
router.delete('/ingredientes/:id', ingCtrl.remove);

module.exports = router;
