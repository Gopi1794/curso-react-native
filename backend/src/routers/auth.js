const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
    try {
        const { nombre, apellido, email, telefono, password, direccion } = req.body;

        // 1. Validar campos requeridos
        if (!nombre || !apellido || !email || !telefono || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // 2. Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        // 3. Verificar si el email ya existe
        const existingUser = await db.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // 4. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 5. Crear usuario en la base de datos
        const result = await db.query(
            `INSERT INTO usuarios (
                nombre, 
                apellido, 
                email, 
                telefono, 
                password_hash, 
                direccion,
                rol,
                estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id, uuid, nombre, apellido, email, telefono, rol, estado`,
            [
                nombre,
                apellido,
                email,
                telefono,
                passwordHash,
                direccion ? JSON.stringify({ completa: direccion }) : null,
                'cliente', // rol por defecto
                'activo'   // estado por defecto
            ]
        );

        const newUser = result.rows[0];

        // 6. Generar token JWT
        const token = jwt.sign(
            {
                id: newUser.id,
                uuid: newUser.uuid,
                email: newUser.email,
                rol: newUser.rol
            },
            process.env.JWT_SECRET || 'tu_secreto_jwt',
            { expiresIn: '7d' }
        );

        // 7. Responder con éxito
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                uuid: newUser.uuid,
                nombre: newUser.nombre,
                apellido: newUser.apellido,
                email: newUser.email,
                telefono: newUser.telefono,
                rol: newUser.rol,
                estado: newUser.estado
            },
            token: token
        });

    } catch (error) {
        console.error('Error en registro:', error);

        // Manejar errores específicos de PostgreSQL
        if (error.code === '23505') { // Violación de unique constraint
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// LOGIN DE USUARIO (por si también lo necesitás)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Buscar usuario por email
        const result = await db.query(
            'SELECT id, uuid, email, nombre, apellido, telefono, password_hash, rol, estado FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = result.rows[0];

        // 2. Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // 3. Verificar estado del usuario
        if (user.estado !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta está inactiva'
            });
        }

        // 4. Generar token
        const token = jwt.sign(
            {
                id: user.id,
                uuid: user.uuid,
                email: user.email,
                rol: user.rol
            },
            process.env.JWT_SECRET || 'tu_secreto_jwt',
            { expiresIn: '7d' }
        );

        // 5. Responder con éxito
        res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: user.id,
                uuid: user.uuid,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol,
                estado: user.estado
            },
            token: token
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;