# Home Miner Rewards Calculator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully functional client-side Bitcoin mining calculator for home miners, covering rewards, costs, breakeven, hodl scenarios, and solo block stats.

**Architecture:** Pure static files (HTML + CSS + JS) with no build step, no frameworks, no dependencies. All calculation logic lives in `calculator.js`. Live API data (`api.js`) is deferred — this plan uses static placeholder values so the calculator is fully testable offline first.

**Tech Stack:** Vanilla HTML5, CSS3 (CSS custom properties, Grid, Flexbox), ES6+ JavaScript (no bundler). Hosted on GitHub Pages, embeddable via Shopify iframe.

---

## Key Calculations Reference

All math used throughout the calculator. Block reward post-halving = **3.125 BTC**.

```
// Effective hashrate (H/s)
effectiveHashrate_Hs = hashrate_TH * 1e12 * (uptime / 100)

// Expected BTC per day (pool mode — pool fee applied)
expectedBlocksPerDay = (effectiveHashrate_Hs * 86400) / (difficulty * 4294967296)
dailyBTC_pool        = expectedBlocksPerDay * 3.125 * (1 - poolFee / 100)
dailySats_pool       = dailyBTC_pool * 1e8

// Electricity cost per day (AUD)
dailyKwh      = (power_W / 1000) * 24 * (uptime / 100)
dailyElecCost = dailyKwh * electricityRate_AUD

// Daily revenue and net profit (AUD)
dailyRevenue_AUD = dailyBTC_pool * btcPrice_AUD
dailyNet_AUD     = dailyRevenue_AUD - dailyElecCost

// BTC price floor (break-even price)
priceFloor_AUD = dailyElecCost / dailyBTC_pool   // if dailyBTC_pool > 0

// Breakeven days (iterative, accounting for annual difficulty growth)
// Each day: effectiveDaily = baseDaily * (1 - annualGrowthRate/365)^day
// Accumulate until cumRevenue - cumElec >= hardwareCost

// True breakeven (hardware cost offset by resale value)
trueHardwareCost = hardwareCost - resaleValue

// Solo block probability (Poisson approximation)
expectedBlocksPerPeriod_solo = (effectiveHashrate_Hs * secondsInPeriod) / (difficulty * 4294967296)
p_solo = 1 - Math.exp(-expectedBlocksPerPeriod_solo)
expectedDaysToBlock = 1 / (expectedBlocksPerDay_solo_raw)

// Hodl scenarios — what 1 year of accumulated sats are worth at multiplied prices
yearlyBTC = dailyBTC_pool * 365  // simplified (ignores compounding difficulty)
hodl2x_AUD  = yearlyBTC * 1e8 * (btcPrice_AUD * 2) / 1e8
hodl5x_AUD  = yearlyBTC * 1e8 * (btcPrice_AUD * 5) / 1e8
hodl10x_AUD = yearlyBTC * 1e8 * (btcPrice_AUD * 10) / 1e8

// vs Buying BTC directly
satsFromBuying = (hardwareCost / btcPrice_AUD) * 1e8
```

---

## Static Placeholder Values (until api.js is wired up)

```js
// Used while API integration is deferred
const PLACEHOLDER_BTC_PRICE_AUD = 150000;   // AUD — update to rough current value
const PLACEHOLDER_BTC_PRICE_USD = 95000;    // USD
const PLACEHOLDER_DIFFICULTY    = 113757508067674;  // ~Feb 2026 value
```

---

### Task 1: Create miners.json

**Files:**
- Create: `miners.json`

**Step 1: Write the file**

Exact content from CLAUDE.md spec. No changes to structure. Canaan Avalon entries are included but marked with `"notes": "Specs need verification"` so they can be easily audited later.

```json
{
  "categories": [
    {
      "name": "Bitaxe (Open Source)",
      "miners": [
        {
          "id": "bitaxe-gamma",
          "name": "Bitaxe Gamma",
          "hashrate_th": 1.2,
          "power_w": 15,
          "notes": "Most popular open-source ASIC miner — hashrate may vary by firmware/chip"
        },
        {
          "id": "bitaxe-ultra",
          "name": "Bitaxe Ultra",
          "hashrate_th": 0.5,
          "power_w": 5
        },
        {
          "id": "bitaxe-hex",
          "name": "Bitaxe Hex",
          "hashrate_th": 3.0,
          "power_w": 35
        },
        {
          "id": "bitaxe-supra",
          "name": "Bitaxe Supra",
          "hashrate_th": 0.6,
          "power_w": 8
        }
      ]
    },
    {
      "name": "NerdMiner / NerdAxe",
      "miners": [
        {
          "id": "nerdaxe",
          "name": "NerdAxe",
          "hashrate_th": 0.6,
          "power_w": 10
        }
      ]
    },
    {
      "name": "Canaan Avalon",
      "miners": [
        {
          "id": "avalon-nano-3",
          "name": "Avalon Nano 3",
          "hashrate_th": 4.0,
          "power_w": 140,
          "notes": "Specs need verification"
        },
        {
          "id": "avalon-nano-3s",
          "name": "Avalon Nano 3S",
          "hashrate_th": 6.0,
          "power_w": 200,
          "notes": "Specs need verification"
        },
        {
          "id": "avalon-mini",
          "name": "Avalon Mini",
          "hashrate_th": 37.5,
          "power_w": 2200,
          "notes": "Specs need verification — confirm model name"
        }
      ]
    },
    {
      "name": "Industrial (Comparison)",
      "miners": [
        {
          "id": "antminer-s21-pro",
          "name": "Antminer S21 Pro",
          "hashrate_th": 234,
          "power_w": 3510
        },
        {
          "id": "antminer-s21",
          "name": "Antminer S21",
          "hashrate_th": 200,
          "power_w": 3500
        },
        {
          "id": "antminer-s19j-pro",
          "name": "Antminer S19j Pro",
          "hashrate_th": 104,
          "power_w": 3068,
          "notes": "Older gen, common secondhand"
        }
      ]
    },
    {
      "name": "Custom",
      "miners": [
        {
          "id": "custom",
          "name": "Enter my own specs",
          "hashrate_th": null,
          "power_w": null
        }
      ]
    }
  ]
}
```

