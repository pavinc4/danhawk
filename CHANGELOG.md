# Changelog

## 1.0.0 — Mar 21, 2026

> Initial release of Danhawk platform.

### Improvements

- Left sidebar navigation with Home, Explore, Settings, About
- Quick Access panel showing active tools as icon grid
- Tools panel with All / On / Off filter and inline toggle
- Explore page with category filter, sort, and refresh
- Tool detail page with info tabs from GitHub markdown files
- Glass card design in Explore with dark obsidian theme
- Fixed window size at 900×600 for consistent layout
- Search bar in title bar for Home and Explore pages

### Fixes

- Scroll bounce and elastic overscroll disabled globally
- Toggle guard prevents double-fire on rapid clicks
- Autostart registry only written on user Settings change
- Explore page loads from disk cache — no GitHub call on open
- Icon rendering consistent across Quick Access, Explore, and Detail pages

### Patches

- Custom tool icons render without background box decoration
- Active/Inactive status shown at card bottom, not top-right dot
- Tool card height fixed so description always fully visible
