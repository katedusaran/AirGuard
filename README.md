# AirGuard

AirGuard is a responsive React + Vite application for environmental air quality monitoring. It provides a dashboard for recent sensor readings, trend charts, alerts, and date-range monitoring with CSV export.

The repository also contains a device firmware sketch in `firmware/airguard_main/airguard_main.ino`, while the frontend connects to Supabase for sensor data and alert history.

## Features

- Dashboard with last 24 hours of sensor readings
- Multi-line trend chart for air quality, temperature, and humidity
- Alerts panel and delivery summary
- Real-time Supabase updates for dashboard readings and alerts
- Monitoring page with date range filtering and CSV export
- Responsive sidebar navigation for Dashboard, Monitoring, and Alerts

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your Supabase values:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the local Vite URL displayed in the terminal.

## Available scripts

- `npm run dev` - start Vite in development mode
- `npm run build` - build the app for production
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint across the source files

## Project structure

- `src/` - React application source code
  - `pages/` - route pages: `Dashboard`, `Monitoring`, and `Alerts`
  - `components/` - reusable UI components such as charts, tables, sidebar, and alerts panel
  - `hooks/` - Supabase hooks for sensor readings and alerts
  - `lib/` - helper modules for Supabase client, air quality classification, and CSV export
  - `styles/` - component and page styles
- `firmware/airguard_main/airguard_main.ino` - Arduino sketch for the sensor device
- `docs/PROJECT_ARCHITECTURE.md` - architecture notes and implementation overview

## Environment variables

The frontend uses the following environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

> Do not commit service-role keys or other secrets to version control. Use only publishable browser keys in the frontend.

## Notes

- `Dashboard` and `Alerts` pages use Supabase realtime inserts for live updates.
- `Monitoring` queries sensor readings for the selected date range and supports CSV export.
- The app currently does not include authentication, error retry UI, or Supabase schema documentation.

## Future improvements

- Add authentication and role-based access
- Add error handling and retry states
- Document Supabase schema and seed data requirements
- Add a 404 page and route fallback
- Add firmware deployment and device setup instructions
