import { promotions, anniversaries, programColors } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentYear = 2026;
    let currentView = 'calendar'; // 'calendar' or 'table'
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Selectors
    const calendarDisplay = document.getElementById('calendarDisplay');
    const tableDisplay = document.getElementById('tableDisplay');
    const timelineDisplay = document.getElementById('timelineDisplay');
    const promoTableBody = document.getElementById('promoTableBody');
    const anniversaryBar = document.getElementById('anniversaryBar');
    const currentYearDisplay = document.getElementById('currentYearDisplay');

    const filterDest = document.getElementById('filterDest');
    const filterSource = document.getElementById('filterSource');
    const viewCalendarBtn = document.getElementById('viewCalendar');
    const viewTableBtn = document.getElementById('viewTable');

    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');

    const modal = document.getElementById('promoModal');
    const modalData = document.getElementById('modalData');
    const closeModal = document.querySelector('.close-modal');

    // Initialize
    function init() {
        populateFilters();
        render();
        setupEventListeners();
    }

    function populateFilters() {
        const sources = new Set();
        promotions.forEach(promo => {
            if (promo.source) sources.add(promo.source);
            if (promo.participants) {
                promo.participants.forEach(p => {
                    if (p !== 'Todos os bancos' && p !== 'Todos os programas' && p !== 'Todos os programas ') {
                        sources.add(p);
                    }
                });
            }
        });

        const currentValue = filterSource.value;
        filterSource.innerHTML = '<option value="all">Todas as Origens</option>';

        const sortedSources = Array.from(sources).sort((a, b) => a.localeCompare(b));
        sortedSources.forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            filterSource.appendChild(option);
        });

        // Restore value if it still exists
        if (Array.from(sources).includes(currentValue)) {
            filterSource.value = currentValue;
        }
    }

    function render() {
        const filteredPromos = getFilteredPromotions();

        currentYearDisplay.textContent = currentYear;
        renderAnniversaries();

        if (currentView === 'calendar') {
            calendarDisplay.classList.remove('sim-hidden');
            tableDisplay.classList.add('sim-hidden');
            renderCalendar(filteredPromos);
            renderTimeline(filteredPromos); // Timeline is used for mobile even in calendar view
        } else {
            calendarDisplay.classList.add('sim-hidden');
            tableDisplay.classList.remove('sim-hidden');
            renderTable(filteredPromos);
        }
    }

    function getFilteredPromotions() {
        return promotions.filter(promo => {
            const promoDate = getLocalDate(promo.startDate);
            const yearMatch = promoDate.getFullYear() === currentYear;
            const destMatch = filterDest.value === 'all' || promo.dest === filterDest.value;

            let sourceMatch = filterSource.value === 'all';
            if (!sourceMatch) {
                const selected = filterSource.value;
                sourceMatch =
                    promo.source === selected ||
                    (promo.participants && promo.participants.includes(selected)) ||
                    (promo.participants && (promo.participants.includes('Todos os bancos') || promo.participants.includes('Todos os programas')));
            }

            return yearMatch && destMatch && sourceMatch;
        });
    }

    function renderAnniversaries() {
        anniversaryBar.innerHTML = '';
        const currentMonth = new Date().getMonth();
        const monthAnniversaries = anniversaries.filter(a => a.month === currentMonth);

        monthAnniversaries.forEach(a => {
            const badge = document.createElement('div');
            badge.className = 'anniversary-badge';
            badge.style.cursor = 'pointer';
            badge.innerHTML = `🎂 Mês de Aniversário: <span>${a.program}</span>`;

            badge.title = `Aniversário de ${a.program} no dia ${a.day} de ${months[a.month]}`;
            badge.onclick = () => showAnniversaryDetails(a);
            anniversaryBar.appendChild(badge);
        });
    }

    function renderCalendar(promos) {
        calendarDisplay.innerHTML = '';

        months.forEach((monthName, index) => {
            const monthCard = document.createElement('div');
            monthCard.className = 'month-card';

            const monthPromos = promos.filter(p => getLocalDate(p.startDate).getMonth() === index);
            const monthAnniversary = anniversaries.find(a => a.month === index);

            monthCard.innerHTML = `
                <h3>
                    ${monthName}
                    ${monthAnniversary ? `<span class="anniversary-icon" style="cursor:pointer" title="Aniversário ${monthAnniversary.program} (Dia ${monthAnniversary.day})">🎂</span>` : ''}
                </h3>
            `;

            if (monthAnniversary) {
                const icon = monthCard.querySelector('.anniversary-icon');
                icon.onclick = () => showAnniversaryDetails(monthAnniversary);
            }

            const badgesContainer = document.createElement('div');
            badgesContainer.className = 'promo-badges';

            if (monthPromos.length === 0) {
                badgesContainer.innerHTML = '<div class="empty-month">Nenhuma promoção</div>';
            } else {
                monthPromos.sort((a, b) => getLocalDate(a.startDate) - getLocalDate(b.startDate)).forEach(promo => {
                    const badge = document.createElement('div');
                    badge.className = 'promo-badge';
                    const colors = programColors[promo.dest] || { primary: '#333', secondary: '#eee' };
                    badge.style.backgroundColor = colors.secondary;
                    badge.style.borderLeftColor = colors.primary;
                    badge.style.color = colors.primary;

                    badge.innerHTML = `
                        <span>${promo.dest}</span>
                        <span> <- ${promo.source}</span>
                        <span class="bonus-text">${promo.bonus}%</span>
                    `;
                    badge.onclick = () => showPromoDetails(promo);
                    badgesContainer.appendChild(badge);
                });
            }

            monthCard.appendChild(badgesContainer);
            calendarDisplay.appendChild(monthCard);
        });
    }

    function renderTable(promos) {
        promoTableBody.innerHTML = '';

        promos.sort((a, b) => getLocalDate(a.startDate) - getLocalDate(b.startDate)).forEach(promo => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.onclick = () => showPromoDetails(promo);

            row.innerHTML = `
                <td>${formatDate(promo.startDate)}</td>
                <td>${promo.source}</td>
                <td><span style="font-weight:700; color:${programColors[promo.dest]?.primary || 'inherit'}">${promo.dest}</span></td>
                <td><strong>${promo.bonus}%</strong></td>
                <td>${promo.participants.join(', ')}</td>
            `;
            promoTableBody.appendChild(row);
        });
    }

    function renderTimeline(promos) {
        timelineDisplay.innerHTML = '';
        const sortedPromos = [...promos].sort((a, b) => getLocalDate(a.startDate) - getLocalDate(b.startDate));

        if (sortedPromos.length === 0) {
            timelineDisplay.innerHTML = '<div class="empty-month" style="padding:40px">Nenhuma promoção encontrada para este período.</div>';
            return;
        }

        sortedPromos.forEach(promo => {
            const item = document.createElement('div');
            item.className = 'timeline-item';

            item.innerHTML = `
                <div class="timeline-date">
                    ${formatDateShort(promo.startDate)}
                </div>
                <div class="timeline-content" onclick="showPromoDetails(${promo.id})">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                        <strong style="color:${programColors[promo.dest]?.primary || 'inherit'}">${promo.dest}</strong>
                        <span style="background:${programColors[promo.dest]?.secondary || '#eee'}; color:${programColors[promo.dest]?.primary || '#333'}; padding:2px 8px; border-radius:12px; font-size:0.8rem; font-weight:800">${promo.bonus}%</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary)">
                        Origem: ${promo.source}<br>
                        Até ${formatDate(promo.endDate)}
                    </div>
                </div>
            `;
            // Add event listener manually since we use ID in string
            item.querySelector('.timeline-content').onclick = () => showPromoDetails(promo);
            timelineDisplay.appendChild(item);
        });
    }

    function showPromoDetails(promo) {
        modalData.innerHTML = `
            <div style="text-align:center; margin-bottom:24px">
                <div style="font-size:3rem; margin-bottom:10px">${getProgramIcon(promo.dest)}</div>
                <h2 style="color:${programColors[promo.dest]?.primary || 'inherit'}; margin-bottom:5px">${promo.bonus}% de Bônus</h2>
                <p style="color:var(--text-secondary)">Transferência de <strong>${promo.source}</strong> para <strong>${promo.dest}</strong></p>
            </div>
            
            <div style="background:#F9FAFB; padding:16px; border-radius:12px; margin-bottom:16px">
                <div style="display:grid; grid-template-columns: 1fr; gap:15px; margin-bottom:12px">
                    <div>
                        <span style="display:block; font-size:0.75rem; color:#6B7280; text-transform:uppercase; font-weight:700">Válido até</span>
                        <strong>${formatDate(promo.endDate)}</strong>
                    </div>
                </div>
                <div>
                    <span style="display:block; font-size:0.75rem; color:#6B7280; text-transform:uppercase; font-weight:700; margin-bottom:5px">Bancos Participantes</span>
                    <div style="display:flex; flex-wrap:wrap; gap:8px">
                        ${promo.participants.map(p => `<span style="background:white; border:1px solid #E5E7EB; padding:2px 10px; border-radius:5px; font-size:0.85rem">${p}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div style="border-top:1px solid #F3F4F6; padding-top:16px">
                 <span style="display:block; font-size:0.75rem; color:#6B7280; text-transform:uppercase; font-weight:700; margin-bottom:10px">Regras Principais</span>
                 ${Array.isArray(promo.rules)
                ? `<ul style="font-size:0.9rem; line-height:1.5; color:var(--text-primary); padding-left:20px; margin:0">
                        ${promo.rules.map(rule => `<li style="margin-bottom:6px">${rule}</li>`).join('')}
                       </ul>`
                : `<p style="font-size:0.9rem; line-height:1.5; color:var(--text-primary); margin:0">${promo.rules}</p>`
            }
            </div>
        `;
        modal.style.display = 'block';
    }

    function showAnniversaryDetails(anniversary) {
        modalData.innerHTML = `
            <div style="text-align:center; margin-bottom:24px">
                <div style="font-size:4rem; margin-bottom:15px">🎂</div>
                <h2 style="color:${programColors[anniversary.program]?.primary || 'inherit'}; margin-bottom:10px">Parabéns, ${anniversary.program}!</h2>
                <p style="color:var(--text-secondary); font-size:1.1rem">O aniversário do programa é dia <strong>${anniversary.day} de ${months[anniversary.month]}</strong>.</p>
            </div>
            
            <div style="background:#FFF9E6; border:1px solid #FFEBB3; padding:20px; border-radius:12px; margin-bottom:24px">
                <p style="font-size:0.95rem; line-height:1.6; color:#856404; margin:0">
                    <strong>💡 Por que isso é importante?</strong><br>
                    Meses de aniversário costumam trazer as <strong>melhores promoções</strong> do ano para o programa, como bônus de transferência de 100% ou mais, além de ofertas exclusivas em compras bonificadas.
                </p>
            </div>

            <div style="text-align:center">
                <p style="font-size:0.85rem; color:var(--text-muted)">Fique atento às notificações para não perder nenhuma oportunidade neste mês!</p>
            </div>
        `;
        modal.style.display = 'block';
    }

    // Helpers
    function getLocalDate(dateStr) {
        // Force parsing as local time by adding midnight time or using split
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    function formatDate(dateStr) {
        const date = getLocalDate(dateStr);
        return date.toLocaleDateString('pt-BR');
    }

    function formatDateShort(dateStr) {
        const date = getLocalDate(dateStr);
        const day = date.getDate();
        const monthShort = months[date.getMonth()].substring(0, 3);
        return `${day} ${monthShort}`;
    }

    function getProgramIcon(program) {
        if (program.includes('Smiles')) return '🧡';
        if (program.includes('Azul')) return '💙';
        if (program.includes('Latam')) return '❤️';
        if (program.includes('Livelo')) return '💗';
        if (program.includes('Esfera')) return '🖤';
        return '✈️';
    }

    function setupEventListeners() {
        filterDest.addEventListener('change', render);
        filterSource.addEventListener('change', render);

        viewCalendarBtn.addEventListener('click', () => {
            currentView = 'calendar';
            viewCalendarBtn.classList.add('active');
            viewTableBtn.classList.remove('active');
            render();
        });

        viewTableBtn.addEventListener('click', () => {
            currentView = 'table';
            viewTableBtn.classList.add('active');
            viewCalendarBtn.classList.remove('active');
            render();
        });

        prevYearBtn.addEventListener('click', () => {
            currentYear--;
            render();
        });

        nextYearBtn.addEventListener('click', () => {
            currentYear++;
            render();
        });

        closeModal.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = 'none';
        }
    }

    init();
});
