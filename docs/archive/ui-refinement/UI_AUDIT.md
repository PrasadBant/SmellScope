# SMELLSCOPE 2.0 — PHASE 0 UI/UX & DESIGN SYSTEM AUDIT

**Date:** 2026-11-18  
**Scope:** Full Frontend Interface, Information Architecture, and Component System  
**Audit Standard:** Professional Commercial Scientific Research Workstation  

---

## 1. Executive Summary
Following the migration from Streamlit to React + TypeScript + FastAPI and the subsequent stabilization phase, SmellScope 2.0 functions correctly at the scientific algorithm and API level. However, the interface currently exhibits design inconsistencies typical of rapid migration:

1. **Surface & Palette Discrepancy:** The background colors currently use mixed deep blue-grays (`#0B0F19`, `#0F1724`, `#111827`) rather than an intentional, calm, obsidian-black palette (`#080A0E`, `#0D1016`, `#11151D`, `#171C25`, `#252C38`).
2. **Accent & Brand Clutter:** Indigo (`#6366F1`), cyan (`#38BDF8`), and standard blue (`#3B82F6`) compete for visual dominance without a disciplined accent hierarchy.
3. **Information Density & Layout Hierarchy:** Hero cards (e.g. on Overview) occupy excessive vertical height, pushing core analytical tables and diagnostic graphs below the fold.
4. **Typography & Formatting:** Typography lacks uniform tokenization; numbers and technical identifiers (such as SHA-256 hashes and split hashes) are not consistently rendered in monospace with quick-copy interactions.
5. **Component System Maturity:** Buttons and badges have fragmented variants (`variant="cyan"`, `variant="primary"`), and critical workflow components (Breadcrumbs, PageTitle, SectionHeader, ConfirmationDialog, EvidenceBadge, FingerprintDisplay) are absent or implemented ad-hoc.
6. **Usability & Workflow:** Navigation between stages lacks breadcrumb context; tables lack interactive sorting/filtering; empty and error states are inconsistent.

---

## 2. Detailed Findings by Evaluation Criteria

### Criterion 1: Visual Inconsistencies
- **Finding:** Tailwind config defines `accent.primary` as `#6366F1` (indigo) and `accent.cyan` as `#38BDF8`. Screens mix these arbitrarily with `bg-accent-primary` and `text-accent-cyan`.
- **Impact:** Lacks visual cohesion; feels like disparate templates spliced together.
- **Correction:** Establish a strict obsidian-black palette with electric-blue primary (`#3B82F6`), secondary blue-cyan (`#38BDF8`), and restrained semantic colors.

### Criterion 2: Poorly Organised Sections
- **Finding:** Ingestion screen stacks upload, configuration, and audit triggers vertically in a single 1/3-width sidebar card, while the 2/3 right column holds inspection metadata.
- **Impact:** Configuration controls feel cramped, and inspection details are disconnected from the launch action.
- **Correction:** Structure into distinct collapsible sections: 1. Benchmark Source, 2. File Upload / Sample, 3. Ingestion Parameters, 4. Split Health, 5. Inspection & Launch.

### Criterion 3: Unnecessary Visual Clutter
- **Finding:** Glowing radial background blur decorations (`bg-accent-primary/10 blur-3xl`, `bg-accent-cyan/10 blur-2xl`) and animated pulse indicators compete with scientific graphs.
- **Impact:** Resembles consumer/gaming dashboards rather than an enterprise scientific instrument.
- **Correction:** Remove all decorative glow orbs. Use crisp 1px borders (`#252C38`), clean surfaces, and precise typographic hierarchy.

### Criterion 4: Inconsistent Spacing
- **Finding:** Padding jumps between `p-2`, `p-3`, `p-4`, `p-6`, and `p-8` without an 8pt/4pt grid alignment system.
- **Impact:** Cluttered layout rhythm and uneven card margins.
- **Correction:** Standardize spacing tokens: page padding `p-6`, section gap `gap-6`, card padding `p-5`, item gap `gap-3` or `gap-4`.

### Criterion 5: Typography & Text Treatment
- **Finding:** Excessive all-caps labels (e.g. `START NEW AUDIT`, `VIEW AUDIT HISTORY`, `RUN MULTI-CLASS AUDIT`) and lack of consistent font weights.
- **Impact:** Harder to scan; creates shouting effect.
- **Correction:** Restrict uppercase to micro-labels (10–11px, `tracking-wider`). Use natural sentence/title case for action buttons and section headings with Inter and JetBrains Mono for metrics and hashes.

### Criterion 6: Difficult Navigation & Context Awareness
- **Finding:** The top navigation bar lacks breadcrumbs, current dataset indicator, and active audit session switcher.
- **Impact:** Users lose context on which dataset partition and run ID is active when navigating between screens.
- **Correction:** Introduce `AppHeader` featuring active dataset pill, run ID status, quick-switch dropdown, and breadcrumb path.

### Criterion 7: Excessively Large Cards
- **Finding:** Overview hero card is 250px tall with marketing-style copy (`Understand what your NIDS benchmark is really learning.`), forcing key audit metrics off-screen.
- **Impact:** Researchers have to scroll down immediately to view active metrics.
- **Correction:** Replace marketing banner with a high-density, compact Command Center header with contextual audit status and immediate metric cards.

