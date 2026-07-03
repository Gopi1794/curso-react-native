const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/recommendationsController');

const router = Router();
router.use(authMiddleware);

router.get('/:restauranteId', ctrl.get);

module.exports = router;
