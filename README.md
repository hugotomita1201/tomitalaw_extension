# TomitaLaw AI Extension

A unified Chrome extension that combines DS-160 and US Visa Scheduling auto-fill functionality with a modern, persistent sidebar interface.

## Features

- **DS-160 Form Auto-Filler**: Automatically fills DS-160 visa application forms on ceac.state.gov
- **Visa Scheduling Auto-Filler**: Automatically fills US Visa Scheduling forms with dependent support
- **Persistent Sidebar Interface**: Tab-based UI that stays open while browsing
- **Modular Architecture**: Easy to add new tools and features in the future

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `tomitalaw_extension` folder
5. The extension icon will appear in your Chrome toolbar

## Usage

### Opening the Extension
- Click the TomitaLaw extension icon in your toolbar
- The sidebar will open on the right side of your browser

### DS-160 Form Filling
1. Click the "DS-160" tab in the extension sidebar
2. Navigate to https://ceac.state.gov/genniv/
3. Paste your DS-160 JSON data in the text area
4. Click "Fill Current Page"
5. The extension will automatically fill the form fields

### Visa Scheduling Form Filling
1. Click the "Visa Scheduling" tab in the extension sidebar
2. Navigate to the visa scheduling website
3. Paste your visa scheduling JSON data in the text area
4. Click "Fill Current Page"
5. The extension will detect the page type and fill accordingly

## Supported Websites

### DS-160
- https://ceac.state.gov/*

### Visa Scheduling
- https://www.usvisascheduling.com/*
- https://ais.usvisa-info.com/*
- https://ayobaspremium.jp/*
- https://atlasauth.b2clogin.com/*

## Data Format

Both tools accept JSON formatted data. Sample data files are available in:
- `data/ds160/` - DS-160 sample data
- `data/visa/` - Visa scheduling sample data

## Architecture

The extension uses a modular architecture for easy extensibility:

```
tomitalaw_extension/
├── manifest.json           # Chrome extension manifest
├── modules.config.js       # Module configuration (add new tools here)
├── background.js          # Service worker
├── sidebar/               # Sidebar UI
│   ├── sidebar.html
│   ├── sidebar.css
│   └── sidebar.js
├── content/              # Content scripts
│   ├── content-router.js    # Routes to appropriate module
│   └── modules/
│       ├── ds160-content.js # DS-160 filling logic
│       └── visa-content.js  # Visa scheduling logic
└── data/                 # Sample data files
```

## Adding New Tools (Future)

To add a new tool:

1. Add module configuration to `modules.config.js`
2. Create content script in `content/modules/`
3. Add UI template to `sidebar/sidebar.html`
4. The framework automatically handles the rest

## Development

### Testing
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test the functionality

### Debugging
- Open Chrome DevTools (F12)
- Check the Console for logs
- Use the Sources tab to debug scripts

## Version History

- v1.0.0 - Initial release combining DS-160 and Visa Scheduling functionality

## Support

For issues or questions, please contact TomitaLaw support.

## License

Proprietary - TomitaLaw © 2024