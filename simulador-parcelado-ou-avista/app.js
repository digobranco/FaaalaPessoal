const elements = {
    form: document.getElementById('calcForm'),
    totalValue: document.getElementById('totalValue'),
    pixDiscount: document.getElementById('pixDiscount'),
    installments: document.getElementById('installments'),
    selicRate: document.getElementById('selicRate'),
    selicLoadingMsg: document.getElementById('selicLoadingMsg'),
    cdiPercentage: document.getElementById('cdiPercentage'),
    pointsPerDollar: document.getElementById('pointsPerDollar'),

    resultsSection: document.getElementById('resultsSection'),
    verdictBanner: document.getElementById('verdictBanner'),
    verdictTitle: document.getElementById('verdictTitle'),
    verdictSubtitle: document.getElementById('verdictSubtitle'),

    resPixValue: document.getElementById('resPixValue'),
    resInstallmentValue: document.getElementById('resInstallmentValue'),
    resFinalBalance: document.getElementById('resFinalBalance'),

    resPoints: document.getElementById('resPoints'),
    resDollarRate: document.getElementById('resDollarRate'),
    resPointsRate: document.getElementById('resPointsRate'),

    amortizationTableBody: document.getElementById('amortizationTableBody'),
    disclaimerBox: document.getElementById('disclaimerBox')
};

let usdRate = 5.00; // Fallback
window.currentSelic = 10.75; // Fallback 

// Format currency helper
const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Format percent helper
const formatPercent = (val) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch USD
    await fetchUSDRate();
    // 2. Fetch Selic
    await fetchSelic();

    // Listen for form submit
    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });
});

async function fetchUSDRate() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        const data = await response.json();
        usdRate = parseFloat(data.USDBRL.bid);
    } catch (error) {
        console.error('Erro ao buscar cotação do dólar:', error);
    }
}

async function fetchSelic() {
    try {
        // BCB API for Meta Selic (432)
        const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
        const data = await response.json();
        if (data && data.length > 0) {
            window.currentSelic = parseFloat(data[0].valor);
            elements.selicRate.value = window.currentSelic;
            elements.selicLoadingMsg.textContent = 'Taxa Selic atualizada do Banco Central!';
            elements.selicLoadingMsg.style.color = 'var(--text-secondary)';
        }
    } catch (error) {
        console.error('Erro ao buscar Selic:', error);
        elements.selicLoadingMsg.textContent = 'Erro ao buscar. Usando taxa padrão.';
        elements.selicLoadingMsg.style.color = '#ff4b4b';
    }
}

