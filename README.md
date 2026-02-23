# Home Miner Rewards Calculator

A client-side Bitcoin mining calculator built for [32Bitcoins](https://32bitcoins.com) — an educational site focused on open-source Bitcoin mining hardware.

The goal is to help newcomers and hobbyist miners understand the real economics of home mining: what you actually earn in sats, what it costs to run, how long to break even, and what the solo block odds look like. No fluff, no sign-ups, no backend.

## Live

Embedded at [32bitcoins.com](https://32bitcoins.com) or directly at:
`https://donut3226.github.io/32b_miner_calc/`

## What it does

- Pulls live BTC price (AUD + USD) and network difficulty automatically
- Calculates daily/monthly/yearly sats, revenue, and electricity costs
- Breakeven analysis accounting for difficulty growth over time
- Hodl scenarios, mining vs buying comparison, sensitivity table
- Solo block probability — framed honestly as a lottery ticket
- Pre-loaded hardware profiles for popular home miners (Bitaxe, NerdAxe, Avalon, and industrial rigs for comparison)

## Built with

This project was built with [Claude](https://claude.ai) (Anthropic). It's early days — the calculator works but there's plenty of room to improve, refine, and expand.

## Contributing

Suggestions and contributions are welcome. A few areas that could use attention:

- Verifying miner specs (especially the Canaan Avalon models — flagged in `miners.json`)
- Adding new hardware profiles
- Improving the UI or calculations
- Anything that makes it more useful for home miners

Open an issue or submit a pull request.

## Licence

MIT
