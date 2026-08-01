 # AirGuard Project Architecture

 This document describes the architecture as implemented in the repository on 2026-08-01. It distinguishes current behavior from recommended production architecture so future feature work can be planned without mistaking proposals for existing functionality.

 ## 1. Project Overview

 AirGuard is a responsive React single-page application for environmental air-quality monitoring. It presents sensor readings, derives AQI-style health classifications, visualizes recent trends, displays alerts, and exports readings as CSV.

 The apparent target users are an environmental monitoring unit and school staff at Manolo Fortich NHS. The sidebar identifies the organization as the Environmental Monitoring Unit. The likely operational users need to inspect current conditions, review historical readings, and see whether alerts were delivered.

 ### Current status

 The frontend is functional and already connected to Supabase through the browser client. The following parts are implemented:

 - Application bootstrap and client-side routing.
 - Desktop sidebar and responsive mobile navigation drawer.
 - Dashboard metrics, recent sensor trend chart, recent alerts, and readings table.
 - Date-filtered monitoring view.
 - CSV download for selected sensor readings.
 - Alerts summary and alert list.
 - Supabase queries for readings and alerts.
 - Realtime INSERT subscriptions for the dashboard readings and alerts hooks.
 - AQI classification and status presentation.

 The following parts are absent or incomplete:

 - Authentication, user roles, profiles, and authorization UX.
 - Visible error states, retry controls, and realtime subscription status.
 - A route fallback and route-level error boundary.
 - A formal service layer between hooks and Supabase.
 - Database migrations, schema documentation, generated types, seed data, and tests.
 - Sensor/device management, alert acknowledgement, alert creation, settings, and administration.
 - A true realtime implementation for the date-filtered Monitoring page.
 - Production deployment configuration and documented environment setup.

 There are no mock-data modules in the source tree. Data is expected to come from Supabase. Empty tables may therefore indicate either a genuinely empty database or an unavailable/unauthorized query; the current UI does not distinguish those cases because hook errors are not rendered.

 ## 2. Technology Stack

 | Technology | Current use | Reason and notes |
 | --- | --- | --- |
 | React 19 | Functional components and hooks | Provides the component model and local state primitives. |
 | Vite 8 | Development server and production bundling | Fast ESM development, HMR, and a small build configuration. |
 | JavaScript | All application source is `.js`/`.jsx` | Fast to start, but the sensor and alert row contracts are currently implicit. TypeScript or generated Supabase types would improve safety as the system grows. |
 | CSS | Global CSS files imported by components/pages | A simple convention-based styling approach. It is not CSS Modules, Tailwind, or a CSS-in-JS system. |
 | React Router 7 | `BrowserRouter`, `Routes`, `Route`, `NavLink` | Client-side navigation between dashboard, monitoring, and alerts. |
 | Supabase JS 2 | Browser client, table queries, Postgres realtime subscriptions | Supplies the current backend data source. The publishable key is appropriate for browser use only with correct RLS policies. |
 | Chart.js and react-chartjs-2 | Line charts | Chart.js provides rendering and `react-chartjs-2` adapts it to React. |
 | Lucide React | Navigation and download icons | Consistent SVG icon components. |
 | Day.js | Declared dependency only | Not imported by the current source. |
 | React Icons | Declared dependency only | Not imported by the current source. |
 | ESLint | Static analysis | Uses the recommended JavaScript rules plus React Hooks and React Refresh rules. |

 ### Scripts and configuration

 - `npm run dev`: starts Vite.
 - `npm run build`: creates the production bundle.
 - `npm run lint`: runs ESLint.
 - `npm run preview`: serves the built bundle locally.
 - `vite.config.js`: enables `@vitejs/plugin-react`; there are no aliases, proxy rules, or deployment rewrites.
 - `eslint.config.js`: flat ESLint configuration for JavaScript/JSX, browser globals, hooks, and refresh.
 - `index.html`: sets the document title, loads the Inter font from Google Fonts, and loads `src/main.jsx`.

 ## 3. Complete Folder Structure

 ```text
 AirGuard/
 |-- .env
 |-- .gitignore
 |-- eslint.config.js
 |-- index.html
 |-- package.json
 |-- package-lock.json
 |-- README.md
 |-- vite.config.js
 |-- docs/
 |   `-- PROJECT_ARCHITECTURE.md
 |-- public/
 |   |-- favicon.svg
 |   `-- icons.svg
 `-- src/
		 |-- App.css
		 |-- App.jsx
		 |-- index.css
		 |-- main.jsx
		 |-- assets/
		 |   |-- hero.png
		 |   |-- react.svg
		 |   `-- vite.svg
		 |-- components/
		 |   |-- AlertsPanel.jsx
		 |   |-- LineChart.jsx
		 |   |-- MultiLineChart.jsx
		 |   |-- ReadingsTable.jsx
		 |   |-- Sidebar.jsx
		 |   `-- StatCard.jsx
		 |-- hooks/
		 |   |-- useAlerts.js
		 |   |-- useSensorReadings.js
		 |   `-- useSensorReadingsByDate.js
		 |-- lib/
		 |   |-- AirQuality.js
		 |   |-- ExportCSV.js
		 |   `-- supabase.js
		 |-- pages/
		 |   |-- Alerts.jsx
		 |   |-- Dashboard.jsx
		 |   `-- Monitoring.jsx
		 `-- styles/
				 |-- AlertsPage.css
				 |-- AlertsPanel.css
				 |-- Dashboard.css
				 |-- Global.css
				 |-- LineChart.css
				 |-- Monitoring.css
				 |-- ReadingsTable.css
				 |-- Sidebar.css
				 `-- StatCard.css
 ```

 ### File responsibilities

 **Application and configuration**

 - `main.jsx` is the entry point. It mounts React under `StrictMode` and provides `BrowserRouter`.
 - `App.jsx` owns the persistent shell, imports global styles, renders `Sidebar`, and declares all current routes.
 - `index.html` is the browser host document and font-loading boundary.
 - `package.json` declares runtime/development dependencies and scripts.
 - `vite.config.js` controls the Vite build at present.
 - `eslint.config.js` defines static-analysis rules.
 - `.env` supplies `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. It must not contain a service-role key. It should be excluded from version control; `.gitignore` currently does not explicitly ignore `.env`.
 - `README.md` currently contains only the project title and is not an operational guide.
 - `docs/PROJECT_ARCHITECTURE.md` is the architecture and roadmap reference.

 **Pages**

 - `Dashboard.jsx` composes the 24-hour readings hook, ten-alert hook, trend chart, alert panel, table, and three statistic cards. It calculates chart series and current AQI status.
 - `Monitoring.jsx` owns start/end date state, invokes the date-range readings hook, renders the table, and triggers CSV export.
 - `Alerts.jsx` invokes the fifty-alert hook, calculates delivery summary counts, and renders the alert panel.

 **Reusable components**

 - `Sidebar.jsx` renders desktop navigation and the mobile drawer. It owns only drawer-open state.
 - `StatCard.jsx` is a presentational metric card with `label`, `value`, and optional `tone` props.
 - `AlertsPanel.jsx` renders loading, empty, or alert-list states. It expects alert fields `id`, `alert_type`, `created_at`, and `message`.
 - `ReadingsTable.jsx` renders sensor rows, formats dates/numbers, and derives display status using `classifyAirQuality`.
 - `LineChart.jsx` is a reusable single-series Chart.js component. It is currently unused.
 - `MultiLineChart.jsx` renders the dashboard's air quality, temperature, and humidity series. Its `series` contract is `{ label, values, color, unit }`.

 **Hooks and library code**

 - `useSensorReadings.js` queries recent readings, tracks loading/error state, exposes the latest row, and subscribes to sensor INSERT events.
 - `useSensorReadingsByDate.js` queries a local-date range. It has no realtime subscription.
 - `useAlerts.js` queries newest alerts, tracks loading/error state, and prepends realtime INSERT events.
 - `supabase.js` creates and exports the singleton Supabase client.
 - `AirQuality.js` owns AQI thresholds, classifications, colors, backgrounds, and descriptions.
 - `ExportCSV.js` converts reading rows to a browser download.

 **Styles and assets**

 - `styles/Global.css` is the active design token/reset/layout layer.
 - The remaining files in `styles/` own selectors for their matching page/component.
 - `App.css` and `index.css` are unused Vite starter styles. `index.css` contains conflicting purple/light-dark variables and a fixed `#root` width, but it is not imported.
 - `assets/hero.png`, `assets/react.svg`, `assets/vite.svg`, `public/favicon.svg`, and `public/icons.svg` are starter assets with no current application references.

 ## 4. Application Flow

 1. The browser loads `index.html`, creates `#root`, and loads `src/main.jsx`.
 2. `main.jsx` calls `ReactDOM.createRoot`, wraps `App` in `StrictMode`, and provides `BrowserRouter`.
 3. `App` renders the shell: `Sidebar` plus the main content area.
 4. React Router matches `/`, `/monitoring`, or `/alerts` and renders the corresponding page.
 5. The page calls its custom hook. The hook schedules an asynchronous initial load, queries Supabase, and updates local hook state.
 6. Dashboard and alerts hooks also create Postgres realtime channels. INSERT payloads update hook state without requiring a full page reload.
 7. Pages derive presentation data: chart labels/series, AQI status, counts, date filters, and alert delivery counts.
 8. Presentational components render cards, charts, tables, alerts, and navigation.
 9. User interactions change route, open/close mobile navigation, change date inputs, or start a CSV download.
 10. Date changes recreate `useSensorReadingsByDate`'s callback/effect and trigger a new query.

 Current flow in compact form:

 ```text
 User
	 -> Sidebar/NavLink or page control
	 -> Route/Page
	 -> Custom hook or local state
	 -> Supabase query/realtime event
	 -> Hook state
	 -> Page-derived values
	 -> Chart/Table/Panel/StatCard render
 ```

 ## 5. Routing

 | Route | Page | Main children | Data |
 | --- | --- | --- | --- |
 | `/` | `Dashboard` | `StatCard` x3, `MultiLineChart`, `AlertsPanel`, `ReadingsTable` | Last 24 hours of `sensor_readings`; newest 10 `alerts`; realtime inserts for both |
 | `/monitoring` | `Monitoring` | date inputs, export button, `ReadingsTable` | Date-filtered `sensor_readings`; no realtime channel |
 | `/alerts` | `Alerts` | alert summary and `AlertsPanel` | Newest 50 `alerts`; realtime alert inserts |

 `Sidebar` uses `NavLink` and closes the mobile drawer after a link click. The root link uses `end` so it is active only on `/`. There is no wildcard route, authentication guard, nested layout, route-level loading boundary, or route-level error boundary. Unknown URLs therefore render the shell with no matched page.

 For scale, keep the shell as a layout route and add a wildcard not-found route. Add route metadata for titles/permissions, lazy-load pages when the application grows, and introduce an auth boundary before protected pages. A route-level error boundary should isolate failed page data from navigation.

 ## 6. Component Architecture

 The present hierarchy is:

 ```text
 App
 |-- Sidebar
 `-- Routes
		 |-- Dashboard
		 |   |-- StatCard x3
		 |   |-- MultiLineChart
		 |   |-- AlertsPanel
		 |   `-- ReadingsTable
		 |-- Monitoring
		 |   `-- ReadingsTable
		 `-- Alerts
				 `-- AlertsPanel
 ```

 Pages own data composition; reusable components are mostly presentational. This is a good boundary for gradual backend evolution, but the pages currently know database column names indirectly through hook return values and derived calculations.

 ### Component review

 - `Sidebar`: local `open` state; depends on React Router and Lucide; parent is `App`. Improvement: close on Escape, expose `aria-expanded`, and optionally derive navigation from route metadata.
 - `StatCard`: no state; receives scalar props. Good reuse candidate. Improvement: add semantic value/label markup if needed and validate tones.
 - `AlertsPanel`: no state; receives `alerts` and `loading`. Shared by Dashboard and Alerts. Improvement: accept an error and retry callback, and render alert severity/status rather than applying one danger style to every item.
 - `ReadingsTable`: no state; receives `readings`. Shared by Dashboard and Monitoring. Improvement: handle errors, stable empty/loading states, pagination/virtualization for large ranges, and explicit locale/time-zone formatting.
 - `LineChart`: no state; receives `title`, `labels`, `values`, `color`, `unit`, and `height`. Currently dead code. It duplicates Chart.js registration and option setup from `MultiLineChart`.
 - `MultiLineChart`: no state; receives `labels`, `series`, and `height`. Improvement: share chart configuration with `LineChart`; use separate axes or separate charts because AQI, Celsius, and percentage are different units.

 Duplicated logic includes Chart.js registration/options, date formatting, loading/empty messaging, and direct use of backend row field names. A future `ChartShell`, `LoadingState`, `ErrorState`, and normalized view-model mapper would reduce duplication without changing page behavior.

 ## 7. Data Flow

 ### Sensor readings

 `Dashboard` calls `useSensorReadings('24h')`. The hook queries `sensor_readings` ordered ascending by `created_at`, returns `readings` and `latest`, then appends realtime INSERT payloads. Dashboard maps rows into chart labels and three series, counts rows whose stored status is `Poor` or `Hazardous`, and passes rows to `ReadingsTable`.

 `Monitoring` owns date strings from native date inputs. `useSensorReadingsByDate` converts them to local start/end timestamps, queries the same table ordered descending, and passes the result to `ReadingsTable` and `exportSensorReadingsCSV`.

 `ReadingsTable` independently calls `classifyAirQuality` for every row, so its badge is derived from the numeric AQI value rather than the stored status.

 ### Alerts

 `Dashboard` calls `useAlerts(10)` and `Alerts` calls `useAlerts(50)`. The hook queries newest rows, returns them to the page, and prepends realtime INSERT payloads. `AlertsPanel` displays `alert_type`, `created_at`, and `message`. `Alerts` counts rows with `status === 'sent'` as SMS delivered and treats all other statuses as pending/failed.

 ### No Context or mock layer

 There is no React Context, global client store, reducer, mock adapter, or local persistence. State is local to hooks/pages/components and is passed through props.

 ## 8. State Management

 - **Global state:** none.
 - **Server state:** readings and alerts are held in custom hook state. Each mounted consumer has its own query state and realtime channel.
 - **Local UI state:** `Sidebar.open`, `Monitoring.startDate`, and `Monitoring.endDate`.
 - **Derived state:** chart series, latest classification, risk counts, and alert delivery counts are calculated during render.
 - **Props:** pages pass data into presentational components; components do not mutate parent state.

 This is adequate for three read-heavy pages. It will become harder to coordinate when authentication, shared filters, acknowledgements, pagination, mutations, caching, and offline behavior arrive. First introduce a service layer and query-keyed hooks. React Query/TanStack Query would be a strong optional addition for cache, retries, invalidation, and deduplication; a full global store is not currently necessary.

 ## 9. Current Features

 - **Dashboard:** 24-hour reading count, Poor count, Hazardous count, current AQI classification, combined trend chart, recent alerts, and readings table.
 - **Real-time reading updates:** `useSensorReadings` appends sensor INSERT events while mounted.
 - **Alert updates:** `useAlerts` prepends alert INSERT events while mounted.
 - **Historical filtering:** Monitoring accepts an inclusive start/end date range.
 - **CSV export:** Monitoring downloads the currently loaded rows.
 - **Alert delivery summary:** Alerts shows total, sent, and non-sent counts.
 - **Responsive navigation:** Sidebar becomes a mobile top bar and drawer below 768px.
 - **Responsive layout:** Dashboard columns collapse below 1100px; alert summary stacks below 700px; tables scroll horizontally.
 - **AQI presentation:** Numeric values map to Good, Moderate, Poor, or Hazardous with shared colors and descriptions.

 Not implemented: user accounts, role-based views, alert actions, sensor configuration, charts with selectable ranges, search, pagination, notification preferences, data mutation forms, and monitoring-page realtime updates.

 ## 10. Future Supabase Integration

 The frontend already has the correct high-level direction: components render props, pages compose hooks, and `supabase.js` owns client creation. The next boundary should be:

 ```text
 React components
	 -> Pages
	 -> Custom hooks
	 -> Domain services
	 -> Supabase client
 ```

 ### Recommended schema

 **`sensor_readings`**

 - `id uuid primary key default gen_random_uuid()`
 - `created_at timestamptz not null default now()`
 - `device_id uuid not null references devices(id)` once devices are introduced
 - `air_quality_value numeric not null check (air_quality_value >= 0)`
 - `air_quality_status text not null` or a derived/generated value; do not allow it to drift from the numeric value
 - `temperature numeric`
 - `humidity numeric check (humidity between 0 and 100)`

 **`alerts`**

 - `id uuid primary key default gen_random_uuid()`
 - `created_at timestamptz not null default now()`
 - `sensor_reading_id uuid references sensor_readings(id)`
 - `device_id uuid references devices(id)`
 - `alert_type text not null`
 - `severity text not null`
 - `message text not null`
 - `status text not null default 'pending'` with a constrained set such as `pending`, `sent`, `failed`, `acknowledged`
 - `sent_at timestamptz`
 - `acknowledged_at timestamptz`

 **Future supporting tables**

 - `devices`: sensor identity, display name, location, active flag, calibration metadata.
 - `organizations`: school/unit ownership boundary.
 - `profiles`: user metadata linked to `auth.users`.
 - `organization_members`: organization membership and roles.
 - `alert_rules`: thresholds and delivery configuration.
 - `alert_deliveries`: per-channel delivery attempts and provider responses.

 Add indexes on `sensor_readings(created_at desc)`, `sensor_readings(device_id, created_at desc)`, `alerts(created_at desc)`, and foreign keys used for filtering. Consider a view such as `latest_sensor_readings` only when the query is reused; do not hide simple queries behind views prematurely.

 ### Auth, RLS, storage, and realtime

 - Use Supabase Auth for staff accounts. The browser receives only the publishable key.
 - Link `profiles.id` to `auth.users.id`; use organization membership for access decisions.
 - Enable RLS on every application table. Authenticated users should select only rows for organizations they belong to. Sensor ingestion should use a trusted server, Edge Function, or narrowly scoped device credential, never a service-role key in the browser.
 - Permit browser SELECT on readings/alerts only under the intended organization policy. Restrict INSERT/UPDATE/DELETE to trusted ingestion or authorized staff roles.
 - Enable Realtime for `sensor_readings` and `alerts` only after RLS and publication settings are verified. Handle channel status and errors in the hooks.
 - Supabase Storage is not required for current readings. It may later store reports, exports, device documentation, or incident attachments with private buckets and signed URLs.

 ### Page integration

 - Dashboard uses `readingService.listRecent({ range })`, `alertService.listRecent({ limit })`, and optional realtime hook helpers.
 - Monitoring uses `readingService.listByDate({ startDate, endDate })` and keeps CSV formatting in a utility or export service.
 - Alerts uses `alertService.listRecent({ limit })`; future acknowledgement should call a service mutation and invalidate/refetch alert data.
 - Components should remain unaware of Supabase table names and query syntax.

 ## 11. Recommended Service Layer

 Add `src/services/` gradually. Services should be small, domain-oriented, and return application-shaped data or Supabase errors.

 - `readingService.js`: recent/date-range queries, pagination, normalization, and optional latest-reading queries.
 - `alertService.js`: recent alerts, acknowledgement, delivery status, and alert filters.
 - `deviceService.js`: device registration, health, location, and calibration metadata.
 - `authService.js`: sign in/out, session retrieval, password recovery, and role/profile lookup.
 - `organizationService.js`: current organization and member permissions.
 - `exportService.js`: CSV generation/download; the existing `lib/ExportCSV.js` can be moved or wrapped without changing Monitoring's UI contract.
 - `realtimeService.js`: channel creation, cleanup, status reporting, and event normalization if multiple pages need the same subscriptions.

 Keep `lib/supabase.js` limited to client configuration. Do not put database calls in `AlertsPanel`, `ReadingsTable`, charts, or other UI components.

 ## 12. Recommended Custom Hooks

 - `useAuth`: session, user, sign-in/out actions, and auth loading/error state.
 - `useProfile`: current profile and organization role.
 - `useSensorReadings`: existing hook evolved to call `readingService`, normalize rows, deduplicate realtime events, and expose refresh/error/subscription state.
 - `useSensorReadingsByDate`: existing hook evolved to use an explicit timezone policy and service query.
 - `useAlerts`: existing hook evolved to call `alertService`, expose errors, and support acknowledgement/invalidation.
 - `useDevices`: active devices, device health, and selection state.
 - `useAlertRules`: rules and rule mutations for authorized users.
 - `useRealtimeSubscription`: shared lifecycle/status handling if several domains need realtime.

 Hooks should manage server-state lifecycle and expose stable view-model contracts. Pages should decide layout; services should decide persistence.

 ## 13. Database Migration Plan

 1. Document the existing `sensor_readings` and `alerts` columns and constraints in Supabase migrations. Add indexes and confirm Realtime publication settings.
 2. Add service functions that reproduce the exact current hook queries. Keep hook return shapes (`readings`, `alerts`, `loading`, `error`, `refresh`) stable.
 3. Change the existing hooks to call services. Components and pages should remain untouched at this stage.
 4. Add normalized row mappers and generated database types. Resolve whether status is authoritative in the database or always derived from AQI.
 5. Add visible error/retry states and realtime status without changing successful rendering.
 6. Add Auth and RLS. Introduce an auth boundary only after the unauthenticated/read-only flow has a deliberate product decision.
 7. Add mutations such as alert acknowledgement behind service functions and role checks.
 8. Add pagination or time-window limits before exposing long historical ranges.

 Files likely to change during migration: `src/hooks/*`, new `src/services/*`, `src/lib/supabase.js` for configuration validation, and page-level error/auth boundaries. `ReadingsTable`, charts, `AlertsPanel`, and most CSS should remain untouched if hook contracts are preserved. `Monitoring.jsx` may change only for export/query error handling. Database migrations and generated types belong outside `src`, in a documented Supabase migrations/types workflow.

 ## 14. Code Quality Review

 ### High-priority risks

 - Hook `error` values are returned but ignored by all pages, so permission/network/schema failures look like empty data.
 - `useSensorReadings` appends every sensor INSERT without deduplication, sorting, or checking the active time range. Realtime rows can duplicate or fall outside the selected range.
 - Dashboard counts use stored `air_quality_status`, while the latest badge and table status derive from `air_quality_value`. These can disagree if stored status is stale or missing.
 - `MultiLineChart` puts AQI, temperature, and humidity on one Y-axis. The visual comparison is misleading because the units and scales differ.
 - `ExportCSV.js` does not quote/escape commas, quotes, or newlines and exports stored status rather than the same derived status shown in the table.
 - Async hook loads do not consistently guard state updates after an awaited request when a component unmounts or its parameters change.
 - Date queries use local midnight conversion before UTC serialization. This needs an explicit product timezone for users or devices in multiple regions.

 ### Medium-priority issues

 - There is no fallback route, route error boundary, loading shell, or authentication boundary.
 - Realtime subscription errors/status are not exposed.
 - `Monitoring` is named real-time but has no realtime subscription.
 - Chart configuration and registration are duplicated in two components.
 - `LineChart` and `statusColorMap` appear unused.
 - `dayjs` and `react-icons` are declared but unused.
 - Starter `App.css`, `index.css`, and assets add dead-code noise.
 - The README does not explain installation, environment variables, schema, RLS, or deployment.
 - `.env` is not explicitly ignored. The publishable key is not a secret, but environment handling still needs to be deliberate.

 ### Accessibility and responsive review

 Existing strengths include labels associated with date inputs, semantic table markup, an `aria-label` on the mobile menu button, keyboard-focusable native controls, and horizontal table overflow. Improvements should include `aria-expanded`/`aria-controls` for the menu, Escape-to-close behavior, a visible focus style for all controls, meaningful status text beyond color, an accessible chart summary, and error messaging tied to the relevant region. Test the 768px/700px/1100px breakpoints with long alert messages and narrow date controls.

 ### Performance

 Current datasets are unpaginated and charts rebuild data/options on each render. This is acceptable for a small 24-hour window but not unlimited history. Add query limits/pagination, downsample chart points for long ranges, and consider cached server-state hooks before adding memoization. The realtime channels must be cleaned up, which the current effects do on unmount.

 ## 15. Project Improvements

 ### Near term

 - Add a real README with setup, environment variables, expected tables, RLS, and deployment notes.
 - Add error, retry, and subscription-status UI.
 - Add a wildcard route and accessible mobile navigation behavior.
 - Centralize date/time formatting and define a timezone policy.
 - Fix CSV escaping and make exported status consistent with displayed status.
 - Remove unused starter CSS/assets and unused dependencies after confirming they are not needed.

 ### Medium term

 - Introduce `src/services`, domain mappers, and generated Supabase types.
 - Add tests for AQI classification, CSV escaping, hook transformations, and page-level rendering states.
 - Share Chart.js configuration and separate axes or charts by unit.
 - Add query limits/pagination and a deliberate realtime event strategy.
 - Add authentication, organization membership, and RLS-aware route protection.

 ### Longer term

 - Device health and calibration management.
 - Configurable alert rules and acknowledgement workflows.
 - Notification delivery history and retry visibility.
 - Scheduled reports and private export storage.
 - Observability for ingestion latency, stale devices, failed queries, and realtime disconnects.

 ## 16. Development Guidelines

 - Keep pages responsible for composition and layout, components responsible for rendering, hooks responsible for server-state lifecycle, and services responsible for Supabase persistence.
 - Do not query Supabase directly from UI components.
 - Reuse `classifyAirQuality` for every AQI status presentation and define one source of truth for status semantics.
 - Preserve hook return contracts when replacing data sources so the UI can migrate incrementally.
 - Treat timestamps as `timestamptz` and document whether filters are device-local, user-local, or UTC.
 - Validate and normalize external rows at the service boundary.
 - Keep loading, empty, error, and realtime-disconnected states distinct.
 - Prefer accessible native controls and visible focus indicators.
 - Add a focused test when adding a domain rule or data transformation.
 - Keep secrets out of browser code. Only the Supabase publishable key may be exposed to the frontend, and RLS must enforce access.

 ## 17. Future Roadmap

 1. Operational documentation and schema migrations.
 2. Service layer and generated types.
 3. Error/retry/subscription UX and data consistency fixes.
 4. Automated tests and CI lint/build checks.
 5. Authentication, profiles, organizations, and RLS.
 6. Device administration and alert workflows.
 7. Scalable historical analytics, reporting, and observability.

 This roadmap preserves the existing page/component architecture while moving persistence and cross-cutting concerns behind explicit boundaries. It avoids a large rewrite and leaves the current Dashboard, Monitoring, and Alerts presentation reusable as backend capabilities expand.
