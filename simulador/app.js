// ===== App State =====
const elements = {};
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  // Cache elements
  ['currency', 'amount', 'startDate', 'endDate', 'simulationForm', 'periodInfo',
    'errorMessage', 'resultsSection', 'strategiesGrid',
    'resultsSummary', 'currencyLabel', 'currencySymbol', 'submitBtn'
  ].forEach(id => elements[id] = document.getElementById(id));

  setupDateLimits();
  elements.currency.addEventListener('change', updateCurrencyLabel);
  elements.startDate.addEventListener('change', updatePeriodInfo);
  elements.endDate.addEventListener('change', updatePeriodInfo);
  elements.simulationForm.addEventListener('submit', handleSubmit);
});

function getDataRange() {
  const dates = COTACOES.map(c => c.date);
  return { min: dates[0], max: dates[dates.length - 1] };
}

function setupDateLimits() {
  const range = getDataRange();
  const minMonth = range.min.substring(0, 7); // YYYY-MM
  const maxMonth = range.max.substring(0, 7);
  elements.startDate.min = minMonth;
  elements.startDate.max = maxMonth;
  elements.endDate.min = minMonth;
  elements.endDate.max = maxMonth;
  // Default: últimos 6 meses
  const endParts = maxMonth.split('-');
  let y = parseInt(endParts[0]), m = parseInt(endParts[1]) - 5;
  if (m < 1) { m += 12; y--; }
  elements.startDate.value = `${y}-${String(m).padStart(2, '0')}`;
  elements.endDate.value = maxMonth;
  updatePeriodInfo();
}

function updateCurrencyLabel() {
  const isUSD = elements.currency.value === 'usd';
  elements.currencyLabel.textContent = isUSD ? 'USD' : 'EUR';
  elements.currencySymbol.textContent = isUSD ? '$' : '€';
}

function updatePeriodInfo() {
  const start = elements.startDate.value;
  const end = elements.endDate.value;
  if (!start || !end) return;
  hideError();
  const months = countMonths(start, end);
  if (months <= 0) {
    elements.periodInfo.classList.add('sim-hidden');
    return;
  }
  elements.periodInfo.classList.remove('sim-hidden');
  if (months > 12) {
    const adjusted = getAdjustedStart(end);
    elements.periodInfo.textContent = `O período selecionado tem ${months} meses. Serão considerados apenas os últimos 12 meses: ${formatMonthYear(adjusted)} a ${formatMonthYear(end)}.`;
  } else {
    elements.periodInfo.textContent = `Período de ${months} ${months === 1 ? 'mês' : 'meses'}: ${formatMonthYear(start)} a ${formatMonthYear(end)}.`;
  }
}

