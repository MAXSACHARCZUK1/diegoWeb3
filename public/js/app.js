// Configuración de WhatsApp
const SUPPORT_WHATSAPP = '54 9 11 2345-6789';
const SUPPORT_MESSAGE = 'Hola, quiero consultar una operación de pago de servicio con descuento...';

// ESTADO DE LA APLICACIÓN
const state = {
    currentStep: 1,
    selectedService: null,
    selectedProvider: null,
    billFile: null,
    serverFileName: null, 
    amount: 0,
    clientName: '',
    clientEmail: '',
    paymentMethod: '',
    discount: 0,
    discountAmount: 0,
    finalAmount: 0
};

// ELEMENTOS DEL DOM
const elements = {
    app: document.getElementById('app'),
    homePage: document.getElementById('home-page'),
    paymentPage: document.getElementById('payment-page'),
    startPaymentBtn: document.getElementById('start-payment-btn'),
    consultWhatsappBtn: document.getElementById('consult-whatsapp-btn'),
    floatingWhatsapp: document.getElementById('floating-whatsapp'),
    backBtn: document.getElementById('back-btn'),
    homeBtn: document.getElementById('home-btn'),
    servicesList: document.getElementById('services-list'),
    currentService: document.getElementById('current-service'),
    currentService2: document.getElementById('current-service-2'),
    currentService3: document.getElementById('current-service-3'),
    providersList: document.getElementById('providers-list'),
    currentProvider: document.getElementById('current-provider'),
    currentProvider2: document.getElementById('current-provider-2'),
    uploadArea: document.getElementById('upload-area'),
    billInput: document.getElementById('bill-input'),
    uploadTitle: document.getElementById('upload-title'),
    amount: document.getElementById('amount'),
    clientName: document.getElementById('client-name'),
    clientEmail: document.getElementById('client-email'),
    discountSummary: document.getElementById('discount-summary'),
    summaryAmount: document.getElementById('summary-amount'),
    summaryDiscount: document.getElementById('summary-discount'),
    summaryTotal: document.getElementById('summary-total'),
    finalAmount: document.getElementById('final-amount'),
    finalDiscount: document.getElementById('final-discount'),
    finalTotal: document.getElementById('final-total'),
    whatsappPrimary: document.getElementById('whatsapp-primary'),
    whatsappSecondary: document.getElementById('whatsapp-secondary'),
    whatsappPrimaryNumber: document.getElementById('whatsapp-primary-number'),
    whatsappSecondaryNumber: document.getElementById('whatsapp-secondary-number')
};

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    renderServices();
    setupEventListeners();
});

function setupEventListeners() {
    if (elements.startPaymentBtn) elements.startPaymentBtn.addEventListener('click', () => goToPayment());
    if (elements.backBtn) elements.backBtn.addEventListener('click', () => goToHome());
    if (elements.homeBtn) elements.homeBtn.addEventListener('click', () => goToHome());
    
    if (elements.consultWhatsappBtn) elements.consultWhatsappBtn.addEventListener('click', () => openWhatsAppConsult());
    if (elements.floatingWhatsapp) elements.floatingWhatsapp.addEventListener('click', (e) => { e.preventDefault(); openWhatsAppDirect(); });
    
    document.addEventListener('click', (e) => {
        if (e.target.closest('.step-prev')) previousStep();
        if (e.target.closest('.step-next')) nextStep();
        const serviceBtn = e.target.closest('.service-item-btn');
        if (serviceBtn) selectService(parseInt(serviceBtn.dataset.serviceId));
        const providerBtn = e.target.closest('.provider-item-btn');
        if (providerBtn) selectProvider(parseInt(providerBtn.dataset.providerId));
    });
    
    if (elements.uploadArea) elements.uploadArea.addEventListener('click', () => elements.billInput.click());
    if (elements.billInput) elements.billInput.addEventListener('change', (e) => handleBillUpload(e));
    if (elements.amount) elements.amount.addEventListener('input', () => updateSummary());
    
    // --- LÓGICA DE LOS BOTONES DE FINALIZACIÓN EN 2 PASOS ---
    if (elements.whatsappPrimary) {
        elements.whatsappPrimary.innerHTML = "<strong>1️⃣ PASO 1: Unirse al Grupo</strong>";
        elements.whatsappPrimary.addEventListener('click', () => joinWhatsAppGroup());
    }
    
    if (elements.whatsappSecondary) {
        elements.whatsappSecondary.innerHTML = "<strong>2️⃣ PASO 2: Enviar Datos para Finalizar</strong>";
        elements.whatsappSecondary.addEventListener('click', () => sendDataToGroup());
    }
}

