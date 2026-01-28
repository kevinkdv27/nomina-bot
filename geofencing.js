// ================================================
// ARCHIVO: geofencing.js - Funciones de Geovalla para el Bot
// ================================================

const mysql = require('mysql2/promise');

// Configuración de base de datos (usar la misma que en config/database.php)
const dbConfig = {
    host: '162.241.2.167',
    port: 3306,
    database: 'adminsal_prueba',
    user: 'adminsal_confort123',
    password: 'Charlyalitokk27*',
    charset: 'utf8mb4'
};

// ===== FUNCIÓN PARA VALIDAR UBICACIÓN INDIVIDUAL DEL EMPLEADO =====
async function validarUbicacionEmpleado(userId, latitud, longitud) {
    try {
        console.log(`🔍 Validando ubicación para empleado: ${userId}`);
        console.log(`📍 Coordenadas recibidas: ${latitud}, ${longitud}`);
        
        const connection = await mysql.createConnection(dbConfig);
        
        // Obtener configuración individual del empleado
        const [empleados] = await connection.execute(`
            SELECT 
                user_id,
                nombre_completo,
                geofencing_activo,
                latitud_trabajo,
                longitud_trabajo,
                radio_permitido_metros,
                direccion_trabajo
            FROM empleados 
            WHERE user_id = ?
        `, [userId]);
        
        if (!empleados || empleados.length === 0) {
            await connection.end();
            console.log(`❌ Empleado ${userId} no encontrado en el sistema`);
            return {
                success: false,
                valida: false,
                motivo: 'Empleado no encontrado en el sistema',
                geofencing_activo: false
            };
        }
        
        const empleado = empleados[0];
        console.log(`👤 Empleado encontrado: ${empleado.nombre_completo}`);
        console.log(`🛡️ Geofencing activo: ${empleado.geofencing_activo}`);
        
        // Si no tiene geofencing activo o coordenadas no configuradas
        if (empleado.geofencing_activo === 'NO' || !empleado.latitud_trabajo || !empleado.longitud_trabajo) {
            await connection.end();
            console.log(`✅ Empleado sin restricción geográfica - registro permitido`);
            return {
                success: true,
                valida: true,
                motivo: 'Empleado sin restricción geográfica configurada',
                distancia_metros: 0,
                radio_permitido: empleado.radio_permitido_metros || 1000,
                geofencing_activo: false,
                direccion_trabajo: empleado.direccion_trabajo || 'No configurada',
                nombre_completo: empleado.nombre_completo
            };
        }
        
        // Calcular distancia usando función de MySQL si existe
        let distancia_actual = 0;
        try {
            const [distancias] = await connection.execute(
                'SELECT calcular_distancia_metros(?, ?, ?, ?) as distancia',
                [empleado.latitud_trabajo, empleado.longitud_trabajo, latitud, longitud]
            );
            distancia_actual = distancias[0].distancia;
            console.log(`📏 Distancia calculada con MySQL: ${distancia_actual}m`);
        } catch (error) {
            // Si la función MySQL no existe, calcular en JavaScript
            console.log(`⚠️ Función MySQL no disponible, calculando en JavaScript`);
            distancia_actual = calcularDistanciaHaversine(
                empleado.latitud_trabajo, empleado.longitud_trabajo,
                latitud, longitud
            );
            console.log(`📏 Distancia calculada con JavaScript: ${distancia_actual}m`);
        }
        
        await connection.end();
        
        const radio_permitido = empleado.radio_permitido_metros || 1000;
        const dentro_del_area = distancia_actual <= radio_permitido;
        
        console.log(`🎯 Resultado de validación:`);
        console.log(`  - Coordenadas trabajo: ${empleado.latitud_trabajo}, ${empleado.longitud_trabajo}`);
        console.log(`  - Coordenadas usuario: ${latitud}, ${longitud}`);
        console.log(`  - Distancia: ${distancia_actual}m`);
        console.log(`  - Radio permitido: ${radio_permitido}m`);
        console.log(`  - Resultado: ${dentro_del_area ? 'VÁLIDA ✅' : 'FUERA DEL ÁREA ❌'}`);
        
        return {
            success: true,
            valida: dentro_del_area,
            distancia_metros: distancia_actual,
            radio_permitido: radio_permitido,
            geofencing_activo: true,
            direccion_trabajo: empleado.direccion_trabajo || 'Configurada',
            coordenadas_trabajo: `${empleado.latitud_trabajo}, ${empleado.longitud_trabajo}`,
            nombre_completo: empleado.nombre_completo,
            motivo: dentro_del_area 
                ? 'Ubicación dentro del área de trabajo asignada'
                : `Fuera del área de trabajo. Distancia: ${distancia_actual}m, Máximo permitido: ${radio_permitido}m`
        };
        
    } catch (error) {
        console.error('❌ Error validando ubicación individual:', error);
        
        // En caso de error, permitir el registro (failsafe)
        return {
            success: false,
            valida: true, // Permitir por defecto si hay error
            distancia_metros: 0,
            radio_permitido: 0,
            geofencing_activo: false,
            motivo: 'Error en validación - registro permitido por seguridad',
            error: error.message
        };
    }
}

