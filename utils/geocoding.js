// utils/geocoding.js
// Servicio para obtener direcciones completas usando geocodificación inversa

const axios = require('axios');

/**
 * Obtiene la dirección completa usando Google Maps Geocoding API
 * Necesitas una API Key de Google Maps Platform
 */
async function obtenerDireccionGoogle(latitud, longitud) {
    try {
        const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!GOOGLE_API_KEY) {
            console.warn('⚠️ Google Maps API Key no configurada');
            return null;
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitud},${longitud}&key=${GOOGLE_API_KEY}&language=es&region=mx`;
        
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const resultado = response.data.results[0];
            return {
                direccion_completa: resultado.formatted_address,
                componentes: resultado.address_components,
                lugar_id: resultado.place_id,
                tipo: 'google'
            };
        }
        
        console.warn('⚠️ Google Geocoding no encontró resultados');
        return null;
        
    } catch (error) {
        console.error('❌ Error con Google Geocoding:', error.message);
        return null;
    }
}

/**
 * Obtiene la dirección usando Nominatim (OpenStreetMap) - Gratis
 * No requiere API Key pero tiene límites de uso
 */
async function obtenerDireccionNominatim(latitud, longitud) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}&addressdetails=1&accept-language=es&countrycodes=mx`;
        
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'ConfortValet-Bot/1.0 (asistencias@confortvalet.com)'
            }
        });
        
        if (response.data && response.data.display_name) {
            return {
                direccion_completa: response.data.display_name,
                componentes: response.data.address,
                lugar_id: response.data.place_id,
                tipo: 'nominatim'
            };
        }
        
        console.warn('⚠️ Nominatim no encontró resultados');
        return null;
        
    } catch (error) {
        console.error('❌ Error con Nominatim:', error.message);
        return null;
    }
}

/**
 * Obtiene la dirección usando MapBox Geocoding API
 * Requiere API Key de MapBox (tiene plan gratuito generoso)
 */
async function obtenerDireccionMapBox(latitud, longitud) {
    try {
        const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;
        
        if (!MAPBOX_API_KEY) {
            console.warn('⚠️ MapBox API Key no configurada');
            return null;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitud},${latitud}.json?access_token=${MAPBOX_API_KEY}&language=es&country=mx`;
        
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data.features && response.data.features.length > 0) {
            const resultado = response.data.features[0];
            return {
                direccion_completa: resultado.place_name,
                componentes: resultado.context,
                lugar_id: resultado.id,
                tipo: 'mapbox'
            };
        }
        
        console.warn('⚠️ MapBox no encontró resultados');
        return null;
        
    } catch (error) {
        console.error('❌ Error con MapBox:', error.message);
        return null;
    }
}

/**
 * Función principal que intenta obtener la dirección usando múltiples servicios
 * Prioridad: Google > MapBox > Nominatim
 */
async function obtenerDireccionCompleta(latitud, longitud) {
    console.log(`🔍 Obteniendo dirección para coordenadas: ${latitud}, ${longitud}`);
    
    // Validar coordenadas
    if (!latitud || !longitud || isNaN(latitud) || isNaN(longitud)) {
        console.error('❌ Coordenadas inválidas');
        return null;
    }
    
    // Validar que las coordenadas estén en México (aproximadamente)
    if (latitud < 14 || latitud > 33 || longitud < -118 || longitud > -86) {
        console.warn('⚠️ Coordenadas fuera del rango de México');
    }

    let resultado = null;
    
    // Intentar con Google Maps primero (más preciso)
    try {
        resultado = await obtenerDireccionGoogle(latitud, longitud);
        if (resultado) {
            console.log('✅ Dirección obtenida con Google Maps');
            return resultado;
        }
    } catch (error) {
        console.warn('⚠️ Google Maps falló, intentando con siguiente servicio');
    }
    
    // Intentar con MapBox (buen balance entre precisión y límites)
    try {
        resultado = await obtenerDireccionMapBox(latitud, longitud);
        if (resultado) {
            console.log('✅ Dirección obtenida con MapBox');
            return resultado;
        }
    } catch (error) {
        console.warn('⚠️ MapBox falló, intentando con siguiente servicio');
    }
    
    // Intentar con Nominatim (gratis pero con límites)
    try {
        resultado = await obtenerDireccionNominatim(latitud, longitud);
        if (resultado) {
            console.log('✅ Dirección obtenida con Nominatim');
            return resultado;
        }
    } catch (error) {
        console.warn('⚠️ Nominatim falló');
    }
    
    // Si todo falla, crear una dirección básica con las coordenadas
    console.warn('⚠️ Todos los servicios de geocodificación fallaron');
    return {
        direccion_completa: `Coordenadas: ${latitud}, ${longitud}`,
        componentes: null,
        lugar_id: null,
        tipo: 'coordenadas'
    };
}

/**
 * Función para limpiar y formatear la dirección
 */
function limpiarDireccion(direccion) {
    if (!direccion) return null;
    
    return direccion
        .replace(/^\d+\s*,?\s*/, '') // Remover números iniciales
        .replace(/,\s*México$/, '') // Remover "México" al final
        .replace(/,\s*Mexico$/, '') // Remover "Mexico" al final
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
}

/**
 * Función para obtener dirección con retry automático
 */
async function obtenerDireccionConReintento(latitud, longitud, maxIntentos = 3) {
    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            console.log(`🔄 Intento ${intento} de ${maxIntentos} para obtener dirección`);
            
            const resultado = await obtenerDireccionCompleta(latitud, longitud);
            
            if (resultado && resultado.direccion_completa) {
                resultado.direccion_completa = limpiarDireccion(resultado.direccion_completa);
                console.log(`✅ Dirección obtenida en intento ${intento}: ${resultado.direccion_completa}`);
                return resultado;
            }
            
            if (intento < maxIntentos) {
                console.log(`⏳ Reintentando en 2 segundos...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`❌ Error en intento ${intento}:`, error.message);
            
            if (intento < maxIntentos) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    console.error('❌ No se pudo obtener la dirección después de todos los intentos');
    return {
        direccion_completa: `Ubicación: ${latitud}, ${longitud}`,
        componentes: null,
        lugar_id: null,
        tipo: 'fallback'
    };
}

module.exports = {
    obtenerDireccionCompleta,
    obtenerDireccionConReintento,
    obtenerDireccionGoogle,
    obtenerDireccionMapBox,
    obtenerDireccionNominatim,
    limpiarDireccion
};