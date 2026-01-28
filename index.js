// index.js - BOT WhatsApp actualizado
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let isReady = false;

// Función para inicializar el bot
function startBot() {
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: "bot" }),
        puppeteer: {
            headless: true, // Siempre true en servidores Linux
            executablePath: '/usr/bin/chromium-browser', // Chromium en Ubuntu
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    // QR Code
    client.on('qr', (qr) => {
        console.log('📱 ESCANEA EL QR CON TU WHATSAPP:');
        qrcode.generate(qr, { small: true });
    });

    // Autenticado
    client.on('authenticated', () => {
        console.log('✅ AUTENTICADO');
    });

    // Ready
    client.on('ready', () => {
        if (isReady) return;
        isReady = true;
        console.log('✅ BOT LISTO Y CONECTADO');
        console.log('📡 Esperando mensajes...');
    });

    // Mensajes
    client.on('message', async (message) => {
        console.log('');
        console.log('🔔 ¡MENSAJE RECIBIDO!');
        console.log('De:', message.from);
        console.log('Texto:', message.body);
        console.log('');

        try {
            await message.reply('✅ Funciona: ' + message.body);
        } catch (err) {
            console.error('❌ Error al responder:', err.message);
        }
    });

    // Desconexiones
    client.on('disconnected', (reason) => {
        console.log('⚠️ Bot desconectado:', reason);
        console.log('♻️ Intentando reconectar en 5 segundos...');
        setTimeout(() => {
            isReady = false;
            startBot(); // Reconectar automáticamente
        }, 5000);
    });

    // Manejo de errores globales
    client.on('auth_failure', (msg) => {
        console.log('❌ Error de autenticación:', msg);
        console.log('♻️ Eliminando sesión y reiniciando bot...');
        const fs = require('fs');
        const sessionPath = './.wwebjs_auth/bot/';
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        setTimeout(() => startBot(), 3000);
    });

    // Inicializar cliente
    console.log('🚀 Iniciando bot de WhatsApp...');
    client.initialize();
}

// Arrancar bot por primera vez
startBot();
