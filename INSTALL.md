# 📦 Installation Guide

This guide provides multiple ways to install the LinkedIn Profile Scraper userscript.

> Prefer a polished web version? Visit the GitHub Pages guide at [withlinda.github.io/LinkedIn-profile-scraper-lite/install.html](https://withlinda.github.io/LinkedIn-profile-scraper-lite/install.html).

## Prerequisites

You need the **Tampermonkey** browser extension installed:

- **Chrome**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- **Edge**: [Install from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Safari**: [Install from Mac App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)

---

## 🚀 Method 1: One-Click Install (Recommended)

The easiest way to install the script:

1. **Ensure Tampermonkey is installed** (see links above)
2. **Click this link**: [Install LinkedIn Scraper Script](https://raw.githubusercontent.com/withLinda/LinkedIn-profile-scraper-lite/main/build/linkedin-scraper.user.js)
3. **Tampermonkey will open** showing the script details
4. **Click "Install"** button in the Tampermonkey tab

![Screenshot placeholder: Tampermonkey install dialog]

### Alternative Mirror Link
If the main link doesn't work, try: [GitHub Pages Mirror](https://withlinda.github.io/LinkedIn-profile-scraper-lite/linkedin-scraper.user.js)

---

## 📋 Method 2: Import from URL

Use Tampermonkey's import feature:

1. **Open Tampermonkey Dashboard**
   - Click the Tampermonkey icon in your browser toolbar
   - Select "Dashboard"

2. **Navigate to Utilities tab**
   - Look for "Utilities" in the top menu

3. **Import from URL**
   - Find the "Import from URL" section
   - Paste this URL:
   ```
   https://raw.githubusercontent.com/withLinda/LinkedIn-profile-scraper-lite/main/build/linkedin-scraper.user.js
   ```

4. **Click "Import"**
   - Tampermonkey will fetch the script
   - Review and click "Install"

![Screenshot placeholder: Tampermonkey utilities import]

---

## ✏️ Method 3: Manual Installation

Copy and paste the script manually:

1. **Get the Script**
   - Go to: [linkedin-scraper.user.js on GitHub](https://github.com/withLinda/LinkedIn-profile-scraper-lite/blob/main/build/linkedin-scraper.user.js)
   - Click "Raw" button to see the plain text
   - Select all text (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

2. **Open Tampermonkey Dashboard**
   - Click Tampermonkey icon → "Dashboard"

3. **Create New Script**
   - Click the "+" tab (Create a new script)
   - Delete all default content

4. **Paste and Save**
   - Paste the copied script (Ctrl+V / Cmd+V)
   - Press Ctrl+S (Cmd+S on Mac) to save
   - The script is now installed!

![Screenshot placeholder: Tampermonkey new script editor]

---

## ✅ Verify Installation

1. **Check Tampermonkey Dashboard**
   - The script should appear in your installed scripts list
   - Status should show as "Enabled" (green)

2. **Visit LinkedIn**
   - Go to [LinkedIn People Search](https://www.linkedin.com/search/results/people/)
   - Look for the "🔍 Scrape Profiles" button in the top-right corner

3. **Test the Script**
   - Click the button or use Tampermonkey menu
   - Enter number of profiles to scrape
   - Watch the magic happen!

---

## 🔧 Troubleshooting

### Script doesn't appear on LinkedIn
- **Check the URL**: Must be on `linkedin.com/search/results/people/*`
- **Refresh the page**: Sometimes scripts need a page refresh
- **Check Tampermonkey**: Ensure the script is enabled (green status)

### "Rate limit" errors
- The script automatically handles rate limits with smart delays
- If persistent, wait a few minutes and try again
- Reduce the number of profiles to scrape

### No results or errors
- **Login required**: Ensure you're logged in to LinkedIn
- **Search results**: Perform a people search first
- **Browser console**: Check for error messages (F12 → Console)

### Button not visible
- **Wait a moment**: Button appears 2 seconds after page load
- **Check popup blockers**: Disable for LinkedIn
- **Use menu command**: Right-click Tampermonkey icon → "Start LinkedIn Scraper"

### CSRF Token errors
- Clear browser cache and cookies for LinkedIn
- Log out and log back in to LinkedIn
- Disable other LinkedIn-related extensions temporarily

---

## 🌐 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Excellent | Recommended |
| Firefox | ✅ Excellent | Full support |
| Edge | ✅ Excellent | Based on Chromium |
| Safari | ✅ Good | Requires Tampermonkey from App Store |
| Brave | ⚠️ Good | May need to disable shields for LinkedIn |
| Opera | ✅ Good | Install Tampermonkey from Chrome store |

---

## 🔄 Updating the Script

The script includes auto-update functionality:

- Tampermonkey checks for updates periodically
- You'll be notified when updates are available
- Click "Update" to get the latest version

To manually check for updates:
1. Open Tampermonkey Dashboard
2. Click the script name
3. Go to "Settings" tab
4. Click "Check for updates"

---

## 🆘 Getting Help

- **Documentation**: [README](https://github.com/withLinda/LinkedIn-profile-scraper-lite/blob/main/README.md)
- **Issues**: [Report a bug](https://github.com/withLinda/LinkedIn-profile-scraper-lite/issues)
- **Source Code**: [GitHub Repository](https://github.com/withLinda/LinkedIn-profile-scraper-lite)

---

## 📝 Notes

- The script respects LinkedIn's rate limits
- Use responsibly and in accordance with LinkedIn's Terms of Service
- Export data is stored locally in your browser
- No data is sent to external servers
