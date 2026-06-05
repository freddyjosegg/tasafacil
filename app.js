let currentRate = 0;
let transactions = [];
let lastCalculatedAmount = 0; 
let referenceCurrency = 'USD';
let currentRateType = 'USD_oficial';

const RATE_ENDPOINTS = {
    'USD_oficial': 'https://ve.dolarapi.com/v1/dolares/oficial',
    'USD_paralelo': 'https://ve.dolarapi.com/v1/dolares/paralelo',
    'EUR_oficial': 'https://ve.dolarapi.com/v1/euros/oficial',
    'EUR_paralelo': 'https://ve.dolarapi.com/v1/euros/paralelo'
};

// --- LÓGICA DE TEMA (CLARO / OSCURO / PREMIUM) ---
function toggleTheme() {
    let currentTheme = localStorage.getItem('tasafacil_theme') || 'auto';
    let nextTheme = 'light';
    
    if (currentTheme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        nextTheme = prefersDark ? 'light' : 'dark';
    } else if (currentTheme === 'light') {
        nextTheme = 'dark';
    } else if (currentTheme === 'dark') {
        nextTheme = 'premium';
    } else if (currentTheme === 'premium') {
        nextTheme = 'light';
    }
    
    setTheme(nextTheme);
}

function setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-premium');
    
    if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else if (theme === 'dark') {
        document.body.classList.add('theme-dark');
    } else if (theme === 'premium') {
        document.body.classList.add('theme-premium');
    }
    
    localStorage.setItem('tasafacil_theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    
    let icon = '☀️';
    let title = 'Cambiar a modo oscuro';
    
    if (theme === 'light') {
        icon = '☀️';
        title = 'Cambiar a modo oscuro (🌙)';
    } else if (theme === 'dark') {
        icon = '🌙';
        title = 'Cambiar a modo premium (👑)';
    } else if (theme === 'premium') {
        icon = '👑';
        title = 'Cambiar a modo claro (☀️)';
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        icon = prefersDark ? '🌙' : '☀️';
        title = 'Cambiar tema';
    }
    
    btn.innerText = icon;
    btn.title = title;
}

// Cargar preferencia de tema al iniciar
const savedTheme = localStorage.getItem('tasafacil_theme');
if (savedTheme) {
    setTheme(savedTheme);
} else {
    updateThemeIcon('auto');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('tasafacil_theme')) {
            updateThemeIcon('auto');
        }
    });
}

// --- FUNCIONES UTILITARIAS ---
const formatVE = (num) => {
    return new Intl.NumberFormat('es-VE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num);
};

const parseAmount = (val) => {
    if (!val) return 0;
    let str = val.toString().trim();
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(str) || 0;
};

// --- LÓGICA PRINCIPAL ---
function updateCurrencyUI() {
    const symbol = referenceCurrency === 'EUR' ? '€' : '$';
    
    document.getElementById('ref-currency-label').innerText = referenceCurrency;
    document.getElementById('budget-currency-code').innerText = referenceCurrency;
    
    const quickOptRef = document.getElementById('quick-opt-ref');
    const quickOptVes = document.getElementById('quick-opt-ves');
    const currencyOptRef = document.getElementById('currency-opt-ref');
    
    if (quickOptRef) {
        quickOptRef.value = referenceCurrency;
        quickOptRef.innerText = referenceCurrency === 'EUR' ? 'De Euros (EUR) a Bolívares (Bs)' : 'De Dólares (USD) a Bolívares (Bs)';
    }
    if (quickOptVes) {
        quickOptVes.innerText = referenceCurrency === 'EUR' ? 'De Bolívares (Bs) a Euros (EUR)' : 'De Bolívares (Bs) a Dólares (USD)';
    }
    if (currencyOptRef) {
        currencyOptRef.value = referenceCurrency;
        currencyOptRef.innerText = `${referenceCurrency} (${symbol})`;
    }
}

function loadSavedData() {
    const savedBudget = localStorage.getItem('tasafacil_budget');
    const savedTransactions = localStorage.getItem('tasafacil_transactions');
    
    if (savedBudget) document.getElementById('budget').value = savedBudget;
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        // Compatibilidad con transacciones antiguas
        transactions.forEach(t => {
            if (t.amountInUSD !== undefined && t.amountInRef === undefined) {
                t.amountInRef = t.amountInUSD;
            }
        });
        renderTransactions();
    }
}