**Step 2: Verify**

Open `miners.json` in browser or validator. Confirm valid JSON, all categories present, custom entry last.

---

### Task 2: Create index.html

**Files:**
- Create: `index.html`

**Step 1: Write the HTML skeleton**

Full page structure. All inputs, all output sections, all IDs wired for JS. No inline styles — all styling deferred to styles.css. Script tags at bottom of body.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home Miner Rewards Calculator — 32Bitcoins</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">

    <header class="site-header">
      <h1>Home Miner Rewards Calculator</h1>
      <p class="subtitle">Find out what your miner actually earns — in sats, dollars, and real terms.</p>
    </header>

    <!-- ===================== INPUTS ===================== -->
    <section class="card inputs-card">
      <h2>Your Setup</h2>

      <div class="field-group">
        <label for="miner-select">Miner</label>
        <select id="miner-select">
          <option value="">Select a miner…</option>
          <!-- populated by calculator.js -->
        </select>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="hashrate">Hashrate (TH/s)</label>
          <input type="number" id="hashrate" min="0" step="0.1" placeholder="e.g. 1.2">
        </div>
        <div class="field-group">
          <label for="power">Power (Watts)</label>
          <input type="number" id="power" min="0" step="1" placeholder="e.g. 15">
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="hardware-cost">Hardware cost (AUD)</label>
          <input type="number" id="hardware-cost" min="0" step="1" placeholder="e.g. 500">
        </div>
        <div class="field-group">
          <label for="resale-value">Resale value (AUD)</label>
          <input type="number" id="resale-value" min="0" step="1" placeholder="0" value="0">
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="electricity-cost">Electricity (AUD/kWh)</label>
          <input type="number" id="electricity-cost" min="0" step="0.01" placeholder="e.g. 0.28">
        </div>
        <div class="field-group">
          <label for="pool-fee">Pool fee (%)</label>
          <input type="number" id="pool-fee" min="0" max="100" step="0.1" value="1">
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="uptime">Uptime (%)</label>
          <input type="number" id="uptime" min="0" max="100" step="1" value="95">
        </div>
        <div class="field-group">
          <label for="difficulty-growth">Annual difficulty growth (%)</label>
          <input type="number" id="difficulty-growth" min="0" step="1" value="30">
        </div>
      </div>

      <!-- Live data row -->
      <div class="field-row live-data-row">
        <div class="field-group">
          <label for="btc-price-aud">
            BTC price (AUD)
            <span class="live-badge" id="btc-price-badge">loading…</span>
          </label>
          <input type="number" id="btc-price-aud" min="0" step="100" placeholder="loading…">
        </div>
        <div class="field-group">
          <label for="btc-price-usd">BTC price (USD)</label>
          <input type="number" id="btc-price-usd" min="0" step="100" placeholder="loading…">
        </div>
      </div>

      <div class="field-group">
        <label for="network-difficulty">
          Network difficulty
          <span class="live-badge" id="difficulty-badge">loading…</span>
        </label>
        <input type="number" id="network-difficulty" min="0" step="1e12" placeholder="loading…">
      </div>

      <p class="live-data-note" id="live-data-status">Fetching live data…</p>

      <button class="btn-calculate" id="btn-calculate">Calculate</button>
    </section>

    <!-- ===================== OUTPUTS ===================== -->
    <div id="results" class="results hidden">

      <!-- Rewards Summary -->
      <section class="card results-card">
        <h2>Rewards Summary</h2>
        <p class="section-note">Sats = satoshis, the smallest unit of Bitcoin (1 BTC = 100,000,000 sats)</p>

        <div class="results-table">
          <div class="results-header">
            <span></span>
            <span>Daily</span>
            <span>Monthly</span>
            <span>Yearly</span>
          </div>
          <div class="results-row highlight-row">
            <span class="row-label">Sats earned</span>
            <span id="daily-sats">—</span>
            <span id="monthly-sats">—</span>
            <span id="yearly-sats">—</span>
          </div>
          <div class="results-row">
            <span class="row-label">Revenue (AUD)</span>
            <span id="daily-revenue-aud">—</span>
            <span id="monthly-revenue-aud">—</span>
            <span id="yearly-revenue-aud">—</span>
          </div>
          <div class="results-row">
            <span class="row-label">Revenue (USD)</span>
            <span id="daily-revenue-usd">—</span>
            <span id="monthly-revenue-usd">—</span>
            <span id="yearly-revenue-usd">—</span>
          </div>
          <div class="results-row cost-row">
            <span class="row-label">Electricity cost (AUD)</span>
            <span id="daily-elec">—</span>
            <span id="monthly-elec">—</span>
            <span id="yearly-elec">—</span>
          </div>
          <div class="results-row net-row">
            <span class="row-label">Net profit/loss (AUD)</span>
            <span id="daily-net">—</span>
            <span id="monthly-net">—</span>
            <span id="yearly-net">—</span>
          </div>
        </div>
      </section>

      <!-- Breakeven Analysis -->
      <section class="card results-card">
        <h2>Breakeven Analysis</h2>
        <div class="stat-grid">
          <div class="stat-block">
            <div class="stat-label">Breakeven</div>
            <div class="stat-value" id="breakeven-days">—</div>
            <div class="stat-sub">at current difficulty growth</div>
          </div>
          <div class="stat-block">
            <div class="stat-label">True breakeven</div>
            <div class="stat-value" id="true-breakeven-days">—</div>
            <div class="stat-sub">after selling hardware</div>
          </div>
          <div class="stat-block">
            <div class="stat-label">BTC price floor</div>
            <div class="stat-value" id="price-floor">—</div>
            <div class="stat-sub">minimum to cover electricity</div>
          </div>
        </div>
      </section>

      <!-- Hodl Scenarios -->
      <section class="card results-card">
        <h2>If You Hodl Your Sats</h2>
        <p class="section-note">What your first year of mined sats could be worth if BTC price rises. Not a prediction — just perspective.</p>
        <div class="stat-grid">
          <div class="stat-block">
            <div class="stat-label">At 2× current price</div>
            <div class="stat-value" id="hodl-2x">—</div>
          </div>
          <div class="stat-block">
            <div class="stat-label">At 5× current price</div>
            <div class="stat-value" id="hodl-5x">—</div>
          </div>
          <div class="stat-block">
            <div class="stat-label">At 10× current price</div>
            <div class="stat-value" id="hodl-10x">—</div>
          </div>
        </div>
      </section>

      <!-- vs Buying BTC -->
      <section class="card results-card">
        <h2>Mining vs Buying BTC</h2>
        <div class="compare-block" id="compare-block">
          <!-- populated by JS -->
        </div>
      </section>

      <!-- Sensitivity Table -->
      <section class="card results-card sensitivity-card">
        <h2>Breakeven Sensitivity</h2>
        <p class="section-note">Days to break even across different BTC prices and annual difficulty growth rates. Your current estimate is highlighted.</p>
        <div class="table-scroll">
          <table class="sensitivity-table" id="sensitivity-table">
            <!-- populated by JS -->
          </table>
        </div>
      </section>

      <!-- Solo Block Stats -->
      <section class="card results-card">
        <h2>Solo Mining Odds</h2>
        <p class="section-note">What are the odds of finding a block entirely on your own? Think of it as a lottery ticket.</p>

        <div class="toggle-group" id="solo-pool-toggle">
          <button class="toggle-btn active" data-mode="pool">Pool mining</button>
          <button class="toggle-btn" data-mode="solo">Solo mining</button>
        </div>

        <div id="pool-stats" class="mode-panel">
          <p class="mode-description">Pool mining gives you steady, small payouts proportional to your hashrate. You share block rewards with the pool.</p>
          <div class="stat-grid" id="pool-stat-grid">
            <!-- populated by JS — shows daily/monthly/yearly sats from pool -->
          </div>
        </div>

        <div id="solo-stats" class="mode-panel hidden">
          <p class="mode-description">Solo mining: you keep the full block reward (3.125 BTC = 312,500,000 sats) if you find a block. The odds are slim, but real.</p>
          <div class="stat-grid">
            <div class="stat-block">
              <div class="stat-label">Odds in 24 hours</div>
              <div class="stat-value" id="solo-prob-24h">—</div>
            </div>
            <div class="stat-block">
              <div class="stat-label">Odds in 30 days</div>
              <div class="stat-value" id="solo-prob-30d">—</div>
            </div>
            <div class="stat-block">
              <div class="stat-label">Odds in 1 year</div>
              <div class="stat-value" id="solo-prob-1y">—</div>
            </div>
            <div class="stat-block">
              <div class="stat-label">Expected time to a block</div>
              <div class="stat-value" id="solo-expected-time">—</div>
            </div>
          </div>
        </div>
      </section>

      <p class="disclaimer">All figures are estimates. Mining rewards vary. Not financial advice.</p>

    </div><!-- /#results -->

  </div><!-- /.container -->

  <script src="calculator.js"></script>
