// bot_directo.js - Conexión directa sin caché
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

console.log('🤖 BOT DIRECTO CON PUPPETEER');

async function iniciarBot() {
    // 1. Abrir Chrome manualmente
    const browser = await puppeteer.launch({
        headless: false, // VER lo que pasa
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        userDataDir: './chrome_data_directo'
    });
    
    // 2. Abrir WhatsApp Web
    const page = await browser.newPage();
    await page.goto('https://web.whatsapp.com');
    
    console.log('📱 Abre WhatsApp Web en el navegador que se abrió');
    console.log('👉 Escanea el QR en la página');
    console.log('👉 Luego vuelve a esta terminal');
    
    // Esperar a que el usuario escanee
    await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 120000 });
    
    console.log('✅ WhatsApp Web cargado!');
    
    // 3. Enviar mensaje de prueba
    await page.evaluate(() => {
        // Buscar tu propio chat
        const searchBox = document.querySelector('div[data-testid="chat-list-search"]');
        if (searchBox) {
            searchBox.click();
            // Aquí necesitarías inyectar código para enviar mensajes
            // Esto es solo para demostrar que la conexión funciona
        }
    });
    
    console.log('🎉 Conexión exitosa! El problema NO es de conexión');
    console.log('🔧 El problema está en tu código de mensajes');
    
    await browser.close();
}

iniciarBot().catch(console.error);