---
"@quartz-community/og-image": patch
---

Fix build crash when Google Fonts is unreachable (fetch failed). Added error handling to font fetching, system font fallback for macOS/Linux/Windows, and graceful skip when no fonts are available.
