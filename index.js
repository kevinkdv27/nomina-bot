// index.js - BOT WhatsApp para AWS Ubuntu
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let isReady = false;

// Inicializa el cliente
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }),
  puppeteer: {
    headless: true,  // <-- aquí
    executablePath: '/usr/bin/chromium-browser',
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

// Evento QR
client.on('qr', (qr) => {
    console.log('📱 ESCANEA EL QR CON TU WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

// Evento autenticado
client.on('authenticated', () => {
    console.log('✅ AUTENTICADO');
});

// Evento ready
client.on('ready', () => {
    if (isReady) return;
    isReady = true;
    console.log('✅ BOT LISTO Y CONECTADO');
    console.log('📡 Esperando mensajes...');
});

// Evento mensajes
client.on('message', async (message) => {
    console.log('');
    console.log('🔔 ¡MENSAJE RECIBIDO!');
    console.log('De:', message.from);
    console.log('Texto:', message.body);
    console.log('');

    // Responder al mensaje
    try {
        await message.reply('✅ Funciona: ' + message.body);
    } catch (err) {
        console.error('❌ Error al responder:', err.message);
    }
});

// Manejo de errores globales de Puppeteer
client.on('disconnected', (reason) => {
    console.log('⚠️ Bot desconectado:', reason);
});

// Inicializar
console.log('🚀 Iniciando bot de WhatsApp...');
client.initialize();
