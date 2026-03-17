const elements = {
    form: document.getElementById('calcForm'),
    precoDireto: document.getElementById('precoDireto'),
    precoParceiro: document.getElementById('precoParceiro'),
    pontosPorReal: document.getElementById('pontosPorReal'),
    valorMilheiroRef: document.getElementById('valorMilheiroRef'),
    
    resultsSection: document.getElementById('resultsSection'),
    verdictBanner: document.getElementById('verdictBanner'),
    verdictTitle: document.getElementById('verdictTitle'),
    verdictSubtitle: document.getElementById('verdictSubtitle'),
    
    resDiferenca: document.getElementById('resDiferenca'),
    resPontosTotais: document.getElementById('resPontosTotais'),
    resCustoMilheiro: document.getElementById('resCustoMilheiro'),
    
    disclaimerText: document.getElementById('disclaimerText')
};

const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

document.addEventListener('DOMContentLoaded', () => {
    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });
});

function calculate() {
    const precoDireto = parseFloat(elements.precoDireto.value) || 0;
    const precoParceiro = parseFloat(elements.precoParceiro.value) || 0;
    const ptsPorReal = parseFloat(elements.pontosPorReal.value) || 0;
    const refMercado = parseFloat(elements.valorMilheiroRef.value) || 32.0;

    // 1. Math
    const diferencaTrata = precoParceiro - precoDireto;
    const pontosGerados = precoParceiro * ptsPorReal;
    const milheiros = pontosGerados / 1000;

    // Prevent division by zero if 0 points promo
    if (milheiros === 0) {
        alert("O acúmulo de pontos precisa ser maior que zero!");
        return;
    }

    let custoMilheiro = 0;
    
    // 2. Logic & UI
    elements.resPontosTotais.textContent = Math.round(pontosGerados).toLocaleString('pt-BR') + ' pts';

    if (diferencaTrata <= 0) {
        // Partners price is equal or cheaper. Free Points!
        custoMilheiro = 0;
        
        elements.resDiferenca.textContent = 'R$ 0,00 (Sem acréscimo)';
        elements.resCustoMilheiro.textContent = 'A Custo Zero!';
        elements.resCustoMilheiro.className = 'text-success';

        elements.verdictBanner.className = 'verdict-banner win-gratis';
        elements.verdictTitle.textContent = '🤩 Nem pense duas vezes!';
        elements.verdictSubtitle.textContent = 'Como o produto está o mesmo preço (ou mais barato) no parceiro, os pontos saem completamente de graça.';
        
        elements.disclaimerText.innerHTML = `Nesta simulação você <strong>não pagou nada a mais</strong> para receber <strong>${milheiros.toFixed(1)} milheiros</strong>. Fica muito fácil tomar a decisão: basta comprar pelo link promocional e aguardar os pontos creditarem na sua conta!`;
        
    } else {
        // Partner is more expensive. Let's calculate the Cost per Thousand (CP).
        custoMilheiro = diferencaTrata / milheiros;
        
        elements.resDiferenca.textContent = '+ ' + formatCurrency(diferencaTrata);
        elements.resCustoMilheiro.textContent = formatCurrency(custoMilheiro);
        
        if (custoMilheiro < refMercado) {
            // It compensates 
            elements.verdictBanner.className = 'verdict-banner win-pontos';
            elements.verdictTitle.textContent = '✅ Vale pagar a mais pelos pontos!';
            elements.verdictSubtitle.textContent = `A diferença de preço se pagou. Você gerou pontos mais baratos que o custo de mercado (${formatCurrency(refMercado)}).`;
            elements.resCustoMilheiro.className = 'text-success';
            
            elements.disclaimerText.innerHTML = `Você pagou <strong>${formatCurrency(diferencaTrata)}</strong> a mais para poder ganhar <strong>${milheiros.toFixed(1)} milheiros</strong> na conta. A matemática nos diz que o seu Custo por Milheiro foi de <strong>${formatCurrency(custoMilheiro)}</strong>. Como esse valor é menor que os ${formatCurrency(refMercado)} estipulados no custo de mercado da Livelo, isso foi uma ótima jogada financeira!`;
        } else {
            // It doesn't compensate
            elements.verdictBanner.className = 'verdict-banner win-direto';
            elements.verdictTitle.textContent = '🚨 Foge da cilada! Compre direto!';
            elements.verdictSubtitle.textContent = `A diferença no valor do produto é tão brutal que seus pontos saíram caríssimos, acima do teto de mercado de ${formatCurrency(refMercado)}.`;
            elements.resCustoMilheiro.className = 'text-danger';
            
            elements.disclaimerText.innerHTML = `O ágio do produto na loja parceira foi de <strong>${formatCurrency(diferencaTrata)}</strong>. Para os <strong>${milheiros.toFixed(1)} milheiros</strong> recebidos, significa que cada milheiro custou absurdos <strong>${formatCurrency(custoMilheiro)}</strong>.<br><br>Geralmente, você consegue comprar esses mesmos pontos direto na Livelo ou Smiles em dia de promoção por ~${formatCurrency(refMercado)}. Assim sendo, a atitude mais inteligente é comprar a TV mais barata em loja avulsa e caso precise de pontos urgentes, comprá-los de forma avulsa quando rolar um desconto legal de 50% nos clubes.`;
        }
    }

    elements.resultsSection.classList.remove('sim-hidden');
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
