---
description: "Mandatory execution invariant: Always run compiled production server ('npm run start') when running AirwayLab."
always_on: true
---

# AirwayLab Runtime Invariants

## 1. Default to Compiled Production Server
Whenever instructed to run, launch, or serve AirwayLab (e.g., for sleep data analysis, web dashboard inspection, or local verification):
- **Always run:** `npm run start` (serves the pre-compiled production build on `http://localhost:3000`).
- **Never run:** `npm run dev` by default. `npm run dev` introduces 5–15s JIT compilation latencies per route, React 19 StrictMode double-execution, and unoptimized Web Worker execution loops on mobile/Termux hardware.
- **Exception:** Only use `npm run dev` when the user explicitly requests live development mode with Hot Module Replacement (HMR) for active UI code editing.

## 2. Build Pre-requisite Check
Before executing `npm run start`:
- Verify that the production build exists by checking for `.next/BUILD_ID`.
- If `.next/BUILD_ID` is missing or the project source has been modified since the last build, compile first using:
  ```bash
  npm run build
  ```
- Then start the server:
  ```bash
  npm run start
  ```