</body>
</html>
```

**Step 2: Open in browser**

Open `index.html` directly in a browser (no server needed at this stage). Verify:
- Page loads without errors
- All input fields are visible
- Results section is hidden (`.hidden` class applied)
- No JS errors in console (no script loaded yet)

---

### Task 3: Create styles.css

**Files:**
- Create: `styles.css`

**Step 1: Write the stylesheet**

Clean, minimal, Apple/Tesla aesthetic. CSS custom properties for theming. Mobile-first, responsive at 600px, 800px, 1200px. Dark-ish background with off-white card surfaces. Orange Bitcoin accent colour.

```css
/* =============================================
   CSS Custom Properties
   ============================================= */
:root {
  --bg:           #0f0f0f;
  --surface:      #1a1a1a;
  --surface-alt:  #222222;
  --border:       #2e2e2e;
  --text:         #e8e8e8;
  --text-muted:   #888888;
  --accent:       #f7931a;   /* Bitcoin orange */
  --accent-dim:   rgba(247, 147, 26, 0.15);
  --green:        #34c759;
  --red:          #ff3b30;
  --radius:       12px;
  --radius-sm:    8px;
  --transition:   0.15s ease;
  --max-width:    860px;
  --font:         -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

/* =============================================
   Reset & Base
   ============================================= */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  line-height: 1.6;
  padding: 24px 16px 48px;
}

/* =============================================
   Layout
   ============================================= */
.container {
  max-width: var(--max-width);
  margin: 0 auto;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 16px;
}

/* =============================================
   Header
   ============================================= */
.site-header {
  text-align: center;
  padding: 32px 0 24px;
}

.site-header h1 {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.subtitle {
  color: var(--text-muted);
  margin-top: 8px;
  font-size: 1rem;
}

/* =============================================
   Section Headings
   ============================================= */
h2 {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
  color: var(--text);
}

.section-note {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 16px;
  line-height: 1.5;
}

/* =============================================
   Form Fields
   ============================================= */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.field-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.field-group:not(:last-child) {
  margin-bottom: 14px;
}

.field-row .field-group {
  margin-bottom: 0;
}

label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 6px;
}

