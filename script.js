'use strict';

const STORAGE_KEY = 'bvmacSimulatorStateV1';

const DEFAULT_STOCKS = [
  { id: 1, name: 'Socapalm', sector: 'Agro-industrie', price: 25000, div: 2325, growth: 5.2, startYear: 2015 },
  { id: 2, name: 'Safacam', sector: 'Agro-industrie', price: 22000, div: 2200, growth: 4.8, startYear: 2015 },
  { id: 3, name: 'SEMC', sector: 'Agroalimentaire', price: 10000, div: 600, growth: 3.5, startYear: 2015 },
  { id: 4, name: 'La Régionale', sector: 'Banque / MF', price: 42000, div: 0, growth: 0, startYear: 2021 },
  { id: 5, name: 'Bange Bank', sector: 'Secteur Bancaire', price: 206000, div: 4830, growth: 2, startYear: 2022 },
  { id: 6, name: 'SCG-Ré', sector: 'Assurance', price: 12000, div: 510, growth: 6.2, startYear: 2023 }
];

let stocks = DEFAULT_STOCKS.map(stock => ({ ...stock }));
let trajectoryChartInstance = null;
let metricsChartInstance = null;
let lastSimulationResults = null;

const $ = id => document.getElementById(id);

function showMessage(message, isError = false) {
  const output = $('formMessage');
  output.textContent = message;
  output.className = `text-sm ${isError ? 'text-red-600' : 'text-emerald-700'}`;
}

function readNumber(id, min, max) {
  const input = $(id);
  const value = input.value.trim();
  const number = Number(value);

  if (value === '' || !Number.isFinite(number) || number < min || number > max) {
    input.setAttribute('aria-invalid', 'true');
    throw new Error(`${input.labels[0].textContent.trim()} : entre ${min} et ${max}.`);
  }

  input.removeAttribute('aria-invalid');
  return number;
}

function readSettings() {
  const reinvest = Number($('tauxReinvest').value);
  const slippage = Number($('delaiSlippage').value);

  if (![1, 0.75, 0.5, 0.25].includes(reinvest) || ![1, 2, 3].includes(slippage)) {
    throw new Error('Choisissez une valeur valide pour le réinvestissement et le délai.');
  }

  return {
    capitalInitial: readNumber('capitalInitial', 1, 1_000_000_000_000),
    ircmRate: readNumber('tauxIRCM', 0, 100) / 100,
    feeRate: readNumber('fraisCourtage', 0, 100) / 100,
    rfRate: readNumber('tauxSansRisque', 0, 100) / 100,
    reinvestFactor: reinvest,
    slippageMonths: slippage
  };
}

function isValidStock(stock) {
  return stock &&
    Number.isFinite(Number(stock.price)) && Number(stock.price) > 0 &&
    Number.isFinite(Number(stock.div)) && Number(stock.div) >= 0 &&
    Number.isFinite(Number(stock.growth)) && Number(stock.growth) >= -99 && Number(stock.growth) <= 100 &&
    Number.isInteger(Number(stock.startYear)) && Number(stock.startYear) >= 2015 && Number(stock.startYear) <= 2025 &&
    String(stock.name || '').trim() && String(stock.sector || '').trim();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      settings: {
        capital: $('capitalInitial').value,
        ircm: $('tauxIRCM').value,
        fee: $('fraisCourtage').value,
        rf: $('tauxSansRisque').value,
        reinvest: $('tauxReinvest').value,
        slippage: $('delaiSlippage').value
      },
      stocks,
      theme: document.body.classList.contains('dark') ? 'dark' : 'light'
    }));
  } catch (error) {
    console.warn('Impossible de sauvegarder les paramètres.', error);
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return;

    const settings = saved.settings || {};
    if (settings.capital !== undefined) $('capitalInitial').value = settings.capital;
    if (settings.ircm !== undefined) $('tauxIRCM').value = settings.ircm;
    if (settings.fee !== undefined) $('fraisCourtage').value = settings.fee;
    if (settings.rf !== undefined) $('tauxSansRisque').value = settings.rf;
    if (['1', '0.75', '0.5', '0.25'].includes(String(settings.reinvest))) $('tauxReinvest').value = settings.reinvest;
    if (['1', '2', '3'].includes(String(settings.slippage))) $('delaiSlippage').value = settings.slippage;

    if (Array.isArray(saved.stocks) && saved.stocks.length && saved.stocks.every(isValidStock)) {
      stocks = saved.stocks;
    }
    if (saved.theme === 'dark') document.body.classList.add('dark');
  } catch (error) {
    console.warn('Les paramètres sauvegardés sont illisibles.', error);
  }
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const fields = {
    capital: 'capitalInitial',
    ircm: 'tauxIRCM',
    frais: 'fraisCourtage',
    rf: 'tauxSansRisque',
    reinvest: 'tauxReinvest',
    slippage: 'delaiSlippage'
  };

  for (const [parameter, id] of Object.entries(fields)) {
    if (params.has(parameter)) $(id).value = params.get(parameter);
  }

  if (params.has('actions')) {
    try {
      const parsed = JSON.parse(params.get('actions'));
      if (Array.isArray(parsed) && parsed.length && parsed.every(isValidStock)) stocks = parsed;
      else throw new Error('Liste invalide');
    } catch {
      showMessage('La liste d’actions du lien est invalide.', true);
    }
  }
}

