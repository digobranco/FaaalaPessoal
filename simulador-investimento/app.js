/**
 * Investment Simulator Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('simulatorForm');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const growthFields = document.getElementById('growthFields');
    const retirementFields = document.getElementById('retirementFields');
    const depletionYearsGroup = document.getElementById('depletionYearsGroup');
    const retirementType = document.getElementById('retirementType');
    const resultsCol = document.getElementById('resultsCol');
    const comparisonSection = document.getElementById('comparisonSection');

    let currentMode = 'growth';
    let chart = null;

    // --- Tab Switching Logic ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;

            if (currentMode === 'growth') {
                growthFields.classList.remove('hidden');
                retirementFields.classList.add('hidden');
                document.getElementById('mainResultLabel').textContent = 'Patrimônio Estimado';
            } else {
                growthFields.classList.add('hidden');
                retirementFields.classList.remove('hidden');
                document.getElementById('mainResultLabel').textContent = 'Capital Necessário';
            }
        });
    });

    // --- Retirement Type Toggle ---
    retirementType.addEventListener('change', () => {
        if (retirementType.value === 'depletion') {
            depletionYearsGroup.classList.remove('hidden');
        } else {
            depletionYearsGroup.classList.add('hidden');
        }
    });

    // --- Field Logic ---
    const adjustByInflation = document.getElementById('adjustByInflation');
    const inflationRateInput = document.getElementById('inflationRate');

    function updateInflationState() {
        inflationRateInput.disabled = !adjustByInflation.checked;
        if (inflationRateInput.disabled) {
            inflationRateInput.style.opacity = '0.5';
        } else {
            inflationRateInput.style.opacity = '1';
        }
    }

    adjustByInflation.addEventListener('change', updateInflationState);
    updateInflationState();

    // --- Core Calculation ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    function calculate() {
        const initialCapitalGrowth = parseFloat(document.getElementById('initialCapital').value) || 0;
        const initialCapitalRet = parseFloat(document.getElementById('initialCapitalRet').value) || 0;
        const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
        const years = parseInt(document.getElementById('timeYears').value) || 1;
        const annualRateA = parseFloat(document.getElementById('interestRate').value) / 100;
        const annualRateB = parseFloat(document.getElementById('interestRateB').value) / 100;
        const annualInflation = parseFloat(document.getElementById('inflationRate').value) / 100;

        const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

        if (currentMode === 'growth') {
            const months = years * 12;
            const monthlyRateA = Math.pow(1 + annualRateA, 1 / 12) - 1;
            const resultA = runGrowthSimulation(initialCapitalGrowth, monthlyContribution, monthlyRateA, monthlyInflation, months, adjustByInflation.checked);
            let resultB = null;

            if (!isNaN(annualRateB)) {
                const monthlyRateB = Math.pow(1 + annualRateB, 1 / 12) - 1;
                resultB = runGrowthSimulation(initialCapitalGrowth, monthlyContribution, monthlyRateB, monthlyInflation, months, adjustByInflation.checked);
            }

            updateGrowthUI(resultA, resultB, annualRateA, annualRateB);
        } else {
            const desiredIncome = parseFloat(document.getElementById('desiredIncome').value) || 0;
            const currentAge = parseInt(document.getElementById('currentAge').value) || 0;
            const retirementAge = parseInt(document.getElementById('retirementAge').value) || 0;
            const yearsToRetire = retirementAge - currentAge;
            const type = retirementType.value;
            const depletionAge = parseInt(document.getElementById('depletionAge').value) || 95;

            if (yearsToRetire <= 0) {
                alert('A idade de aposentadoria deve ser maior que a idade atual.');
                return;
            }

            const monthlyRateA = Math.pow(1 + annualRateA, 1 / 12) - 1;
            const monthlyRealRateA = (1 + monthlyRateA) / (1 + monthlyInflation) - 1;

            const resultA = calculateRetirement(initialCapitalRet, desiredIncome, yearsToRetire, monthlyRealRateA, type, depletionAge, retirementAge);
            let resultB = null;

            if (!isNaN(annualRateB)) {
                const monthlyRateB = Math.pow(1 + annualRateB, 1 / 12) - 1;
                const monthlyRealRateB = (1 + monthlyRateB) / (1 + monthlyInflation) - 1;
                resultB = calculateRetirement(initialCapitalRet, desiredIncome, yearsToRetire, monthlyRealRateB, type, depletionAge, retirementAge);
            }

            updateRetirementUI(resultA, resultB, annualRateA, annualRateB);

            // Accumulation Chart for retirement
            const accA = runGrowthSimulation(initialCapitalRet, resultA.neededMonthly, monthlyRateA, monthlyInflation, yearsToRetire * 12, true);
            let accB = null;
            if (resultB) {
                const monthlyRateB = Math.pow(1 + annualRateB, 1 / 12) - 1;
                accB = runGrowthSimulation(initialCapitalRet, resultB.neededMonthly, monthlyRateB, monthlyInflation, yearsToRetire * 12, true);
            }
            renderChart(accA, accB, annualRateA, annualRateB);
        }

        resultsCol.classList.remove('hidden');
        resultsCol.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Simulation Functions ---

    function runGrowthSimulation(pv, pmt, i, inf, periods, adjustPmt) {
        let total = pv;
        let invested = pv;
        let dataTotal = [pv];
        let dataInvested = [pv];
        let dataReal = [pv];
        let currentPmt = pmt;

        for (let m = 1; m <= periods; m++) {
            total = total * (1 + i) + currentPmt;
            invested += currentPmt;

            if (adjustPmt) {
                currentPmt *= (1 + inf);
            }

            dataTotal.push(total);
            dataInvested.push(invested);
            dataReal.push(total / Math.pow(1 + inf, m));
        }

        return {
            finalTotal: total,
            finalInvested: invested,
            finalJuros: total - invested,
            finalReal: total / Math.pow(1 + inf, periods),
            dataTotal,
            dataInvested,
            dataReal
        };
    }

    function calculateRetirement(initialCapital, income, yearsToRetire, realRate, type, depletionAge, retirementAge) {
        let capitalNeeded;

        if (type === 'perpetual') {
            capitalNeeded = income / realRate;
        } else {
            const depletionMonths = (depletionAge - retirementAge) * 12;
            capitalNeeded = (income * (1 - Math.pow(1 + realRate, -depletionMonths))) / realRate;
        }

        // PMT needed to reach (capitalNeeded - initialCapital * (1+i)^n)
        // FV = initialCapital * (1+i)^n + PMT * [((1 + i)^n - 1) / i]
        // PMT = (FV - initialCapital * (1+i)^n) * i / ((1+i)^n - 1)
        const n = yearsToRetire * 12;
        const initialCapitalGrowth = initialCapital * Math.pow(1 + realRate, n);
        const neededMonthly = ((capitalNeeded - initialCapitalGrowth) * realRate) / (Math.pow(1 + realRate, n) - 1);

        return {
            capitalNeeded,
            neededMonthly,
            realIncome: income
        };
    }

    // --- UI Update Helpers ---

    function formatCurrency(val) {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function updateGrowthUI(resA, resB, rateA, rateB) {
        document.getElementById('mainResultValue').textContent = formatCurrency(resA.finalTotal);
        document.getElementById('secondResultLabel').innerHTML = `Valor Real (Hoje): ${formatCurrency(resA.finalReal)} <span class="info-icon" title="O valor que o dinheiro acumulado valeria hoje, descontando a inflação.">?</span>`;

        renderChart(resA, resB, rateA, rateB);

        if (resB) {
            showComparison(resA, resB, rateA, rateB);
        } else {
            comparisonSection.classList.add('hidden');
        }
    }

    function updateRetirementUI(resA, resB, rateA, rateB) {
        document.getElementById('mainResultValue').textContent = formatCurrency(resA.capitalNeeded);
        document.getElementById('secondResultLabel').innerHTML = `Aporte Mensal Necessário: ${formatCurrency(resA.neededMonthly)} <span class="info-icon" title="O valor mensal que você precisa poupar para atingir o capital necessário.">?</span>`;

        if (resB) {
            showComparison(resA, resB, rateA, rateB);
        } else {
            comparisonSection.classList.add('hidden');
        }
    }

    function showComparison(resA, resB, rateA, rateB) {
        comparisonSection.classList.remove('hidden');
        document.getElementById('rateATitle').textContent = `Cenário A (${(rateA * 100).toFixed(1)}%)`;
        document.getElementById('rateBTitle').textContent = `Cenário B (${(rateB * 100).toFixed(1)}%)`;

        document.getElementById('valA').textContent = formatCurrency(resA.finalTotal);
        document.getElementById('detailA').innerHTML = `
            <span>Investido: ${formatCurrency(resA.finalInvested)}</span>
            <span>Juros: ${formatCurrency(resA.finalJuros)}</span>
        `;

        document.getElementById('valB').textContent = formatCurrency(resB.finalTotal);
        document.getElementById('detailB').innerHTML = `
            <span>Investido: ${formatCurrency(resB.finalInvested)}</span>
            <span>Juros: ${formatCurrency(resB.finalJuros)}</span>
        `;

        document.getElementById('valDiff').textContent = formatCurrency(Math.abs(resB.finalTotal - resA.finalTotal));
    }

    // --- Charting ---

    function renderChart(resA, resB = null, rateA, rateB) {
        const ctx = document.getElementById('resultsChart').getContext('2d');

        if (chart) {
            chart.destroy();
        }

        const labels = resA.dataTotal.map((_, i) => i % 12 === 0 ? `Ano ${i / 12}` : '');

        const datasets = [
            {
                label: `Total (A: ${(rateA * 100 || 0).toFixed(1)}%)`,
                data: resA.dataTotal,
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.3
            }
        ];

        if (resB) {
            datasets.push({
                label: `Total (B: ${(rateB * 100 || 0).toFixed(1)}%)`,
                data: resB.dataTotal,
                borderColor: '#F59E0B',
                fill: false,
                tension: 0.3
            });
        }

        datasets.push(
            {
                label: 'Total Investido',
                data: resA.dataInvested,
                borderColor: '#94a3b8',
                borderDash: [5, 5],
                fill: false,
                tension: 0
            },
            {
                label: 'Poder de Compra (Real)',
                data: resA.dataReal,
                borderColor: '#10B981',
                fill: false,
                tension: 0.3
            }
        );

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: value => formatCurrency(value).split(',')[0]
                        }
                    }
                }
            }
        });
    }
});
