const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

exports.register = async (req, res) => {
    try {
        const { nombre, apellido, email, telefono, password } = req.body;

        // 1. Validar campos requeridos
        if (!nombre || !apellido || !email || !telefono || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos: nombre, apellido, email, teléfono, contraseña'
            });
        }

        // 2. Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, ingresa un correo electrónico válido'
            });
        }

        // 3. Validar teléfono (mínimo 8 dígitos)
        const phoneDigits = telefono.replace(/\D/g, '');
        if (phoneDigits.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'El teléfono debe tener al menos 8 dígitos'
            });
        }

        // 4. Validar contraseña
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // 5. Verificar si el email ya existe
        const [existingUsers] = await db.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Este email ya está registrado'
            });
        }

        // 6. Hash de la contraseña
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 7. Generar UUID único
        const uuid = crypto.randomUUID();

        // 8. Insertar usuario en la base de datos
        const [result] = await db.query(
            `INSERT INTO usuarios (
                uuid, 
                nombre, 
                apellido, 
                email, 
                telefono, 
                password_hash, 
                rol, 
                estado, 
                fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                uuid,
                nombre.trim(),
                apellido.trim(),
                email.trim().toLowerCase(),
                telefono.trim(),
                hashedPassword,
                'cliente',           // Rol por defecto
                'activo'             // Estado por defecto
            ]
        );

        // 9. Generar token JWT
        const token = jwt.sign(
            {
                userId: result.insertId,
                uuid: uuid,
                email: email,
                rol: 'cliente'
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // 10. Obtener usuario creado (sin password)
        const [users] = await db.query(
            `SELECT 
                id, uuid, nombre, apellido, email, 
                telefono, rol, estado, fecha_creacion
            FROM usuarios WHERE id = ?`,
            [result.insertId]
        );

        const user = users[0];

        // 11. Responder con éxito
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token: token,
            user: {
                id: user.id,
                uuid: user.uuid,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol,
                estado: user.estado,
                fecha_creacion: user.fecha_creacion
            }
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);

        // Manejo de errores específicos de MySQL
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El email o teléfono ya están registrados'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Método de login (por si lo necesitas)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario
        const [users] = await db.query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email.toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        const user = users[0];

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Verificar si el usuario está activo
        if (user.estado !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta no está activa'
            });
        }

        // Generar token
        const token = jwt.sign(
            {
                userId: user.id,
                uuid: user.uuid,
                email: user.email,
                rol: user.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // Responder
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token: token,
            user: {
                id: user.id,
                uuid: user.uuid,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol,
                estado: user.estado
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};