function updateShareUrl() {
  const params = new URLSearchParams({
    capital: $('capitalInitial').value,
    ircm: $('tauxIRCM').value,
    frais: $('fraisCourtage').value,
    rf: $('tauxSansRisque').value,
    reinvest: $('tauxReinvest').value,
    slippage: $('delaiSlippage').value,
    actions: JSON.stringify(stocks)
  });
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function renderStockTable() {
  const tbody = $('stockTableBody');
  tbody.replaceChildren();

  stocks.forEach(stock => {
    const row = document.createElement('tr');
    const values = [
      stock.name, stock.sector, `${Number(stock.price).toLocaleString()} FCFA`,
      `${Number(stock.div).toLocaleString()} FCFA`, `+${stock.growth}%`, stock.startYear
    ];

    values.forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-btn secondary-btn';
    button.setAttribute('aria-label', `Supprimer ${stock.name}`);
    button.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
    button.addEventListener('click', () => deleteStock(stock.id));
    actionCell.appendChild(button);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
}

function deleteStock(id) {
  if (stocks.length <= 1) {
    showMessage('Le portefeuille doit contenir au moins une société cotée.', true);
    return;
  }
  stocks = stocks.filter(stock => stock.id !== id);
  renderStockTable();
  runSimulation();
}

function resetDefaults() {
  stocks = DEFAULT_STOCKS.map(stock => ({ ...stock }));
  $('capitalInitial').value = 10000000;
  $('tauxIRCM').value = 16.5;
  $('fraisCourtage').value = 1.5;
  $('tauxSansRisque').value = 4.5;
  $('tauxReinvest').value = '1';
  $('delaiSlippage').value = '1';
  renderStockTable();
  runSimulation();
}

function runSimulation() {
  try {
    const { capitalInitial, ircmRate, feeRate, rfRate, reinvestFactor, slippageMonths } = readSettings();

    if (!stocks.length || !stocks.some(stock => Number(stock.startYear) <= 2015)) {
      throw new Error('Ajoutez au moins une action cotée en 2015 pour démarrer la simulation.');
    }
    if (!stocks.every(isValidStock)) throw new Error('Une ou plusieurs actions ont des valeurs invalides.');

    const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    let stratA_cash = 0;
    let stratB_cash = 0;
    const stratA_shares = {};
    const stratB_shares = {};
    const active2015 = stocks.filter(stock => stock.startYear <= 2015);
    const capitalPerStock = capitalInitial / active2015.length;

    stocks.forEach(stock => {
      if (stock.startYear <= 2015) {
        const quantity = Math.floor(capitalPerStock / (stock.price * (1 + feeRate)));
        stratA_shares[stock.id] = quantity;
        stratB_shares[stock.id] = quantity;
        stratA_cash += capitalPerStock - quantity * stock.price * (1 + feeRate);
        stratB_cash += capitalPerStock - quantity * stock.price * (1 + feeRate);
      } else {
        stratA_shares[stock.id] = 0;
        stratB_shares[stock.id] = 0;
      }
    });

    const historyData = [];

    years.forEach(year => {
      const newlyListed = stocks.filter(stock => stock.startYear === year && year > 2015);
      newlyListed.forEach(stock => {
        const price = stock.price * Math.pow(1 + stock.growth / 100, year - stock.startYear);
        if (stratB_cash > price * (1 + feeRate)) {
          const quantity = Math.floor((stratB_cash * 0.4) / (price * (1 + feeRate)));
          stratB_shares[stock.id] += quantity;
          stratB_cash -= quantity * price * (1 + feeRate);
        }
      });

      let yearDividendA = 0;
      let yearDividendB = 0;
      let newSharesB = 0;

      stocks.forEach(stock => {
        if (stock.startYear <= year) {
          const dividend = stock.div * Math.pow(1 + stock.growth / 100, year - stock.startYear) * (1 - ircmRate);
          yearDividendA += stratA_shares[stock.id] * dividend;
          yearDividendB += stratB_shares[stock.id] * dividend;
        }
      });

      stratA_cash += yearDividendA;

      const reinvestPool = (stratB_cash + yearDividendB) * reinvestFactor;
      const retainedCash = (stratB_cash + yearDividendB) * (1 - reinvestFactor);
      const dividendStocks = stocks.filter(stock => stock.startYear <= year && stock.div > 0);

      if (dividendStocks.length && reinvestPool > 0) {
        const poolPerStock = reinvestPool / dividendStocks.length;
        let spent = 0;

        dividendStocks.forEach(stock => {
          const currentPrice = stock.price * Math.pow(1 + (stock.growth * 0.8) / 100, year - stock.startYear);
          const adjustedPrice = currentPrice * (1 + slippageMonths * 0.003);
          const quantity = Math.floor(poolPerStock / (adjustedPrice * (1 + feeRate)));

          if (quantity > 0) {
            stratB_shares[stock.id] += quantity;
            newSharesB += quantity;
            spent += quantity * adjustedPrice * (1 + feeRate);
          }
        });

        stratB_cash = (reinvestPool - spent) + retainedCash;
      } else {
        stratB_cash += yearDividendB;
      }

      let equityA = 0;
      let equityB = 0;
      stocks.forEach(stock => {
        if (stock.startYear <= year) {
          const currentPrice = stock.price * Math.pow(1 + (stock.growth * 0.8) / 100, year - stock.startYear);
          equityA += stratA_shares[stock.id] * currentPrice;
          equityB += stratB_shares[stock.id] * currentPrice;
        }
      });

      const wealthA = equityA + stratA_cash;
      const wealthB = equityB + stratB_cash;

      historyData.push({
        year,
        wealthA: Math.round(wealthA),
        wealthB: Math.round(wealthB),
        diffAbs: Math.round(wealthB - wealthA),
        surperf: wealthA > 0 ? Number(((wealthB / wealthA - 1) * 100).toFixed(2)) : 0,
        divNetB: Math.round(yearDividendB),
        newSharesB
      });
    });

    const finalA = historyData.at(-1).wealthA;
    const finalB = historyData.at(-1).wealthB;
    const periods = years.length;
    const cagrA = finalA > 0 ? (Math.pow(finalA / capitalInitial, 1 / periods) - 1) * 100 : 0;
    const cagrB = finalB > 0 ? (Math.pow(finalB / capitalInitial, 1 / periods) - 1) * 100 : 0;

    const returnsA = [];
    const returnsB = [];
    for (let i = 1; i < historyData.length; i++) {
      returnsA.push(historyData[i - 1].wealthA > 0 ? historyData[i].wealthA / historyData[i - 1].wealthA - 1 : 0);
      returnsB.push(historyData[i - 1].wealthB > 0 ? historyData[i].wealthB / historyData[i - 1].wealthB - 1 : 0);
    }

    const mean = values => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
    const volatility = values => Math.sqrt(
      values.reduce((sum, value) => sum + Math.pow(value - mean(values), 2), 0) /
      Math.max(1, values.length - 1)
    );

    const volA = volatility(returnsA);
    const volB = volatility(returnsB);
    const sharpeA = volA > 0 ? ((cagrA / 100) - rfRate) / volA : 0;
    const sharpeB = volB > 0 ? ((cagrB / 100) - rfRate) / volB : 0;

    const downsideDeviation = values => Math.sqrt(
      values.filter(value => value < rfRate)
        .reduce((sum, value) => sum + Math.pow(value - rfRate, 2), 0) /
      (values.length || 1)
    );
    const downsideA = downsideDeviation(returnsA);
    const downsideB = downsideDeviation(returnsB);
    const sortinoA = downsideA > 0 ? ((cagrA / 100) - rfRate) / downsideA : 0;
    const sortinoB = downsideB > 0 ? ((cagrB / 100) - rfRate) / downsideB : 0;

    const maxDrawdown = key => {
      let peak = historyData[0][key];
      let maximum = 0;
      historyData.forEach(point => {
        peak = Math.max(peak, point[key]);
        if (peak > 0) maximum = Math.max(maximum, (peak - point[key]) / peak);
      });
      return maximum * 100;
    };

    lastSimulationResults = {
      historyData, finalA, finalB, cagrA, cagrB,
      sharpeA, sharpeB, sortinoA, sortinoB,
      maxDDA: maxDrawdown('wealthA'),
      maxDDB: maxDrawdown('wealthB')
    };

    updateDashboardUI(lastSimulationResults);
    saveState();
    updateShareUrl();
    showMessage('Simulation mise à jour.');
  } catch (error) {
    showMessage(error.message, true);
  }
}

function updateDashboardUI(results) {
  if (!results) return;

  $('kpiPatrimoineB').textContent = `${results.finalB.toLocaleString()} FCFA`;
  $('kpiPatrimoineA').textContent = `Stratégie A (Cash) : ${results.finalA.toLocaleString()} FCFA`;
  $('kpiSurperf').textContent = `${((results.finalB / results.finalA - 1) * 100).toFixed(2)} %`;
  $('kpiCAGRB').textContent = `${results.cagrB.toFixed(2)} %`;
  $('kpiCAGRA').textContent = `Stratégie A : ${results.cagrA.toFixed(2)} %`;
  $('kpiEcartCAGR').textContent = `${(results.cagrB - results.cagrA).toFixed(2)} pts`;
  $('kpiSharpeB').textContent = results.sharpeB.toFixed(2);
  $('kpiSharpeA').textContent = `Stratégie A : ${results.sharpeA.toFixed(2)}`;
  $('kpiMaxDDB').textContent = `-${results.maxDDB.toFixed(2)} %`;
  $('kpiMaxDDA').textContent = `Stratégie A : -${results.maxDDA.toFixed(2)} %`;

  const tbody = $('backtestTableBody');
  tbody.replaceChildren();

  results.historyData.forEach(point => {
    const row = document.createElement('tr');
    [
      point.year,
      `${point.wealthA.toLocaleString()} FCFA`,
      `${point.wealthB.toLocaleString()} FCFA`,
      `${point.diffAbs.toLocaleString()} FCFA`,
      `${point.surperf}%`,
      `${point.divNetB.toLocaleString()} FCFA`,
      point.newSharesB
    ].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });

  if (typeof Chart === 'undefined') return;

  const dark = document.body.classList.contains('dark');
  const tickColor = dark ? '#e7e2d9' : '#555';

  if (trajectoryChartInstance) trajectoryChartInstance.destroy();
  trajectoryChartInstance = new Chart($('trajectoryChart'), {
    type: 'line',
    data: {
      labels: results.historyData.map(point => point.year),
      datasets: [
        {
          label: 'Stratégie B (DRIP)',
          data: results.historyData.map(point => point.wealthB),
          borderColor: '#D4AF37',
          backgroundColor: 'rgba(212,175,55,.12)',
          borderWidth: 3,
          fill: true,
          tension: .3
        },
        {
          label: 'Stratégie A (Cash)',
          data: results.historyData.map(point => point.wealthA),
          borderColor: '#4A2E2B',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: .3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tickColor } } },
      scales: {
        x: { ticks: { color: tickColor } },
        y: { ticks: { color: tickColor, callback: value => `${(value / 1000000).toFixed(1)} M` } }
      }
    }
  });

  if (metricsChartInstance) metricsChartInstance.destroy();
  metricsChartInstance = new Chart($('metricsChart'), {
    type: 'bar',
    data: {
      labels: ['Sharpe', 'Sortino'],
      datasets: [
        { label: 'Stratégie B (DRIP)', data: [results.sharpeB, results.sortinoB], backgroundColor: '#D4AF37' },
        { label: 'Stratégie A (Cash)', data: [results.sharpeA, results.sortinoA], backgroundColor: '#4A2E2B' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tickColor } } },
      scales: { x: { ticks: { color: tickColor } }, y: { beginAtZero: true, ticks: { color: tickColor } } }
    }
  });
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!lastSimulationResults) return;
  const rows = [
    ['Annee', 'Strategie_A_FCFA', 'Strategie_B_FCFA', 'Ecart_Absolu_FCFA', 'Surperformance_Pct', 'Dividendes_Nets_B_FCFA', 'Actions_Nouvelles_B'],
    ...lastSimulationResults.historyData.map(point => [
      point.year, point.wealthA, point.wealthB, point.diffAbs,
      point.surperf, point.divNetB, point.newSharesB
    ])
  ];
  downloadFile('Backtest_BVMAC_Dividendes.csv', '\ufeff' + rows.map(row => row.join(';')).join('\n'), 'text/csv;charset=utf-8');
}

