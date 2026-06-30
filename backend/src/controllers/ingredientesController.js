const db = require('../config/database');

const CATEGORIAS = ['proteina','lacteo','verdura','fruta','pan','salsa','condimento','grano','pasta','bebida','dulce','otro'];
const UNIDADES   = ['gr','ml','unidad'];

exports.getAll = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, nombre, categoria, unidad_medida, activo, fecha_creacion
             FROM ingredientes
             ORDER BY categoria, nombre`
        );
        res.json({ success: true, ingredientes: result.rows });
    } catch (error) {
        console.error('Error en getAll ingredientes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.create = async (req, res) => {
    const { nombre, categoria, unidad_medida } = req.body;

    if (!nombre?.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }
    if (!CATEGORIAS.includes(categoria)) {
        return res.status(400).json({ success: false, message: `Categoría inválida. Debe ser: ${CATEGORIAS.join(', ')}` });
    }
    if (!UNIDADES.includes(unidad_medida)) {
        return res.status(400).json({ success: false, message: `Unidad inválida. Debe ser: ${UNIDADES.join(', ')}` });
    }

    try {
        const result = await db.query(
            `INSERT INTO ingredientes (nombre, categoria, unidad_medida)
             VALUES ($1, $2, $3)
             RETURNING id, nombre, categoria, unidad_medida, activo, fecha_creacion`,
            [nombre.trim(), categoria, unidad_medida]
        );
        res.status(201).json({ success: true, ingrediente: result.rows[0] });
    } catch (error) {
        if (error.constraint === 'ingredientes_nombre_unique') {
            return res.status(409).json({ success: false, message: 'Ya existe un ingrediente con ese nombre' });
        }
        console.error('Error en create ingrediente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, unidad_medida, activo } = req.body;

    if (nombre !== undefined && !nombre?.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre no puede estar vacío' });
    }
    if (categoria !== undefined && !CATEGORIAS.includes(categoria)) {
        return res.status(400).json({ success: false, message: `Categoría inválida` });
    }
    if (unidad_medida !== undefined && !UNIDADES.includes(unidad_medida)) {
        return res.status(400).json({ success: false, message: `Unidad inválida` });
    }

    try {
        const result = await db.query(
            `UPDATE ingredientes
             SET nombre        = COALESCE($1, nombre),
                 categoria     = COALESCE($2, categoria),
                 unidad_medida = COALESCE($3, unidad_medida),
                 activo        = COALESCE($4, activo)
             WHERE id = $5
             RETURNING id, nombre, categoria, unidad_medida, activo`,
            [nombre?.trim() ?? null, categoria ?? null, unidad_medida ?? null, activo ?? null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ingrediente no encontrado' });
        }
        res.json({ success: true, ingrediente: result.rows[0] });
    } catch (error) {
        if (error.constraint === 'ingredientes_nombre_unique') {
            return res.status(409).json({ success: false, message: 'Ya existe un ingrediente con ese nombre' });
        }
        console.error('Error en update ingrediente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'DELETE FROM ingredientes WHERE id = $1 RETURNING id',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ingrediente no encontrado' });
        }
        res.json({ success: true, message: 'Ingrediente eliminado' });
    } catch (error) {
        console.error('Error en remove ingrediente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
