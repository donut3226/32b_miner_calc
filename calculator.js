// calculator.js
// ============================================================
// Home Miner Rewards Calculator — 32Bitcoins
// All calculation logic and UI interactivity
// ============================================================

// ============================================================
// Constants
// ============================================================
const BLOCK_REWARD_BTC      = 3.125;        // post-4th-halving (April 2024)
const SATS_PER_BTC          = 1e8;
const SECONDS_PER_DAY       = 86400;
const DIFFICULTY_MULTIPLIER = 4294967296;   // 2^32

// Static fallback values — replaced by api.js when wired up
const FALLBACK_BTC_PRICE_AUD = 150000;
const FALLBACK_BTC_PRICE_USD = 95000;
const FALLBACK_DIFFICULTY    = 113757508067674;

// Hashrate unit → TH/s multipliers
const UNIT_TO_TH = { KH: 1e-9, MH: 1e-6, GH: 1e-3, TH: 1, PH: 1e3, EH: 1e6 };

// ============================================================
// Pure calculation functions
// ============================================================

/**
 * Effective hashrate in H/s after applying uptime.
 */
function effectiveHashrate(hashrate_TH, uptime_pct) {
  return hashrate_TH * 1e12 * (uptime_pct / 100);
}

/**
 * Expected BTC mined per day via pool (after pool fee applied).
 */
function dailyBTC(hashrate_TH, uptime_pct, difficulty, poolFee_pct) {
  const effectiveH  = effectiveHashrate(hashrate_TH, uptime_pct);
  const blocksPerDay = (effectiveH * SECONDS_PER_DAY) / (difficulty * DIFFICULTY_MULTIPLIER);
  return blocksPerDay * BLOCK_REWARD_BTC * (1 - poolFee_pct / 100);
}

/**
 * Convert BTC to satoshis (rounded to nearest sat).
 */
function btcToSats(btc) {
  return Math.round(btc * SATS_PER_BTC);
}

/**
 * Daily electricity cost in AUD.
 */
function dailyElectricityCost(power_W, uptime_pct, electricityRate_AUD) {
  const kwhPerDay = (power_W / 1000) * 24 * (uptime_pct / 100);
  return kwhPerDay * electricityRate_AUD;
}

/**
 * Minimum BTC price (AUD) at which daily revenue covers electricity.
 * Returns null if btcPerDay is zero.
 */
function btcPriceFloor(elecCostPerDay_AUD, btcPerDay) {
  if (btcPerDay <= 0) return null;
  return elecCostPerDay_AUD / btcPerDay;
}

/**
 * Breakeven days accounting for annual difficulty growth.
 * Iterates day-by-day (max 10 years = 3650 days).
 * Returns null if never breaks even within that window.
 */
function breakevenDays(hardwareCost_AUD, baseDailyBTC, dailyElecCost_AUD, btcPrice_AUD, annualDifficultyGrowth_pct) {
  if (hardwareCost_AUD <= 0) return 0;
  if (baseDailyBTC <= 0 || btcPrice_AUD <= 0) return null;

  const dailyDecayFactor = Math.pow(1 + annualDifficultyGrowth_pct / 100, 1 / 365);
  let cumulative = 0;
  const maxDays  = 365 * 10;

  for (let day = 1; day <= maxDays; day++) {
    // Each day, difficulty has grown so effective BTC earned shrinks
    const btcToday     = baseDailyBTC / Math.pow(dailyDecayFactor, day - 1);
    const revenueToday = btcToday * btcPrice_AUD;
    cumulative        += revenueToday - dailyElecCost_AUD;
    if (cumulative >= hardwareCost_AUD) return day;
  }

  return null;
}

/**
 * Human-readable breakeven string.
 */
function formatBreakeven(days) {
  if (days === null) return 'Never (10yr+)';
  if (days === 0)    return 'No cost entered';
  if (days <= 365)   return `${days} days`;
  const years = (days / 365).toFixed(1);
  return `${years} yrs`;
}

/**
 * What 1 year of mined BTC is worth at 2×, 5×, 10× the current price.
 * Simplified: uses baseDailyBTC * 365 (ignores compounding difficulty).
 */