function saveDataAndRecalculate() {
    const currentBudget = document.getElementById('budget').value;
    localStorage.setItem('tasafacil_budget', currentBudget);
    localStorage.setItem('tasafacil_transactions', JSON.stringify(transactions));
    
    updateBalance();
    renderTransactions();
}

async function fetchReferenceRate(rateType) {
    currentRateType = rateType;
    localStorage.setItem('tasafacil_rate_type', rateType);
    
    referenceCurrency = rateType.startsWith('EUR') ? 'EUR' : 'USD';
    updateCurrencyUI();
    
    const endpoint = RATE_ENDPOINTS[rateType] || RATE_ENDPOINTS['USD_oficial'];
    
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Error en la red');
        const data = await response.json();
        
        currentRate = data.promedio; 
        document.getElementById('bcv-rate').innerText = formatVE(currentRate);
        
        const updateDate = new Date(data.fechaActualizacion);
        document.getElementById('last-update').innerText = `Actualizado: ${updateDate.toLocaleDateString()} ${updateDate.toLocaleTimeString()}`;
        
        // Recalcular el equivalente en referencia para todas las transacciones en VES
        transactions.forEach(t => {
            t.amountInRef = t.currency === 'VES' ? (t.originalAmount / currentRate) : t.originalAmount;
        });
        
        calculateQuick();
        updateBalance(); 
        renderTransactions();

    } catch (error) {
        document.getElementById('bcv-rate').innerText = "Error";
        document.getElementById('last-update').innerText = "Revisa tu conexión a internet";
    }
}

function calculateQuick() {
    if (currentRate === 0) return; 
    const amountInput = document.getElementById('quick-amount').value;
    const amount = parseAmount(amountInput);
    const currency = document.getElementById('quick-currency').value;
    const resultElement = document.getElementById('quick-result');
    const copyBtn = document.getElementById('copy-btn');
    const symbol = referenceCurrency === 'EUR' ? '€' : '$';

    if (currency === referenceCurrency) {
        lastCalculatedAmount = amount * currentRate;
        resultElement.innerText = `Equivale a: Bs ${formatVE(lastCalculatedAmount)}`;
    } else {
        lastCalculatedAmount = amount / currentRate;
        resultElement.innerText = `Equivale a: ${symbol}${formatVE(lastCalculatedAmount)}`;
    }

    copyBtn.style.display = amount > 0 ? 'inline-block' : 'none';
    copyBtn.innerText = '📋'; 
}

function copyToClipboard() {
    const textToCopy = lastCalculatedAmount.toFixed(2).replace('.', ',');
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.innerText = '✅'; 
        setTimeout(() => { btn.innerText = '📋'; }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
        alert("Tu navegador no soporta la función de copiar automática.");
    });
}

function addTransaction() {
    const amountInput = document.getElementById('amount');
    const amount = parseAmount(amountInput.value);
    const currency = document.getElementById('currency').value;
    const type = document.getElementById('type').value;

    if (isNaN(amount) || amount <= 0) return alert("Ingresa un monto válido.");
    if (currentRate === 0) return alert("Esperando la tasa de cambio de internet...");

    let amountInRef = currency === 'VES' ? (amount / currentRate) : amount;
    
    transactions.push({
        date: new Date().toLocaleString(),
        originalAmount: amount,
        currency: currency,
        type: type,
        amountInRef: amountInRef
    });

    amountInput.value = ''; 
    saveDataAndRecalculate();
}

// --- CONFIGURACIÓN DE EVENT LISTENERS ---
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('quick-amount').addEventListener('input', calculateQuick);
document.getElementById('quick-currency').addEventListener('change', calculateQuick);
document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
document.getElementById('budget').addEventListener('input', saveDataAndRecalculate);
document.getElementById('add-btn').addEventListener('click', addTransaction);
document.getElementById('clear-btn').addEventListener('click', clearData);
document.getElementById('export-btn').addEventListener('click', exportToCSV);

