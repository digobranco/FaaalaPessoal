import { CARDS } from './cards.js';

const elements = {
    form: document.getElementById('pointsForm'),
    monthlySpend: document.getElementById('monthlySpend'),
    cardSelect: document.getElementById('cardSelect'),
    cardRule: document.getElementById('cardRule'),
    customPointsGroup: document.getElementById('customPointsGroup'),
    customPoints: document.getElementById('customPoints'),
    bonusAmount: document.getElementById('bonusAmount'),
    bonusMultiplier: document.getElementById('bonusMultiplier'),
    transferBonus: document.getElementById('transferBonus'),
    resultsSection: document.getElementById('resultsSection'),
    totalPointsResult: document.getElementById('totalPointsResult'),
    currentDollarDisplay: document.getElementById('currentDollarDisplay'),
    cardPointsYear: document.getElementById('cardPointsYear'),
    bonusPointsTotal: document.getElementById('bonusPointsTotal'),
    bonusAppliedDisplay: document.getElementById('bonusAppliedDisplay'),
    finalTotalPoints: document.getElementById('finalTotalPoints'),
};

let usdRate = 5.00; // Fallback

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
    populateCards();
    await fetchUSDRate();
    setupEventListeners();
});

async function fetchUSDRate() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        const data = await response.json();
        usdRate = parseFloat(data.USDBRL.bid);
        elements.currentDollarDisplay.textContent = `R$ ${usdRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Erro ao buscar cotação do dólar:', error);
        elements.currentDollarDisplay.textContent = 'R$ 5,00 (Erro ao carregar, usando padrão)';
    }
}

function populateCards() {
    CARDS.sort((a, b) => a.ordem - b.ordem);
    CARDS.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        elements.cardSelect.appendChild(option);
    });
}

function setupEventListeners() {
    elements.cardSelect.addEventListener('change', (e) => {
        const card = CARDS.find(c => c.id === e.target.value);
        if (!card) return;

        // Show card rule
        elements.cardRule.classList.remove('sim-hidden');
        if (card.id === 'custom') {
            elements.cardRule.textContent = 'Informe a pontuação abaixo.';
            elements.customPointsGroup.classList.remove('sim-hidden');
        } else {
            const unit = card.currency === 'USD' ? 'dólar' : 'real';
            const type = card.type === 'cashback' ? 'cashback' : 'pontos';
            elements.cardRule.textContent = `Pontuação: ${card.pointsPerUnit} ${type} por ${unit}`;
            elements.customPointsGroup.classList.add('sim-hidden');
        }
    });

    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });
}

function calculate() {
    const selectedId = elements.cardSelect.value;
    const card = CARDS.find(c => c.id === selectedId);
    const spend = parseFloat(elements.monthlySpend.value) || 0;
    const bonusVal = parseFloat(elements.bonusAmount.value) || 0;
    const bonusMult = parseFloat(elements.bonusMultiplier.value) || 0;
    const transferPct = parseFloat(elements.transferBonus.value) / 100;

    if (!card) return;

    let pointsPerUnit = card.pointsPerUnit;
    if (card.id === 'custom') {
        pointsPerUnit = parseFloat(elements.customPoints.value) || 0;
    }

    // Calculate card points (Yearly)
    let annualCardPoints = 0;
    if (card.currency === 'USD') {
        annualCardPoints = (spend / usdRate) * pointsPerUnit * 12;
    } else {
        annualCardPoints = spend * pointsPerUnit * 12;
    }

    // Calculate bonus points
    const totalBonusPoints = bonusVal * bonusMult;

    // Apply transfer bonus
    const finalTotal = (annualCardPoints + totalBonusPoints) * (1 + transferPct);

    // Update UI
    elements.totalPointsResult.textContent = Math.round(finalTotal).toLocaleString('pt-BR');
    elements.cardPointsYear.textContent = Math.round(annualCardPoints).toLocaleString('pt-BR') + ' pts';
    elements.bonusPointsTotal.textContent = Math.round(totalBonusPoints).toLocaleString('pt-BR') + ' pts';
    elements.bonusAppliedDisplay.textContent = (transferPct * 100) + '%';
    elements.finalTotalPoints.textContent = Math.round(finalTotal).toLocaleString('pt-BR') + ' pts/milhas';

    elements.resultsSection.classList.remove('sim-hidden');
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
