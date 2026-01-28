// ================================================
// ARCHIVO: models/asistencias.js (SIMPLIFICADO)
// ================================================

const { executeQuery } = require('../config/database');

class AsistenciasModel {
    
    // ===== GUARDAR ASISTENCIA =====
    static async guardarAsistencia(data) {
        try {
            console.log('💾 Guardando asistencia en BD...');
            
            const query = `
                INSERT INTO asistencias (
                    user_id, nombre, zona, servicio, asistencia, 
                    latitud, longitud, direccion_completa, fecha_ubicacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                data.userId,
                data.nombre,
                data.zona || 'N/A',
                data.servicio || 'Sin especificar',
                data.asistencia, // PRESENTE, AUSENTE, APOYO
                data.ubicacion ? data.ubicacion.latitud : null,
                data.ubicacion ? data.ubicacion.longitud : null,
                data.ubicacion ? data.ubicacion.direccion_completa : null,
                data.ubicacion ? new Date() : null
            ];
            
            const result = await executeQuery(query, params);
            
            if (result.success) {
                console.log('✅ Registro guardado en BD, ID:', result.insertId);
                
                // Log según tipo de asistencia
                if (data.asistencia === 'APOYO') {
                    console.log('🆘 Registro de APOYO guardado');
                } else if (data.asistencia === 'AUSENTE') {
                    console.log('🚫 Registro de AUSENCIA guardado');
                } else {
                    console.log('✅ Registro de PRESENCIA guardado');
                }
                
                if (data.ubicacion && data.ubicacion.direccion_completa) {
                    console.log('🏠 Dirección guardada:', data.ubicacion.direccion_completa);
                }
                
                return { 
                    success: true, 
                    id: result.insertId 
                };
            } else {
                console.error('❌ Error guardando registro:', result.error);
                return { 
                    success: false, 
                    error: result.error 
                };
            }
            
        } catch (error) {
            console.error('❌ Error crítico guardando asistencia:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    // ===== VERIFICAR SI PUEDE REGISTRAR =====
    static async puedeRegistrar(userId, horasLimite = 6) {
        try {
            console.log(`⏰ Verificando si ${userId} puede registrar (límite: ${horasLimite}h)`);
            
            const query = `
                SELECT 
                    ultimo_registro,
                    TIMESTAMPDIFF(HOUR, ultimo_registro, NOW()) as horas_transcurridas
                FROM control_registros 
                WHERE user_id = ?
            `;
            
            const result = await executeQuery(query, [userId]);
            
            if (!result.success) {
                console.warn('⚠️ Error verificando registro, permitiendo por defecto');
                return { puede: true, esNuevo: true };
            }
            
            if (result.data.length === 0) {
                console.log('✅ Usuario nuevo, puede registrar');
                return { 
                    puede: true, 
                    esNuevo: true
                };
            }
            
            const registro = result.data[0];
            const horasTranscurridas = registro.horas_transcurridas || 0;
            const puedeRegistrar = horasTranscurridas >= horasLimite;
            
            console.log(`📊 Último registro: ${registro.ultimo_registro}`);
            console.log(`🕐 Horas transcurridas: ${horasTranscurridas}`);
            console.log(`✅ Puede registrar: ${puedeRegistrar ? 'SÍ' : 'NO'}`);
            
            return {
                puede: puedeRegistrar,
                esNuevo: false,
                horasTranscurridas: horasTranscurridas,
                ultimoRegistro: registro.ultimo_registro
            };
            
        } catch (error) {
            console.error('❌ Error verificando registro:', error);
            return { 
                puede: true, 
                esNuevo: true, 
                error: error.message
            };
        }
    }
    
    // ===== ACTUALIZAR CONTROL DE REGISTRO =====
    static async actualizarControlRegistro(userId) {
        try {
            console.log(`🔄 Actualizando control para: ${userId}`);
            
            const query = `
                INSERT INTO control_registros (user_id, ultimo_registro) 
                VALUES (?, NOW()) 
                ON DUPLICATE KEY UPDATE 
                    ultimo_registro = NOW(),
                    updated_at = NOW()
            `;
            
            const result = await executeQuery(query, [userId]);
            
            if (result.success) {
                console.log('✅ Control de registro actualizado');
                return { success: true };
            } else {
                console.error('❌ Error actualizando control:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error crítico actualizando control:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== GUARDAR LOG DE ACTIVIDAD =====
    static async guardarLog(userId, accion, mensajeUsuario = null, respuestaBot = null, estadoAnterior = null, estadoNuevo = null) {
        try {
            const query = `
                INSERT INTO logs_bot (
                    user_id, accion, mensaje, respuesta, 
                    estado_anterior, estado_nuevo
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                userId,
                accion,
                mensajeUsuario ? mensajeUsuario.substring(0, 1000) : null,
                respuestaBot ? respuestaBot.substring(0, 2000) : null,
                estadoAnterior,
                estadoNuevo
            ];
            
            const result = await executeQuery(query, values);
            return result.success;
            
        } catch (error) {
            console.warn('⚠️ Error guardando log:', error.message);
            return false;
        }
    }
    
    // ===== LIMPIAR REGISTROS ANTIGUOS =====
    static async limpiarRegistrosAntiguos(diasAntiguedad = 90) {
        try {
            console.log(`🧹 Limpiando registros mayores a ${diasAntiguedad} días...`);
            
            const queries = [
                {
                    name: 'asistencias',
                    query: `DELETE FROM asistencias WHERE fecha_registro < DATE_SUB(NOW(), INTERVAL ? DAY)`
                },
                {
                    name: 'logs_bot',
                    query: `DELETE FROM logs_bot WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)`
                }
            ];
            
            let totalEliminados = 0;
            
            for (const queryInfo of queries) {
                const result = await executeQuery(queryInfo.query, [diasAntiguedad]);
                
                if (result.success) {
                    const eliminados = result.affectedRows || 0;
                    totalEliminados += eliminados;
                    console.log(`🗑️ ${queryInfo.name}: ${eliminados} registros eliminados`);
                }
            }
            
            console.log(`✅ Limpieza completada: ${totalEliminados} registros eliminados`);
            return { success: true, eliminados: totalEliminados };
            
        } catch (error) {
            console.error('❌ Error en limpieza:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AsistenciasModel;