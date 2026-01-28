// ================================================
// ARCHIVO: config/database.js (VERSIÓN FINAL CORREGIDA)
// ================================================

const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
    host: '162.241.2.167',
    port: 3306,
    user: 'adminsal_confort123',
    password: 'Charlyalitokk27*',
    database: 'adminsal_final',
    charset: 'utf8mb4',
    timezone: 'local',
    connectionLimit: 15,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    ssl: false,
    multipleStatements: false,
    namedPlaceholders: false,
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// ===== FUNCIÓN CORREGIDA: Probar la conexión =====
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        
        // ✅ CONSULTA CORREGIDA - Sin palabras reservadas problemáticas
        const [rows] = await connection.execute('SELECT 1 as test, NOW() as fecha_servidor');
        
        console.log('✅ Conexión a la base de datos establecida correctamente');
        console.log(`🕐 Hora del servidor DB: ${rows[0].fecha_servidor}`);
        
        connection.release();
        
        // Verificar que las tablas principales existen
        await verificarTablas();
        
        return true;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        
        if (error.code) {
            console.error(`🔍 Código de error: ${error.code}`);
        }
        if (error.errno) {
            console.error(`🔢 Número de error: ${error.errno}`);
        }
        
        return false;
    }
}

// ===== FUNCIÓN SIMPLIFICADA: Verificar tablas =====
async function verificarTablas() {
    try {
        const tablasRequeridas = [
            'asistencias',
            'control_registros',
            'logs_bot'
        ];
        
        for (const tabla of tablasRequeridas) {
            try {
                // ✅ CONSULTA SIMPLIFICADA sin parámetros
                const query = `SHOW TABLES LIKE '${tabla}'`;
                const result = await executeQuery(query);
                
                if (!result.success || result.data.length === 0) {
                    console.warn(`⚠️ Tabla '${tabla}' no encontrada - se creará automáticamente`);
                } else {
                    console.log(`✅ Tabla '${tabla}' verificada`);
                }
            } catch (error) {
                console.warn(`⚠️ Error verificando tabla '${tabla}':`, error.message);
            }
        }
        
    } catch (error) {
        console.warn('⚠️ Error verificando tablas:', error.message);
    }
}

// ===== FUNCIÓN MEJORADA: Ejecutar consultas =====
async function executeQuery(query, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Log simplificado para desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 Ejecutando: ${query.substring(0, 50)}...`);
        }
        
        const [rows, fields] = await connection.execute(query, params);
        
        return { 
            success: true, 
            data: rows, 
            fields,
            affectedRows: rows.affectedRows || 0,
            insertId: rows.insertId || null
        };
        
    } catch (error) {
        console.error('❌ Error en consulta SQL:');
        console.error(`   Query: ${query.substring(0, 100)}...`);
        console.error(`   Params: ${JSON.stringify(params)}`);
        console.error(`   Error: ${error.message}`);
        
        // Errores específicos
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('📋 La tabla no existe. Ejecuta setup-database.js primero.');
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            console.error('🏷️ Campo/columna no encontrada en la tabla.');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('🔌 No se puede conectar al servidor de base de datos.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('🚫 Usuario o contraseña incorrectos.');
        } else if (error.code === 'ER_PARSE_ERROR') {
            console.error('📝 Error de sintaxis SQL. Revisa la consulta.');
        }
        
        return { 
            success: false, 
            error: error.message,
            code: error.code,
            errno: error.errno
        };
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// ===== FUNCIÓN PARA TEST BÁSICO =====
async function testBasicConnection() {
    try {
        const connection = await pool.getConnection();
        
        // Test más simple posible
        await connection.ping();
        
        connection.release();
        console.log('✅ Conexión básica establecida');
        return true;
    } catch (error) {
        console.error('❌ Error en conexión básica:', error.message);
        return false;
    }
}

// Función para cerrar el pool de conexiones
async function closePool() {
    try {
        await pool.end();
        console.log('🔌 Pool de conexiones cerrado correctamente');
    } catch (error) {
        console.error('❌ Error cerrando pool:', error);
    }
}

// ===== EVENTOS DEL POOL =====
pool.on('connection', (connection) => {
    console.log('🔗 Nueva conexión establecida: ' + connection.threadId);
});

pool.on('error', (err) => {
    console.error('❌ Error en pool de conexiones:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Conexión perdida, el pool intentará reconectar automáticamente...');
    }
});

// ===== EXPORTAR FUNCIONES =====
module.exports = {
    pool,
    testConnection,
    testBasicConnection,
    executeQuery,
    closePool,
    verificarTablas
};