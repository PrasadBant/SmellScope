# SMELLSCOPE 2.0 — DESIGN SYSTEM SPECIFICATION

## 1. Design Identity & Principles

- **Brand:** `SMELLSCOPE`
- **Subtitle:** `SCIENTIFIC DATASET TRUST AUDIT WORKSTATION`
- **Atmosphere:** Calm, dark, precise, intelligent, uncluttered.
- **Visual Style:** Obsidian black (`#080A0E`), graphite panels (`#11151D`), subtle 1px charcoal borders (`#252C38`), clean white typography (`#F5F7FA`), and restrained electric-blue primary accents (`#3B82F6`).
- **Data-First:** Zero decorative graphics or glowing blur orbs. Every pixel serves information clarity, metric readability, and scientific reproducibility.

---

## 2. Color Palette & Semantic Tokens

### Background Surfaces
| Surface Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `bg-app` / `bg-main` | `#080A0E` | Main browser viewport, root canvas |
| `bg-sidebar` | `#0A0C10` | Collapsible left navigation sidebar |
| `bg-workspace` | `#0D1016` | Main content workspace |
| `bg-card` | `#11151D` | Standard card and data container |
| `bg-elevated` | `#171C25` | Nested cards, modal dialogs, header bars |
| `bg-hover` | `#1C2330` | Hovered rows, interactive elements |
| `border-subtle` | `#1B202A` | Internal table dividers, subtle rules |
| `border-DEFAULT` | `#252C38` | Card and panel outer boundaries |
| `border-active` | `#3B82F6` | Focus indicators, active navigation tabs |

### Typography Colors
| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `txt-primary` | `#F5F7FA` | Primary titles, active values, high contrast |
| `txt-secondary`| `#C4CBD6` | Body text, table rows, descriptive text |
| `txt-muted` | `#8993A3` | Table headers, metadata labels, unit indicators |
| `txt-disabled` | `#626C7C` | Inactive controls, placeholder text |

### Accent & Semantic Status
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `accent-primary` | `#3B82F6` | Primary action buttons, active navigation indicator |
| `accent-secondary` / `accent-cyan` | `#38BDF8` | Telemetry highlights, Plotly primary data series |
| `status-success` | `#22C55E` | Clean benchmark, RSM PASS, verified hash |
| `status-warning` | `#F59E0B` | Moderate anomaly, RSM WARN (requires authorization) |
| `status-block` | `#EF4444` | Severe shortcut artifact, RSM BLOCK, failed split |

### Scientific Evidence Provenance Badges
| Evidence Type | Badge Token | Color Hex | Definition |
| :--- | :--- | :--- | :--- |
| **[published]** | `evidence-published` | `#38BDF8` | Literature baseline from Flood et al. EuroS&P 2024 |
| **[measured]** | `evidence-measured` | `#22C55E` | Live empirical measurement computed on local engine |
| **[synthetic]** | `evidence-synthetic` | `#A78BFA` | Planted shortcut validation dataset (CIC-IDS-2017) |
| **[cached]** | `evidence-cached` | `#FB923C` | Historical run result loaded from local disk cache |
| **[target]** | `evidence-target` | `#3B82F6` | Target attack class selected for deep investigation |
| **[mock]** | `evidence-mock` | `#8993A3` | Placeholder for pending computation (never in live audit) |

---

## 3. Typography & Hierarchy

- **Primary Sans:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Technical Monospace:** `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace`

| Level | Size | Weight | Font | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 26–28px (`text-2xl` / `text-3xl`) | Extrabold (800) | Sans | Top of each screen |
| **Section Title**| 18–20px (`text-lg`) | Semibold (600) | Sans | Card groups, major panels |
| **Card Title** | 14–15px (`text-sm` / `text-base`) | Semibold (600) | Sans | Card headers, table titles |
| **Body Text** | 13–14px (`text-xs` / `text-sm`) | Normal (400) | Sans | Explanations, documentation |
| **Metadata Label**| 10–11px (`text-[11px]` / `text-[10px]`)| Bold (700, uppercase)| Sans | Column headers, KPI labels |
| **Scientific Metric**| 24–30px (`text-2xl` / `text-3xl`)| Bold (700) | Mono | Numerical KPI values ($F_1$, SFI, GGI) |
| **Hash / ID** | 11–12px (`text-xs`) | Normal (400) | Mono | SHA-256 hashes, run IDs, split hashes |

---

## 4. Component Standards

1. **Buttons:**
   - Primary: Solid `#3B82F6`, hover `#2563EB`, text `#FFFFFF`, rounded 8px.
   - Secondary: Background `#171C25`, border `#252C38`, hover `#1C2330`, text `#F5F7FA`.
   - Ghost / Tertiary: Transparent, text `#8993A3`, hover text `#F5F7FA`.
   - Destructive: Background `transparent`, border `rgba(239, 68, 68, 0.4)`, text `#FCA5A5`, hover `rgba(239, 68, 68, 0.15)`.

2. **Cards:**
   - Standard: Background `#11151D`, border 1px `#252C38`, rounded 10px, padding `p-5`.
   - Elevated: Background `#171C25`, border 1px `#252C38`, rounded 10px, padding `p-5`.

3. **Tables:**
   - Header: Background `#0A0C10`, border-b `#252C38`, text uppercase `#8993A3`, 11px font.
   - Row: Border-b `#1B202A`, hover `#1C2330`, padding `py-2.5 px-3`, text `#C4CBD6`.

4. **Interactive Charts (Plotly):**
   - Background: Transparent (inheriting `#11151D`).
   - Gridlines: `#1B202A`.
   - Primary line: `#38BDF8` (2.5px width).
   - Null reference: `#8993A3` (dashed).