function exportConfig() {
  const config = {
    exportedAt: new Date().toISOString(),
    settings: {
      capitalInitial: $('capitalInitial').value,
      tauxIRCM: $('tauxIRCM').value,
      fraisCourtage: $('fraisCourtage').value,
      tauxSansRisque: $('tauxSansRisque').value,
      tauxReinvest: $('tauxReinvest').value,
      delaiSlippage: $('delaiSlippage').value
    },
    stocks
  };
  downloadFile('configuration-simulateur-bvmac.json', JSON.stringify(config, null, 2), 'application/json');
}

async function shareSimulation() {
  updateShareUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    showMessage('Lien de partage copié.');
  } catch {
    window.prompt('Copiez le lien de partage :', location.href);
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  $('themeToggle').innerHTML = `<i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
  $('themeToggle').setAttribute('aria-label', isDark ? 'Activer le mode clair' : 'Activer le mode sombre');
  saveState();
  if (lastSimulationResults) updateDashboardUI(lastSimulationResults);
}

function addStock(event) {
  event.preventDefault();

  const stock = {
    id: Date.now(),
    name: $('stockName').value.trim(),
    sector: $('stockSector').value.trim(),
    price: Number($('stockPrice').value),
    div: Number($('stockDiv').value),
    growth: Number($('stockGrowth').value),
    startYear: Number($('stockYear').value)
  };

  if (!isValidStock(stock)) {
    showMessage('Vérifiez les valeurs saisies pour cette action.', true);
    return;
  }

  stocks.push(stock);
  $('stockDialog').close();
  $('stockForm').reset();
  renderStockTable();
  runSimulation();
}

function init() {
  restoreState();
  applyUrlParams();

  const dark = document.body.classList.contains('dark');
  $('themeToggle').innerHTML = `<i class="fa-solid ${dark ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
  $('themeToggle').setAttribute('aria-label', dark ? 'Activer le mode clair' : 'Activer le mode sombre');

  renderStockTable();
  runSimulation();

  $('simulatorForm').addEventListener('submit', event => {
    event.preventDefault();
    runSimulation();
  });

  ['capitalInitial', 'tauxIRCM', 'fraisCourtage', 'tauxSansRisque', 'tauxReinvest', 'delaiSlippage'].forEach(id => {
    $(id).addEventListener('input', saveState);
    $(id).addEventListener('change', runSimulation);
  });

  $('resetBtn').addEventListener('click', resetDefaults);
  $('themeToggle').addEventListener('click', toggleTheme);
  $('addStockBtn').addEventListener('click', () => $('stockDialog').showModal());
  $('cancelStockBtn').addEventListener('click', () => $('stockDialog').close());
  $('stockForm').addEventListener('submit', addStock);
  $('exportCsvBtn').addEventListener('click', exportCSV);
  $('exportConfigBtn').addEventListener('click', exportConfig);
  $('shareBtn').addEventListener('click', shareSimulation);

  $('menuToggle').addEventListener('click', () => {
    const panel = $('controlsPanel');
    const isOpen = panel.classList.toggle('mobile-open');
    $('menuToggle').setAttribute('aria-expanded', String(isOpen));
    if (isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(error => {
        console.warn('Service worker non enregistré.', error);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