function hodlScenarios(baseDailyBTC, btcPrice_AUD) {
  const yearlyBTC = baseDailyBTC * 365;
  return {
    x2:  yearlyBTC * (btcPrice_AUD * 2),
    x5:  yearlyBTC * (btcPrice_AUD * 5),
    x10: yearlyBTC * (btcPrice_AUD * 10),
  };
}

/**
 * Sats you could buy directly with the hardware budget at current BTC price.
 */
function satsFromDirectBuy(hardwareCost_AUD, btcPrice_AUD) {
  if (btcPrice_AUD <= 0) return 0;
  return Math.round((hardwareCost_AUD / btcPrice_AUD) * SATS_PER_BTC);
}

/**
 * Solo block probability for a given duration (Poisson approximation).
 * No pool fee applied — this is raw solo odds.
 */
function soloBlockProbability(hashrate_TH, uptime_pct, difficulty, seconds) {
  const effectiveH     = effectiveHashrate(hashrate_TH, uptime_pct);
  const expectedBlocks = (effectiveH * seconds) / (difficulty * DIFFICULTY_MULTIPLIER);
  return 1 - Math.exp(-expectedBlocks);
}

/**
 * Expected days to find a solo block.
 */
function expectedDaysToSoloBlock(hashrate_TH, uptime_pct, difficulty) {
  const effectiveH   = effectiveHashrate(hashrate_TH, uptime_pct);
  if (effectiveH <= 0) return Infinity;
  const blocksPerDay = (effectiveH * SECONDS_PER_DAY) / (difficulty * DIFFICULTY_MULTIPLIER);
  if (blocksPerDay <= 0) return Infinity;
  return 1 / blocksPerDay;
}

/**
 * Human-readable expected solo block time.
 */
function formatExpectedSoloTime(days) {
  if (!isFinite(days) || days > 365 * 100000) return 'practically never';
  if (days < 1)    return 'less than a day';
  if (days < 30)   return `once every ~${Math.round(days)} days`;
  if (days < 365)  return `once every ~${Math.round(days / 30)} months`;
  const years = Math.round(days / 365);
  return `once every ~${years.toLocaleString()} years`;
}

/**
 * Human-readable probability as percentage or odds string.
 */
function formatProbability(p) {
  if (p <= 0) return '0%';
  if (p < 0.000001) {
    const odds = Math.round(1 / p);
    return `1 in ${odds.toLocaleString()}`;
  }
  if (p < 0.0001) return `${(p * 100).toFixed(6)}%`;
  if (p < 0.01)   return `${(p * 100).toFixed(4)}%`;
  return `${(p * 100).toFixed(2)}%`;
}

// ============================================================
// Number formatting
// ============================================================

function fmtSats(n) {
  return `${Math.round(n).toLocaleString()} sats`;
}

function fmtBTC(n) {
  if (n <= 0) return '0 BTC';
  if (n < 0.00000001) return '< 0.00000001 BTC';
  return `${n.toFixed(8)} BTC`;
}