async function handleBillUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    state.billFile = file;
    if (elements.uploadTitle) elements.uploadTitle.textContent = "Analizando factura...";

    const formData = new FormData();
    formData.append('billFile', file);

    try {
        const response = await fetch('/leer-factura', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            elements.amount.value = data.monto;
            state.serverFileName = data.archivoUrl; 
            updateSummary();
            elements.uploadTitle.textContent = `${file.name} (${formatCurrency(data.monto)} detectado)`;
        }
    } catch (error) {
        elements.uploadTitle.textContent = "Error al analizar, intenta de nuevo";
    }
    document.querySelectorAll('#step-3 .step-next').forEach(btn => btn.disabled = false);
}

// --- PASO 1: UNIRSE AL GRUPO ---
function joinWhatsAppGroup() {
    const groupInviteLink = (state.discount <= 20) 
        ? "https://chat.whatsapp.com/D19vBLDAbF9Df59alVPDZj" 
        : "https://chat.whatsapp.com/ImzBMjvRkg9EwsEKHM4BvN";
    
    window.open(groupInviteLink, '_blank');
    
    alert("¡Perfecto! Una vez que te unas al grupo en WhatsApp, volvé a esta pantalla y tocá el PASO 2 para enviar tu factura.");
}

// --- PASO 2: ENVIAR DATOS AL GRUPO ---
function sendDataToGroup() {
    const s = SERVICES.find(x => x.id === state.selectedService);
    const p = s.providers.find(x => x.id === state.selectedProvider);
    const facturaLink = state.serverFileName; 

    const message = `*NUEVO PAGO REGISTRADO* 🚀
📌 *Servicio:* ${s.name} - ${p.name}
💰 *Importe:* ${formatCurrency(state.amount)}
🎁 *Descuento:* ${state.discount}%
💵 *Total a pagar:* ${formatCurrency(state.finalAmount)}
👤 *Cliente:* ${elements.clientName.value}
📄 *Factura:* ${facturaLink}`;

    // Abre WhatsApp para elegir a quién enviar el mensaje (el grupo recién unido)
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    // Copia de seguridad al portapapeles
    navigator.clipboard.writeText(message).catch(err => console.log('No se pudo copiar al portapapeles', err));

    window.open(url, '_blank');

    setTimeout(() => {
        goToStep(6);
    }, 1500);
}

function renderServices() {
    if (!elements.servicesList) return;
    elements.servicesList.innerHTML = SERVICES.map(service => `
        <button class="service-item-btn" data-service-id="${service.id}">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 1.5rem;">${service.icon}</span>
                <span>${service.name}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"/>
            </svg>
        </button>
    `).join('');
}

function selectService(serviceId) {
    state.selectedService = serviceId;
    const service = SERVICES.find(s => s.id === serviceId);
    if (elements.currentService) elements.currentService.textContent = service.name;
    if (elements.currentService2) elements.currentService2.textContent = service.name;
    if (elements.currentService3) elements.currentService3.textContent = service.name;
    renderProviders(serviceId);
    goToStep(2);
}

