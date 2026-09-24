# FitScribe — Trainer Platform

An athlete monitoring & programming platform for strength/fitness coaches, built with **React 19 + Vite** and structured with **atomic component design**. It captures subjective and objective training load, surfaces the dose-response relationship, and helps coaches manage and modify programmes.

## Getting started

```bash
bun install      # install dependencies
bun run dev      # start the dev server (http://localhost:5173)
bun run build    # production build -> dist/
bun run lint     # oxlint
```

> Uses [Bun](https://bun.sh) for install/scripts. `npm`/`pnpm` also work if you prefer.

## Features

- **Dashboard** — KPIs plus a streamlined, risk-sorted *Squad Readiness & Workload* board (Readiness, ACWR, Wellness, Concerns) and a bulk morning check-in.
- **Command Center** (`/command/:id`) — two-column workspace: a configurable **Load-Response dashboard** (X/Y metric toggles, rolling-average windows, dual-axis charts, ACWR), a **Workout Planner** (prescription modal with auto Volume Load, supersets, copy-last-session and templates), and a pinned **rule-based AI coaching assistant**. A click-to-open off-canvas **profile panel** holds anthropometrics + intake/history.
- **Athlete Monitor** (`/monitor/:id`) — Readiness Matrix (color-coded quadrants), Hooper Index & Session-RPE logs, resistance/conditioning logs, and opt-in wearable tracking with 30-day baselines.
- **Clients, Workouts, Schedule, Progress, Concerns, Settings** — full CRUD.
- **Units** (kg/lb) and **timezone-aware** day boundaries.
- **Reporting** — CSV export and a printable athlete report (Save as PDF).
- **Accessibility** — non-color status cues, ARIA roles/labels, full keyboard navigation.

The app uses Supabase authentication and Postgres when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. Without them it uses browser `localStorage` for a standalone demo. See [SETUP_BACKEND.md](./SETUP_BACKEND.md) for schema and migration steps. Wearable sync and live AI require separate edge-function and vendor/provider configuration.

## Architecture

```
src/
  lib/         pure logic — calc (sRPE-TL, Volume Load, monotony, strain, ACWR,
               readiness, baselines), metrics registry, dates, units, seed, storage
  store/       DataContext (localStorage-backed state + commit) and ModalContext
  hooks/       useFormat (unit-bound formatters)
  components/
    atoms/       Avatar, Tag, Shape, Button, Card, Kpi, ProgressBar, Field, RangeSlider
    molecules/   StatCard, ReadinessTag, ConcernCard, SegToggle, AnthroCell, ModalShell
    organisms/   Sidebar, LoadResponseDashboard, WorkoutPlanner, AICoach, ReadinessMatrix,
                 ProfilePanel, PrescriptionModal, forms/*
    templates/   AppLayout
  pages/       one component per route (Dashboard, Clients, ClientDetail, CommandCenter,
               Monitor, Workouts, Schedule, Progress, Concerns, Settings, Report)
```

Calculations are pure functions that take data explicitly; React state lives in `DataContext` and is persisted on every change.
