# LinkedIn Profile Scraper

A basic LinkedIn profile scraper that extracts data from LinkedIn search results using the Voyager API. Works as a Tampermonkey userscript or console script.

> ⚠️ **Important Notice**: LinkedIn frequently modifies their website structure and API endpoints. This may cause the scraper to stop working without notice. If you encounter issues, please check for updates or submit an issue/pull request.

> 📝 **Note**: This is a basic profile information scraper that extracts data from search results only. It has not been modified into an advanced scraper for detailed profile information. For more advanced features, contributions are welcome!

## Features

- 🚀 **Fast & Efficient**: Scrapes hundreds of profiles in minutes
- 🎯 **Smart Deduplication**: Automatically removes duplicate profiles
- ⏸️ **Rate Limit Handling**: Intelligently handles LinkedIn's rate limiting
- 📊 **Multiple Export Formats**: Export to CSV or HTML
- 🎨 **Real-time UI**: Beautiful overlay showing progress and results
- 🔒 **Safe & Secure**: No external dependencies, runs entirely in your browser

## How-to Video

Watch this quick tutorial on how to copy, paste, and run the scraper in your Chrome browser console:

https://github.com/user-attachments/assets/be01c9a0-88c6-4ed5-9d62-b3669ef34ea6

## Screenshots

### Export Interface
![Export UI](image-for-readme/exports-UI.png)
*Real-time scraping interface with export options*

### HTML Results
![HTML Results](image-for-readme/HTML-results.png)
*Clean, formatted HTML export with all profile data*

## Quick Start

### Method 1: Console (Recommended) ✅

This is the easiest and most reliable method.

1. **Navigate to LinkedIn**
   - Go to [LinkedIn.com](https://www.linkedin.com)
   - Log in to your account
   - Search for people (e.g., "software engineer", "marketing manager")
   - Make sure you're on: `https://www.linkedin.com/search/results/people/` for example `https://www.linkedin.com/search/results/people/?keywords=n8n&origin=GLOBAL_SEARCH_HEADER&page=3`

2. **Open Browser Console**
   - Press `F12` or right-click → "Inspect"
   - Click on the "Console" tab

3. **Run the Scraper**
   - Copy the entire contents of [`build/console.js`](https://github.com/withLinda/LinkedIn-profile-scraper-lite/blob/main/build/console.js)
   - Paste into the console
   - Press `Enter`

4. **Configure & Wait**
   - Enter the number of profiles to scrape (e.g., 300)
   - Watch the real-time progress
   - Click "Export CSV" or "Export HTML" when complete

### Method 2: Tampermonkey 🐒

Best for frequent use with added convenience features.

1. **Install Tampermonkey**
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **Add the Script**
   - Click Tampermonkey icon → "Create a new script"
   - Delete the default content
   - Copy & paste contents from [`build/userscript.js`](https://github.com/withLinda/LinkedIn-profile-scraper-lite/blob/main/build/userscript.js)
   - Press `Ctrl+S` to save

3. **Use on LinkedIn**
   - Navigate to LinkedIn people search
   - Click the "🔍 Scrape Profiles" button (appears top-right)
   - Or use Tampermonkey menu → "Start LinkedIn Scraper"


## Building from Source

```bash
# Install Node.js if not already installed
# Clone or download this repository

# Navigate to project directory
cd linkedin-scraper

# Build all versions
npm run build

# Files will be generated in /build directory
```

## How It Works

1. **Data Extraction**: Uses LinkedIn's Voyager API to fetch search results
2. **Pagination**: Automatically loads more results (10 profiles at a time)
3. **Rate Limiting**: Adds random delays (400-1100ms) between requests
4. **Deduplication**: Tracks profiles by URL to avoid duplicates
5. **Export**: Generates CSV (Excel-compatible) or HTML files

## Extracted Data

For each profile, the scraper collects:
- **Name**: Full name of the person
- **Profile URL**: Direct link to LinkedIn profile
- **Headline**: Professional headline/title
- **Location**: Geographic location
- **Current Companies**: Current employment
- **Past Companies**: Previous employment
- **Followers**: Number of followers (if available)

## Export Formats

### CSV Export
- UTF-8 encoded with BOM for Excel compatibility
- Properly escaped for commas and quotes
- Opens directly in Excel/Google Sheets

### HTML Export
- Styled, responsive table
- Clickable profile links
- Print-friendly format
- Includes metadata (date, total count)

## Troubleshooting

### "Not on LinkedIn search page"
- Make sure you're on: `https://www.linkedin.com/search/results/people/`, 
- Perform a people search first, for example `https://www.linkedin.com/search/results/people/?keywords=n8n&origin=GLOBAL_SEARCH_HEADER&page=3` 
- then run the scraper

### "No CSRF token found"
- This warning can usually be ignored
- The scraper will attempt to continue without it

### "Rate limited"
- The scraper automatically handles this
- It will wait and retry (up to 3 times)
- If it persists, wait a few minutes and try again

### No results found
- Check that your search has results
- Try a broader search term
- Ensure you're logged in to LinkedIn


## Best Practices

1. **Start Small**: Test with 10-20 profiles first
2. **Respect Rate Limits**: Don't run multiple instances simultaneously
3. **Be Patient**: Large scrapes (500+) may take several minutes
4. **Save Your Data**: Export immediately after scraping completes
5. **Use Filters**: Narrow your LinkedIn search for better results

## Technical Details

- **No External Dependencies**: Pure JavaScript, no libraries required
- **API Endpoint**: LinkedIn Voyager GraphQL API
- **Request Interval**: 400-1100ms (randomized)
- **Batch Size**: 10 profiles per request
- **Auto-Retry**: 3 attempts on rate limit

## Privacy & Ethics

- Only scrapes publicly visible information
- Respects LinkedIn's rate limits
- Requires active LinkedIn login
- Use responsibly and in accordance with LinkedIn's terms

## Limitations

- Requires active LinkedIn login
- Limited to search result data (not full profiles)
- **May break when LinkedIn updates their website structure or API**
- Rate limiting may slow large scrapes
- This is a basic scraper - advanced profile details are not included

## Browser Compatibility

- ✅ Chrome/Chromium (Recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Safari
- ⚠️ Brave (may need shields adjusted)

## Support & Contributing

For issues, questions, or improvements:
1. Check the troubleshooting section above
2. Verify you're following the instructions exactly
3. Try a different method (Console vs Tampermonkey)
4. Check browser console for error messages

**If something is not working:**
- Please submit an issue on GitHub with detailed error messages
- Pull requests are welcome for fixes and improvements
- Note that LinkedIn changes may require script updates

## License

MIT License - Use at your own discretion

## Disclaimer

This tool is for educational purposes. Users are responsible for complying with LinkedIn's Terms of Service and applicable laws. The authors are not responsible for misuse or any consequences of using this tool.

---

**Last Updated**: September 2025
**Version**: 1.0.0
