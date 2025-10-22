# Developer Scripts

Utility scripts for DS-160 form development and debugging. These scripts are designed to be run in the browser console while on DS-160 form pages.

## Available Scripts

### character_limit_detector.js
**Purpose**: Detect character limits for all form fields to prevent site crashes

**Usage**:
1. Navigate to any DS-160 form page
2. Open browser console (F12)
3. Copy and paste entire script into console
4. Press Enter

**Output**:
- Summary of all character limits
- Highlights critical fields (≤20 characters)
- Detects fields currently over their limits
- Auto-copies JSON to clipboard

**Example Output**:
```
Character Limit Summary:
========================
20 characters: 15 fields
40 characters: 8 fields
255 characters: 3 fields

⚠️ CRITICAL: Fields with 20 or fewer characters:
================================================
20 chars: City of Birth ⚠️ OVER LIMIT!
  ID: tbxAPP_POB_CITY
  Current: 25/20
```

**Use Cases**:
- Update ChatGPT prompts with length constraints
- Add pre-fill validation to extension
- Document DS-160 field specifications

---

### field_recorder.js
**Purpose**: Extract complete field information from DS-160 pages

**Usage**: Same as character_limit_detector.js

**Output**:
- Field IDs, names, types
- Associated labels
- Current values
- Dropdown options (for small dropdowns)
- Dynamic field groups

**Features**:
- Skips large dropdown option lists (>15 items)
- Detects repeating field patterns
- Auto-copies JSON to clipboard

**Use Cases**:
- Mapping new DS-160 pages
- Updating field mappings in extension
- Documenting form structure

---

### injected.js
**Purpose**: Inject scripts into page context for direct DOM manipulation

**Usage**: Loaded automatically by extension when needed

**Features**:
- Direct access to page JavaScript context
- Can interact with page-level variables/functions
- Used for operations that require page context

---

### injected-subordinates.js
**Purpose**: Handle subordinate manager dynamic fields in DS-160

**Usage**: Loaded automatically by extension for manager sections

**Features**:
- Manages repeating subordinate fields
- Handles "Add Another" button clicks
- Coordinates with content script

---

### add-another-subordinate.js
**Purpose**: Automated click handling for "Add Another Subordinate" buttons

**Usage**: Used internally by subordinates module

**Features**:
- Staggered timing for DOM updates
- Validates field availability before proceeding
- Error handling for missing elements

---

## Development Workflow

### 1. Discovering New Fields
```bash
# Navigate to new DS-160 page
# Run field_recorder.js
# Copy JSON output
# Update ds160-content.js field mappings
```

### 2. Checking Character Limits
```bash
# Navigate to DS-160 page with address fields
# Run character_limit_detector.js
# Review critical fields (≤20 chars)
# Update ChatGPT prompts with constraints
```

### 3. Debugging Form Filling
```bash
# Load extension
# Navigate to DS-160 page
# Open console
# Run character_limit_detector.js to check current state
# Compare with JSON data being filled
```

## Script Output Format

All scripts output JSON that can be saved to `data/ds160/` for reference:

```bash
# Example workflow
1. Run script in console
2. JSON auto-copied to clipboard
3. Paste into text editor
4. Save as: data/ds160/field_limits_page_X.json
```

## Tips

- **Always run on actual DS-160 pages** - demo pages may have different field IDs
- **Check multiple form pages** - different sections have different limits
- **Save outputs for documentation** - useful for ChatGPT prompt updates
- **Compare before/after changes** - validate field mapping updates

## Related Documentation

- Full documentation: See `/CLAUDE.md` → Debugging section
- Field mappings: See `/content/modules/ds160-content.js`
- ChatGPT prompts: See `/prompts_and_templates/form_prompts/`
