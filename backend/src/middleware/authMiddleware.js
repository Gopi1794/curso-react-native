const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Acceso denegado. Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, uuid, email, rol }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token expirado. Volvé a iniciar sesión'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Token inválido'
        });
    }
};

module.exports = authMiddleware;
