# ⚡ Prepaid Meter Helper (প্রিপেইড মিটার সহায়ক)

> by [tbahsan](https://github.com/tbahsan) • **Live:** https://tbahsan.github.io/utility-token-visualizer/ • **বাংলা README:** [README_BN.md](README_BN.md) (canonical)

A **Bengali-first, 100% offline** helper for Bangladesh's prepaid electricity meter users. No server, no tracking — your data never leaves your device.

## Features

- **Recharge breakdown** — where does your ৳1000 go? Meter rent, demand charge, 5% VAT, 0.5% rebate, with bar chart + read-aloud (bn-BD TTS)
- **Slab rates** — BERC residential (LT-A) marginal slabs + average rate
- **Token check** — 20-digit validator, XXXX-XXXX formatter, meter entry guide
- **Usage tracker** — reading log (localStorage), month-end forecast, days-of-balance estimator
- **Appliances** — monthly cost per appliance + "run AC less" what-if slider
- **Gas & water** — Titas/WASA guides (calculators roadmap)

## Run

```bash
cd utility-token-visualizer
python3 -m http.server 8000
# → http://localhost:8000
```

> JSON won't load over `file://` — use any static server (or the hosted link).

## Formula (transparent)

```
base = recharge − arrears
VAT  = base − base/1.05        (5%, VAT-inclusive treatment)
rebate = 0.5% × base/1.05
energy = base/1.05 − rent − demand + rebate
```

- Demand: Tk 42/kW • Rent: single Tk 40 / three-phase Tk 250
- Slabs are **marginal (block-wise)**, not flat • Lifeline Tk 4.63 only if total ≤ 50 units

Mismatch with your receipt? [Open an issue](https://github.com/tbahsan/utility-token-visualizer/issues).

## Contribute

Tariff change? Just edit `tariffs/tariffs.json` — no coding needed. See [CONTRIBUTING_BN.md](CONTRIBUTING_BN.md).

## License

MIT © tbahsan — see [LICENSE](LICENSE).
