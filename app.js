require('dotenv').config();

const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 
app.use(express.static('public')); 

// 1. Configuración de Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET 
});

// 2. Configuración de Multer / Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'facturas_pagos',
        allowed_formats: ['jpg', 'png', 'pdf'],
    },
});

const upload = multer({ storage: storage });

// 3. RUTA: Analizar factura (OCR)
app.post('/leer-factura', upload.single('billFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false });

        const imageUrl = req.file.path;
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'spa');
        
        const regexMonto = /\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:\.\d{2})/g;
        const coincidencias = text.match(regexMonto) || [];

        const valores = coincidencias.map(m => {
            let limpio = m.replace(/\./g, '').replace(',', '.');
            return parseFloat(limpio);
        });

        const totalDetectado = valores.length > 0 ? Math.max(...valores) : 0;

        res.json({ 
            success: true, 
            monto: totalDetectado,
            archivoUrl: imageUrl 
        });
    } catch (error) {
        console.error("--- ERROR OCR ---", error.message);
        res.status(500).json({ success: false, detalle: error.message });
    }
});

// 4. RUTA: Enviar Email vía Google Bridge (Bypass de Render)
app.post('/enviar-email', async (req, res) => {
    console.log("➡️ 1. Intentando enviar email. Datos recibidos:", req.body);
    const { servicio, proveedor, monto, descuento, total, cliente, facturaUrl } = req.body;

    const destinatario = descuento <= 20 ? process.env.EMAIL_SOCIO_20 : process.env.EMAIL_SOCIO_60;
    console.log("📨 2. Destinatario:", destinatario);

    const htmlMsg = `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #28a745;">Nuevo Pago Registrado 🚀</h2>
            <hr>
            <p><b>👤 Cliente:</b> ${cliente}</p>
            <p><b>⚡ Servicio:</b> ${servicio} (${proveedor})</p>
            <p><b>💰 Importe Original:</b> $${monto}</p>
            <p><b>🎁 Descuento Aplicado:</b> ${descuento}%</p>
            <p><b>💵 Total a Cobrar:</b> $${total}</p>
            <hr><br>
            <a href="${facturaUrl}" style="background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">VER FACTURA ADJUNTA</a>
            <p style="font-size: 0.8rem; color: #777; margin-top: 20px;">Este es un mensaje automático del sistema de gestión de Pro_DigitalWeb.</p>
        </div>
    `;

    try {
        console.log("🚀 3. Conectando con Google Bridge...");
        
        const response = await fetch('https://script.google.com/macros/s/AKfycbz5RA028K7_E-_XxJKIl8iuO8Mzhn3mjh2qDR_aib57f5_tIYSc7LF0tU8EgG69HbU_/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Google Apps Script prefiere este formato para evitar bloqueos CORS
            },
            body: JSON.stringify({
                to: destinatario,
                subject: `Nuevo Pago Registrado - ${cliente}`,
                body: htmlMsg
            }),
            redirect: 'follow'
        });

        console.log("✅ 4. Status de respuesta:", response.status);
        
        const textResponse = await response.text();
        console.log("📝 5. Cuerpo de respuesta:", textResponse);

        const data = JSON.parse(textResponse);
        
        if (data.success) {
            console.log("🎉 6. ¡Email enviado con éxito!");
            res.json({ success: true });
        } else {
            console.error("❌ Error en el script de Google:", data.error);
            res.status(500).json({ success: false, error: data.error });
        }
    } catch (error) {
        console.error("💥 Error fatal en el proceso de envío:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});