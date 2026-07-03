require('dotenv').config();

const Sentry = require('@sentry/node');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
});

const authRouter             = require('./routers/auth');
const usersRouter            = require('./routers/users');
const restaurantsRouter      = require('./routers/restaurants');
const recommendationsRouter  = require('./routers/recommendations');
const ordersRouter      = require('./routers/orders');
const paymentsRouter    = require('./routers/payments');
const cuponesRouter     = require('./routers/cupones');
const comentariosRouter  = require('./routers/comentarios');
const favoritosRouter    = require('./routers/favoritos');
const supportRouter      = require('./routers/support');
const ingredientesRouter = require('./routers/ingredientes');
const adminRouter        = require('./routers/admin');
const repartidorRouter   = require('./routers/repartidor');
const superadminRouter   = require('./routers/superadmin');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Rate limiting ──────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    message: { success: false, message: 'Demasiados intentos. Esperá 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 120,
    message: { success: false, message: 'Demasiadas solicitudes. Esperá un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Middleware global ──────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:8081', 'http://192.168.0.82:8081'];
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50kb' }));

if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRouter);
app.use('/api/users',       apiLimiter, usersRouter);
app.use('/api/restaurants',      apiLimiter, restaurantsRouter);
app.use('/api/recommendations',  apiLimiter, recommendationsRouter);
app.use('/api/orders',      apiLimiter, ordersRouter);
app.use('/api/payments',    apiLimiter, paymentsRouter);
app.use('/api/cupones',     apiLimiter, cuponesRouter);
app.use('/api/menu-items/:menuItemId/comentarios', apiLimiter, comentariosRouter);
app.use('/api/favorites',   apiLimiter, favoritosRouter);
app.use('/api/support',       apiLimiter, supportRouter);
app.use('/api/admin/ingredientes', apiLimiter, ingredientesRouter);
app.use('/api/admin',              apiLimiter, adminRouter);
app.use('/api/repartidor',         apiLimiter, repartidorRouter);
app.use('/api/superadmin',         apiLimiter, superadminRouter);

// ── Health check ───────────────────────────────────────────
app.get('/health', async (req, res) => {
    const db = require('./config/database');
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
    }
});

// ── Error handlers ────────────────────────────────────────
Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Servidor ──────────────────────────────────────────────
let serverStarted = false;
const server = app.listen(PORT, () => {
    serverStarted = true;
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Endpoints disponibles:`);
    console.log(`  POST /api/auth/register`);
    console.log(`  POST /api/auth/login`);
    console.log(`  GET  /api/auth/me`);
    console.log(`  GET  /api/users/profile`);
    console.log(`  PUT  /api/users/profile`);
    console.log(`  PUT  /api/users/change-password`);
    console.log(`  GET  /api/restaurants`);
    console.log(`  GET  /api/restaurants/:id`);
    console.log(`  GET  /api/restaurants/:id/menu`);
    console.log(`  GET  /api/restaurants/:id/menu/:itemId`);
    console.log(`  POST /api/orders`);
    console.log(`  GET  /api/orders`);
    console.log(`  GET  /api/orders/:id`);
    console.log(`  PUT  /api/orders/:id/cancel`);
    console.log(`  GET  /api/payments/methods`);
    console.log(`  POST /api/payments/methods`);
    console.log(`  DEL  /api/payments/methods/:id`);
    console.log(`  POST /api/payments/pay`);
    console.log(`  GET  /api/payments/history`);
    console.log(`  GET  /api/menu-items/:id/comentarios`);
    console.log(`  POST /api/menu-items/:id/comentarios`);
    console.log(`  DEL  /api/menu-items/:id/comentarios`);
    console.log(`  GET  /health`);
});

server.on('error', (err) => {
    if (!serverStarted && err.code === 'EADDRINUSE') {
        // Solo mostrar este mensaje si el servidor aún no arrancó
        console.error(`❌ Puerto ${PORT} ya está en uso. Cerrá la instancia anterior o cambiá PORT en .env`);
        process.exit(1);
    } else {
        // Si ya estaba corriendo, dejar que Node/nodemon lo maneje normalmente
        throw err;
    }
});
