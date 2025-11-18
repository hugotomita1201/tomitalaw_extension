# Frontend Architecture

Overview of how the TomitaLaw extension frontend is structured.

## Table of Contents
- [Technology Stack](#technology-stack)
- [File Structure](#file-structure)
- [Module System](#module-system)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Styling Architecture](#styling-architecture)
- [Chrome Extension Integration](#chrome-extension-integration)

---

## Technology Stack

### Core Technologies

**Framework:** Vanilla JavaScript (ES6+)
- No React, Vue, or other frameworks
- Direct DOM manipulation
- Native browser APIs
- Chrome Extension APIs

**Styling:** Custom CSS with shadcn-inspired design
- CSS Variables (HSL color system)
- Component classes (BEM-inspired)
- Utility classes for layout
- No Tailwind or Bootstrap

**Build System:** None
- Direct file loading
- No bundling (Webpack, Vite, etc.)
- ES6 modules
- Chrome handles loading

### Why Vanilla JS?

1. **Fast** - No framework overhead
2. **Small** - ~110KB total bundle
3. **Simple** - No build complexity
4. **Compatible** - Works perfectly with Chrome extensions
5. **Direct** - Full control over DOM

---

## File Structure

```
/sidebar/
├── sidebar.html              # Main UI template (871 lines)
├── sidebar.js                # Main controller (2,287 lines)
├── sidebar.css               # Core styles (1,474 lines)
├── components.css            # shadcn-style components (710 lines)
├── icons/
│   └── icons.js              # SVG icon library
├── libs/
│   ├── pdf.min.js            # PDF.js for PDF parsing
│   └── pdf.worker.min.js     # PDF.js worker
└── modules/
    ├── photo/
    │   └── photo-service.js  # OpenAI GPT-4 Vision integration
    ├── postal/
    │   └── postal-service.js # Japanese postal code lookup
    ├── retrieval/
    │   ├── retrieval-service.js  # DS-160 data CRUD
    │   └── retrieval-handlers.js # DS-160 UI handlers
    └── text-extractor/
        ├── text-extractor-service.js # PDF/image extraction
        └── text-extractor-ui.js      # Extraction UI rendering
```

### File Responsibilities

**sidebar.html**
- Main structure
- `<template>` tags for modules
- Base HTML for all components
- No inline JavaScript

**sidebar.js**
- Main application controller
- Module loading/switching
- Event handler setup
- DOM manipulation
- Chrome storage interface

**sidebar.css**
- Layout styles
- Typography
- Module-specific styles
- Animations

**components.css**
- Reusable component styles
- Button variants
- Card components
- Form elements
- Design tokens (CSS variables)

---

## Module System

### How Modules Work

The extension uses a template-based module system:

1. **Define modules** in `modules.config.js`
2. **Create HTML** in `<template>` tags
3. **Register handlers** in module files
4. **Switch modules** via tab navigation

### Module Structure

```javascript
// modules.config.js
{
  id: 'ds160',
  name: 'DS-160',
  description: 'DS-160 Form Auto-Filler',
  icon: '📝',
  enabled: true,
  handlers: 'setupDS160Handlers'  // Function in sidebar.js
}
```

### Module Lifecycle

```
1. User clicks tab
   ↓
2. loadModuleContent(moduleId)
   ↓
3. Find <template id="module-{id}">
   ↓
4. Clone template content
   ↓
5. Inject into .module-content
   ↓
6. Setup module handlers
   ↓
7. Load saved data (if any)
   ↓
8. Module is active
```

### Adding a New Module

1. **Add to config:**
```javascript
// modules.config.js
{
  id: 'my-module',
  name: 'My Module',
  enabled: true
}
```

2. **Create template:**
```html
<!-- sidebar.html -->
<template id="module-my-module">
  <div class="card">
    <div class="card-content">
      <!-- Your UI here -->
    </div>
  </div>
</template>
```

3. **Add handlers:**
```javascript
// sidebar.js
function setupMyModuleHandlers() {
  const button = document.getElementById('my-button');
  button.addEventListener('click', () => {
    // Handle click
  });
}
```

4. **Register in switch:**
```javascript
// sidebar.js loadModuleContent()
case 'my-module':
  setupMyModuleHandlers();
  break;
```

---

## Data Flow

### Architecture Pattern

**Service + Handler Separation**

```
User Action → Handler (UI) → Service (Logic) → Storage → Content Script
```

### Example: DS-160 Retrieval

```
User clicks "Save"
    ↓
retrieval-handlers.js
  → Validates input
  → Prepares data
    ↓
retrieval-service.js
  → Performs CRUD operation
  → Saves to chrome.storage.local
    ↓
Storage updated
    ↓
UI refreshes with new data
```

### Data Persistence

**Chrome Storage API:**
```javascript
// Save
chrome.storage.local.set({ key: value });

// Load
chrome.storage.local.get(['key'], (result) => {
  // Use result.key
});
```

**Storage Keys:**
- `ds160Data` - Main DS-160 JSON
- `ds160Applications` - Saved applications list
- `lastDS160CoreData` - Last loaded core data
- `lastDS160EvisaData` - Last loaded E-visa data

### Communication with Content Scripts

```
Sidebar (sidebar.js)
    ↓ [chrome.tabs.sendMessage]
Content Script (ds160-content.js)
    ↓ [fills form fields]
DS-160 Form
```

---

## State Management

### Current Approach

**Closure-based State:**

```javascript
function setupDS160Handlers() {
  // Module-local state
  let currentData = null;
  let currentDataType = null;
  let modifiedFields = new Set();
  let isRawView = false;

  // Handlers use closures to access state
  loadBtn.addEventListener('click', () => {
    currentData = parseJSON(input.value);
    displayEditableData(currentData);
  });
}
```

### State Scope

- **Module state** - Function-scoped closures
- **Global state** - `chrome.storage.local`
- **UI state** - DOM classes (.active, .expanded, etc.)

### No External State Library

We don't use Redux, Zustand, or other state libraries because:
- State is simple (not complex app state)
- Modules are independent
- Chrome storage handles persistence
- Vanilla JS closures are sufficient

---

## Styling Architecture

### CSS Organization

**Two-file System:**

1. **components.css** - Component library
   - Button styles
   - Card styles
   - Form elements
   - Design tokens

2. **sidebar.css** - Application styles
   - Layout (flexbox, grid)
   - Typography
   - Module-specific styles
   - Animations

### Design Token System

```css
:root {
  /* Colors (HSL) */
  --primary: 219 79% 58%;
  --foreground: 222 47% 11%;
  --border: 214 32% 91%;

  /* Spacing */
  --radius: 0.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
}
```

### Component Naming

**BEM-inspired:**
```css
.btn { }              /* Block */
.btn-primary { }      /* Block + Modifier */
.btn:hover { }        /* Block + State */
```

**Semantic, not visual:**
```css
.btn-primary { }      /* ✅ Good - describes purpose */
.btn-blue { }         /* ❌ Bad - describes appearance */
```

### Utility Classes

**Minimal set:**
```css
.flex { display: flex; }
.gap-2 { gap: 8px; }
.items-center { align-items: center; }
.mt-3 { margin-top: 12px; }
```

**Not Tailwind:**
- Only essential utilities
- Custom, not comprehensive
- No build step needed

---

## Chrome Extension Integration

### Manifest V3

```json
{
  "manifest_version": 3,
  "action": {
    "default_panel": "sidebar/sidebar.html"
  },
  "content_scripts": [{
    "matches": ["https://ceac.state.gov/*"],
    "js": ["content/modules/ds160-content.js"]
  }],
  "permissions": ["storage", "tabs"]
}
```

### Key Constraints

1. **No inline scripts** - CSP policy
   ```html
   <!-- ❌ Not allowed -->
   <button onclick="doSomething()">

   <!-- ✅ Allowed -->
   <button id="my-btn">
   <script src="sidebar.js"></script>
   ```

2. **No eval()** - Security restriction
   ```javascript
   // ❌ Not allowed
   eval('console.log("hi")');

   // ✅ Use JSON.parse instead
   JSON.parse('{"key": "value"}');
   ```

3. **Limited external resources**
   - Must bundle all libraries
   - Can't load from CDN
   - All assets local

### Communication Patterns

**Sidebar → Content Script:**
```javascript
// sidebar.js
chrome.tabs.query({active: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'fillForm',
    data: formData
  });
});
```

**Content Script → Sidebar:**
```javascript
// content script
chrome.runtime.sendMessage({
  action: 'formFilled',
  success: true
});
```

---

## Performance Considerations

### Bundle Size

**Current: ~110KB total**
- sidebar.js: ~80KB
- sidebar.css: ~20KB
- components.css: ~10KB

**Fast initial load:**
- No framework overhead
- Direct browser parsing
- Cached by Chrome

### DOM Manipulation

**Efficient patterns:**
```javascript
// ✅ Good - batch updates
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const el = document.createElement('div');
  el.textContent = item;
  fragment.appendChild(el);
});
container.appendChild(fragment);

// ❌ Bad - causes multiple reflows
items.forEach(item => {
  const el = document.createElement('div');
  el.textContent = item;
  container.appendChild(el); // Reflow each time!
});
```

### Event Delegation

**For dynamic content:**
```javascript
// ✅ Good - single listener
container.addEventListener('click', (e) => {
  if (e.target.matches('.delete-btn')) {
    deleteItem(e.target.dataset.id);
  }
});

// ❌ Bad - many listeners
items.forEach(item => {
  item.querySelector('.delete-btn')
    .addEventListener('click', deleteItem);
});
```

---

## Future Considerations

### Potential Improvements

1. **TypeScript** (optional)
   - Type safety
   - Better IDE support
   - Would need build step

2. **Component Tests**
   - Jest or Vitest
   - Test component rendering
   - Test user interactions

3. **CSS Modules**
   - Scoped styles
   - Avoid naming collisions
   - Would need build step

4. **React Migration** (major)
   - Only if needed
   - Would require complete rewrite
   - See [shadcn migration analysis] for details

### When to Consider React

**Consider if:**
- Performance becomes issue
- Team wants TypeScript strongly
- Need component marketplace
- State management too complex

**Don't consider if:**
- Current system works well
- Want to stay lightweight
- Team comfortable with vanilla JS
- Build complexity not desired

---

## Best Practices

### Code Organization

1. **Separate concerns:**
   - Services: Business logic
   - Handlers: UI events
   - Utils: Shared functions

2. **Single responsibility:**
   - Each function does one thing
   - Small, focused modules

3. **DRY (Don't Repeat Yourself):**
   - Extract common patterns
   - Reuse components
   - Share utilities

### Performance

1. **Minimize DOM access:**
   ```javascript
   // ✅ Good
   const items = document.querySelectorAll('.item');
   items.forEach(item => process(item));

   // ❌ Bad
   for (let i = 0; i < 10; i++) {
     document.querySelectorAll('.item')[i].process();
   }
   ```

2. **Use event delegation:**
   - For lists and dynamic content
   - Single listener vs many

3. **Debounce expensive operations:**
   ```javascript
   const debouncedSearch = debounce(search, 300);
   searchInput.addEventListener('input', debouncedSearch);
   ```

### Maintainability

1. **Comment complex logic:**
   ```javascript
   // Calculate expiration with 30-day buffer
   // DS-160 appointments expire 30 days after creation
   const expirationDate = addDays(createDate, 30);
   ```

2. **Use semantic names:**
   ```javascript
   // ✅ Good
   function saveApplication(data) { }
   const isExpired = checkExpiration(date);

   // ❌ Bad
   function doStuff(x) { }
   const flag = check(d);
   ```

3. **Keep functions small:**
   - < 50 lines ideal
   - Extract complex logic
   - Single responsibility

---

## See Also

- [Components](./COMPONENTS.md) - Component library
- [Style Guide](./STYLE_GUIDE.md) - Design system
- [Quick Start](./QUICK_START.md) - Getting started
- [Examples](./examples.html) - Live examples

---

## Additional Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [shadcn/ui](https://ui.shadcn.com) - Design inspiration
- [MDN Web Docs](https://developer.mozilla.org) - Web APIs reference
