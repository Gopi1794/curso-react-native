// test-connection.js
const pool = require("./src/config/database").pool;

async function testConnection() {
    console.log("🧪 Probando conexión a PostgreSQL...");

    try {
        // 1. Probar conexión básica
        const client = await pool.connect();
        console.log("✅ Conexión exitosa");

        // 2. Verificar versión de PostgreSQL
        const versionResult = await client.query("SELECT version()");
        console.log(`📋 PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);

        // 3. Verificar tablas de foodapp_db
        const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log(`📊 Tablas en la base de datos (${tablesResult.rows.length}):`);
        tablesResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.table_name}`);
        });

        // 4. Contar registros en cada tabla
        console.log("\n📈 Registros por tabla:");
        for (const row of tablesResult.rows) {
            const countResult = await client.query(`SELECT COUNT(*) FROM ${row.table_name}`);
            console.log(`  ${row.table_name}: ${countResult.rows[0].count} registros`);
        }

        client.release();
        console.log("\n🎉 ¡Todo funciona correctamente!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error de conexión:", error.message);
        console.log("\n🔧 Solución de problemas:");

        if (error.code === 'ECONNREFUSED') {
            console.log("1. Verifica que PostgreSQL esté corriendo:");
            console.log("   Windows: Servicios → PostgreSQL");
            console.log("   Linux/Mac: sudo systemctl status postgresql");
        }

        if (error.code === '28P01') {
            console.log("1. Contraseña incorrecta");
            console.log("2. Cambia la contraseña en el archivo .env");
        }

        if (error.code === '3D000') {
            console.log("1. La base de datos 'foodapp_db' no existe");
            console.log("2. Crea la base en pgAdmin4: CREATE DATABASE foodapp_db;");
        }

        process.exit(1);
    }
}

testConnection();