// backend/server-pg.js - VERSIÓN POSTGRESQL REAL
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// ============ CONFIGURACIÓN POSTGRESQL ============
// ⚠️ IMPORTANTE: Usa TUS credenciales de pgAdmin
const pool = new Pool({
    host: 'localhost',            // Mismo que en pgAdmin
    port: 5432,                   // Puerto default
    user: 'postgres',             // Tu usuario
    password: 'Cachipun.1994',    // Tu contraseña EXACTA
    database: 'foodapp_db',          // Base de datos creada
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERROR PostgreSQL:', err.message);
        console.log('🔍 Verifica:');
        console.log('   1. PostgreSQL está corriendo?');
        console.log('   2. Credenciales correctas?');
        console.log('   3. Base de datos "foodapp" existe?');
    } else {
        console.log('✅ PostgreSQL CONECTADO correctamente');
        release();

        // Verificar tabla usuarios
        client.query('SELECT * FROM usuarios LIMIT 1', (err, result) => {
            if (err && err.code === '42P01') {
                console.log('⚠️ Tabla "usuarios" no existe, créala en pgAdmin');
            } else {
                console.log('✅ Tabla "usuarios" disponible');
            }
        });
    }
});

// ============ MIDDLEWARE ============
app.use(cors({ origin: '*' }));
app.use(express.json());

// Middleware de log
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ============ RUTAS ============

// 1. Health Check con PostgreSQL
app.get('/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW() as time, version() as version');

        res.json({
            status: 'healthy',
            postgresql: 'connected',
            database_time: dbResult.rows[0].time,
            postgres_version: dbResult.rows[0].version.split(' ').slice(1, 3).join(' '),
            message: '✅ PostgreSQL funcionando'
        });

    } catch (error) {
        res.json({
            status: 'degraded',
            postgresql: 'disconnected',
            error: error.message,
            message: '⚠️ PostgreSQL no disponible'
        });
    }
});

// 2. REGISTRO REAL con PostgreSQL
app.post('/api/auth/register', async (req, res) => {
    console.log('📨 Registro recibido:', req.body);

    const { nombre, apellido, email, telefono, password } = req.body;

    // Validación básica
    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Nombre, apellido, email y contraseña son requeridos'
        });
    }

    try {
        // 1. Verificar si email ya existe
        const emailCheck = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email.toLowerCase()]
        );

        if (emailCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Este email ya está registrado'
            });
        }

        // 2. Hash de contraseña (simplificado para desarrollo)
        // En producción usarías: bcrypt.hash(password, 10)
        const passwordHash = `dev_hash_${Date.now()}`;

        // 3. Insertar en PostgreSQL
        const result = await pool.query(
            `INSERT INTO usuarios 
       (nombre, apellido, email, telefono, password_hash, rol, estado) 
       VALUES ($1, $2, $3, $4, $5, 'cliente', 'activo') 
       RETURNING id, nombre, apellido, email, telefono, rol, estado, fecha_creacion`,
            [nombre, apellido, email.toLowerCase(), telefono || null, passwordHash]
        );

        const user = result.rows[0];

        console.log('✅ Usuario INSERTADO en PostgreSQL. ID:', user.id);

        // 4. Responder éxito
        res.status(201).json({
            success: true,
            message: '✅ Usuario registrado en PostgreSQL',  // ← Este mensaje
            user: user,
            token: `pg_token_${user.id}_${Date.now()}`
        });

    } catch (error) {
        console.error('❌ ERROR PostgreSQL en registro:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });

        // Manejo específico de errores PostgreSQL
        if (error.code === '23505') { // unique violation
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        if (error.code === '23502') { // not null violation
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos'
            });
        }

        // Error general de PostgreSQL
        res.status(500).json({
            success: false,
            message: 'Error en la base de datos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 3. Listar usuarios (para debugging)
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, apellido, email, telefono, rol, estado, fecha_creacion ' +
            'FROM usuarios ORDER BY id DESC'
        );

        res.json({
            success: true,
            count: result.rows.length,
            usuarios: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});

// ============ INICIAR SERVIDOR ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════════════╗
  ║        🗄️  BACKEND CON POSTGRESQL REAL         ║
  ╚══════════════════════════════════════════════════╝
  
  📊 CONFIGURACIÓN:
  ├── Puerto: ${PORT}
  ├── PostgreSQL: localhost:5432
  ├── Base de datos: foodapp
  ├── Usuario: postgres
  
  🌐 URLS:
  ├── Local: http://localhost:${PORT}
  ├── Ngrok: https://verlie-ripply-jill.ngrok-free.dev
  ├── Health: http://localhost:${PORT}/health
  
  🔗 ENDPOINTS:
  ├── POST /api/auth/register  → Registro real en PostgreSQL
  ├── GET  /api/usuarios       → Ver usuarios en DB
  └── GET  /health             → Estado PostgreSQL
  
  ═══════════════════════════════════════════════════
  📱 Para verificar:
  1. Visita: http://localhost:${PORT}/health
  2. Debería decir "PostgreSQL funcionando"
  3. Luego haz registro desde tu app
  4. Verifica en pgAdmin: SELECT * FROM usuarios;
  ═══════════════════════════════════════════════════
  `);
});