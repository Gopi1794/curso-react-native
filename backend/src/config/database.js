const { Pool } = require("pg");
require("dotenv").config();

// Configuración para PostgreSQL local (pgAdmin4)
const pool = new Pool({
    // 1. HOST: Dónde está tu PostgreSQL
    host: process.env.DB_HOST || "localhost",  // Si está en tu PC

    // 2. PUERTO: Puerto de PostgreSQL (5432 es el default)
    port: process.env.DB_PORT || 5432,

    // 3. NOMBRE DE LA BASE: El que creaste en pgAdmin4
    database: process.env.DB_NAME || "foodapp_db",

    // 4. USUARIO: Usuario de PostgreSQL (generalmente "postgres")
    user: process.env.DB_USER || "postgres",

    // 5. CONTRASEÑA: La que pusiste al instalar PostgreSQL
    password: process.env.DB_PASSWORD || "Cachipun.1994",

    // 6. CONFIGURACIÓN ADICIONAL (opcional pero recomendada)
    max: 20,                 // Máximo de conexiones simultáneas
    idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexión inactiva (30 seg)
    connectionTimeoutMillis: 2000, // Tiempo máximo para conectar (2 seg)
});

// Función para probar la conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Error conectando a PostgreSQL:", err.message);
        console.log("📌 Verifica estos puntos:");
        console.log("1. ¿PostgreSQL está corriendo?");
        console.log("2. ¿La base 'foodapp_db' existe?");
        console.log("3. ¿Usuario/contraseña son correctos?");
        console.log("4. ¿El puerto 5432 está abierto?");
    } else {
        console.log("✅ Conectado exitosamente a PostgreSQL");
        console.log(`📊 Base de datos: ${pool.options.database}`);
        console.log(`📍 Host: ${pool.options.host}:${pool.options.port}`);

        // Probar consulta simple
        client.query("SELECT NOW()", (queryErr, result) => {
            release(); // Liberar cliente
            if (queryErr) {
                console.error("❌ Error en consulta de prueba:", queryErr.message);
            } else {
                console.log(`⏰ Hora del servidor: ${result.rows[0].now}`);
                console.log("🎉 ¡Base de datos lista para usar!");
            }
        });
    }
});

// Manejar errores de conexión
pool.on("error", (err) => {
    console.error("💥 Error inesperado en el pool de conexiones:", err);
    console.log("🔄 Reconectando automáticamente...");
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    end: () => pool.end(),
    pool: pool
};