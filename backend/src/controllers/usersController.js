const bcrypt = require('bcryptjs');
const db = require('../config/database');
const supabase = require('../config/supabase');
const { sendPasswordChangedEmail } = require('../services/emailService');

// ── GET PROFILE ───────────────────────────────────────────
// GET /api/users/profile
exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, uuid, nombre, apellido, email, telefono, rol, estado, avatar_url, fecha_creacion, fecha_actualizacion
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

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 8 caracteres'
            });
        }

        if (newPassword.length > 72) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña no puede exceder 72 caracteres'
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

        const updateResult = await db.query(
            'UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING email, nombre',
            [newHash, req.user.userId]
        );

        const { email, nombre } = updateResult.rows[0];
        sendPasswordChangedEmail(email, nombre).catch(() => {});

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

// ── UPLOAD AVATAR ────────────────────────────────────────
// POST /api/users/avatar
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se envió ninguna imagen'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                message: 'Supabase Storage no está configurado'
            });
        }

        const userId = req.user.userId;
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `avatars/user_${userId}_${Date.now()}.${ext}`;

        // Subir a Supabase Storage
        const { data, error } = await supabase.storage
            .from('bucketFoodApp')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (error) {
            console.error('Error subiendo a Supabase Storage:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al subir la imagen'
            });
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
            .from('bucketFoodApp')
            .getPublicUrl(fileName);

        const avatarUrl = urlData.publicUrl;

        // Guardar URL en la DB
        await db.query(
            'UPDATE usuarios SET avatar_url = $1 WHERE id = $2',
            [avatarUrl, userId]
        );

        res.json({
            success: true,
            message: 'Avatar actualizado',
            avatar_url: avatarUrl
        });

    } catch (error) {
        console.error('Error en uploadAvatar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── ADDRESSES ────────────────────────────────────────
// GET /api/users/addresses
exports.getAddresses = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, etiqueta, direccion, ciudad, provincia, referencia,
                    latitud, longitud, es_principal, fecha_creacion
             FROM direcciones_usuarios
             WHERE usuario_id = $1
             ORDER BY es_principal DESC, fecha_creacion DESC`,
            [req.user.userId]
        );
        res.json({ success: true, addresses: result.rows });
    } catch (error) {
        console.error('Error en getAddresses:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/users/addresses
exports.createAddress = async (req, res) => {
    try {
        const { etiqueta, direccion, ciudad = '', provincia = '', referencia = '', latitud = null, longitud = null, es_principal = false } = req.body;

        if (!etiqueta || !etiqueta.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre de la dirección es requerido' });
        }
        if (!direccion || !direccion.trim()) {
            return res.status(400).json({ success: false, message: 'La dirección es requerida' });
        }

        if (es_principal) {
            await db.query(
                'UPDATE direcciones_usuarios SET es_principal = FALSE WHERE usuario_id = $1',
                [req.user.userId]
            );
        }

        const result = await db.query(
            `INSERT INTO direcciones_usuarios
                (usuario_id, etiqueta, direccion, ciudad, provincia, referencia, latitud, longitud, es_principal)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [req.user.userId, etiqueta.trim(), direccion.trim(), ciudad, provincia, referencia, latitud, longitud, es_principal]
        );

        res.status(201).json({ success: true, address: result.rows[0] });
    } catch (error) {
        console.error('Error en createAddress:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// DELETE /api/users/addresses/:id
exports.deleteAddress = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM direcciones_usuarios WHERE id = $1 AND usuario_id = $2 RETURNING id',
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dirección no encontrada' });
        }

        res.json({ success: true, message: 'Dirección eliminada' });
    } catch (error) {
        console.error('Error en deleteAddress:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── GET STATS ────────────────────────────────────────────
// GET /api/users/stats
// ── DELETE ACCOUNT ───────────────────────────────────────
// DELETE /api/users/account
exports.deleteAccount = async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'Confirmá tu contraseña para eliminar la cuenta' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            'SELECT password_hash FROM usuarios WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
        if (!isValid) {
            await client.query('ROLLBACK');
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        await client.query('DELETE FROM usuarios WHERE id = $1', [req.user.userId]);
        await client.query('COMMIT');

        res.json({ success: true, message: 'Cuenta eliminada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en deleteAccount:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM pedidos WHERE usuario_id = $1) AS total_pedidos,
                (SELECT COALESCE(AVG(c.rating), 0) FROM comentarios c WHERE c.usuario_id = $1) AS rating_promedio,
                (SELECT COUNT(*) FROM comentarios WHERE usuario_id = $1) AS total_resenas`,
            [userId]
        );

        const stats = result.rows[0];

        res.json({
            success: true,
            stats: {
                pedidos: parseInt(stats.total_pedidos),
                rating: parseFloat(parseFloat(stats.rating_promedio).toFixed(1)),
                resenas: parseInt(stats.total_resenas),
            }
        });

    } catch (error) {
        console.error('Error en getStats:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
