# Leafwise landing page — build plan

Source of truth: Figma file `kznrGLDl8F7hGsU3JkSBwr`, frame `1:31` "Leafwise — Plant health, made clear" (1728 × 10179).
Extracted spec: node tree with exact coordinates, fonts, colors, image fills (see `outline-1-31.txt` in the temp figma folder).

## Design tokens

| token | value | usage |
|---|---|---|
| paper | `#fffaf2` | page bg, light text on dark |
| bone | `#f5efe4` | panels, chips, tracks |
| ink | `#061a2b` | text, laptop bezel |
| teal | `#22bd93` | buttons, active tab |
| teal-bright | `#21bd94` | progress gradient start, camera border |
| lime | `#e8fc47` | progress gradient end |
| night | `#082033` | switcher / disclaimer chips |
| fonts | Lora 400 (display), Inter 400/500 (UI) | `next/font/google` |

## Section → component map

| # | Figma frame | size | component |
|---|---|---|---|
| — | Hero & navigation `1:32` | 1728×1300 | `Nav.tsx` + `Hero.tsx` |
| 01 | AI diagnostics `1:59` | 1728×1150 | `DiagnosticsSection.tsx` (laptop mockup) |
| 02 | Field accessibility `1:148` | 1728×1100 | `FieldSection.tsx` (phone mockup) |
| 03 | Supported classes `1:290` | 1728×1608 | `ClassesSection.tsx` + `CropCard` |
| 04 | How it works `1:581` | 1728×1100 | `HowItWorksSection.tsx` |
| 05 | Live preview `1:612` | 1728×1150 | `LivePreviewSection.tsx` |
| 06 | Use cases `1:678` | 1728×1150 | `UseCasesSection.tsx` |
| 07 | Quick scan `1:787` | 1728×1108 | `QuickScanSection.tsx` |
| 08 | Project footer `1:797` | 1728×513 | `SiteFooter.tsx` |
| — | shared | | `UploadPill.tsx` |

## Asset map (matched by Figma `imageRef`)

| section | local asset |
|---|---|
| hero bg | `Agricultural_drone_scanning_farm…_c1d8d0be_2K 1.webp` |
| 03 bg | `Farm_banner_illustration_cf9f5a3e_2K 1.webp` |
| 04 bg | `Underground_soil_bed_vector_illu…_c9c796c9_2K 1.webp` |
| 05 bg | `Wind_turbines_on_agricultural_la…_25ac0cb1_2K 1.webp` |
| 07 bg | `Farm_banner_illustration_design_7897d729_2K 1.webp` |
| footer bg | `Underground_soil_bed_vector_illu…_544f39bf_2K 1.webp` |

Vector art exported from the same Figma nodes as SVG (design assets, not stock):
`asset-hand-scanner.svg`, `asset-leaf-tomato.svg`, `asset-crop-{tomato,apple,corn,potato,grape,pepper}.svg`.
The use-case mini illustrations are the same crop artwork at 45% scale → reused.

## Responsive strategy

- Exact Figma values at ≥1280px (`xl`), design width 1728.
- Display headings use `clamp(<mobile>, <vw>, <figma px>)` so 1280–1728 scales gracefully.
- <1280px: single-column stacking, reduced type/padding (no mobile design in Figma — adaptation preserving hierarchy).
- No horizontal overflow, images `object-cover` with tuned `object-position`.

## Verification loop

1. `npm run dev` → headless Edge screenshots at 1728 / 1440 / 375.
2. Compare section by section against Figma PNG slices (`s0-hero.png` … `s8-footer.png`).
3. Refine spacing, type, image framing until aligned.

## Known deviations (documented)

- Hero / twilight background photos in Figma are different crops of the same illustrations than the supplied WebP files → used supplied files with `object-cover` framing.
- Live-preview sample switcher (Healthy / Early blight / Powdery mildew) is rendered exactly as designed but static: Figma only provides content for one state and inventing copy is out of scope.
- Crop carousel controls (`01—06`, arrows) are decorative/static for the same reason.
- Use-case card mini illustrations reuse the exported crop SVGs (tomato / potato) — Figma's originals are embedded generated illustrations that were not separately supplied.
- Next.js 16 emits static SVG imports as objects; `lib/assets.ts` unwraps `.src` so `next/image` receives a plain URL (SVGs pass through unoptimized).
- Below 1728px the diagnostics laptop/explanation split uses proportional widths (61% / 34%) instead of the exact 920 / 525 px, preventing clipping on laptop viewports. No `src/` directory: this App Router project keeps `app/`, `components/` and `lib/` at the frontend root (`@/*` → `frontend/`).
