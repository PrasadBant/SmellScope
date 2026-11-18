# PHASE 2 — REACT FOUNDATION & DESIGN SYSTEM REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** UI/UX Architect & Senior React Engineer  
**Timestamp:** 2026-11-18T19:54:00+05:30  
**Branch:** `feature/react-frontend`  
**Frontend Stack:** React 18.3.1 + TypeScript 5.6.3 + Vite 5.4.11 + Tailwind CSS 3.4.16 + Radix UI + Lucide Icons  

---

## 1. Executive Summary

Phase 2 establishes the complete frontend foundation and design system for SmellScope 2.0. The application transforms the legacy Streamlit interface into an enterprise-grade dark scientific research workstation.

The frontend is strictly decoupled from scientific calculations: all metrics, heuristic scores, null distributions, and safety authorizations originate from the Python research core via FastAPI versioned HTTP endpoints.

---

## 2. Design Token System & Palette

The design system implements the non-negotiable research workstation palette specified in Section 8 of the architecture brief:

| Token | Hex Value | Purpose in SmellScope 2.0 |
|---|---|---|
| **Main Background** | `#0B0F19` | Global deep workspace canvas |
| **Workspace** | `#0F1724` | Primary viewport background |
| **Sidebar** | `#0D1420` | Collapsible command navigation container |
| **Card** | `#111827` | Standard data and panel containers |
| **Elevated Card** | `#182234` | Focused inspectors, active previews, modals |
| **Border** | `#263244` | Crisp, low-contrast structural boundaries |
| **Primary Text** | `#F8FAFC` | High-contrast metrics, headers, titles |
| **Secondary Text** | `#CBD5E1` | Descriptions, labels, table data |
| **Muted Text** | `#94A3B8` | Provenance timestamps, helper captions |
| **Primary Accent** | `#6366F1` | Primary research action triggers, active tabs |
| **Cyan Accent** | `#38BDF8` | Scientific indicators, highlighted features |
| **Success** | `#16A34A` | Clean baselines, RSM PASS status |
| **Warning** | `#D97706` | Intermediate heuristics, RSM WARN flags |
| **Block / Danger** | `#DC2626` | Shortcut suspicions, RSM BLOCK denials |
| **Published** | `#0284C7` | Published literature reference metrics |
| **Synthetic** | `#9333EA` | Synthetic planted validation markers |
| **Cached** | `#EA580C` | Cached demonstration records |

---

## 3. Global Application Shell Architecture

The global shell (`src/layouts/AppShell.tsx`) encapsulates the entire workstation layout:

1. **Collapsible Left Sidebar**:
   - Brand title: `SMELLSCOPE`
   - Subtitle: `SCIENTIFIC DATASET AUDITOR`
   - Sections:
     - **WORKSPACE:** Overview (`/overview`), Dataset Ingestion (`/ingestion`)
     - **RESEARCH:** Smell Matrix (`/heatmap`), Shortcut Diagnostics (`/diagnostics`)
     - **EXPERIMENTATION:** Remediation Lab (`/remediation`), Verification & Reports (`/reports`)
   - Persistent status footer displaying active dataset ID, current audit run ID, and real-time backend connection status (`127.0.0.1:8000`).

2. **Top Application Header**:
   - Scientific Auditor Disclaimer Pill: *"Scientific Auditor · NIDS Benchmark Trust"*.
   - Methodology Help Modal providing definitions for UGT, WL, HDF, PDD, TC, SFI, GGI.
   - Interactive 5-Stage Research Workflow Navigation Bar.

3. **Five-Stage Research Workflow Bar**:
   - Stages: `01 INGEST` &rarr; `02 OVERVIEW` &rarr; `03 DIAGNOSE` &rarr; `04 REMEDIATE` &rarr; `05 VERIFY`.
   - Real-time step completion indicators based on genuine backend state (e.g. valid dataset loaded, active run completed, diagnostics computed).
   - One-click navigation across the entire research investigation lifecycle.

---

## 4. Component Primitives

The workstation includes custom accessible components built with Radix UI and Tailwind CSS:
- `Button`: Primary, Secondary, Outline, Ghost, Danger, and Cyan variants with integrated loading spinners and focus rings.
- `Badge`: Status badges for evidence labels (`published`, `synthetic`, `cached`), RSM states (`success`, `warning`, `danger`), and feature controllability taxonomy (`categoryA`, `categoryB`, `categoryC`, `categoryD`).
- `Card`: Scientific panels with header, title, description, content, and footer subdivisions.
- `StatCard`: High-density metric display cards with mono-spaced typography and trend indicators.
- `Modal`: Accessible dialogs with blurred backdrops and keyboard escape traps.

---

## 5. Verification & Build Results

- **Typecheck:** `tsc --noEmit` passed with 0 errors.
- **Unit Tests:** `vitest run` passed (4/4 tests passed).
- **Production Bundle:** `vite build` generated optimized static assets (`dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`) in 3.08 seconds.

**Status:** PHASE 2 COMPLETE — PROCEEDING TO PHASE 3 DOCUMENTATION.
