const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/ingredientesController');
const stockCtrl = require('../controllers/adminStockController');

const router = Router();

const requireAdmin = (req, res, next) => {
    if (req.user?.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
    }
    next();
};

router.use(authMiddleware, requireAdmin);

// Catálogo de ingredientes
router.get('/',       ctrl.getAll);
router.post('/',      ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

// Stock por restaurante
router.get('/stock/:restauranteId',        stockCtrl.getStock);
router.get('/platos/:restauranteId',       stockCtrl.getIngredientesMenuItems);
router.put('/stock/item/:id',              stockCtrl.updateStock);

module.exports = router;
