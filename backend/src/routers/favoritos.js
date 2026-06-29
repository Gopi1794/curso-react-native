const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/favoritosController');

router.get('/',                authMiddleware, ctrl.getAll);
router.post('/',               authMiddleware, ctrl.add);
router.delete('/:menuItemId',  authMiddleware, ctrl.remove);

module.exports = router;
