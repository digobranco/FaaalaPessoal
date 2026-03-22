document.addEventListener("DOMContentLoaded", () => {
    const calcForm = document.getElementById('calcForm');
    const resultsSection = document.getElementById('resultsSection');

    // Inputs
    const pontosNecessarios = document.getElementById('pontosNecessarios');
    const pontosPossui = document.getElementById('pontosPossui');
    const prepBonificacao = document.getElementById('prepBonificacao');
    const precoMilheiro = document.getElementById('precoMilheiro');
    const taxaEmbarque = document.getElementById('taxaEmbarque');

    // Outputs
    const resCustoTotal = document.getElementById('resCustoTotal');
    const resMilheirosComprar = document.getElementById('resMilheirosComprar');
    const resCustoMilhas = document.getElementById('resCustoMilhas');
    const resTaxaEmbarque = document.getElementById('resTaxaEmbarque');
    const resCustoMilheiroFinal = document.getElementById('resCustoMilheiroFinal');

    calcForm.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    const calculate = () => {
        const pNecessarios = parseInt(pontosNecessarios.value) || 0;
        const pPossui = parseInt(pontosPossui.value) || 0;
        const bonificacao = parseFloat(prepBonificacao.value) || 0;
        const pMilheiro = parseFloat(precoMilheiro.value) || 0;
        const tEmbarque = parseFloat(taxaEmbarque.value) || 0;

        // Lógica de pontos faltantes
        let pontosFaltantes = pNecessarios - pPossui;
        if (pontosFaltantes < 0) pontosFaltantes = 0;

        // Cálculo dos pontos base a comprar sem contar com a bonificação extra.
        // Formula: PontosFaltantes / (1 + (Bonificacao / 100))
        const multiplicadorBonus = 1 + (bonificacao / 100);
        const pontosBaseAComprar = pontosFaltantes / multiplicadorBonus;

        // Milheiros a comprar (Arredondamento sempre para cima para poder emitir)
        const milheirosAComprar = Math.ceil(pontosBaseAComprar / 1000);

        // Custos financeiros
        const custoMilhas = milheirosAComprar * pMilheiro;
        const custoTotal = custoMilhas + tEmbarque;

        // Atualiza interface
        resCustoTotal.textContent = custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resCustoMilhas.textContent = custoMilhas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resTaxaEmbarque.textContent = tEmbarque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resMilheirosComprar.textContent = `${milheirosAComprar} (${(milheirosAComprar * 1000).toLocaleString('pt-BR')} pts)`;

        const exatoMilheiros = Math.max(0, pontosBaseAComprar / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        document.getElementById('resAvisoArredondamento').innerHTML = `* Valor exato (quebrado): <strong>${exatoMilheiros} milheiros</strong>. Acima, arredondamos para o próximo número inteiro pois só compramos lotes de 1.000 pts.`;

        // Cálculo do valor do milheiro final (CPM) gerado pela transação
        const cpmFinal = pNecessarios > 0 ? (custoTotal / (pNecessarios / 1000)) : 0;
        resCustoMilheiroFinal.textContent = cpmFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        resultsSection.classList.remove('sim-hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
});