function updateBalance() {
    if (currentRate === 0) return;

    let initialBudget = parseAmount(document.getElementById('budget').value);
    let currentBalanceRef = initialBudget;

    transactions.forEach(t => {
        currentBalanceRef += t.type === 'expense' ? -t.amountInRef : t.amountInRef;
    });

    // Actualizar textos de saldo
    const symbol = referenceCurrency === 'EUR' ? '€' : '$';
    document.getElementById('remaining-usd').innerText = `${symbol}${formatVE(currentBalanceRef)}`;
    document.getElementById('remaining-ves').innerText = `Bs ${formatVE(currentBalanceRef * currentRate)}`;
    
    // --- LÓGICA DE BARRA DE PROGRESO ---
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressLabel = document.getElementById('progress-label');

    if (initialBudget > 0) {
        let spent = initialBudget - currentBalanceUSD;
        let percentage = (spent / initialBudget) * 100;
        // Asegurar que el porcentaje esté entre 0 y 100 para la barra visual
        let visualPercentage = Math.max(0, Math.min(100, percentage));
        
        progressContainer.style.display = 'block';
        progressLabel.style.display = 'block';
        progressBar.style.width = `${visualPercentage}%`;
        progressLabel.innerText = `${percentage.toFixed(0)}% Gastado`;

        // Cambiar color según el porcentaje
        progressBar.className = 'progress-bar'; // Resetear clases
        if (percentage < 50) {
            progressBar.classList.add('pb-green');
        } else if (percentage < 85) {
            progressBar.classList.add('pb-yellow');
        } else {
            progressBar.classList.add('pb-red');
        }
    } else {
        progressContainer.style.display = 'none';
        progressLabel.style.display = 'none';
    }

    // Mostrar/ocultar botones inferiores
    const showButtons = (initialBudget > 0 || transactions.length > 0) ? 'block' : 'none';
    document.getElementById('clear-btn').style.display = showButtons;
    document.getElementById('export-btn').style.display = (transactions.length > 0 || initialBudget > 0) ? 'block' : 'none';
}

function renderTransactions() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    transactions.forEach((t, index) => {
        const li = document.createElement('li');
        const sign = t.type === 'expense' ? '-' : '+';
        const colorClass = t.type === 'expense' ? 'text-red' : 'text-green';
        const typeLabel = t.type === 'expense' ? 'Gasto' : 'Ingreso';
        
        li.innerHTML = `
            <span>#${index + 1} (${typeLabel})</span>
            <span class="${colorClass}">${sign} ${formatVE(t.originalAmount)} ${t.currency}</span>
        `;
        list.appendChild(li);
    });
}

function clearData() {
    if(confirm("¿Estás seguro de que quieres borrar el presupuesto y todos los movimientos?")) {
        localStorage.removeItem('tasafacil_budget');
        localStorage.removeItem('tasafacil_transactions');
        document.getElementById('budget').value = '';
        transactions = [];
        saveDataAndRecalculate();
    }
}

function exportToCSV() {
    let initialBudget = parseAmount(document.getElementById('budget').value);
    if (transactions.length === 0 && initialBudget === 0) return alert("No hay datos para exportar.");

    let csvContent = "\uFEFF"; 
    csvContent += `Fecha;Tipo de Movimiento;Moneda Original;Monto Original;Equivalente en ${referenceCurrency}\n`;

    if (initialBudget > 0) {
        const formattedBudget = initialBudget.toFixed(2).replace('.', ',');
        const exportDate = new Date().toLocaleString(); 
        csvContent += `${exportDate};Presupuesto Inicial Base;${referenceCurrency};${formattedBudget};${formattedBudget}\n`;
    }

    transactions.forEach(t => {
        const typeLabel = t.type === 'expense' ? 'Gasto' : 'Ingreso';
        const formattedOriginal = t.originalAmount.toFixed(2).replace('.', ',');
        const formattedRef = t.amountInRef.toFixed(2).replace('.', ',');
        csvContent += `${t.date};${typeLabel};${t.currency};${formattedOriginal};${formattedRef}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Historial_TasaFacil.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('Error SW', err));
}

// --- CONFIGURACIÓN DE EVENT LISTENERS ADICIONALES ---
document.getElementById('rate-selector').addEventListener('change', (e) => {
    fetchReferenceRate(e.target.value);
});

// Inicializar tasa al cargar
const savedRateType = localStorage.getItem('tasafacil_rate_type') || 'USD_oficial';
document.getElementById('rate-selector').value = savedRateType;

loadSavedData();
fetchReferenceRate(savedRateType);
