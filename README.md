# LinkedIn Profile Scraper (lite)

Browser-native LinkedIn people-search scraper that runs as a Tampermonkey userscript or a one-off console snippet. It collects profile cards from LinkedIn's Voyager API, renders a live overlay, and exports the results to CSV or HTML—everything stays in your browser session.

> ⚠️ LinkedIn tweaks their UI and Voyager endpoints frequently. Expect to refresh to the latest build when things break.
> 
> 📝 Scope: people-search result cards only. Full profile crawling is out of scope.

## Highlights

- Runs from the Tampermonkey menu (`🔍 Start LinkedIn Scraper`) or the floating `Scrape Profiles` button that appears only on `/search/results/people` routes
- Route guard + History API + `locationchange` listener keep the UI in sync as you navigate search tabs
- Handles rate limits with jittered delays and bounded retries; stops after three empty result pages
- Real-time overlay shows progress, captured rows, export controls, and inline error toasts
- Clean exports: UTF-8 BOM CSV and styled HTML tables saved via in-browser Blobs with timestamped filenames
- No server component, no external dependencies—your LinkedIn session (cookies + optional CSRF token) stays in the browser

## Requirements

- Logged-in LinkedIn session in a desktop browser (Chromium, Firefox, Edge, or Safari)
- For Tampermonkey mode: the [Tampermonkey extension](https://www.tampermonkey.net/) installed
- For console mode: permission to run pasted JavaScript in DevTools

## Install & Run

### Option A — Tampermonkey overlay (best for repeat runs)

1. Install Tampermonkey (Chrome, Firefox, Edge all supported).
2. Open the one-click installer:
   - Raw userscript: `https://raw.githubusercontent.com/withLinda/LinkedIn-profile-scraper-lite/main/build/linkedin-scraper.user.js`
   - Friendly mirror: [`install.html`](https://withlinda.github.io/LinkedIn-profile-scraper-lite/install.html)
3. Visit a LinkedIn people-search page and launch the scraper using either the floating **Scrape Profiles** button or the Tampermonkey menu command **🔍 Start LinkedIn Scraper**.

### Option B — One-off console run (no extensions)

1. Navigate to a people-search URL, e.g. `https://www.linkedin.com/search/results/people/?keywords=product%20designer`.
2. Open DevTools → **Console**.
3. Fetch and paste the console build from `https://raw.githubusercontent.com/withLinda/LinkedIn-profile-scraper-lite/main/build/console.js`, then press Enter.
4. Enter the target number of profiles (default 300) and let the overlay drive the rest.

## Using the scraper

- Guard: the script verifies you are on `/search/results/people` before it runs.
- Prompt: choose how many profiles to collect; pagination is handled automatically in batches of 10.
- Run loop: the scraper builds Voyager GraphQL URLs with queryId `voyagerSearchDashClusters.15c671c3162c043443995439a3d3b6dd`, injects required headers (`x-restli-protocol-version`, optional `csrf-token`), and keeps requesting until the target is met or three consecutive empty pages occur.
- UI overlay: shows counts, progress bar, table preview, and inline error toasts for rate limits or missing tokens. You can dismiss it with the close icon.
- Completion: once the run stops, the export buttons activate so you can download CSV or HTML immediately.

## Data captured

| Field       | Source / Notes |
| ----------- | -------------- |
| `name`      | `record.image.accessibilityText` (trimmed) |
| `profileUrl`| Normalized with `sanitizeProfileUrl` to `/in/{slug}` format |
| `headline`  | `record.primarySubtitle.text` |
| `location`  | `record.secondarySubtitle.text` |
| `current`   | Summary text with `Current:` prefix removed |
| `followers` | Parsed with suffix-aware `parseFollowers` (`1.5K`, `2M`, etc.) |
| `urnCode`   | Extracted via `extractMiniProfileUrn` |

Duplicates are dropped based on `profileUrl`, so each row is unique.

## Export formats

- **CSV**: UTF-8 with BOM, escaped cells, filename `linkedin_profiles_YYYY-MM-DD.csv`.
- **HTML**: stand-alone table with lightweight styling for printing or copy/paste.

Both exports are generated entirely in-browser using `Blob` URLs—no data leaves your machine.

## Under the hood

- Core engine: the `LinkedInScraper` class orchestrates keyword detection, pagination, deduplication, and rate limit handling (`delay(400–1100ms)` with retries up to three times).
- Extractors: `extractPerson` composes final records using helpers from `lib/url` and `lib/parse`.
- UI module: `ScraperUI` injects fixed overlay styles, keeps a MutationObserver alive so the floating button survives DOM refreshes, and wires export handlers.
- Utilities: `exportToCsv` / `exportToHtml` live in `utils.js` and share column definitions from `schema/columns.js`.
- Install artifact: `install.html` mirrors the latest userscript and documents fallback install paths.

The repository is intentionally small—only the userscript and install page are shipped in `build/`.

## Troubleshooting & limits

- **Not on a people-search page**: ensure the URL contains `/search/results/people`.
- **Rate limited by LinkedIn (HTTP 429)**: the script pauses with a toast message. Let it retry or rerun later.
- **Promo / monthly limit cards**: LinkedIn may inject promo cards; when no real results are returned, the UI surfaces a warning.
- **Empty exports**: stay logged in, loosen filters, and try a smaller target to confirm results are coming in.

Operational notes: LinkedIn returns ~10 profiles per request, CSLF cookies must be present, and the scraper halts after three empty batches. Large pulls (>500) can take several minutes.

## Development

```bash
npm install # (only needed if you plan to modify scripts)
npm run build
```

Build outputs land in `build/`:
- `build/console.js` — pasteable DevTools version
- `build/linkedin-scraper.user.js` — Tampermonkey package

The build also publishes `LinkedInScraper`, `LinkedInScraperCore`, and `ScraperUI` globals for quick experimentation.

## Privacy, ethics, and terms

- Scrapes only what LinkedIn exposes in search results while you are logged in.
- Runs locally; nothing is transmitted to external servers by this project.
- You are responsible for complying with LinkedIn's Terms of Service and local laws.

## License

MIT License — use at your own discretion.

_Last updated: September 2025_
