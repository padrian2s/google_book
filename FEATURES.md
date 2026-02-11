# How Google Works — Interactive Study Guide

## Features

### Document Reader
- 384-page document viewer with dual display modes (image + text)
- Per-page commentary with Summary, Key Patterns, and Practical Applications
- Zoom controls (70%–140%) via left-edge panel
- Keyboard shortcuts: Arrow keys (navigate), V (toggle view), M (menu), Escape (close)
- Full-text search across all pages
- Progress bar and page counter
- URL parameter support (?page=N) for direct linking
- localStorage persistence for page, view mode, and zoom level
- Context menu with navigation, view toggle, and search
- Responsive design for mobile and desktop

### Landing Page
- Hero section with book metadata
- Table of contents with 8 chapter cards
- 6 interactive simulator cards
- Responsive grid layout

### Interactive Simulators
1. **Culture Assessment** — Evaluate organizational culture against Google's principles
2. **Strategy Builder** — Build strategy using technical insights and platform thinking
3. **Hiring Pipeline** — Design a peer-based hiring process
4. **Decision Framework** — Practice data-driven decision making
5. **Communication Router** — Map information flows and routing
6. **Innovation Lab** — Create conditions for innovation

### Technical Details
- Zero external dependencies (vanilla HTML, CSS, JavaScript)
- Static site — no build step required
- Local development: `./run.sh` starts server at http://localhost:8000
- CSS custom properties for consistent theming (Google brand colors)
- Mobile-responsive with breakpoints at 640px and 768px

### Book Information
- **Title:** How Google Works
- **Authors:** Eric Schmidt & Jonathan Rosenberg
- **Source:** Grand Central Publishing, 2014 · 384 pages
- **Chapters:** 8 (Introduction, Culture, Strategy, Talent, Decisions, Communications, Innovation, Conclusion)