input[type="number"],
select {
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 0.95rem;
  padding: 10px 12px;
  width: 100%;
  transition: border-color var(--transition);
  appearance: none;
  -webkit-appearance: none;
}

input[type="number"]:focus,
select:focus {
  outline: none;
  border-color: var(--accent);
}

input[type="number"]::placeholder {
  color: var(--text-muted);
}

select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}

select option {
  background: var(--surface-alt);
  color: var(--text);
}

/* =============================================
   Live Data
   ============================================= */
.live-badge {
  font-size: 0.7rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 2px 7px;
  border-radius: 20px;
}

.live-badge.error {
  color: var(--red);
  background: rgba(255, 59, 48, 0.12);
}

.live-data-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: -6px;
  margin-bottom: 20px;
}

/* =============================================
   Calculate Button
   ============================================= */
.btn-calculate {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: #000;
  cursor: pointer;
  font-family: var(--font);
  font-size: 1rem;
  font-weight: 600;
  padding: 13px 24px;
  width: 100%;
  transition: opacity var(--transition), transform var(--transition);
}

.btn-calculate:hover {
  opacity: 0.9;
}

.btn-calculate:active {
  transform: scale(0.99);
}

/* =============================================
   Results — hidden state
   ============================================= */
.hidden {
  display: none !important;
}

/* =============================================
   Rewards Table
   ============================================= */
.results-table {
  width: 100%;
}

.results-header,
.results-row {
  display: grid;
  grid-template-columns: 1fr repeat(3, minmax(80px, 1fr));
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  align-items: center;
}

.results-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
}

.results-header span:not(:first-child),
.results-row span:not(:first-child) {
  text-align: right;
}

.row-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.highlight-row .row-label,
.highlight-row span {
  color: var(--accent);
  font-weight: 700;
  font-size: 1rem;
}

.cost-row span:not(:first-child) {
  color: var(--red);
}

.net-row span:not(:first-child) {
  font-weight: 600;
}

.net-row .positive {
  color: var(--green);
}

.net-row .negative {
  color: var(--red);
}

/* =============================================
   Stat Grid
   ============================================= */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-block {
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* =============================================
   Compare Block
   ============================================= */
.compare-block {
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
  font-size: 0.95rem;
  line-height: 1.7;
}

.compare-block strong {
  color: var(--accent);
}

/* =============================================
   Sensitivity Table
   ============================================= */
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.sensitivity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 420px;
}

.sensitivity-table th,
.sensitivity-table td {
  padding: 9px 12px;
  text-align: center;
  border: 1px solid var(--border);
}

