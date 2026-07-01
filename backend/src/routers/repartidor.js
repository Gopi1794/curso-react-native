const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/repartidorController');

const router = Router();

const requireRepartidor = (req, res, next) => {
    if (req.user?.rol !== 'repartidor') {
        return res.status(403).json({ success: false, message: 'Acceso restringido a repartidores' });
    }
    next();
};

router.use(authMiddleware, requireRepartidor);

router.get('/pedidos',              ctrl.getMisPedidos);
router.get('/historial',            ctrl.getHistorial);
router.put('/pedidos/:id/estado',   ctrl.updateEstado);
router.put('/pedidos/:id/cobrar',   ctrl.cobrarEfectivo);

module.exports = router;
