# CLAUDE.md — Home Miner Rewards Calculator

## Project Overview

A client-side Bitcoin mining calculator targeted at home miners. Built for 32Bitcoins (32bitcoins.com), an educational site focused on open-source Bitcoin mining hardware. The tool helps newcomers and hobbyist miners understand their real-world mining economics — rewards, costs, breakeven, and solo block odds.

No backend. No server. All calculations happen in the browser. Hosted on GitHub Pages, embedded in Shopify via iframe and available as a standalone page.

---

## Project Structure

```
/
├── index.html          # Main calculator page
├── styles.css          # Styling
├── calculator.js       # All calculation logic and UI interactivity
├── miners.json         # Miner hardware database (update here to add new miners)
├── api.js              # API fetch logic (CoinGecko + mempool.space)
└── CLAUDE.md           # This file
```

---

## miners.json Structure

This is the file to update when adding new miners. Claude Code can update this independently without touching calculator logic.

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
          "notes": "Most popular open-source ASIC miner"
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
      "name": "Canaan Avalon (TODO — verify specs before launch)",
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

---

## Inputs

### Miner Selection
- Dropdown populated from `miners.json` grouped by category
- Selecting a miner auto-fills hashrate and power consumption fields
- Selecting "Enter my own specs" leaves those fields blank for manual entry
- All pre-filled fields remain editable

### User Inputs
| Field | Default | Notes |
|---|---|---|
| Hardware cost | — | AUD |
| Hashrate | Auto-filled | TH/s |
| Power consumption | Auto-filled | Watts |
| Electricity cost | — | AUD per kWh |
| Pool fee | 1% | % |
| Uptime | 95% | % |
| Hardware resale value | 0 | AUD, used for true breakeven |
| Difficulty growth (annual) | 30% | % estimate |
| BTC price | Auto-fetched | AUD + USD, manual override allowed |
| Network difficulty | Auto-fetched | Manual override allowed |

---

## Outputs

### Rewards Summary
- Daily / Monthly / Yearly revenue in:
  - Satoshis (sats) — displayed prominently, this is the primary metric
  - AUD
  - USD
- Daily electricity cost (AUD)
- Daily net profit/loss (AUD)

### Breakeven Analysis
- Breakeven in days
- BTC price floor (minimum BTC price to break even)
- True breakeven factoring in hardware resale value

### Hodl Scenarios
- What your mined sats are worth if BTC goes 2x, 5x, 10x current price
- Framed as upside potential, not financial advice

### vs Buying BTC Directly
- Simple comparison: "With your hardware budget of $X you could have bought Y sats directly"
- Honest framing — educational, not judgemental

### Sensitivity Table
- Matrix of BTC price (rows) vs annual difficulty growth (columns)
- Shows breakeven days at each combination
- Highlight the current estimate cell

### Solo Block Stats
- Probability of finding a block in: 24hrs / 30 days / 1 year
- Expected time to find a block (e.g. "once every 47 years")
- Framed as "lottery ticket" language — fun and honest
- Solo vs Pool toggle showing the tradeoff between steady pool payouts and low-probability solo reward

---

## Live Data APIs

All API calls are made client-side from the user's browser. No backend required.

### BTC Price
- **Source:** CoinGecko free tier
- **Endpoint:** `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=aud,usd`
- **No API key required**
- Refresh on page load, show timestamp
- Allow manual override

### Network Difficulty + Hashrate
- **Source:** mempool.space
- **Endpoint:** `https://mempool.space/api/v1/mining/hashrate/3d` (or difficulty endpoint)
- **No API key required**
- Refresh on page load
- Allow manual override

### Error Handling
- If API fetch fails, fields default to manual input with a clear "Live data unavailable — enter manually" message
- Never silently fail

---

## Design & Style Guidelines

- Clean, minimal — consistent with 32Bitcoins brand (Apple/Tesla aesthetic)
- Mobile responsive
- No AI slop language — copy should be plain, direct, Australian English
- Sats displayed prominently — this is what home miners care about
- Industrial miners shown clearly as "for comparison" to avoid confusing newcomers
- Avoid financial advice language — frame outputs as estimates and educational tools
- Add a small disclaimer: "All figures are estimates. Mining rewards vary. Not financial advice."

---

## Embed in Shopify

The tool should work as:
1. **Standalone page** — `https://[username].github.io/home-miner-rewards-calculator/`
2. **Shopify iframe embed** — paste the following into a Shopify page's custom HTML block:

```html
<iframe 
  src="https://[username].github.io/home-miner-rewards-calculator/" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border:none;">
</iframe>
```

Ensure the tool works at various iframe widths — test at 600px, 800px, 1200px.

---

## Future / Nice to Have (not in v1)

- Difficulty growth chart (historical context)
- Multiple miner comparison (run two miners side by side)
- Printable / shareable results URL with params encoded
- Canaan Avalon Nano 3, Nano 3S, and Mini added once specs are verified

---

## Tone & Copy Notes

The site is educational. Assume the user might be new to Bitcoin mining. Avoid jargon without explanation. "Sats" should be explained inline on first use (e.g. "sats — short for satoshis, the smallest unit of Bitcoin"). The solo block stats section should feel fun and honest, not discouraging.

---

## To Do Before Launch

- [ ] Verify all miner specs in `miners.json` — especially Canaan Avalon models
- [ ] Confirm Bitaxe Gamma hashrate (may vary by firmware/chip)
- [ ] Test iframe embed in Shopify theme
- [ ] Test API fallback behaviour when offline
- [ ] Write page copy / intro text for 32Bitcoins site
