const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/ingredientesController');

const router = Router();

const requireAdmin = (req, res, next) => {
    if (req.user?.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
    }
    next();
};

router.use(authMiddleware, requireAdmin);

router.get('/',       ctrl.getAll);
router.post('/',      ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
