const jwt = require('jsonwebtoken');
const db  = require('../config/database');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Acceso denegado. Token no proporcionado',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar que el token no fue emitido antes del último logout del usuario.
        // Esto invalida tokens robados tras un cierre de sesión, incluso entre reinicios del servidor.
        const result = await db.query(
            'SELECT last_logout_at FROM usuarios WHERE id = $1',
            [decoded.userId]
        );
        const user = result.rows[0];
        if (user?.last_logout_at) {
            const tokenIat     = decoded.iat * 1000; // iat viene en segundos
            const lastLogoutMs = new Date(user.last_logout_at).getTime();
            if (tokenIat < lastLogoutMs) {
                return res.status(401).json({
                    success: false,
                    message: 'Sesión cerrada. Volvé a iniciar sesión',
                });
            }
        }

        req.user  = decoded; // { userId, uuid, email, rol, iat, exp }
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token expirado. Volvé a iniciar sesión',
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Token inválido',
        });
    }
};

module.exports = authMiddleware;