function fmtAUD(n) {
  const abs = Math.abs(n);
  if (abs < 0.005) return 'A$0.00';
  const sign = n < 0 ? '−' : '';
  return `${sign}A$${abs.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUSD(n) {
  const abs = Math.abs(n);
  if (abs < 0.005) return 'US$0.00';
  const sign = n < 0 ? '−' : '';
  return `${sign}US$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================
// DOM helpers
// ============================================================

function $(id) { return document.getElementById(id); }

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

// ============================================================
// Miner dropdown
// ============================================================

async function loadMiners() {
  try {
    const resp = await fetch('miners.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    populateMinerDropdown(data);
  } catch (err) {
    console.error('Failed to load miners.json:', err);
  }
}

function populateMinerDropdown(data) {
  const select = $('miner-select');
  if (!select) return;

  data.categories.forEach(cat => {
    const group    = document.createElement('optgroup');
    group.label    = cat.name;

    cat.miners.forEach(miner => {
      const opt          = document.createElement('option');
      opt.value          = miner.id;
      opt.textContent    = miner.name;
      opt.dataset.hashrate = miner.hashrate_th !== null ? miner.hashrate_th : '';
      opt.dataset.power    = miner.power_w     !== null ? miner.power_w     : '';
      group.appendChild(opt);
    });

    select.appendChild(group);
  });
}

function initMinerSelect() {
  const select = $('miner-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    $('hashrate').value = opt.dataset.hashrate || '';
    $('power').value    = opt.dataset.power    || '';
  });
}

// ============================================================
// Read & validate inputs
// ============================================================

function readInputs() {
  return {
    hashrate:         (parseFloat($('hashrate').value) || 0) * (UNIT_TO_TH[$('hashrate-unit') ? $('hashrate-unit').value : 'TH'] || 1),
    power:            parseFloat($('power').value)             || 0,
    hardwareCost:     parseFloat($('hardware-cost').value)     || 0,
    resaleValue:      parseFloat($('resale-value').value)      || 0,
    electricityCost:  parseFloat($('electricity-cost').value)  || 0,
    poolFee:          parseFloat($('pool-fee').value)          || 0,
    uptime:           parseFloat($('uptime').value)            || 95,
    difficultyGrowth: parseFloat($('difficulty-growth').value) || 30,
    btcPriceAUD:      parseFloat($('btc-price-aud').value)     || FALLBACK_BTC_PRICE_AUD,
    btcPriceUSD:      parseFloat($('btc-price-usd').value)     || FALLBACK_BTC_PRICE_USD,
    difficulty:       parseFloat($('network-difficulty').value)|| FALLBACK_DIFFICULTY,
  };
}

function validateInputs(inputs) {
  if (inputs.hashrate <= 0)        return 'Enter a hashrate greater than 0 TH/s.';
  if (inputs.power <= 0)           return 'Enter power consumption greater than 0 watts.';
  if (inputs.electricityCost <= 0) return 'Enter your electricity cost (AUD per kWh).';
  if (inputs.btcPriceAUD <= 0)     return 'BTC price (AUD) must be greater than 0.';
  if (inputs.difficulty <= 0)      return 'Network difficulty must be greater than 0.';
  return null;
}

// ============================================================
// Main calculate + render
// ============================================================

function calculate() {
  const inputs = readInputs();
  const err    = validateInputs(inputs);
  if (err) { alert(err); return; }

  const {
    hashrate, power, hardwareCost, resaleValue,
    electricityCost, poolFee, uptime, difficultyGrowth,
    btcPriceAUD, btcPriceUSD, difficulty
  } = inputs;

  // Core daily figures
  const btcPerDay    = dailyBTC(hashrate, uptime, difficulty, poolFee);
  const satsPerDay   = btcToSats(btcPerDay);
  const elecPerDay   = dailyElectricityCost(power, uptime, electricityCost);
  const revAUD       = btcPerDay * btcPriceAUD;
  const revUSD       = btcPerDay * btcPriceUSD;
  const netPerDay    = revAUD - elecPerDay;

  // — Rewards Summary —
  setText('daily-sats',   fmtSats(satsPerDay));
  setText('monthly-sats', fmtSats(satsPerDay * 30));
  setText('yearly-sats',  fmtSats(satsPerDay * 365));

  setText('daily-revenue-aud',   fmtAUD(revAUD));
  setText('monthly-revenue-aud', fmtAUD(revAUD * 30));
  setText('yearly-revenue-aud',  fmtAUD(revAUD * 365));

  setText('daily-revenue-usd',   fmtUSD(revUSD));
  setText('monthly-revenue-usd', fmtUSD(revUSD * 30));
  setText('yearly-revenue-usd',  fmtUSD(revUSD * 365));

  setText('daily-elec',   fmtAUD(elecPerDay));
  setText('monthly-elec', fmtAUD(elecPerDay * 30));
  setText('yearly-elec',  fmtAUD(elecPerDay * 365));

  renderNetCell('daily-net',   netPerDay);
  renderNetCell('monthly-net', netPerDay * 30);
  renderNetCell('yearly-net',  netPerDay * 365);

  // — Breakeven —
  const bedays     = breakevenDays(hardwareCost, btcPerDay, elecPerDay, btcPriceAUD, difficultyGrowth);
  const trueBedays = breakevenDays(Math.max(0, hardwareCost - resaleValue), btcPerDay, elecPerDay, btcPriceAUD, difficultyGrowth);
  const floor      = btcPriceFloor(elecPerDay, btcPerDay);

  setText('breakeven-days',      hardwareCost > 0 ? formatBreakeven(bedays)     : 'No cost entered');
  setText('true-breakeven-days', hardwareCost > 0 ? formatBreakeven(trueBedays) : 'No cost entered');
  setText('price-floor',         floor !== null    ? fmtAUD(floor)              : '—');

  // — Hodl Scenarios —
  const hodl = hodlScenarios(btcPerDay, btcPriceAUD);
  setText('hodl-2x',  fmtAUD(hodl.x2));
  setText('hodl-5x',  fmtAUD(hodl.x5));
  setText('hodl-10x', fmtAUD(hodl.x10));

  // — Mining vs Buying —
  renderCompare(hardwareCost, btcPriceAUD, satsPerDay);

  // — Sensitivity Table —
  renderSensitivityTable(hardwareCost, btcPerDay, elecPerDay, btcPriceAUD, difficultyGrowth);

  // — Solo Stats —
  renderSoloStats(hashrate, uptime, difficulty, btcPriceAUD, btcPerDay, satsPerDay, elecPerDay);

  // Show results
  const results = $('results');
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderNetCell(id, value) {
  const el = $(id);
  if (!el) return;
  el.textContent = fmtAUD(value);
  el.className   = value >= 0 ? 'positive' : 'negative';
}

// ============================================================
// Simple mode calculate
// ============================================================

function calculateSimple() {
  const SIMPLE_UPTIME   = 95;
  const SIMPLE_POOL_FEE = 1;

  const hashrateRaw = parseFloat($('simple-hashrate').value) || 0;
  const unit        = $('simple-hashrate-unit').value;
  const hashrate_TH = hashrateRaw * (UNIT_TO_TH[unit] || 1);
  const power_W     = parseFloat($('simple-power').value) || 0;
  const powerCost   = parseFloat($('simple-power-cost').value) || 0;
  const currency    = $('simple-currency').value;

  if (hashrateRaw <= 0) { alert('Enter a hashrate greater than 0.'); return; }
  if (power_W <= 0)     { alert('Enter power consumption greater than 0 watts.'); return; }
  if (powerCost <= 0)   { alert('Enter your electricity cost per kWh.'); return; }

  const btcPriceAUD = parseFloat($('btc-price-aud').value) || FALLBACK_BTC_PRICE_AUD;
  const btcPriceUSD = parseFloat($('btc-price-usd').value) || FALLBACK_BTC_PRICE_USD;
  const difficulty  = parseFloat($('network-difficulty').value) || FALLBACK_DIFFICULTY;
  const btcPrice    = currency === 'AUD' ? btcPriceAUD : btcPriceUSD;
  const fmtFiat     = currency === 'AUD' ? fmtAUD : fmtUSD;

  // Core figures
  const btcPerDay  = dailyBTC(hashrate_TH, SIMPLE_UPTIME, difficulty, SIMPLE_POOL_FEE);
  const satsPerDay = btcToSats(btcPerDay);
  const elecPerDay = dailyElectricityCost(power_W, SIMPLE_UPTIME, powerCost);

  // Electricity expressed in BTC/sats
  const elecBTC  = btcPrice > 0 ? elecPerDay / btcPrice : 0;
  const elecSats = btcToSats(elecBTC);

  // Profit
  const profitBTC  = btcPerDay - elecBTC;
  const profitSats = btcToSats(profitBTC);
  const profitFiat = btcPerDay * btcPrice - elecPerDay;

  // Render income
  setText('simple-income-sats', fmtSats(satsPerDay));
  setText('simple-income-btc',  fmtBTC(btcPerDay));
  setText('simple-income-fiat', fmtFiat(btcPerDay * btcPrice));

  // Render electricity
  setText('simple-elec-sats', fmtSats(elecSats));
  setText('simple-elec-btc',  fmtBTC(elecBTC));
  setText('simple-elec-fiat', fmtFiat(elecPerDay));

  // Render profit (coloured)
  const profitSatsEl = $('simple-profit-sats');
  const profitFiatEl = $('simple-profit-fiat');
  if (profitSatsEl) {
    profitSatsEl.textContent = fmtSats(profitSats);
    profitSatsEl.className   = 'simple-stat-primary ' + (profitSats >= 0 ? 'positive' : 'negative');
  }
  setText('simple-profit-btc', fmtBTC(Math.abs(profitBTC)));
  if (profitFiatEl) {
    profitFiatEl.textContent = fmtFiat(profitFiat);
    profitFiatEl.className   = 'simple-stat-fiat ' + (profitFiat >= 0 ? 'positive' : 'negative');
  }

  $('simple-results').classList.remove('hidden');
}

// ============================================================
// Mining vs Buying render
// ============================================================

function renderCompare(hardwareCost, btcPriceAUD, satsPerDay) {
  const el = $('compare-block');
  if (!el) return;

  if (hardwareCost <= 0) {
    el.innerHTML = '<p style="color:var(--text-muted)">Enter a hardware cost to see this comparison.</p>';
    return;
  }

  const satsBuy        = satsFromDirectBuy(hardwareCost, btcPriceAUD);
  const yearlyMinedSats = satsPerDay * 365;
  const diff            = yearlyMinedSats - satsBuy;

  const diffText = diff >= 0
    ? `that's <strong>${fmtSats(diff)} more</strong> than buying outright`
    : `that's <strong>${fmtSats(Math.abs(diff))} fewer</strong> than buying outright`;

  el.innerHTML = `
    <p>With your hardware budget of <strong>${fmtAUD(hardwareCost)}</strong>, you could have bought <strong>${fmtSats(satsBuy)}</strong> directly.</p>
    <p style="margin-top:10px">Mining for a year at current difficulty earns roughly <strong>${fmtSats(yearlyMinedSats)}</strong> — ${diffText}.</p>
    <p style="margin-top:10px;color:var(--text-muted);font-size:0.85rem">Mining also gives you ongoing income and skin in the game — but buying is more capital-efficient at current difficulty. Neither is wrong.</p>
  `;
}

// ============================================================
// Sensitivity table render
// ============================================================

function renderSensitivityTable(hardwareCost, baseDailyBTC, dailyElecCost, btcPrice, currentGrowthPct) {
  const table = $('sensitivity-table');
  if (!table) return;

  const priceMultipliers = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const growthRates      = [0, 15, 30, 45, 60];

  let html = '<thead><tr><th>BTC price</th>';
  growthRates.forEach(g => {
    html += `<th>${g}% growth/yr</th>`;
  });
  html += '</tr></thead><tbody>';

  priceMultipliers.forEach(mult => {
    const price      = btcPrice * mult;
    const priceLabel = mult === 1
      ? `${fmtAUD(price)} ← now`
      : `${mult}× — ${fmtAUD(price)}`;

    html += `<tr><td style="text-align:left"><strong>${priceLabel}</strong></td>`;

    growthRates.forEach(growth => {
      const days      = breakevenDays(hardwareCost, baseDailyBTC, dailyElecCost, price, growth);
      const isCurrent = mult === 1 && growth === currentGrowthPct;
      const cls       = isCurrent ? 'current-cell' : (days === null ? 'never' : '');
      const text      = hardwareCost > 0 ? formatBreakeven(days) : '—';
      html += `<td class="${cls}">${text}</td>`;
    });

    html += '</tr>';
  });

  html += '</tbody>';
  table.innerHTML = html;
}

// ============================================================
// Solo stats render
// ============================================================

function renderSoloStats(hashrate, uptime, difficulty, btcPriceAUD, poolBtcPerDay, poolSatsPerDay, elecPerDay) {
  // Solo probabilities (no pool fee)
  const p24h        = soloBlockProbability(hashrate, uptime, difficulty, SECONDS_PER_DAY);
  const p30d        = soloBlockProbability(hashrate, uptime, difficulty, SECONDS_PER_DAY * 30);
  const p1y         = soloBlockProbability(hashrate, uptime, difficulty, SECONDS_PER_DAY * 365);
  const expectedDays = expectedDaysToSoloBlock(hashrate, uptime, difficulty);

  setText('solo-prob-24h',      formatProbability(p24h));
  setText('solo-prob-30d',      formatProbability(p30d));
  setText('solo-prob-1y',       formatProbability(p1y));
  setText('solo-expected-time', formatExpectedSoloTime(expectedDays));

  // Pool stats panel
  const poolGrid = $('pool-stat-grid');
  if (poolGrid) {
    const dailyNet = poolBtcPerDay * btcPriceAUD - elecPerDay;
    poolGrid.innerHTML = `
      <div class="stat-block">
        <div class="stat-label">Daily sats</div>
        <div class="stat-value">${fmtSats(poolSatsPerDay)}</div>
      </div>
      <div class="stat-block">
        <div class="stat-label">Monthly sats</div>
        <div class="stat-value">${fmtSats(poolSatsPerDay * 30)}</div>
      </div>
      <div class="stat-block">
        <div class="stat-label">Daily net (AUD)</div>
        <div class="stat-value ${dailyNet >= 0 ? 'positive' : 'negative'}">${fmtAUD(dailyNet)}</div>
      </div>
    `;
  }
}

// ============================================================
// Solo/Pool toggle
// ============================================================

function initToggle() {
  const group = $('solo-pool-toggle');
  if (!group) return;

  group.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;

    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const mode = btn.dataset.mode;
    $('pool-stats').classList.toggle('hidden', mode !== 'pool');
    $('solo-stats').classList.toggle('hidden', mode !== 'solo');
  });
}

