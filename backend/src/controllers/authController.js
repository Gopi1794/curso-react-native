const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../services/emailService');

// Genera código de 6 dígitos
const generateVerificationCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// ── REGISTER ──────────────────────────────────────────────
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

        // 4. Validar longitud máxima de campos
        if (nombre.length > 50 || apellido.length > 50 || email.length > 100 || telefono.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Uno o más campos exceden la longitud permitida'
            });
        }

        // 5. Validar contraseña
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        if (password.length > 72) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña no puede exceder 72 caracteres'
            });
        }

        // 5. Verificar si el email ya existe
        const emailCheck = await db.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (emailCheck.rows.length > 0) {
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

        // 8. Generar código de verificación
        const verificationCode = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // 9. Insertar usuario con email NO verificado
        const result = await db.query(
            `INSERT INTO usuarios (
                uuid, nombre, apellido, email, telefono,
                password_hash, rol, estado, email_verificado,
                token_verificacion, token_verificacion_expira, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            RETURNING id, uuid, nombre, apellido, email, telefono, rol, estado, fecha_creacion`,
            [
                uuid,
                nombre.trim(),
                apellido.trim(),
                email.trim().toLowerCase(),
                telefono.trim(),
                hashedPassword,
                'cliente',
                'activo',
                false,
                verificationCode,
                codeExpires
            ]
        );

        const user = result.rows[0];

        // 10. Enviar email de verificación
        let emailSent = true;
        try {
            await emailService.sendVerificationEmail(user.email, user.nombre, verificationCode);
        } catch (emailError) {
            console.error('Error enviando email de verificación:', emailError);
            emailSent = false;
        }

        res.status(201).json({
            success: true,
            message: emailSent
                ? 'Registro exitoso. Revisá tu email para verificar tu cuenta.'
                : 'Registro exitoso, pero no pudimos enviar el email de verificación. Podés solicitarlo de nuevo desde la pantalla de inicio de sesión.',
            requiresVerification: true,
            emailSent,
            email: user.email
        });

    } catch (error) {
        console.error('Error en registro:', error);

        if (error.code === '23505') {
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

// ── LOGIN ─────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        const result = await db.query(
            `SELECT id, uuid, nombre, apellido, email, telefono, rol, estado,
                    email_verificado, avatar_url, password_hash,
                    login_attempts, locked_until, restaurante_id
             FROM usuarios WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        // Siempre ejecutar bcrypt para evitar timing attacks (aunque el usuario no exista)
        const DUMMY_HASH = '$2b$12$invalidhashfortimingattackprotection000000000000000000';
        const user = result.rows[0] || null;
        const hashToCompare = user ? user.password_hash : DUMMY_HASH;
        const isPasswordValid = await bcrypt.compare(password, hashToCompare);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }

        // Verificar bloqueo temporal (independientemente de la contraseña)
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
            return res.status(429).json({
                success: false,
                message: `Cuenta bloqueada por demasiados intentos. Intentá de nuevo en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`,
            });
        }

        if (!isPasswordValid) {
            const newAttempts = (user.login_attempts || 0) + 1;
            const shouldLock  = newAttempts >= 10;
            await db.query(
                `UPDATE usuarios
                 SET login_attempts = $1,
                     locked_until   = $2
                 WHERE id = $3`,
                [
                    newAttempts,
                    shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
                    user.id,
                ]
            );
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }

        // Login exitoso — resetear intentos
        await db.query(
            'UPDATE usuarios SET login_attempts = 0, locked_until = NULL WHERE id = $1',
            [user.id]
        );

        if (user.estado !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta no está activa'
            });
        }

        // Verificar si el email está verificado
        if (!user.email_verificado) {
            // Generar nuevo código y enviarlo
            const verificationCode = generateVerificationCode();
            const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

            await db.query(
                'UPDATE usuarios SET token_verificacion = $1, token_verificacion_expira = $2 WHERE id = $3',
                [verificationCode, codeExpires, user.id]
            );

            try {
                await emailService.sendVerificationEmail(user.email, user.nombre, verificationCode);
            } catch (emailError) {
                console.error('Error reenviando email:', emailError);
            }

            return res.status(403).json({
                success: false,
                message: 'Tu email no está verificado. Te enviamos un nuevo código.',
                requiresVerification: true,
                email: user.email
            });
        }

        const token = jwt.sign(
            { userId: user.id, uuid: user.uuid, email: user.email, rol: user.rol, restauranteId: user.restaurante_id || null },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '30m' }
        );

        let restaurante = null;
        if (user.rol === 'admin' && user.restaurante_id) {
            const resRow = await db.query(
                'SELECT id, nombre, descripcion, direccion, telefono, horario FROM restaurantes WHERE id = $1',
                [user.restaurante_id]
            );
            restaurante = resRow.rows[0] || null;
        }

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                uuid: user.uuid,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol,
                estado: user.estado,
                avatar_url: user.avatar_url || null,
                restaurante_id: user.restaurante_id || null,
                restaurante,
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

// ── LOGOUT ────────────────────────────────────────────────
exports.logout = async (req, res) => {
    try {
        await db.query(
            'UPDATE usuarios SET last_logout_at = NOW() WHERE id = $1',
            [req.user.userId]
        );
    } catch (err) {
        console.error('logout last_logout_at:', err);
    }
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
};

// ── GOOGLE LOGIN ──────────────────────────────────────────
// POST /api/auth/google
// Recibe el idToken de Google, verifica con Google, crea o busca el usuario
exports.googleLogin = async (req, res) => {
    try {
        const { idToken, accessToken } = req.body;

        if (!idToken && !accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere idToken o accessToken de Google'
            });
        }

        // Verificar el token con Google y obtener datos del usuario
        let googleUser;
        if (idToken) {
            const response = await fetch(
                `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
            );
            googleUser = await response.json();
            if (googleUser.error) {
                return res.status(401).json({ success: false, message: 'Token de Google inválido' });
            }
        } else {
            const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            googleUser = await response.json();
            if (!googleUser.email) {
                return res.status(401).json({ success: false, message: 'Token de Google inválido' });
            }
        }

        const email = googleUser.email?.toLowerCase();
        const nombre = googleUser.given_name || googleUser.name?.split(' ')[0] || 'Usuario';
        const apellido = googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '';

        if (!email) {
            return res.status(400).json({ success: false, message: 'No se pudo obtener el email de Google' });
        }

        // Buscar si el usuario ya existe
        let userResult = await db.query(
            'SELECT id, uuid, nombre, apellido, email, telefono, rol, estado FROM usuarios WHERE email = $1',
            [email]
        );

        let user;

        if (userResult.rows.length > 0) {
            // Usuario ya existe — solo verificar que esté activo
            user = userResult.rows[0];
            if (user.estado !== 'activo') {
                return res.status(403).json({ success: false, message: 'Tu cuenta no está activa' });
            }
        } else {
            // Usuario nuevo — crear con datos de Google
            const uuid = crypto.randomUUID();
            // Contraseña aleatoria (nunca la usarán, pero el campo es NOT NULL)
            const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

            const insertResult = await db.query(
                `INSERT INTO usuarios (uuid, nombre, apellido, email, telefono, password_hash, rol, estado)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, uuid, nombre, apellido, email, telefono, rol, estado`,
                [uuid, nombre, apellido, email, '', randomPassword, 'cliente', 'activo']
            );
            user = insertResult.rows[0];
        }

        // Generar nuestro propio JWT
        const token = jwt.sign(
            { userId: user.id, uuid: user.uuid, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '30m' }
        );

        res.json({
            success: true,
            message: 'Inicio de sesión con Google exitoso',
            token,
            user: {
                id: user.id,
                uuid: user.uuid,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol,
                estado: user.estado,
            }
        });

    } catch (error) {
        console.error('Error en Google login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── GET PROFILE ───────────────────────────────────────────
// req.user es inyectado por el middleware JWT (Fase 3)
exports.getUserProfile = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, uuid, nombre, apellido, email, telefono, rol, estado, avatar_url, fecha_creacion, restaurante_id
             FROM usuarios WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const userData = result.rows[0];
        let restaurante = null;
        if (userData.rol === 'admin' && userData.restaurante_id) {
            const resRow = await db.query(
                'SELECT id, nombre, descripcion, direccion, telefono, horario FROM restaurantes WHERE id = $1',
                [userData.restaurante_id]
            );
            restaurante = resRow.rows[0] || null;
        }

        res.json({
            success: true,
            user: { ...userData, restaurante }
        });

    } catch (error) {
        console.error('Error en getUserProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── VERIFY EMAIL ─────────────────────────────────────────
// POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email y código son requeridos'
            });
        }

        const result = await db.query(
            'SELECT id, uuid, nombre, apellido, email, telefono, rol, estado, token_verificacion, token_verificacion_expira FROM usuarios WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];

        // Verificar código
        if (user.token_verificacion !== code) {
            return res.status(400).json({
                success: false,
                message: 'Código incorrecto'
            });
        }

        // Verificar expiración
        if (new Date() > new Date(user.token_verificacion_expira)) {
            return res.status(400).json({
                success: false,
                message: 'El código expiró. Solicitá uno nuevo.',
                expired: true
            });
        }

        // Marcar email como verificado
        await db.query(
            'UPDATE usuarios SET email_verificado = TRUE, token_verificacion = NULL, token_verificacion_expira = NULL WHERE id = $1',
            [user.id]
        );

        // Generar JWT y loguear al usuario
        const token = jwt.sign(
            { userId: user.id, uuid: user.uuid, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '30m' }
        );

        res.json({
            success: true,
            message: 'Email verificado correctamente',
            token,
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
        console.error('Error en verifyEmail:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── RESEND VERIFICATION ──────────────────────────────────
// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email es requerido'
            });
        }

        const result = await db.query(
            'SELECT id, nombre, email, email_verificado FROM usuarios WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];

        if (user.email_verificado) {
            return res.json({
                success: true,
                message: 'Tu email ya está verificado'
            });
        }

        const verificationCode = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            'UPDATE usuarios SET token_verificacion = $1, token_verificacion_expira = $2 WHERE id = $3',
            [verificationCode, codeExpires, user.id]
        );

        await emailService.sendVerificationEmail(user.email, user.nombre, verificationCode);

        res.json({
            success: true,
            message: 'Código de verificación reenviado'
        });

    } catch (error) {
        console.error('Error en resendVerification:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── FORGOT PASSWORD ───────────────────────────────────────
// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'El email es requerido' });
        }

        const result = await db.query(
            'SELECT id, nombre, email, estado FROM usuarios WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        // Respuesta genérica para no revelar si el email existe
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Si el email está registrado, recibirás un código en tu casilla.'
            });
        }

        const user = result.rows[0];

        if (user.estado !== 'activo') {
            return res.json({
                success: true,
                message: 'Si el email está registrado, recibirás un código en tu casilla.'
            });
        }

        const resetCode = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            'UPDATE usuarios SET token_verificacion = $1, token_verificacion_expira = $2 WHERE id = $3',
            [resetCode, codeExpires, user.id]
        );

        try {
            await emailService.sendPasswordResetEmail(user.email, user.nombre, resetCode);
        } catch (emailError) {
            console.error('Error enviando email de reset:', emailError);
        }

        res.json({
            success: true,
            message: 'Si el email está registrado, recibirás un código en tu casilla.'
        });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── RESET PASSWORD ────────────────────────────────────────
// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, código y nueva contraseña son requeridos' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
        }

        if (newPassword.length > 72) {
            return res.status(400).json({ success: false, message: 'La contraseña no puede exceder 72 caracteres' });
        }

        const result = await db.query(
            'SELECT id, token_verificacion, token_verificacion_expira FROM usuarios WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
        }

        const user = result.rows[0];

        if (!user.token_verificacion || user.token_verificacion !== code) {
            return res.status(400).json({ success: false, message: 'Código incorrecto' });
        }

        if (new Date() > new Date(user.token_verificacion_expira)) {
            return res.status(400).json({ success: false, message: 'El código expiró. Solicitá uno nuevo.', expired: true });
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await db.query(
            'UPDATE usuarios SET password_hash = $1, token_verificacion = NULL, token_verificacion_expira = NULL, email_verificado = TRUE WHERE id = $2',
            [hashedPassword, user.id]
        );

        const token = jwt.sign(
            { userId: user.id, uuid: user.uuid, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Contraseña cambiada correctamente.',
            token,
            user: {
                id: user.id,
                uuid: user.uuid,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol,
                estado: user.estado,
            },
        });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
