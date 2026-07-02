const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/superadminController');

const requireSuperAdmin = (req, res, next) => {
    if (req.user?.rol !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Acceso restringido al super administrador' });
    }
    next();
};

router.use(authMiddleware, requireSuperAdmin);

router.get('/stats',              ctrl.getGlobalStats);
router.get('/tenants',            ctrl.getTenants);
router.get('/tenants/:id/stats',  ctrl.getTenantStats);
router.post('/tenants',           ctrl.createTenant);
router.put('/tenants/:id/toggle', ctrl.toggleTenantEstado);

module.exports = router;
