require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/restaurants',      restaurantsRouter);
app.use('/api/recommendations',  recommendationsRouter);
app.use('/api/orders',      ordersRouter);
app.use('/api/payments',    paymentsRouter);
app.use('/api/cupones',     cuponesRouter);
app.use('/api/menu-items/:menuItemId/comentarios', comentariosRouter);
app.use('/api/favorites',   favoritosRouter);
app.use('/api/support',       supportRouter);
app.use('/api/admin/ingredientes', ingredientesRouter);
app.use('/api/admin',              adminRouter);
app.use('/api/repartidor',         repartidorRouter);
app.use('/api/superadmin',         superadminRouter);

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