// ============================================================
// Live data fallbacks — only used if api.js fetch fails
// ============================================================

function loadLiveDataPlaceholders() {
  // Set rough fallback values so fields aren't blank if the API call fails.
  // api.js overwrites these with live data on success.
  $('btc-price-aud').value      = FALLBACK_BTC_PRICE_AUD;
  $('btc-price-usd').value      = FALLBACK_BTC_PRICE_USD;
  $('network-difficulty').value = FALLBACK_DIFFICULTY;
  // Badge/status text is managed entirely by api.js
}

// ============================================================
// Calc mode toggle (Simple / Full)
// ============================================================

function initCalcModeToggle() {
  const toggle = $('calc-mode-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;

    toggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const simple = btn.dataset.mode === 'simple';

    $('full-inputs').classList.toggle('hidden', simple);
    $('simple-inputs').classList.toggle('hidden', !simple);
    $('results').classList.add('hidden');
    $('simple-results').classList.add('hidden');
  });
}

// ============================================================
// Calculate button
// ============================================================

function initCalculateButton() {
  const btn = $('btn-calculate');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const activeMode = $('calc-mode-toggle').querySelector('.toggle-btn.active');
    const mode = activeMode ? activeMode.dataset.mode : 'full';
    if (mode === 'simple') {
      calculateSimple();
    } else {
      calculate();
    }
  });
}