function calculate() {
    const P_prazo = parseFloat(elements.totalValue.value) || 0;
    const discountPct = parseFloat(elements.pixDiscount.value) || 0;
    const n_parcelas = parseInt(elements.installments.value) || 1;
    const selicAnual = parseFloat(elements.selicRate.value) || 0;
    const cdiPct = parseFloat(elements.cdiPercentage.value) || 0;
    const pontosUSD = parseFloat(elements.pointsPerDollar.value) || 0;

    // --- 1. Basic Math ---
    const P_pix = P_prazo * (1 - (discountPct / 100)); // Valor a vista
    const valor_parcela = P_prazo / n_parcelas; // Valor da parcela

    // Points calculation (No Credit Card Bill Delay / Simplified)
    // Points are gained on the Full term value (P_prazo) since the purchase is processed at once on the credit card.
    const pontosGanhos = (P_prazo / usdRate) * pontosUSD;

    // --- 2. Yield Math ---
    // CDI base assume Selic - 0.10, with floor 0
    const cdiAnualBase = Math.max(0, selicAnual - 0.10);
    // Yield we actually get based on CDIPct
    const cdiAnualEfetivo = cdiAnualBase * (cdiPct / 100);

    // Convert Annual to Monthly Rate: (1 + Anual)^(1/12) - 1
    const taxaEfetivaMensal = Math.pow(1 + (cdiAnualEfetivo / 100), 1 / 12) - 1;

    // Array to hold table rows
    const amortizationRows = [];

    let saldo = P_pix; // Começa com o dinheiro do à vista investido
    let impostoTotal = 0;
    let rendimentoBrutoTotal = 0;

    for (let mes = 1; mes <= n_parcelas; mes++) {
        const saldoInicial = saldo;

        // 1. Rende
        const rendimentoBruto = saldoInicial * taxaEfetivaMensal;

        // 2. Aplica IR sobre o rendimento
        // IR: 22.5% p/ até 6 meses. 20% para de 7 a 12. 17.5% de 13 a 24. 15% acima de 24
        let aliquotaIR = 0;
        if (mes <= 6) { aliquotaIR = 0.225; }
        else if (mes <= 12) { aliquotaIR = 0.20; }
        else if (mes <= 24) { aliquotaIR = 0.175; }
        else { aliquotaIR = 0.15; }

        const imposto = rendimentoBruto * aliquotaIR;
        const rendimentoLiquido = rendimentoBruto - imposto;

        // 3. Paga a parcela
        let saque = valor_parcela;

        // Se o saldo após o rendimento não for suficiente para pagar a parcela, o saldo final será negativo (ficou devendo).
        let saldoFinal = saldoInicial + rendimentoLiquido - saque;

        amortizationRows.push({
            mes: mes,
            saldoInicial: saldoInicial,
            rendimentoBruto: rendimentoBruto,
            taxaIR: aliquotaIR,
            imposto: imposto,
            rendimentoLiquido: rendimentoLiquido,
            saque: saque,
            saldoFinal: saldoFinal
        });

        saldo = saldoFinal;
        impostoTotal += imposto;
        rendimentoBrutoTotal += rendimentoBruto;
    }

    // --- 3. UI Update ---

    elements.resPixValue.textContent = formatCurrency(P_pix);
    elements.resInstallmentValue.textContent = formatCurrency(valor_parcela) + ` (x${n_parcelas})`;

    elements.resPoints.textContent = Math.round(pontosGanhos).toLocaleString('pt-BR') + ' pts';
    elements.resDollarRate.textContent = formatCurrency(usdRate);
    elements.resPointsRate.textContent = pontosUSD;

    const saldoSobra = saldo; // is negative if short of money

    if (saldoSobra >= 0) {
        // Valia a pena parcelar
        elements.verdictBanner.className = 'verdict-banner win-parcelado';
        elements.verdictTitle.textContent = '🥳 Vale mais a pena Parcelar!';
        elements.verdictSubtitle.textContent = `Ao parcelar e investir o dinheiro do PIX, após pagar todas as parcelas ainda sobrarão ${formatCurrency(saldoSobra)} no seu bolso.`;
        elements.resFinalBalance.className = 'text-success';
        elements.resFinalBalance.textContent = '+ ' + formatCurrency(saldoSobra);
    } else {
        // Valia a pena o PIX
        elements.verdictBanner.className = 'verdict-banner win-pix';
        elements.verdictTitle.textContent = '🚨 Vale mais a pena o PIX!';
        elements.verdictSubtitle.textContent = `O rendimento não supera o desconto. Se parcelar, faltarão ${formatCurrency(Math.abs(saldoSobra))} para quitar a última parcela.`;
        elements.resFinalBalance.className = 'text-danger';
        elements.resFinalBalance.textContent = '- ' + formatCurrency(Math.abs(saldoSobra));
    }

    // Render Table
    elements.amortizationTableBody.innerHTML = '';
    amortizationRows.forEach(row => {
        const tr = document.createElement('tr');

        // Formating class conditionally for negative final balance
        const saldoFinalClass = row.saldoFinal >= 0 ? '' : 'text-danger';

        tr.innerHTML = `
            <td>${row.mes}</td>
            <td>${formatCurrency(row.saldoInicial)}</td>
            <td class="text-success">+ ${formatCurrency(row.rendimentoBruto)}</td>
            <td class="text-danger">- ${formatCurrency(row.imposto)} <span style="font-size: 0.7rem; opacity: 0.7;">(${row.taxaIR * 100}%)</span></td>
            <td>+ ${formatCurrency(row.rendimentoLiquido)}</td>
            <td class="text-danger">- ${formatCurrency(row.saque)}</td>
            <td class="${saldoFinalClass}"><strong>${formatCurrency(row.saldoFinal)}</strong></td>
        `;

        elements.amortizationTableBody.appendChild(tr);
    });

    // --- 4. Render Disclaimer ---
    const disclaimerHTML = `
        <h4><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Importante saber (Para Leigos)</h4>
        <p><strong>Por que calculamos assim?</strong> Quando você tem a opção de pagar à vista com desconto ou parcelar sem juros, o dinheiro do "à vista" fica com você. Se você deixar ele investido e for retirando apenas o valor da parcela a cada mês, esse dinheiro vai rendendo.</p>
        <p>Para esse cálculo exato, nós consideramos os seguintes valores que afetam o resultado do mundo real:</p>
        <ul style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 8px; margin-bottom: 8px; padding-left: 20px;">
            <li><strong>Taxa Selic:</strong> ${formatPercent(selicAnual)} ao ano, que é a taxa básica de juros do país no momento.</li>
            <li><strong>Rentabilidade:</strong> ${cdiPct}% do CDI. O chamado "CDI" é uma taxa que sempre fica 0,10% abaixo da Selic. Ou seja, usamos um CDI base de ${formatPercent(cdiAnualBase)} ao ano para calcular o seu ganho.</li>
            <li><strong>Imposto de Renda (IR):</strong> Os investimentos em Renda Fixa (como CDB) sofrem cobrança de IR automático pelo governo apenas sobre o seu <u>lucro</u> (e não sobre todo o dinheiro). A tabela da Receita Federal diz que nos 6 primeiros meses cobra-se 22,5%, do mês 7 ao 12 cobra-se 20%, e continua caindo. Nós descontamos exatamente esses valores a cada mês.</li>
            <li><strong>O Dólar:</strong> Para descobrir quantos pontos no cartão você ganhou na compra inteira, convertemos o valor a prazo usando o dólar hoje (${formatCurrency(usdRate)}). Lembre-se que você ganha pontos pelo valor total da compra.</li>
        </ul>
        <p style="margin-top: 12px; font-size: 0.8rem; font-style: italic;">Aviso: Esta é uma simulação matemática que aproxima os rendimentos em meses fixos de 30 dias. A rentabilidade do CDI passa por pequenas variações diárias. Não consideramos possíveis taxas de permanência (como a tarifa de custódia da B3, se você usar Tesouro), IOF para resgates antes de 30 dias, nem os custos de anuidade do seu cartão.</p>
    `;

    elements.disclaimerBox.innerHTML = disclaimerHTML;

    // Show Results
    elements.resultsSection.classList.remove('sim-hidden');
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