function renderProviders(serviceId) {
    if (!elements.providersList) return;
    const service = SERVICES.find(s => s.id === serviceId);
    elements.providersList.innerHTML = service.providers.map(provider => `
        <button class="provider-item-btn" data-provider-id="${provider.id}">
            <span>${provider.name}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"/>
            </svg>
        </button>
    `).join('');
    document.querySelectorAll('#step-2 .step-next').forEach(btn => btn.disabled = true);
}

function selectProvider(providerId) {
    state.selectedProvider = providerId;
    const service = SERVICES.find(s => s.id === state.selectedService);
    const provider = service.providers.find(p => p.id === providerId);
    if (elements.currentProvider) elements.currentProvider.textContent = provider.name;
    if (elements.currentProvider2) elements.currentProvider2.textContent = provider.name;
    document.querySelectorAll('#step-2 .step-next').forEach(btn => btn.disabled = false);
}

function updateSummary() {
    state.amount = parseFloat(elements.amount.value) || 0;
    // Usamos la función de cálculo de descuento (asegurate que esté definida en tu constants.js)
    state.discount = calculateDiscount(state.amount); 
    state.discountAmount = state.amount * (state.discount / 100);
    state.finalAmount = state.amount - state.discountAmount;
    
    if (state.amount > 0) {
        if (elements.discountSummary) elements.discountSummary.style.display = 'block';
        if (elements.summaryAmount) elements.summaryAmount.textContent = formatCurrency(state.amount);
        if (elements.summaryDiscount) elements.summaryDiscount.textContent = `-${formatCurrency(state.discountAmount)}`;
        if (elements.summaryTotal) elements.summaryTotal.textContent = formatCurrency(state.finalAmount);
        document.querySelectorAll('#step-4 .step-next').forEach(btn => btn.disabled = false);
    } else {
        if (elements.discountSummary) elements.discountSummary.style.display = 'none';
        document.querySelectorAll('#step-4 .step-next').forEach(btn => btn.disabled = true);
    }
    
    if (elements.finalAmount) elements.finalAmount.textContent = formatCurrency(state.amount);
    if (elements.finalDiscount) elements.finalDiscount.textContent = `-${formatCurrency(state.discountAmount)}`;
    if (elements.finalTotal) elements.finalTotal.textContent = formatCurrency(state.finalAmount);
}

function goToStep(step) {
    state.currentStep = step;
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const stepEl = step === 6 ? document.getElementById('step-confirmation') : document.getElementById(`step-${step}`);
    if (stepEl) stepEl.classList.add('active');
    window.scrollTo(0, 0);
}

function nextStep() { if (state.currentStep < 5) goToStep(state.currentStep + 1); }
function previousStep() { if (state.currentStep > 1) goToStep(state.currentStep - 1); }
function goToPayment() { elements.homePage.classList.remove('active'); elements.paymentPage.classList.add('active'); goToStep(1); }
function goToHome() { elements.paymentPage.classList.remove('active'); elements.homePage.classList.add('active'); resetForm(); }

function resetForm() {
    state.currentStep = 1;
    state.selectedService = state.selectedProvider = state.billFile = state.serverFileName = null;
    state.amount = 0;
    if (elements.amount) elements.amount.value = '';
    if (elements.clientName) elements.clientName.value = '';
    if (elements.clientEmail) elements.clientEmail.value = '';
    if (elements.billInput) elements.billInput.value = '';
    if (elements.uploadTitle) elements.uploadTitle.textContent = 'Seleccionar archivo';
    if (elements.discountSummary) elements.discountSummary.style.display = 'none';
}

function openWhatsAppConsult() { window.open(`https://wa.me/${cleanPhoneNumber(SUPPORT_WHATSAPP)}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`, '_blank'); }
function openWhatsAppDirect() { window.open(`https://wa.me/${cleanPhoneNumber(SUPPORT_WHATSAPP)}`, '_blank'); }

function cleanPhoneNumber(phone) { return phone ? phone.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '') : ''; }
function formatCurrency(value) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value); }