### Criterion 8: Button Hierarchy & Action Ambiguity
- **Finding:** Buttons use conflicting styling (`variant="cyan"` vs `variant="primary"` vs inline tailwind overrides).
- **Impact:** Users are unsure which action is primary vs secondary.
- **Correction:** Standardize button tiers:
  - `Primary`: Solid Electric Blue (`bg-blue-600 hover:bg-blue-500 text-white`).
  - `Secondary`: Charcoal Graphite Surface (`bg-[#171C25] hover:bg-[#1C2330] border-[#252C38]`).
  - `Tertiary / Ghost`: Text-only action (`text-[#8993A3] hover:text-[#F5F7FA]`).
  - `Destructive`: Subtle crimson border or fill (`border-rose-800 text-rose-300`).

### Criterion 9: Confusing Information Hierarchy & Provenance
- **Finding:** Numerical metrics do not explicitly display their scientific provenance badges (`[published]`, `[measured]`, `[synthetic]`, `[target]`, `[cached]`).
- **Impact:** Obscures scientific lineage required by Shared Contract v1.0.
- **Correction:** Embed `EvidenceBadge` next to every major metric and in tables.

### Criterion 10: Missing Loading, Empty & Error States
- **Finding:** On fresh sessions without audits, screens display generic fallback text or abrupt empty cards.
- **Impact:** First-time users do not know what to do next.
- **Correction:** Implement structured `EmptyState` components with clear icon, explanation, and one-click CTA (`Start Audit`, `Select Dataset`). Add skeleton loaders for API fetches.

### Criterion 11: Tables & Charts Arrangement
- **Finding:** Tables lack column sorting; Smell Matrix cells lack search/filtering by attack class; Plotly SFI decay curve lacks confidence bands and interactive parameter tabs.
- **Impact:** Clumsy exploration of high-dimensional benchmark results.
- **Correction:** Add class search/filter bar to Smell Matrix; enhance SFI plot with customizable tabs (Perturbation Curve, Joint Fragility Grid, Feature Importance).

### Criterion 12: User Workflows & Safeguards
- **Finding:** Remediation rollback was executed immediately upon button click without confirmation dialog; SHA-256 fingerprints could not be copied with one click.
- **Impact:** Risk of accidental rollback; friction in copying evidence fingerprints for scientific reports.
- **Correction:** Add `ConfirmationDialog` before rollback; add `FingerprintDisplay` with one-click copy to clipboard.

---

## 3. Screen-by-Screen Remediation Roadmap

1. **Global AppShell & Navigation:**
   - Implement `AppSidebar` with clean navigation groups (WORKSPACE, RESEARCH ANALYSIS, EXPERIMENTATION), collapsible 250px/72px, obsidian black styling.
   - Implement `AppHeader` with compact title, dataset badge, run ID badge, and live backend connection pulse.
   - Implement `WorkflowStepper` (01 INGEST &rarr; 02 OVERVIEW &rarr; 03 DIAGNOSE &rarr; 04 REMEDIATE &rarr; 05 VERIFY) with real completion status.
   - Standardize global footer with mandatory non-detection disclaimer and zero-telemetry badge.

2. **Screen 1 — Overview Command Center (`/overview`):**
   - Compact hero header: "Dataset Trust Overview".
   - 6 compact KPI panels with provenance badges.
   - Two-column insights: Key Vulnerability Findings vs SFI/GGI Summary.
   - Recent activity audit timeline & quick launch panel.

3. **Screen 2 — Dataset Ingestion (`/ingestion`):**
   - Structured 3-column layout: 1. Benchmark Source & Upload, 2. Configuration & Split Health, 3. Inspection & Class Distribution.
   - Collapsible advanced parameters (sampling seed, row limit).
   - Instant file preview with column selector.

4. **Screen 3 — Smell Matrix (`/heatmap`):**
   - Compact filtering toolbar: search class, filter severity, compare published literature.
   - Central heatmap with dark graphite cells, clear text contrast, and missing metric indicator (`N/A [reason]`).
   - Split inspection drawer showing metric formula, threshold, and drilldown button.

5. **Screen 4 — Shortcut Diagnostics (`/diagnostics`):**
   - Context bar: Class, Sample Count, Baseline F1, Recall, SFI, GGI.
   - Tabbed layout: "Empirical SFI Decay Curve" (Plotly), "2D Joint Fragility Grid", "Feature Ranking Table".
   - Clear scientific interpretation card explaining shortcut implications.

6. **Screen 5 — Remediation Lab (`/remediation`):**
   - 3-column workspace: Configuration (Left), What-If Impact & Diff (Center), RSM Governance & Safety Card (Right).
   - Version history table with cryptographic entry IDs, diff summary, and confirmed rollback.

7. **Screen 6 — Verification & Reports (`/reports`):**
   - Locked test set integrity verification banner.
   - Side-by-side performance delta table (`before` vs `after` F1, recall, precision).
   - Scientific limitations disclosure panel.
   - One-click standalone offline HTML report generator & download badge.
