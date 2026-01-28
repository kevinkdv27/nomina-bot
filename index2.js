// bot_ultra_simple.js - Sin LocalAuth, sin caché, solo conexión directa
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

console.log('🚀 INICIANDO BOT ULTRA SIMPLE\n');

// ELIMINAR ABSOLUTAMENTE TODO
console.log('🧹 Eliminando toda la caché...');
const dirs = ['.wwebjs_auth', '.wwebjs_cache', 'chromium-data'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✅ ${dir} eliminado`);
        } catch (e) {
            console.log(`⚠️ No se pudo eliminar ${dir}`);
        }
    }
});

// CONFIGURACIÓN MÍNIMA - SIN LOCAL AUTH
const client = new Client({
    // NO USAR LocalAuth - sesión temporal
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--single-process',
            '--disable-dev-shm-usage'
        ],
        // Forzar nuevo perfil
        userDataDir: path.join(__dirname, 'temp_chrome_profile_' + Date.now())
    }
});

// EVENTOS BÁSICOS
let sessionSaved = false;

client.on('qr', (qr) => {
    console.log('\n═══════════════════════════════════════════');
    console.log('📱 ESCANEA ESTE QR INMEDIATAMENTE');
    console.log('═══════════════════════════════════════════');
    qrcode.generate(qr, { small: true });
    console.log('═══════════════════════════════════════════\n');
});

client.on('authenticated', (session) => {
    console.log('✅ Autenticado - Guardando sesión...');
    // Guardar sesión manualmente
    fs.writeFileSync(
        path.join(__dirname, 'whatsapp_session.json'),
        JSON.stringify(session, null, 2)
    );
    sessionSaved = true;
    console.log('💾 Sesión guardada en whatsapp_session.json');
});

client.on('ready', () => {
    console.log('\n🎯 ¡BOT CONECTADO!');
    console.log('⏰', new Date().toLocaleString('es-MX'));
    
    // Cargar tu lógica aquí
    console.log('⚙️ Cargando sistema de asistencias...');
    loadYourBotLogic();
});

function loadYourBotLogic() {
    try {
        // Cargar tu código original
        const { testConnection } = require('./config/database');
        const AsistenciasModel = require('./models/asistencias');
        
        console.log('✅ Sistema de asistencias cargado');
        
        // Configurar manejador de mensajes
        client.on('message', async (message) => {
            console.log(`📱 ${message.from}: ${message.body}`);
            
            if (message.body.toLowerCase() === 'inicio') {
                await message.reply('🏢 *Bienvenido al sistema de asistencias Confort Valet*');
            }
        });
        
    } catch (error) {
        console.error('❌ Error cargando lógica:', error.message);
        // Continuar con funcionalidad básica
        client.on('message', async (msg) => {
            if (msg.body.toLowerCase() === 'inicio') {
                await msg.reply('✅ Bot funcionando - Sistema básico');
            }
        });
    }
}

// INICIALIZAR
console.log('⏳ Conectando a WhatsApp...');
client.initialize();

// TIMEOUT DE SEGURIDAD
setTimeout(() => {
    console.log('⏰ Timeout - Forzando reconexión...');
    client.destroy().then(() => {
        setTimeout(() => client.initialize(), 2000);
    });
}, 30000);