// Datos de servicios y proveedores
const SERVICES = [
    { id: 1, name: 'Luz', icon: '💡', providers: [
        { id: 101, name: 'Edesur' },
        { id: 102, name: 'Edenor' }
    ]},
    { id: 2, name: 'Agua', icon: '💧', providers: [
        { id: 201, name: 'AySA' }
    ]},
    { id: 3, name: 'Gas', icon: '🔥', providers: [
        { id: 301, name: 'Metrogas' },
        { id: 302, name: 'Naturgy' }
    ]},
    { id: 4, name: 'Internet', icon: '📡', providers: [
        { id: 401, name: 'Claro' },
        { id: 402, name: 'Movistar' },
        { id: 403, name: 'Personal' }
    ]},
    { id: 5, name: 'Celular', icon: '📱', providers: [
        { id: 501, name: 'Claro' },
        { id: 502, name: 'Movistar' },
        { id: 503, name: 'Personal' }
    ]},
    { id: 6, name: 'Otros', icon: '⋯', providers: [
        { id: 601, name: 'Patentes' },
        { id: 602, name: 'Multas' },
        { id: 603, name: 'Prepagas' },
        { id: 604, name: 'Monotributo' },
        { id: 605, name: 'Ingresos Brutos' },
        { id: 606, name: 'IVA' },
        { id: 607, name: 'Telecoms' },
        { id: 608, name: 'Mostaza' },
        { id: 609, name: 'Tarjeta Cencosud' }
    ]}
];

// Números de WhatsApp por descuento (Actualizado según solicitud del usuario)
const WHATSAPP_NUMBERS = {
    20: {
        primary: '+5491171079973',//1171079973
        secondary: '+54 9 11 3887-7153'//11 4936-6362
    },
    60: {
        primary: '+5491136725386',//1171079973
        secondary: '+54 9 11 3672-5386'//11 3341-5546
    }
};

// Función para calcular descuento
function calculateDiscount(amount) {
    if (amount < 200000) {
        return 20;
    } else {
        return 60;
    }
}

// Función para obtener números de WhatsApp
function getWhatsAppNumbers(discountPercentage) {
    return WHATSAPP_NUMBERS[discountPercentage] || WHATSAPP_NUMBERS[20];
}

// Función para formatear moneda
function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Función para limpiar número de teléfono
function cleanPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');
}

// Función para crear enlace de WhatsApp
function createWhatsAppLink(phoneNumber, message) {
    const cleanPhone = cleanPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
