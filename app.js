require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const app = express();
const port = 3000;

//1.
// Configuración de Cloudinary usando Variables de Entorno
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

app.use(cors());
app.use(express.static('public')); 

// 2. Configuramos Multer para subir directamente a la nube
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'facturas_pagos',
    allowed_formats: ['jpg', 'png', 'pdf'],
  },
});

const upload = multer({ storage: storage });

// 3. Ruta para analizar la factura
app.post('/leer-factura', upload.single('billFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false });

        const imageUrl = req.file.path;

        // Tesseract analiza la imagen desde la URL de la nube
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'spa');
        
        // --- MEJORA DE DETECCIÓN ---
        // Esta regex busca específicamente números con formato de moneda (ej: 1.336,43 o 1336.43)
        // Ignora números enteros largos que no tienen separadores de decimales (como el medidor 765)
        const regexMonto = /\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:\.\d{2})/g;
        const coincidencias = text.match(regexMonto) || [];

        const valores = coincidencias.map(m => {
            // Limpiamos el formato: quitamos puntos de miles y pasamos la coma a punto para JS
            let limpio = m.replace(/\./g, '').replace(',', '.');
            return parseFloat(limpio);
        });

        // Seleccionamos el valor más alto de los que parecen ser montos de dinero
        const totalDetectado = valores.length > 0 ? Math.max(...valores) : 0;

        res.json({ 
            success: true, 
            monto: totalDetectado,
            archivoUrl: imageUrl 
        });
    } catch (error) {
       // console.error("Error en el servidor:", error);
        //res.status(500).json({ success: false });
        // MEJORA PARA VER EL ERROR REAL EN RENDER
        console.error("--- INICIO DE ERROR DETALLADO ---");
        console.error("Mensaje:", error.message);
        console.error("Stack:", error.stack);
        if (error.http_code) console.error("Cloudinary Code:", error.http_code);
        console.error("Objeto completo:", JSON.stringify(error, null, 2));
        console.error("--- FIN DE ERROR DETALLADO ---");
        
        res.status(500).json({ success: false, detalle: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});