// ============================================================
// Info tooltips
// ============================================================

function initTooltips() {
  const popup = document.createElement('div');
  popup.className = 'tooltip-popup';
  document.body.appendChild(popup);

  let activeBtn = null;

  function showTooltip(btn) {
    popup.textContent = btn.dataset.tooltip;
    popup.classList.add('visible');
    btn.classList.add('active');
    activeBtn = btn;
    positionTooltip(btn);
  }

  function hideTooltip() {
    popup.classList.remove('visible');
    if (activeBtn) { activeBtn.classList.remove('active'); activeBtn = null; }
  }

  function positionTooltip(btn) {
    const rect       = btn.getBoundingClientRect();
    const popupW     = 272;
    const gap        = 8;

    // Prefer below the button, fall back to above if near bottom
    let top  = rect.bottom + gap;
    let left = rect.left;

    if (top + 120 > window.innerHeight) {
      top = rect.top - gap - popup.offsetHeight;
    }

    // Don't overflow right or left edge
    if (left + popupW > window.innerWidth - 8) {
      left = window.innerWidth - popupW - 8;
    }
    left = Math.max(8, left);

    popup.style.top  = `${top}px`;
    popup.style.left = `${left}px`;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.info-btn');
    if (btn) {
      e.stopPropagation();
      if (activeBtn === btn) {
        hideTooltip();
      } else {
        hideTooltip();
        showTooltip(btn);
      }
    } else {
      hideTooltip();
    }
  });

  // Dismiss on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideTooltip();
  });

  // Reposition on scroll/resize in case popup drifts
  window.addEventListener('scroll', () => { if (activeBtn) positionTooltip(activeBtn); }, { passive: true });
  window.addEventListener('resize', () => { if (activeBtn) positionTooltip(activeBtn); }, { passive: true });
}

// ============================================================
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadMiners();
  loadLiveDataPlaceholders();
  initMinerSelect();
  initToggle();
  initCalcModeToggle();
  initCalculateButton();
  initTooltips();
});
