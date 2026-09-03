# Media asset manifest

This manifest covers the local automotive presentation assets used by the web
application. None of these files is sourced from a third-party marketplace,
manufacturer, stock-photo URL, or vehicle-image provider.

## Usage policy

- Category illustrations are decorative, category-level representations. They
  must not be presented as a photograph of a specific purchasable item.
- Generic product and vehicle fallbacks must remain paired with visible text
  that identifies them as unavailable or illustrative media.
- Brand logos, manufacturer marks, model-specific vehicle claims, and remote
  media URLs require a separate content and license review.
- Preserve the documented aspect ratio and an explicit rendered size to avoid
  layout shift.

## Assets

| Path | Source | Dimensions | Intended use | Accessible treatment | SHA-256 |
| --- | --- | ---: | --- | --- | --- |
| `categories/braking-system.webp` | Generated for U5 with the OpenAI image tool, 2026-09-03; no third-party source material | 1200×800 | Decorative braking-system category tile | Empty `alt`; adjacent category name is the label | `A92EA088AEED401B9A1E926C6BE34DA413CBEF5030EBF353EC0FD6D4DBE066CD` |
| `categories/filters.webp` | Generated for U5 with the OpenAI image tool, 2026-09-03; no third-party source material | 1200×800 | Decorative filters category tile | Empty `alt`; adjacent category name is the label | `06AED63A8959428B58F95B8D6304F0BF97D899C783026D3248C2203FA3A01B9D` |
| `categories/suspension.webp` | Generated for U5 with the OpenAI image tool, 2026-09-03; no third-party source material | 1200×800 | Decorative suspension category tile | Empty `alt`; adjacent category name is the label | `0C0BB8422F850D47AAF39B68B356CCFC29C9FAF40ABFBA75297DC400BDD592F1` |
| `categories/engine.webp` | Generated for U5 with the OpenAI image tool, 2026-09-03; no third-party source material | 1200×800 | Decorative engine category tile | Empty `alt`; adjacent category name is the label | `D68B5FE12B7663992EAFEEFD6F02A1F2EF54EAA02B951FC8F29E038A28C5DF9E` |
| `placeholders/product-technical-fallback.webp` | Generated for U5 with the OpenAI image tool, 2026-09-03; no third-party source material | 1200×900 | Honest background for missing product photography | Empty `alt`; the UI exposes visible fallback text and one accessible image label | `06C07910037B95FD0981809A3B0D90C8083E473320BAFB6C2284AAAD0BA6AD83` |
| `vehicles/generic-workshop-vehicle.webp` | Generated for the U0 project visual direction, 2026-09-02; no third-party source material | 1280×720 | Decorative homepage vehicle composition | Empty `alt`; surrounding text carries the meaning | `6BF0E9D74C33B1692CF6FA510717F6236402E21050B0FDE8BD883CBC4AF24621` |
| `vehicles/vehicle-silhouette.svg` | Project-authored generic vector fallback, 2026-09-02 | 640×280 viewBox | Garage vehicle fallback; never an exact model image | Empty `alt`; adjacent make/model/year text is authoritative | `14BE9A6F90DD573174086996467058911F12332AA7CF3499CACF5548EB9D19AA` |

## Deferred real-media contract

Real product, listing, or model-specific vehicle media remains outside this
manifest until the backend provides stable media ownership, ordering,
dimensions, lifecycle, moderation, and fallback metadata.
