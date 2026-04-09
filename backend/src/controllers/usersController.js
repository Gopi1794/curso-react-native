const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ── GET PROFILE ───────────────────────────────────────────
// GET /api/users/profile
exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, uuid, nombre, apellido, email, telefono, rol, estado, fecha_creacion, fecha_actualizacion
             FROM usuarios WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error en getProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── UPDATE PROFILE ────────────────────────────────────────
// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        const { nombre, apellido, telefono } = req.body;

        // Al menos un campo debe venir
        if (!nombre && !apellido && !telefono) {
            return res.status(400).json({
                success: false,
                message: 'Enviá al menos un campo para actualizar: nombre, apellido o teléfono'
            });
        }

        // Validar teléfono si viene
        if (telefono) {
            const phoneDigits = telefono.replace(/\D/g, '');
            if (phoneDigits.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'El teléfono debe tener al menos 8 dígitos'
                });
            }
        }

        // Construir la query dinámicamente solo con los campos enviados
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (nombre)   { fields.push(`nombre = $${paramIndex++}`);   values.push(nombre.trim()); }
        if (apellido) { fields.push(`apellido = $${paramIndex++}`); values.push(apellido.trim()); }
        if (telefono) { fields.push(`telefono = $${paramIndex++}`); values.push(telefono.trim()); }

        values.push(req.user.userId); // último parámetro = WHERE id = $N

        const result = await db.query(
            `UPDATE usuarios SET ${fields.join(', ')}
             WHERE id = $${paramIndex}
             RETURNING id, uuid, nombre, apellido, email, telefono, rol, estado, fecha_actualizacion`,
            values
        );

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error en updateProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── CHANGE PASSWORD ───────────────────────────────────────
// PUT /api/users/change-password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña actual y la nueva son requeridas'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe ser diferente a la actual'
            });
        }

        // Obtener el hash actual de la DB
        const result = await db.query(
            'SELECT password_hash FROM usuarios WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar que la contraseña actual sea correcta
        const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'La contraseña actual es incorrecta'
            });
        }

        // Hashear la nueva contraseña y guardar
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const newHash = await bcrypt.hash(newPassword, saltRounds);

        await db.query(
            'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
            [newHash, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('Error en changePassword:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
