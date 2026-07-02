const db = require('../config/database');
const bcrypt = require('bcryptjs');

exports.updateInfo = async (req, res) => {
    const { restauranteId } = req.params;
    const { nombre, descripcion, direccion, telefono, horario, logo_url } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (nombre      !== undefined) { fields.push(`nombre = $${idx++}`);      values.push(nombre); }
        if (descripcion !== undefined) { fields.push(`descripcion = $${idx++}`); values.push(descripcion); }
        if (direccion   !== undefined) { fields.push(`direccion = $${idx++}`);   values.push(direccion); }
        if (telefono    !== undefined) { fields.push(`telefono = $${idx++}`);    values.push(telefono); }
        if (horario     !== undefined) { fields.push(`horario = $${idx++}`);     values.push(JSON.stringify(horario)); }
        if (logo_url    !== undefined) { fields.push(`logo_url = $${idx++}`);    values.push(logo_url); }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
        }

        values.push(restauranteId);
        const result = await db.query(
            `UPDATE restaurantes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('updateRestauranteInfo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar restaurante' });
    }
};

exports.getInfo = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const result = await db.query('SELECT * FROM restaurantes WHERE id = $1', [restauranteId]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('getRestauranteInfo:', error);
        res.status(500).json({ success: false, message: 'Error al obtener restaurante' });
    }
};

exports.createRepartidor = async (req, res) => {
    const { nombre, apellido, email, telefono, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, message: 'nombre, email y password son requeridos' });
    }

    try {
        const exists = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (exists.rows[0]) {
            return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
        }

        const hash = await bcrypt.hash(password, 12);
        const result = await db.query(
            `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, email_verificado)
             VALUES ($1, $2, $3, $4, $5, 'repartidor', true) RETURNING id, nombre, apellido, email, telefono, rol`,
            [nombre, apellido || '', email, telefono || '000000000', hash]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('createRepartidor:', error);
        res.status(500).json({ success: false, message: 'Error al crear repartidor' });
    }
};
