const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DB_PASSWORD) {
    throw new Error("DB_PASSWORD no está definida en las variables de entorno");
}

const pool = new Pool({
    host:     process.env.DB_HOST || "localhost",
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "foodapp_db",
    user:     process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
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