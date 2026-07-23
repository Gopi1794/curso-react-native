const { Router } = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const requireAdminOwnership = require('../middleware/requireAdminOwnership');
const uploadCtrl   = require('../controllers/adminUploadController');
const cuponesCtrl  = require('../controllers/adminCuponesController');
const platosCtrl   = require('../controllers/adminPlatosController');
const stockCtrl    = require('../controllers/adminStockController');
const ingCtrl      = require('../controllers/ingredientesController');
const recetasCtrl  = require('../controllers/adminRecetasController');
const pedidosCtrl  = require('../controllers/adminPedidosController');
const restCtrl     = require('../controllers/adminRestauranteController');
const ruletaCtrl   = require('../controllers/adminRuletaController');
const zonasEnvioCtrl = require('../controllers/adminZonasEnvioController');
const statsCtrl    = require('../controllers/adminStatsController');
const reviewsCtrl  = require('../controllers/adminReviewsInsightsController');

const router = Router();
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, ALLOWED_MIME.includes(file.mimetype)),
});

const requireAdmin = (req, res, next) => {
    if (req.user?.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
    }
    next();
};

router.use(authMiddleware, requireAdmin);

// ── Stats ─────────────────────────────────────────────────
router.get('/stats/:restauranteId', requireAdminOwnership, statsCtrl.getStats);

// ── Reviews AI Insights ───────────────────────────────────
router.get('/reviews/insights', reviewsCtrl.getInsights);

// ── Restaurante ───────────────────────────────────────────
router.get('/restaurante/:restauranteId',  requireAdminOwnership, restCtrl.getInfo);
router.put('/restaurante/:restauranteId',  requireAdminOwnership, restCtrl.updateInfo);
router.post('/repartidores',               restCtrl.createRepartidor);

// ── Ruleta ────────────────────────────────────────────────
router.get('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.getInfo);
router.put('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.updateInfo);

// ── Zonas de envío ────────────────────────────────────────
router.get('/zonas-envio/:restauranteId',  requireAdminOwnership, zonasEnvioCtrl.getAll);
router.post('/zonas-envio/:restauranteId', requireAdminOwnership, zonasEnvioCtrl.create);
router.put('/zonas-envio/:id',             zonasEnvioCtrl.update);

// ── Upload ────────────────────────────────────────────────
router.post('/upload', upload.single('image'), uploadCtrl.uploadImage);

// ── Cupones ───────────────────────────────────────────────
router.get('/cupones',       cuponesCtrl.getAll);
router.post('/cupones',      cuponesCtrl.create);
router.put('/cupones/:id',   cuponesCtrl.update);
router.delete('/cupones/:id', cuponesCtrl.remove);

// ── Platos ────────────────────────────────────────────────
router.get('/platos/:restauranteId',          requireAdminOwnership, platosCtrl.getAll);
router.post('/platos/:restauranteId',         requireAdminOwnership, platosCtrl.create);
router.put('/platos/:id/toggle',              platosCtrl.toggleDisponible);
router.put('/platos/:id',                     platosCtrl.update);
router.delete('/platos/:id',                  platosCtrl.remove);

// ── Stock ─────────────────────────────────────────────────
router.get('/stock/:restauranteId',           requireAdminOwnership, stockCtrl.getStock);
router.get('/stock/platos/:restauranteId',    requireAdminOwnership, stockCtrl.getIngredientesMenuItems);
router.put('/stock/item/:id',                 stockCtrl.updateStock);

// ── Pedidos (admin) ───────────────────────────────────────
router.get('/notificaciones',                                 pedidosCtrl.getNotificaciones);
router.get('/pedidos/:restauranteId',                         requireAdminOwnership, pedidosCtrl.getAll);
router.get('/repartidores/resumen-dia/:restauranteId',        requireAdminOwnership, pedidosCtrl.getResumenRepartidoresDia);
router.get('/repartidores/:restauranteId',                    requireAdminOwnership, pedidosCtrl.getRepartidores);
router.put('/pedidos/:id/estado',             pedidosCtrl.updateEstado);
router.put('/pedidos/:id/preparar',           pedidosCtrl.prepararPedido);
router.put('/pedidos/:id/asignar',            pedidosCtrl.asignarRepartidor);

// ── Recetas ───────────────────────────────────────────────
router.get('/recetas/:restauranteId',      requireAdminOwnership, recetasCtrl.getByRestaurante);
router.put('/recetas/item/:id',            recetasCtrl.updateCantidad);

// ── Ingredientes ──────────────────────────────────────────
router.get('/ingredientes',       ingCtrl.getAll);
router.post('/ingredientes',      ingCtrl.create);
router.put('/ingredientes/:id',   ingCtrl.update);
router.delete('/ingredientes/:id', ingCtrl.remove);

module.exports = router;
