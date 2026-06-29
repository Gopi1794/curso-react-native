const jwt = require('jsonwebtoken');

// Blacklist en memoria. Para producción de escala: reemplazar con Redis.
// Se limpia al reiniciar el servidor, pero cubre el caso de tokens robados
// durante una sesión activa.
const revokedTokens = new Set();

const revokeToken = (token) => revokedTokens.add(token);

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Acceso denegado. Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];

    if (revokedTokens.has(token)) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido. Volvé a iniciar sesión'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, uuid, email, rol }
        req.token = token;  // necesario para revocar en logout
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
module.exports.revokeToken = revokeToken;
