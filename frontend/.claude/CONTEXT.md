# PGA AgriTask — Web Frontend Context

## Project
Web frontend for PGA AgriTask — field operations platform for
Prabhu Seeds (Indore MP), a multi-state Indian seed company.
Replaces WhatsApp + Excel with structured React web dashboard.

## Tech Stack
- React 18 + Vite + JavaScript (JSX)
- TailwindCSS v3 + Radix UI (accessible primitives)
- TanStack Query v5 (server state, caching)
- Zustand v4 (auth + UI state)
- React Hook Form + Zod (forms + validation)
- @vis.gl/react-google-maps (maps)
- @tanstack/react-table (data tables)
- Recharts (dashboard charts)
- Axios (HTTP with auth interceptor)

## Backend API
- FastAPI (Python) at VITE_API_URL
- Supabase PostgreSQL with RLS
- Auth: OTP via MSG91 → JWT token

## Roles (4 roles, visibility engine is core)
- Owner: sees all data across all states
- Manager: sees own team/state data
- Field: sees only own assigned data
- Accounts: sees travel/expense data

## Key Constraints
- UI designs come from Stitch/Figma — match exactly
- PPK rate = pay-per-km travel reimbursement in INR
- 54 activity types across 4 departments
- Currency: INR (₹), locale: en-IN
- Mobile-responsive (collapse below 768px)

## Folder Structure
src/pages/       Route-level pages (.jsx)
src/components/  Shared UI components (.jsx)
src/features/    Feature modules
src/hooks/       Custom hooks (.js)
src/store/       Zustand stores (.js)
src/api/         TanStack Query hooks (.js)
src/lib/         Axios, Supabase client, auth guard (.js/.jsx)
src/utils/       Utility functions (.js)

## Important
- All files use .jsx (with JSX) or .js (without JSX)
- No TypeScript — no .ts/.tsx files, no type annotations
- Use PropTypes or JSDoc comments for documentation if needed
