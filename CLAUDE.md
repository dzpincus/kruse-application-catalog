# Kruse Application Catalog

SPFx web part for Southern Company SharePoint — showcases Kruse Consulting's project portfolio.

## Stack
- **SPFx 1.20.x** (SharePoint Framework)
- **React + TypeScript** (class components, Fluent UI v8)
- **Node 18** (required by SPFx — use `fnm use 18`)
- **Gulp** build toolchain

## Project Structure
```
kruse-application-catalog/    # SPFx project root
  src/webparts/applicationCatalog/
    components/               # React components
    models/                   # TypeScript interfaces (IProject, enums)
    services/                 # Data layer (IProjectService, StaticProjectService)
    data/                     # Auto-generated project data (from Excel)
    styles/                   # Theme config (colors, typography, category/status maps)
    utils/                    # Filter/sort logic
  scripts/                    # Data conversion tools
project-data/                 # Source Excel files
```

## Commands
```bash
fnm use 18                              # Switch to Node 18 (required)
npx gulp serve                          # Local dev server (workbench)
npx gulp build                          # Build
npx gulp bundle --ship && npx gulp package-solution --ship  # Production build
node scripts/convert-excel.js           # Regenerate data from Excel
```

## Architecture
- **Service abstraction**: `IProjectService` interface → `StaticProjectService` (MVP) → future `ApiProjectService` (SQL)
- **Data flow**: Excel → convert script → `data/projects.ts` → StaticProjectService → React components
- **Theme**: All brand colors in `styles/theme.ts` — single file to update when brand assets arrive
- **Filtering**: Client-side, all 240 projects in memory

## Key Decisions
- Single web part (not multiple)
- Fluent UI v8 (bundled with SPFx, don't install v9)
- es5 target with selective lib additions for Array.from, Set, etc.
- Static data for MVP, service interface pattern for future API swap