function countMonths(start, end) {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

function getAdjustedStart(end) {
  const [ey, em] = end.split('-').map(Number);
  let y = ey, m = em - 11;
  if (m < 1) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function formatMonthYear(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]}/${y}`;
}

// ===== Validation =====
function showError(msg) {
  elements.errorMessage.textContent = msg;
  elements.errorMessage.classList.remove('sim-hidden');
}
function hideError() { elements.errorMessage.classList.add('sim-hidden'); }

function validate(start, end) {
  hideError();
  if (!start || !end) { showError('Preencha as duas datas.'); return false; }
  const range = getDataRange();
  if (end > range.max.substring(0, 7)) { showError('A data final não pode ser posterior aos dados disponíveis.'); return false; }
  if (start > end) { showError('A data inicial não pode ser posterior à data final.'); return false; }
  const amount = parseFloat(elements.amount.value);
  if (!amount || amount <= 0) { showError('Informe um valor válido.'); return false; }
  return true;
}

// ===== Calculation =====
function getQuotesInRange(startMonth, endMonth, currency) {
  const startDate = startMonth + '-01';
  const endDate = endMonth + '-31';
  return COTACOES.filter(c => c.date >= startDate && c.date <= endDate)
    .map(c => ({ date: c.date, rate: c[currency] }));
}

function getMonthsList(startMonth, endMonth) {
  const months = [];
  let [y, m] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function getFirstQuoteOfMonth(quotes, month) {
  const monthQuotes = quotes.filter(q => q.date.substring(0, 7) === month);
  return monthQuotes.length > 0 ? monthQuotes[0] : null;
}

function getLastQuoteOfMonth(quotes, month) {
  const monthQuotes = quotes.filter(q => q.date.substring(0, 7) === month);
  return monthQuotes.length > 0 ? monthQuotes[monthQuotes.length - 1] : null;
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatRate(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function calculateStrategies(currency, amount, startMonth, endMonth) {
  const quotes = getQuotesInRange(startMonth, endMonth, currency);
  if (quotes.length === 0) return null;

  const months = getMonthsList(startMonth, endMonth);
  const numMonths = months.length;
  const monthlyAmount = amount / numMonths;

  // Strategy 1: Buy all at cheapest rate
  const minQuote = quotes.reduce((min, q) => q.rate < min.rate ? q : min, quotes[0]);
  const strat1 = {
    name: 'Melhor Cotação',
    desc: 'Compra tudo no dia mais barato do período',
    totalBRL: amount * minQuote.rate,
    avgRate: minQuote.rate,
    detail: `Cotação: ${formatRate(minQuote.rate)} em ${formatDate(minQuote.date)}`,
    icon: '🏆'
  };

  // Strategy 2: Buy all at most expensive rate
  const maxQuote = quotes.reduce((max, q) => q.rate > max.rate ? q : max, quotes[0]);
  const strat2 = {
    name: 'Pior Cotação',
    desc: 'Compra tudo no dia mais caro do período',
    totalBRL: amount * maxQuote.rate,
    avgRate: maxQuote.rate,
    detail: `Cotação: ${formatRate(maxQuote.rate)} em ${formatDate(maxQuote.date)}`,
    icon: '📉'
  };

  // Strategy 3: Buy on first business day of each month
  let total3 = 0;
  let rates3 = [];
  let breakdown3 = [];
  months.forEach(month => {
    const quote = getFirstQuoteOfMonth(quotes, month);
    if (quote) {
      const cost = monthlyAmount * quote.rate;
      total3 += cost;
      rates3.push(quote.rate);
      breakdown3.push({ date: quote.date, rate: quote.rate, cost });
    }
  });
  const strat3 = {
    name: '1º Dia Útil do Mês',
    desc: `Compra ${formatBRL(monthlyAmount * rates3[0] || 0).replace('R$', '').trim()} por mês (${numMonths} meses)`,
    totalBRL: total3,
    avgRate: rates3.length > 0 ? rates3.reduce((a, b) => a + b, 0) / rates3.length : 0,
    detail: `Cotação média: ${formatRate(rates3.length > 0 ? rates3.reduce((a, b) => a + b, 0) / rates3.length : 0)}`,
    icon: '📅',
    breakdown: breakdown3
  };

  // Strategy 4: Buy on last business day of each month
  let total4 = 0;
  let rates4 = [];
  let breakdown4 = [];
  months.forEach(month => {
    const quote = getLastQuoteOfMonth(quotes, month);
    if (quote) {
      const cost = monthlyAmount * quote.rate;
      total4 += cost;
      rates4.push(quote.rate);
      breakdown4.push({ date: quote.date, rate: quote.rate, cost });
    }
  });
  const strat4 = {
    name: 'Último Dia Útil do Mês',
    desc: `Compra ${formatBRL(monthlyAmount * (rates4[0] || 0)).replace('R$', '').trim()} por mês (${numMonths} meses)`,
    totalBRL: total4,
    avgRate: rates4.length > 0 ? rates4.reduce((a, b) => a + b, 0) / rates4.length : 0,
    detail: `Cotação média: ${formatRate(rates4.length > 0 ? rates4.reduce((a, b) => a + b, 0) / rates4.length : 0)}`,
    icon: '📆',
    breakdown: breakdown4
  };

  return [strat1, strat2, strat3, strat4];
}

// ===== Render =====
function renderResults(strategies, currency, amount, startMonth, endMonth, numMonths) {
  const currencyName = currency === 'usd' ? 'dólares' : 'euros';
  const currencySymbol = currency === 'usd' ? 'US$' : '€';
  const formattedAmount = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  elements.resultsSummary.innerHTML = `Simulação de compra de <strong>${currencySymbol} ${formattedAmount} ${currencyName}</strong> no período de <strong>${formatMonthYear(startMonth)}</strong> a <strong>${formatMonthYear(endMonth)}</strong> (${numMonths} ${numMonths === 1 ? 'mês' : 'meses'}).`;

  // Find best and worst
  const totals = strategies.map(s => s.totalBRL);
  const bestIdx = totals.indexOf(Math.min(...totals));
  const worstIdx = totals.indexOf(Math.max(...totals));
  const neutralIndices = [0, 1, 2, 3].filter(i => i !== bestIdx && i !== worstIdx);

  // Render cards
  elements.strategiesGrid.innerHTML = '';
  strategies.forEach((strat, idx) => {
    let cardClass = '';
    let badgeText = '';
    if (idx === bestIdx) { cardClass = 'best'; badgeText = '✅ Mais econômico'; }
    else if (idx === worstIdx) { cardClass = 'worst'; badgeText = '❌ Mais caro'; }
    else if (idx === neutralIndices[0]) { cardClass = 'neutral-1'; badgeText = strat.icon; }
    else { cardClass = 'neutral-2'; badgeText = strat.icon; }

    const diff = strat.totalBRL - strategies[bestIdx].totalBRL;
    const diffPercent = ((strat.totalBRL / strategies[bestIdx].totalBRL - 1) * 100);

    let savingsHTML = '';
    if (idx !== bestIdx) {
      savingsHTML = `<div class="strategy-savings savings-negative">+${formatBRL(diff)} (+${diffPercent.toFixed(1)}%) vs melhor</div>`;
    } else {
      const saved = strategies[worstIdx].totalBRL - strat.totalBRL;
      savingsHTML = `<div class="strategy-savings savings-positive">Economia de ${formatBRL(saved)} vs pior cenário</div>`;
    }

    let breakdownHTML = '';
    if (strat.breakdown && strat.breakdown.length > 0) {
      const rows = strat.breakdown.map(b =>
        `<div class="breakdown-row"><span>${formatDate(b.date)}</span><span>${formatRate(b.rate)}</span><span>${formatBRL(b.cost)}</span></div>`
      ).join('');
      breakdownHTML = `
        <div class="breakdown">
          <div class="breakdown-header"><span>Data</span><span>Cotação</span><span>Custo</span></div>
          ${rows}
        </div>`;
    }

    const card = document.createElement('div');
    card.className = `strategy-card ${cardClass}`;
    card.innerHTML = `
      <div class="strategy-badge">${badgeText}</div>
      <div class="strategy-name">${strat.icon} ${strat.name}</div>
      <div class="strategy-desc">${strat.desc}</div>
      <div class="strategy-value">${formatBRL(strat.totalBRL)}</div>
      <div class="strategy-detail">${strat.detail}</div>
      ${savingsHTML}
      ${breakdownHTML}
    `;
    elements.strategiesGrid.appendChild(card);
  });

  // Show results
  elements.resultsSection.classList.remove('sim-hidden');
  elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ===== Submit =====
function handleSubmit(e) {
  e.preventDefault();

  let startMonth = elements.startDate.value;
  let endMonth = elements.endDate.value;

  if (!validate(startMonth, endMonth)) return;

  const currency = elements.currency.value;
  const amount = parseFloat(elements.amount.value);

  // Adjust to max 12 months (from end backwards)
  let numMonths = countMonths(startMonth, endMonth);
  if (numMonths > 12) {
    startMonth = getAdjustedStart(endMonth);
    numMonths = 12;
  }

  const strategies = calculateStrategies(currency, amount, startMonth, endMonth);
  if (!strategies) {
    showError('Não há dados de cotação disponíveis para o período selecionado.');
    return;
  }

  renderResults(strategies, currency, amount, startMonth, endMonth, numMonths);
}
