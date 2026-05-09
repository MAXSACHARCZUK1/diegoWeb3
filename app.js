require('dotenv').config();

// --- SOLUCIÓN AL ERROR IPv6 EN RENDER ---
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
// ----------------------------------------

const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const port = process.env.PORT || 3000;

// Middleware esenciales
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

// 4. RUTA: Enviar Email (Nueva sección integrada)
app.post('/enviar-email', async (req, res) => {
    const { servicio, proveedor, monto, descuento, total, cliente, facturaUrl } = req.body;

    // Lógica de ruteo de emails: si el descuento es <= 20 va a un socio, si es mayor va al otro.
    const destinatario = descuento <= 20 ? process.env.EMAIL_SOCIO_20 : process.env.EMAIL_SOCIO_60;

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_REMITENTE, 
            pass: process.env.EMAIL_PASSWORD 
        }
    });

    const mailOptions = {
        from: `"Pro_DigitalWeb Pagos" <${process.env.EMAIL_REMITENTE}>`,
        to: destinatario,
        subject: `Nuevo Pago Registrado - ${cliente}`,
        html: `
            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #28a745;">Nuevo Pago Registrado 🚀</h2>
                <p>Se ha recibido una nueva solicitud de pago con los siguientes detalles:</p>
                <hr>
                <p><b>👤 Cliente:</b> ${cliente}</p>
                <p><b>⚡ Servicio:</b> ${servicio} (${proveedor})</p>
                <p><b>💰 Importe Original:</b> $${monto}</p>
                <p><b>🎁 Descuento Aplicado:</b> ${descuento}%</p>
                <p><b>💵 Total a Cobrar:</b> $${total}</p>
                <hr>
                <br>
                <a href="${facturaUrl}" style="background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">VER FACTURA ADJUNTA</a>
                <p style="font-size: 0.8rem; color: #777; margin-top: 20px;">Este es un mensaje automático del sistema de gestión de Pro_DigitalWeb.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email enviado con éxito a: ${destinatario}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al enviar email:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});