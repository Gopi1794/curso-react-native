const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Configurar CORS para desarrollo
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============ RUTAS DE PRUEBA ============
app.get('/test', (req, res) => {
    console.log('✅ GET /test recibido');
    res.json({ 
        status: 'online', 
        message: '¡Backend Express funcionando!',
        timestamp: new Date().toISOString(),
        directory: process.cwd()
    });
});

app.post('/api/auth/register', (req, res) => {
    console.log('��� POST /register recibido:', req.body);
    
    // Simular procesamiento
    setTimeout(() => {
        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token: 'jwt_test_token_' + Date.now(),
            user: {
                id: Math.floor(Math.random() * 1000) + 1,
                nombre: req.body.nombre,
                apellido: req.body.apellido,
                email: req.body.email,
                telefono: req.body.telefono,
                rol: 'cliente',
                estado: 'activo',
                fecha_creacion: new Date().toISOString()
            }
        });
    }, 300);
});

// Ruta para cualquier método OPTIONS (CORS preflight)
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// ============ INICIAR SERVIDOR ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════╗
    ║       ��� SERVIDOR EXPRESS            ║
    ╚══════════════════════════════════════╝
    ��� Puerto: ${PORT}
    ��� Local:    http://localhost:${PORT}
    ��� Android:  http://10.0.2.2:${PORT}
    ════════════════════════════════════════
    ��� Endpoints disponibles:
         GET  http://localhost:${PORT}/test
         POST http://localhost:${PORT}/api/auth/register
    ════════════════════════════════════════
    `);
    
    // Mostrar IP de red
    const os = require('os');
    const ifaces = os.networkInterfaces();
    
    console.log('��� IPs de red disponibles:');
    Object.keys(ifaces).forEach(ifname => {
        ifaces[ifname].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`   • http://${iface.address}:${PORT}`);
            }
        });
    });
    console.log('════════════════════════════════════════');
});