// ===== FUNCIÓN PARA OBTENER CONFIGURACIÓN INDIVIDUAL DEL EMPLEADO =====
async function obtenerConfiguracionEmpleado(userId) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [results] = await connection.execute(`
            SELECT 
                user_id,
                nombre_completo,
                zona,
                geofencing_activo,
                latitud_trabajo,
                longitud_trabajo,
                radio_permitido_metros,
                direccion_trabajo,
                observaciones_ubicacion
            FROM empleados 
            WHERE user_id = ?
        `, [userId]);
        
        await connection.end();
        
        if (results && results.length > 0) {
            const empleado = results[0];
            return {
                success: true,
                empleado: {
                    user_id: empleado.user_id,
                    nombre_completo: empleado.nombre_completo,
                    zona: empleado.zona,
                    geofencing_activo: empleado.geofencing_activo === 'SI',
                    latitud_trabajo: empleado.latitud_trabajo ? parseFloat(empleado.latitud_trabajo) : null,
                    longitud_trabajo: empleado.longitud_trabajo ? parseFloat(empleado.longitud_trabajo) : null,
                    radio_permitido_metros: empleado.radio_permitido_metros || 1000,
                    direccion_trabajo: empleado.direccion_trabajo,
                    observaciones_ubicacion: empleado.observaciones_ubicacion
                }
            };
        } else {
            return {
                success: false,
                error: 'Empleado no encontrado'
            };
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo configuración del empleado:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ===== FUNCIÓN PARA CALCULAR DISTANCIA EN JAVASCRIPT (FALLBACK) =====
function calcularDistanciaHaversine(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c;
    
    return Math.round(distancia);
}

// ===== FUNCIÓN PARA GENERAR MENSAJE DE ERROR DE UBICACIÓN INDIVIDUAL =====
function generarMensajeErrorUbicacionIndividual(validacion, nombreEmpleado) {
    const distanciaKm = (validacion.distancia_metros / 1000).toFixed(2);
    const radioKm = (validacion.radio_permitido / 1000).toFixed(2);
    const excesoKm = ((validacion.distancia_metros - validacion.radio_permitido) / 1000).toFixed(2);
    
    return `❌ *UBICACIÓN FUERA DE TU ÁREA DE TRABAJO*

🚫 ${nombreEmpleado}, no puedes registrar asistencia desde esta ubicación.

📍 **Detalles de tu ubicación:**
• Lugar de trabajo asignado: *${validacion.direccion_trabajo || 'Configurado'}*
• Debes acercarte: *${excesoKm} km*

🎯 **¿Qué puedes hacer?**
1. Dirígete a tu lugar de trabajo asignado
2. Verifica que estés en la ubicación correcta
3. Si hay un error en tu ubicación asignada, contacta a tu supervisor

📞 *Si necesitas que cambien tu ubicación de trabajo, contacta a Recursos Humanos*

📋 *Para cancelar este registro, escribe* *inicio*`;
}

// ===== FUNCIÓN PARA GENERAR MENSAJE DE UBICACIÓN VÁLIDA INDIVIDUAL =====
function generarMensajeUbicacionValidaIndividual(validacion, nombreEmpleado) {
    const distanciaKm = (validacion.distancia_metros / 1000).toFixed(2);
    const radioKm = (validacion.radio_permitido / 1000).toFixed(2);
    
    return `✅ *UBICACIÓN VALIDADA CORRECTAMENTE*

👤 **${nombreEmpleado}**
📍 **Confirmación de ubicación:**
• Lugar de trabajo: *${validacion.direccion_trabajo || 'Tu área asignada'}*
• Tu distancia: *${distanciaKm} km del centro*
• Radio permitido: *${radioKm} km*
• Estado: *Dentro de tu área de trabajo* ✅

🔍 Procesando tu registro de asistencia...`;
}

// ===== FUNCIÓN PARA GENERAR MENSAJE SIN GEOFENCING =====
function generarMensajeSinGeofencing(nombreEmpleado) {
    return `ℹ️ *SIN RESTRICCIÓN GEOGRÁFICA*`;
}

module.exports = {
    validarUbicacionEmpleado,
    obtenerConfiguracionEmpleado,
    calcularDistanciaHaversine,
    generarMensajeErrorUbicacionIndividual,
    generarMensajeUbicacionValidaIndividual,
    generarMensajeSinGeofencing
};