.sensitivity-table th {
  background: var(--surface-alt);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sensitivity-table td {
  color: var(--text);
}

.sensitivity-table td.current-cell {
  background: var(--accent-dim);
  color: var(--accent);
  font-weight: 700;
  border-color: var(--accent);
}

.sensitivity-table td.never {
  color: var(--red);
}

/* =============================================
   Solo/Pool Toggle
   ============================================= */
.toggle-group {
  display: inline-flex;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px;
  margin-bottom: 16px;
}

.toggle-btn {
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 7px 16px;
  transition: background var(--transition), color var(--transition);
}

.toggle-btn.active {
  background: var(--accent);
  color: #000;
  font-weight: 600;
}

.mode-panel {
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.mode-description {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 16px;
}

/* =============================================
   Disclaimer
   ============================================= */
.disclaimer {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 12px 0 0;
}

/* =============================================
   Responsive — 600px and up
   ============================================= */
@media (max-width: 600px) {
  .field-row {
    flex-direction: column;
  }

  .results-header,
  .results-row {
    grid-template-columns: 1.4fr repeat(3, 1fr);
    font-size: 0.8rem;
  }

  .highlight-row span {
    font-size: 0.875rem;
  }

  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 800px) {
  body {
    padding: 32px 24px 64px;
  }

  .card {
    padding: 28px 32px;
  }

  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Step 2: Open in browser and verify**

Reload `index.html`. Verify:
- Dark background, off-white text
- Card surface visible and distinct from background
- All inputs styled consistently
- Mobile layout at narrow window (stack field rows vertically)
- No horizontal overflow

---

### Task 4: Create calculator.js — pure calculation functions

**Files:**
- Create: `calculator.js`

Build all math functions first, completely separate from DOM. This makes them easy to reason about and manually test in the browser console.

**Step 1: Write the calculation module**

```js
// calculator.js
// ============================================================
// Home Miner Rewards Calculator
// All calculation logic and UI interactivity
// ============================================================

// ============================================================
// Constants
// ============================================================
const BLOCK_REWARD_BTC  = 3.125;         // post-4th-halving
const BLOCK_REWARD_SATS = 3.125e8;       // 312,500,000 sats
const SATS_PER_BTC      = 1e8;
const SECONDS_PER_DAY   = 86400;
const DIFFICULTY_MULTIPLIER = 4294967296; // 2^32

// Static fallback values — used until api.js is wired up
const FALLBACK_BTC_PRICE_AUD  = 150000;
const FALLBACK_BTC_PRICE_USD  = 95000;
const FALLBACK_DIFFICULTY     = 113757508067674;
const FALLBACK_NETWORK_HASHRATE_EHS = 800; // ~800 EH/s, approx Feb 2026

// ============================================================
// Core calculations
// ============================================================

/**
 * Calculate effective hashrate in H/s after applying uptime.
 * @param {number} hashrate_TH - hashrate in TH/s
 * @param {number} uptime_pct  - uptime percentage (0–100)
 * @returns {number} effective hashrate in H/s
 */
function effectiveHashrate(hashrate_TH, uptime_pct) {
  return hashrate_TH * 1e12 * (uptime_pct / 100);
}

/**
 * Expected BTC mined per day via pool (after pool fee).
 * @param {number} hashrate_TH
 * @param {number} uptime_pct
 * @param {number} difficulty     - network difficulty
 * @param {number} poolFee_pct    - pool fee percentage (0–100)
 * @returns {number} BTC per day
 */
function dailyBTC(hashrate_TH, uptime_pct, difficulty, poolFee_pct) {
  const effectiveH = effectiveHashrate(hashrate_TH, uptime_pct);
  const blocksPerDay = (effectiveH * SECONDS_PER_DAY) / (difficulty * DIFFICULTY_MULTIPLIER);
  return blocksPerDay * BLOCK_REWARD_BTC * (1 - poolFee_pct / 100);
}

/**
 * Convert BTC to satoshis.
 * @param {number} btc
 * @returns {number} sats (integer)
 */
function btcToSats(btc) {
  return Math.round(btc * SATS_PER_BTC);
}

/**
 * Daily electricity cost in AUD.
 * @param {number} power_W          - power consumption in watts
 * @param {number} uptime_pct
 * @param {number} electricityRate  - AUD per kWh
 * @returns {number} AUD per day
 */
function dailyElectricityCost(power_W, uptime_pct, electricityRate) {
  const kwhPerDay = (power_W / 1000) * 24 * (uptime_pct / 100);
  return kwhPerDay * electricityRate;
}

/**
 * BTC price floor — minimum AUD price for electricity to be covered.
 * @param {number} elecCostPerDay_AUD
 * @param {number} btcPerDay
 * @returns {number|null} AUD price, or null if btcPerDay is 0
 */
function btcPriceFloor(elecCostPerDay_AUD, btcPerDay) {
  if (btcPerDay <= 0) return null;
  return elecCostPerDay_AUD / btcPerDay;
}

/**
 * Calculate breakeven days accounting for annual difficulty growth.
 * Uses an iterative day-by-day simulation (max 10 years).
 *
 * @param {number} hardwareCost_AUD
 * @param {number} baseDailyBTC          - BTC/day at current difficulty
 * @param {number} dailyElecCost_AUD
 * @param {number} btcPrice_AUD
 * @param {number} annualDifficultyGrowth_pct - e.g. 30 for 30%
 * @returns {number|null} days to breakeven, or null if never (within 10 years)
 */
function breakevenDays(hardwareCost_AUD, baseDailyBTC, dailyElecCost_AUD, btcPrice_AUD, annualDifficultyGrowth_pct) {
  if (baseDailyBTC <= 0 || btcPrice_AUD <= 0) return null;

  const dailyGrowthFactor = 1 + annualDifficultyGrowth_pct / 100 / 365;
  let cumulative = 0;
  const maxDays = 365 * 10;

  for (let day = 1; day <= maxDays; day++) {
    // difficulty grows each day, so BTC earned shrinks
    const btcToday = baseDailyBTC / Math.pow(dailyGrowthFactor, day - 1);
    const revenueToday = btcToday * btcPrice_AUD;
    const netToday = revenueToday - dailyElecCost_AUD;
    cumulative += netToday;
    if (cumulative >= hardwareCost_AUD) return day;
  }

  return null; // never breaks even within 10 years
}

/**
 * Format a breakeven result for display.
 * @param {number|null} days
 * @returns {string}
 */
function formatBreakeven(days) {
  if (days === null) return 'Never (10yr+)';
  if (days <= 365) return `${days} days`;
  const years = (days / 365).toFixed(1);
  return `${years} years`;
}

/**
 * Hodl scenario values (AUD) based on 1 year of mined BTC at price multiplier.
 * Simplified: uses baseDailyBTC * 365, ignoring compounding difficulty growth.
 * @param {number} baseDailyBTC
 * @param {number} btcPrice_AUD
 * @returns {{ x2: number, x5: number, x10: number }}
 */
function hodlScenarios(baseDailyBTC, btcPrice_AUD) {
  const yearlyBTC = baseDailyBTC * 365;
  return {
    x2:  yearlyBTC * btcPrice_AUD * 2,
    x5:  yearlyBTC * btcPrice_AUD * 5,
    x10: yearlyBTC * btcPrice_AUD * 10,
  };
}

/**
 * Sats you could buy directly with the hardware budget.
 * @param {number} hardwareCost_AUD
 * @param {number} btcPrice_AUD
 * @returns {number} sats
 */
function satsFromDirectBuy(hardwareCost_AUD, btcPrice_AUD) {
  if (btcPrice_AUD <= 0) return 0;
  return Math.round((hardwareCost_AUD / btcPrice_AUD) * SATS_PER_BTC);
}

/**
 * Solo block probability for a given time period (Poisson approximation).
 * @param {number} hashrate_TH
 * @param {number} uptime_pct
 * @param {number} difficulty
 * @param {number} seconds    - duration in seconds
 * @returns {number} probability 0–1
 */
function soloBlockProbability(hashrate_TH, uptime_pct, difficulty, seconds) {
  const effectiveH = effectiveHashrate(hashrate_TH, uptime_pct);
  const expectedBlocks = (effectiveH * seconds) / (difficulty * DIFFICULTY_MULTIPLIER);
  return 1 - Math.exp(-expectedBlocks);
}

/**
 * Expected time in days to find a solo block.
 * @param {number} hashrate_TH
 * @param {number} uptime_pct
 * @param {number} difficulty
 * @returns {number} days
 */
function expectedDaysToSoloBlock(hashrate_TH, uptime_pct, difficulty) {
  const effectiveH = effectiveHashrate(hashrate_TH, uptime_pct);
  if (effectiveH <= 0) return Infinity;
  const blocksPerDay = (effectiveH * SECONDS_PER_DAY) / (difficulty * DIFFICULTY_MULTIPLIER);
  if (blocksPerDay <= 0) return Infinity;
  return 1 / blocksPerDay;
}

/**
 * Format expected solo block time in human-readable form.
 * @param {number} days
 * @returns {string}
 */
function formatExpectedSoloTime(days) {
  if (!isFinite(days) || days > 365 * 10000) return 'practically never';
  if (days < 1) return 'less than a day (very lucky miner!)';
  if (days < 30) return `once every ${Math.round(days)} days`;
  if (days < 365) return `once every ${Math.round(days / 30)} months`;
  const years = Math.round(days / 365);
  return `once every ${years.toLocaleString()} years`;
}

/**
 * Format probability as a human-readable percentage or odds string.
 * @param {number} p - probability 0–1
 * @returns {string}
 */
function formatProbability(p) {
  if (p < 0.000001) {
    const odds = Math.round(1 / p);
    return `1 in ${odds.toLocaleString()}`;
  }
  if (p < 0.01) return `${(p * 100).toFixed(4)}%`;
  return `${(p * 100).toFixed(2)}%`;
}

/**
 * Build sensitivity table data.
 * Returns array of { priceMult, growthPct, days } objects.
 *
 * Price multipliers: 0.5, 0.75, 1, 1.25, 1.5, 2
 * Growth rates (%):  0, 15, 30, 45, 60
 *
 * @param {number} hardwareCost_AUD
 * @param {number} baseDailyBTC
 * @param {number} dailyElecCost_AUD
 * @param {number} btcPrice_AUD
 * @param {number} currentGrowthPct
 * @returns {object} { priceMultipliers, growthRates, cells }
 */
function sensitivityTableData(hardwareCost_AUD, baseDailyBTC, dailyElecCost_AUD, btcPrice_AUD, currentGrowthPct) {
  const priceMultipliers = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const growthRates = [0, 15, 30, 45, 60];

  const cells = priceMultipliers.map(mult => ({
    priceMult: mult,
    values: growthRates.map(growth => ({
      growthPct: growth,
      days: breakevenDays(
        hardwareCost_AUD,
        baseDailyBTC,
        dailyElecCost_AUD,
        btcPrice_AUD * mult,
        growth
      ),
      isCurrent: mult === 1 && growth === currentGrowthPct,
    }))
  }));

  return { priceMultipliers, growthRates, cells };
}

// ============================================================
// Number formatting helpers
// ============================================================

function fmtSats(n) {
  return `${Math.round(n).toLocaleString()} sats`;
}

function fmtAUD(n) {
  if (Math.abs(n) < 0.01) return 'A$0.00';
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUSD(n) {
  if (Math.abs(n) < 0.01) return 'US$0.00';
  return `US$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtLargeSats(n) {
  // For yearly/hodl values where sats might be 1000+
  return `${Math.round(n).toLocaleString()} sats`;
}

// ============================================================
// DOM helpers
// ============================================================

function $(id) { return document.getElementById(id); }

function setVal(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setClass(id, cls) {
  const el = $(id);
  if (el) { el.className = ''; el.classList.add(cls); }
}

// ============================================================
// Miner dropdown population
// ============================================================

async function loadMiners() {
  try {
    const resp = await fetch('miners.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    populateMinerDropdown(data);
  } catch (err) {
    console.error('Failed to load miners.json:', err);
    // Fallback: leave dropdown with just the placeholder option
  }
}

function populateMinerDropdown(data) {
  const select = $('miner-select');
  if (!select) return;

  data.categories.forEach(cat => {
    const group = document.createElement('optgroup');
    group.label = cat.name;

    cat.miners.forEach(miner => {
      const opt = document.createElement('option');
      opt.value = miner.id;
      opt.textContent = miner.name;
      opt.dataset.hashrate = miner.hashrate_th ?? '';
      opt.dataset.power    = miner.power_w ?? '';
      group.appendChild(opt);
    });

    select.appendChild(group);
  });
}

// ============================================================
// Read inputs
// ============================================================

function readInputs() {
  return {
    hashrate:        parseFloat($('hashrate').value)          || 0,
    power:           parseFloat($('power').value)             || 0,
    hardwareCost:    parseFloat($('hardware-cost').value)     || 0,
    resaleValue:     parseFloat($('resale-value').value)      || 0,
    electricityCost: parseFloat($('electricity-cost').value)  || 0,
    poolFee:         parseFloat($('pool-fee').value)          || 0,
    uptime:          parseFloat($('uptime').value)            || 95,
    difficultyGrowth:parseFloat($('difficulty-growth').value) || 30,
    btcPriceAUD:     parseFloat($('btc-price-aud').value)     || FALLBACK_BTC_PRICE_AUD,
    btcPriceUSD:     parseFloat($('btc-price-usd').value)     || FALLBACK_BTC_PRICE_USD,
    difficulty:      parseFloat($('network-difficulty').value)|| FALLBACK_DIFFICULTY,
  };
}

// ============================================================
// Validation
// ============================================================

function validateInputs(inputs) {
  if (inputs.hashrate <= 0) return 'Enter a hashrate greater than 0.';
  if (inputs.power <= 0)    return 'Enter power consumption greater than 0.';
  if (inputs.electricityCost <= 0) return 'Enter your electricity cost (AUD per kWh).';
  if (inputs.btcPriceAUD <= 0) return 'BTC price (AUD) must be greater than 0.';
  if (inputs.difficulty <= 0)  return 'Network difficulty must be greater than 0.';
  return null;
}

// ============================================================
// Main calculation + render
// ============================================================

function calculate() {
  const inputs = readInputs();
  const err = validateInputs(inputs);

  if (err) {
    alert(err);
    return;
  }

  const {
    hashrate, power, hardwareCost, resaleValue,
    electricityCost, poolFee, uptime, difficultyGrowth,
    btcPriceAUD, btcPriceUSD, difficulty
  } = inputs;

  // Core daily values
  const btcPerDay   = dailyBTC(hashrate, uptime, difficulty, poolFee);
  const satsPerDay  = btcToSats(btcPerDay);
  const elecPerDay  = dailyElectricityCost(power, uptime, electricityCost);
  const revAUDPerDay = btcPerDay * btcPriceAUD;
  const revUSDPerDay = btcPerDay * btcPriceUSD;
  const netPerDay    = revAUDPerDay - elecPerDay;

  // Render rewards summary
  setVal('daily-sats',   fmtSats(satsPerDay));
  setVal('monthly-sats', fmtSats(satsPerDay * 30));
  setVal('yearly-sats',  fmtLargeSats(satsPerDay * 365));

  setVal('daily-revenue-aud',   fmtAUD(revAUDPerDay));
  setVal('monthly-revenue-aud', fmtAUD(revAUDPerDay * 30));
  setVal('yearly-revenue-aud',  fmtAUD(revAUDPerDay * 365));

  setVal('daily-revenue-usd',   fmtUSD(revUSDPerDay));
  setVal('monthly-revenue-usd', fmtUSD(revUSDPerDay * 30));
  setVal('yearly-revenue-usd',  fmtUSD(revUSDPerDay * 365));

  setVal('daily-elec',   fmtAUD(elecPerDay));
  setVal('monthly-elec', fmtAUD(elecPerDay * 30));
  setVal('yearly-elec',  fmtAUD(elecPerDay * 365));

  const dailyNetEl = $('daily-net');
  if (dailyNetEl) {
    dailyNetEl.textContent = fmtAUD(netPerDay);
    dailyNetEl.className = netPerDay >= 0 ? 'positive' : 'negative';
  }
  const monthlyNetEl = $('monthly-net');
  if (monthlyNetEl) {
    monthlyNetEl.textContent = fmtAUD(netPerDay * 30);
    monthlyNetEl.className = netPerDay >= 0 ? 'positive' : 'negative';
  }
  const yearlyNetEl = $('yearly-net');
  if (yearlyNetEl) {
    yearlyNetEl.textContent = fmtAUD(netPerDay * 365);
    yearlyNetEl.className = netPerDay >= 0 ? 'positive' : 'negative';
  }

  // Breakeven
  const bedays = breakevenDays(hardwareCost, btcPerDay, elecPerDay, btcPriceAUD, difficultyGrowth);
  setVal('breakeven-days', hardwareCost > 0 ? formatBreakeven(bedays) : 'No cost entered');

  const trueHardwareCost = Math.max(0, hardwareCost - resaleValue);
  const trueBedays = breakevenDays(trueHardwareCost, btcPerDay, elecPerDay, btcPriceAUD, difficultyGrowth);
  setVal('true-breakeven-days', hardwareCost > 0 ? formatBreakeven(trueBedays) : 'No cost entered');

  const floor = btcPriceFloor(elecPerDay, btcPerDay);
  setVal('price-floor', floor !== null ? fmtAUD(floor) : '—');

  // Hodl scenarios
  const hodl = hodlScenarios(btcPerDay, btcPriceAUD);
  setVal('hodl-2x',  fmtAUD(hodl.x2));
  setVal('hodl-5x',  fmtAUD(hodl.x5));
  setVal('hodl-10x', fmtAUD(hodl.x10));

  // vs Buying BTC
  const satsBuy = satsFromDirectBuy(hardwareCost, btcPriceAUD);
  const compareEl = $('compare-block');
  if (compareEl) {
    if (hardwareCost > 0) {
      const yearlyMinedSats = satsPerDay * 365;
      const diff = yearlyMinedSats - satsBuy;
      const diffText = diff >= 0
        ? `that's <strong>${fmtSats(diff)} more</strong> than buying outright`
        : `that's <strong>${fmtSats(Math.abs(diff))} fewer</strong> than buying outright`;

      compareEl.innerHTML = `
        <p>With your hardware budget of <strong>${fmtAUD(hardwareCost)}</strong>, you could have bought <strong>${fmtLargeSats(satsBuy)}</strong> directly.</p>
        <p style="margin-top:8px">Mining for a year at current difficulty earns you roughly <strong>${fmtLargeSats(yearlyMinedSats)}</strong> — ${diffText}.</p>
        <p style="margin-top:8px; color: var(--text-muted); font-size:0.85rem">Mining also gives you ongoing income and skin in the game — but buying is more capital-efficient at current difficulty. There's no wrong answer.</p>
      `;
    } else {
      compareEl.innerHTML = '<p style="color:var(--text-muted)">Enter a hardware cost to see this comparison.</p>';
    }
  }

  // Sensitivity table
  renderSensitivityTable(hardwareCost, btcPerDay, elecPerDay, btcPriceAUD, difficultyGrowth);

  // Solo stats
  renderSoloStats(hashrate, uptime, difficulty, btcPriceAUD, btcPerDay, satsPerDay, elecPerDay);

  // Show results
  $('results').classList.remove('hidden');
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    html += `<th>${g}% difficulty growth/yr</th>`;
  });
  html += '</tr></thead><tbody>';

  priceMultipliers.forEach(mult => {
    const priceLabel = mult === 1 ? `A$${Math.round(btcPrice).toLocaleString()} (now)` : `${mult}× — A$${Math.round(btcPrice * mult).toLocaleString()}`;
    html += `<tr><td><strong>${priceLabel}</strong></td>`;

    growthRates.forEach(growth => {
      const days = breakevenDays(hardwareCost, baseDailyBTC, dailyElecCost, btcPrice * mult, growth);
      const isCurrent = mult === 1 && growth === currentGrowthPct;
      const cellClass = isCurrent ? 'current-cell' : (days === null ? 'never' : '');
      const cellText  = hardwareCost > 0 ? formatBreakeven(days) : '—';
      html += `<td class="${cellClass}">${cellText}</td>`;
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
  // Solo probs (no pool fee deducted)
  const p24h = soloBlockProbability(hashrate, uptime, difficulty, 86400);
  const p30d = soloBlockProbability(hashrate, uptime, difficulty, 86400 * 30);
  const p1y  = soloBlockProbability(hashrate, uptime, difficulty, 86400 * 365);
  const expectedDays = expectedDaysToSoloBlock(hashrate, uptime, difficulty);

  setVal('solo-prob-24h', formatProbability(p24h));
  setVal('solo-prob-30d', formatProbability(p30d));
  setVal('solo-prob-1y',  formatProbability(p1y));
  setVal('solo-expected-time', formatExpectedSoloTime(expectedDays));

  // Pool stats panel (reuse pool values)
  const poolGrid = $('pool-stat-grid');
  if (poolGrid) {
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
        <div class="stat-value ${poolBtcPerDay * btcPriceAUD - elecPerDay >= 0 ? 'positive' : 'negative'}">${fmtAUD(poolBtcPerDay * btcPriceAUD - elecPerDay)}</div>
      </div>
    `;
  }
}

// ============================================================
// Solo/Pool toggle
// ============================================================

function initToggle() {
  const toggleGroup = $('solo-pool-toggle');
  if (!toggleGroup) return;

  toggleGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;

    toggleGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const mode = btn.dataset.mode;
    $('pool-stats').classList.toggle('hidden', mode !== 'pool');
    $('solo-stats').classList.toggle('hidden', mode !== 'solo');
  });
}

// ============================================================
// Miner select — auto-fill hashrate + power
// ============================================================

function initMinerSelect() {
  const select = $('miner-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    const hashrate = opt.dataset.hashrate;
    const power    = opt.dataset.power;

    $('hashrate').value = hashrate || '';
    $('power').value    = power    || '';
  });
}

// ============================================================
// Live data placeholders (api.js will replace these)
// ============================================================

function loadLiveDataPlaceholders() {
  $('btc-price-aud').value      = FALLBACK_BTC_PRICE_AUD;
  $('btc-price-usd').value      = FALLBACK_BTC_PRICE_USD;
  $('network-difficulty').value = FALLBACK_DIFFICULTY;

  $('btc-price-badge').textContent  = 'static value — update manually';
  $('difficulty-badge').textContent = 'static value — update manually';
  $('btc-price-badge').classList.add('error');
  $('difficulty-badge').classList.add('error');

  $('live-data-status').textContent = 'Using static placeholder values. Live data not yet connected.';
}

// ============================================================
// Calculate button
// ============================================================

function initCalculateButton() {
  const btn = $('btn-calculate');
  if (!btn) return;
  btn.addEventListener('click', calculate);
}

// ============================================================
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadMiners();
  loadLiveDataPlaceholders();
  initMinerSelect();
  initToggle();
  initCalculateButton();
});
```

**Step 2: Open in browser and verify via console**

Open `index.html` in browser. Open DevTools console and run:

```js
// Verify core math manually
// Bitaxe Gamma: 1.2 TH/s, difficulty ~113757508067674
const btc = dailyBTC(1.2, 95, 113757508067674, 1);
console.log('Daily BTC:', btc);           // expect ~0.0000000xxx
console.log('Daily sats:', btcToSats(btc)); // expect single-digit sats

// Electricity test
const elec = dailyElectricityCost(15, 95, 0.28);
console.log('Daily elec AUD:', elec);     // expect ~0.095

// Price floor
console.log('Price floor:', btcPriceFloor(elec, btc)); // should be a large number

// Solo prob 24hrs
const p = soloBlockProbability(1.2, 95, 113757508067674, 86400);
console.log('Solo 24hr prob:', formatProbability(p)); // expect something like 1 in X million
```

**Step 3: Verify full UI flow**

1. Select "Bitaxe Gamma" from dropdown — hashrate (1.2) and power (15) auto-fill
2. Enter: hardware cost 500, electricity 0.28
3. Click "Calculate"
4. Results section appears
5. Sats values are displayed prominently in orange
6. Breakeven shows days or "Never"
7. Sensitivity table renders with current cell highlighted
8. Solo/pool toggle switches panels

---

### Task 5: Manual verification checklist

**Step 1: Spot-check numbers**

With Bitaxe Gamma (1.2 TH/s), 95% uptime, AUD price $150k, difficulty ~113.7T:
- Daily BTC should be in the range of ~0.0000003 BTC (~30 sats/day) — verify this is plausible
- Daily electricity at $0.28/kWh: (15W / 1000) * 24 * 0.95 * 0.28 ≈ A$0.096
- At $150k AUD/BTC: daily revenue ≈ 0.0000003 * 150000 ≈ A$0.045 — running at a loss

**Step 2: Verify responsiveness**

Resize browser to 600px width. Confirm:
- Field rows stack vertically
- Results table is readable
- Sensitivity table scrolls horizontally

**Step 3: Verify "never" breakeven case**

With low hashrate + high electricity + low BTC price, breakeven should show "Never (10yr+)" not crash.

**Step 4: Verify custom miner**

Select "Enter my own specs" — hashrate and power fields should clear. Manual entry should work.

---

### Notes for Later

- **Canaan Avalon specs** (`avalon-nano-3`, `avalon-nano-3s`, `avalon-mini`) are flagged in `miners.json` with `"notes": "Specs need verification"`. When confirmed, just update `miners.json` — no calculator logic changes needed.
- **Bitaxe Gamma hashrate** may vary (0.9–1.2 TH/s depending on firmware/chip variant). Consider adding a note in the UI or updating when a canonical value is confirmed.
- **api.js integration** is the next step after this plan is working. It will replace `loadLiveDataPlaceholders()` with real CoinGecko + mempool.space fetches.
