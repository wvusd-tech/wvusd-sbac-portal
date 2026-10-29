# WVUSD SBAC Longitudinal Data Portal

A modern, production-ready educational data portal built with **React**, **Vite**, and **Tailwind CSS** for **Walnut Valley Unified School District (WVUSD)**. Designed for district leadership, site administrators, counselors, and teachers to analyze Smarter Balanced (CAASPP) longitudinal trajectory, scale score growth deltas, and intervention planning.

---

## 🌟 Key Features

### 1. 3-Tier Grade Band Architecture
- **Elementary (Grades 3–5):** Self-contained, teacher-centric view with an automated **Small-Group Intervention Builder** sorting students into 4 tiers and highlighting high-leverage **"Bubble Students"** (nearly met proficiency).
- **Middle School (Grades 6–8):** Transition, cohort tracking, and counselor caseload tracking across grades 6, 7, and 8.
- **High School (Grades 9–12):** Readiness and transition tracking with quick presets for:
  - **Incoming 9th Grade Baseline:** Viewing 8th-grade SBAC scores.
  - **11th Grade CAASPP Checkpoint:** College and career readiness analysis.

### 2. Multi-Subject Focus
- Instant toggling between **All Subjects (Combined)**, **ELA (Part 1)**, and **Math (Part 2)** with dynamically adjusted KPIs, performance brackets, and small groups.

### 3. Executive Site Overview
- **Executive KPI Cards:** Total Cohort, % Standard Met / Exceeded (Levels 3 & 4), Average Scale Score, and % Positive YoY Scale Score Growth.
- **Interactive 4-Color Performance Distribution Bar:** Clickable Level 1 (Red), Level 2 (Amber), Level 3 (Emerald), and Level 4 (Blue) segments for instantaneous list filtering.
- **Staff & Cohort Breakdown Table:**
  - Elementary: Grouped by Teacher with classroom size, % proficient, and growth velocity.
  - Secondary: Grouped by Grade Level Cohort and Counselor Caseload with delta metrics.

### 4. Student Longitudinal Modal & AI NotebookLM Workflows
- Full multi-year chronological testing history for Smarter Balanced ELA and Math.
- **1-Click AI Assistants:**
  - **IEP / 504 Accommodations Assistant:** Calibrated prompt tailored to student trajectory and demographic classifications.
  - **SST Intervention Plan Architect:** MTSS Tier 2 / Tier 3 multi-week SMART goals.
  - **Tiered Lesson Differentiation Architect:** Universal Design for Learning (UDL) scaffolding and DOK questioning.
  - 1-click prompt clipboard copy and direct launch to [Google NotebookLM](https://notebooklm.google.com).

### 5. Role-Based Security & Google SSO
- Integrated with `@react-oauth/google` and `jwt-decode`.
- Restricts access strictly to verified `@wvusd.org` and `@sub.wvusd.org` accounts.
- Evaluator sandbox role-switcher allows instant testing across **SuperAdmin**, **SiteAdmin**, **High School Counselor**, **Middle School Counselor**, and **Elementary Teacher** roles.

---

## 🚀 Deployment & Scripts

### Run Locally
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

### Deploy to GitHub Pages
```bash
npm run deploy
```
*(Runs `npm run build` as predeploy and publishes `dist` to GitHub Pages at `https://wvusd-tech.github.io/wvusd-sbac-portal`)*.
