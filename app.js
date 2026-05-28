let currentRate = 0;
let transactions = [];
let lastCalculatedAmount = 0; 

// --- LÓGICA DE MODO OSCURO ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('tasafacil_darkmode', isDark);
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const btn = document.getElementById('theme-toggle');
    btn.innerText = isDark ? '🌙' : '☀️';
}

// Cargar preferencia de tema al iniciar
const savedTheme = localStorage.getItem('tasafacil_darkmode');
if (savedTheme === 'true') {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
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
function loadSavedData() {
    const savedBudget = localStorage.getItem('tasafacil_budget');
    const savedTransactions = localStorage.getItem('tasafacil_transactions');
    
    if (savedBudget) document.getElementById('budget').value = savedBudget;
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
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

async function fetchBCVRate() {
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (!response.ok) throw new Error('Error en la red');
        const data = await response.json();
        
        currentRate = data.promedio; 
        document.getElementById('bcv-rate').innerText = formatVE(currentRate);
        
        const updateDate = new Date(data.fechaActualizacion);
        document.getElementById('last-update').innerText = `Actualizado: ${updateDate.toLocaleDateString()} ${updateDate.toLocaleTimeString()}`;
        
        calculateQuick();
        updateBalance(); 

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

    if (currency === 'USD') {
        lastCalculatedAmount = amount * currentRate;
        resultElement.innerText = `Equivale a: Bs ${formatVE(lastCalculatedAmount)}`;
    } else {
        lastCalculatedAmount = amount / currentRate;
        resultElement.innerText = `Equivale a: $${formatVE(lastCalculatedAmount)}`;
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

    let amountInUSD = currency === 'VES' ? (amount / currentRate) : amount;
    
    transactions.push({
        date: new Date().toLocaleString(),
        originalAmount: amount,
        currency: currency,
        type: type,
        amountInUSD: amountInUSD
    });

    amountInput.value = ''; 
    saveDataAndRecalculate();
}

// Declarar funciones en el objeto global window para que sean accesibles desde los eventos inline HTML
window.toggleDarkMode = toggleDarkMode;
window.calculateQuick = calculateQuick;
window.copyToClipboard = copyToClipboard;
window.addTransaction = addTransaction;
window.clearData = clearData;
window.exportToCSV = exportToCSV;
window.saveDataAndRecalculate = saveDataAndRecalculate;

function updateBalance() {
    if (currentRate === 0) return;

    let initialBudget = parseAmount(document.getElementById('budget').value);
    let currentBalanceUSD = initialBudget;

    transactions.forEach(t => {
        currentBalanceUSD += t.type === 'expense' ? -t.amountInUSD : t.amountInUSD;
    });

    // Actualizar textos de saldo
    document.getElementById('remaining-usd').innerText = `$${formatVE(currentBalanceUSD)}`;
    document.getElementById('remaining-ves').innerText = `Bs ${formatVE(currentBalanceUSD * currentRate)}`;
    
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
    csvContent += "Fecha;Tipo de Movimiento;Moneda Original;Monto Original;Equivalente en USD\n";

    if (initialBudget > 0) {
        const formattedBudget = initialBudget.toFixed(2).replace('.', ',');
        const exportDate = new Date().toLocaleString(); 
        csvContent += `${exportDate};Presupuesto Inicial Base;USD;${formattedBudget};${formattedBudget}\n`;
    }

    transactions.forEach(t => {
        const typeLabel = t.type === 'expense' ? 'Gasto' : 'Ingreso';
        const formattedOriginal = t.originalAmount.toFixed(2).replace('.', ',');
        const formattedUSD = t.amountInUSD.toFixed(2).replace('.', ',');
        csvContent += `${t.date};${typeLabel};${t.currency};${formattedOriginal};${formattedUSD}\n`;
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

loadSavedData();
fetchBCVRate();
