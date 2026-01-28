// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Inicializa el cliente con LocalAuth para guardar sesión
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }),
    puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium-browser', // Chromium de Ubuntu
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

let isReady = false;

// Mostrar QR en consola solo si no hay sesión guardada
client.on('qr', (qr) => {
    console.log('📱 ESCANEA EL QR CON TU WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

// Evento cuando el bot se autentica
client.on('authenticated', () => {
    console.log('✅ AUTENTICADO');
});

// Evento cuando el bot está listo
client.on('ready', () => {
    if (isReady) return;
    isReady = true;
    console.log('✅ BOT LISTO Y CONECTADO');
    console.log('📡 Esperando mensajes...');
});

// Evento cuando llega un mensaje
client.on('message', (message) => {
    console.log('');
    console.log('🔔 ¡MENSAJE RECIBIDO!');
    console.log('De:', message.from);
    console.log('Texto:', message.body);
    console.log('');

    // Responder al mensaje
    message.reply('✅ Funciona: ' + message.body);
});

console.log('🚀 Iniciando bot de WhatsApp...');
client.initialize();
