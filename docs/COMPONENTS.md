# Component Library

Complete guide to all UI components in the TomitaLaw extension.

## Table of Contents
- [Buttons](#buttons)
- [Cards](#cards)
- [Inputs & Forms](#inputs--forms)
- [Alerts & Badges](#alerts--badges)
- [Tabs](#tabs)
- [Data Display](#data-display)
- [Layout](#layout)
- [Specialized Components](#specialized-components)

---

## Buttons

Buttons are the most commonly used interactive elements. We provide multiple variants and sizes.

### Base Button

```html
<button class="btn">Default Button</button>
```

### Variants

#### Primary (Default)
The main call-to-action button with blue gradient background.

```html
<button class="btn btn-primary">Save Changes</button>
<button class="btn btn-primary" id="ds160-fill">Auto-Fill DS-160 Form</button>
```

**Usage:** Main actions, form submissions, primary CTAs

#### Secondary
Gray button for secondary actions.

```html
<button class="btn btn-secondary">Cancel</button>
```

**Usage:** Cancel actions, alternative choices

#### Outline
Border-only button for tertiary actions.

```html
<button class="btn btn-outline">View Details</button>
<button class="btn btn-outline" id="ds160-clear-main">Clear</button>
```

**Usage:** Less prominent actions, toolbar buttons

#### Ghost
Transparent button that shows on hover.

```html
<button class="btn btn-ghost" id="ds160-copy-json">📋 Copy JSON</button>
<button class="btn btn-ghost" id="ds160-view-raw">{ } Raw</button>
```

**Usage:** Icon buttons, subtle actions, navigation

#### Destructive
Red button for dangerous/delete actions.

```html
<button class="btn btn-destructive">Delete Application</button>
```

**Usage:** Delete, remove, destructive operations

#### Orange (Special)
Orange button for special actions (used in Load Data flows).

```html
<button class="btn btn-orange" id="ds160-load-main">Load Data</button>
```

**Usage:** Special data loading actions

### Sizes

#### Small
```html
<button class="btn btn-sm btn-outline">Small</button>
```

#### Default (no class needed)
```html
<button class="btn">Default Size</button>
```

#### Large
```html
<button class="btn btn-lg btn-primary">Large Button</button>
```

### Icon Buttons

Buttons with icons and text:

```html
<button class="btn btn-primary">
  <span class="icon-sm">🚀</span>
  Auto-Fill DS-160 Form (Main Data)
</button>

<button class="btn btn-ghost">
  <span class="icon-sm">📝</span>
  Edit JSON
</button>
```

**Icon sizes:**
- `.icon-sm` - Small icon (16px)
- `.icon` - Default icon (20px)

### Button States

Buttons automatically handle hover, active, and focus states.

```html
<!-- Disabled button -->
<button class="btn btn-primary" disabled>Processing...</button>
```

### Best Practices

✅ **DO:**
- Use `btn-primary` for main actions
- Use `btn-destructive` for delete operations
- Add icon + text for clarity
- Use consistent sizing within a section

❌ **DON'T:**
- Mix multiple primary buttons in same context
- Use destructive for non-destructive actions
- Create buttons without accessible text

---

## Cards

Cards are containers for grouping related content.

### Basic Card

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Card Title</h2>
  </div>
  <div class="card-content">
    <p>Card content goes here</p>
  </div>
</div>
```

### Card with Description

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">DS-160 Form Auto-Filler</h2>
    <p class="card-description">
      Fill your DS-160 forms instantly with extracted data
    </p>
  </div>
  <div class="card-content">
    <!-- Content -->
  </div>
</div>
```

### Card Structure

- `.card` - Container with border, rounded corners, shadow
- `.card-header` - Top section (optional)
- `.card-title` - Main heading
- `.card-description` - Subtitle/description text
- `.card-content` - Main content area

### Examples in Use

**Module Card:**
```html
<div class="card">
  <div class="card-header">
    <div class="flex items-center gap-2">
      <span class="icon">📝</span>
      <h2 class="card-title">DS-160 Form Auto-Filler</h2>
    </div>
  </div>
  <div class="card-content">
    <textarea id="ds160-data" class="ds160-textarea"></textarea>
    <button class="btn btn-primary">Load Data</button>
  </div>
</div>
```

---

## Inputs & Forms

Form components for user input.

### Text Input

```html
<input type="text" class="form-input" placeholder="Enter text">
```

### Text Input with Label

```html
<div class="form-group">
  <label class="form-label">Your Name</label>
  <input type="text" class="form-input" placeholder="John Doe">
</div>
```

### Textarea

Standard textarea:
```html
<textarea class="textarea" rows="4" placeholder="Enter notes"></textarea>
```

Monospace textarea for JSON/code:
```html
<textarea class="ds160-textarea" rows="8" placeholder='{"field": "value"}'></textarea>
```

### Search Input

```html
<input
  type="text"
  id="ds160-search-fields"
  class="form-input"
  placeholder="🔍 Search fields...">
```

### Input States

**Error state:**
```html
<input type="text" class="form-input error" placeholder="Invalid input">
```

**Disabled state:**
```html
<input type="text" class="form-input" disabled placeholder="Disabled">
```

### Best Practices

✅ **DO:**
- Always pair inputs with labels
- Use placeholders for format hints
- Add ARIA labels for accessibility

❌ **DON'T:**
- Use inputs without labels
- Make fields too wide/narrow for content

---

## Alerts & Badges

Components for displaying status and notifications.

### Alerts

#### Info Alert (Default)
```html
<div class="alert alert-info">
  <strong>Info:</strong> This is an informational message.
</div>
```

#### Success Alert
```html
<div class="alert alert-success">
  <strong>Success:</strong> Operation completed successfully!
</div>
```

#### Warning Alert
```html
<div class="alert alert-warning">
  <strong>Warning:</strong> Please review before proceeding.
</div>
```

#### Error Alert
```html
<div class="alert alert-error">
  <strong>Error:</strong> Something went wrong.
</div>
```

### Badges

Small labels for status, counts, or categories.

#### Primary Badge
```html
<span class="section-badge required">Main DS-160 Data</span>
```

#### Secondary Badge
```html
<span class="section-badge optional">Partial JSON Data</span>
```

**Usage:** Status indicators, labels, counts

---

## Tabs

Tab navigation for switching between different views.

### Tab Structure

```html
<div class="tab-navigation">
  <button class="tab-button active" data-tab="tab1">Tab 1</button>
  <button class="tab-button" data-tab="tab2">Tab 2</button>
  <button class="tab-button" data-tab="tab3">Tab 3</button>
</div>

<div id="tab1" class="tab-content active">
  Tab 1 content
</div>
<div id="tab2" class="tab-content">
  Tab 2 content
</div>
```

### Tab Behavior

- `.active` class on button indicates selected tab
- `.active` class on content shows that panel
- JavaScript handles switching between tabs

**Example from sidebar:**
```html
<div class="tab-navigation">
  <button class="tab-button active" data-tab="ds160">
    <span class="icon-sm">📝</span> DS-160
  </button>
  <button class="tab-button" data-tab="visa-scheduling">
    <span class="icon-sm">📅</span> Visa Sch...
  </button>
</div>
```

---

## Data Display

Components for displaying data to users.

### Data Sections (Collapsible)

```html
<div class="data-section">
  <div class="section-header">
    <div class="section-title">
      <span>👤</span>
      <span>Personal Information</span>
    </div>
    <span class="section-chevron">▶</span>
  </div>
  <div class="section-content">
    <!-- Fields -->
  </div>
</div>
```

**States:**
- Default: Collapsed (content hidden)
- Active: Expanded (add `.active` to header, `.expanded` to content)

### Data Fields (Editable)

```html
<div class="data-field">
  <div class="field-label">Last Name:</div>
  <div class="field-value">SMITH</div>
</div>
```

**Field states:**
- `.field-value.empty` - Empty field (gray)
- `.field-value.modified` - User edited (blue border)
- `.field-value.default-value` - Default boolean value (italic)

### Nested Fields

```html
<div class="nested-field-container">
  <div class="nested-field-label">Address:</div>
  <div class="nested-children">
    <div class="data-field">
      <div class="field-label">Street:</div>
      <div class="field-value">123 Main St</div>
    </div>
    <div class="data-field">
      <div class="field-label">City:</div>
      <div class="field-value">New York</div>
    </div>
  </div>
</div>
```

---

## Layout

Utility classes for layout and spacing.

### Flexbox

```html
<!-- Basic flex -->
<div class="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Flex with gap -->
<div class="flex gap-2">
  <button class="btn">Button 1</button>
  <button class="btn">Button 2</button>
</div>

<!-- Flex with alignment -->
<div class="flex items-center justify-between">
  <h3>Title</h3>
  <button class="btn">Action</button>
</div>
```

### Spacing

**Gap (between flex items):**
- `.gap-1` - 4px
- `.gap-2` - 8px
- `.gap-3` - 12px
- `.gap-4` - 16px

**Margin:**
- `.mt-3` - margin-top: 12px
- `.mb-3` - margin-bottom: 12px
- `.mb-4` - margin-bottom: 16px
- `.mb-6` - margin-bottom: 24px

### Separators

Horizontal separator:
```html
<div class="separator-horizontal"></div>
```

Vertical separator:
```html
<div class="separator-vertical"></div>
```

---

## Specialized Components

Components with specific use cases.

### Drop Zone (File Upload)

```html
<div class="drop-zone" id="file-drop-zone">
  <p class="drop-zone-text">
    Drag & drop files here or click to browse
  </p>
  <input type="file" id="file-input" class="file-input" multiple>
</div>
```

**States:**
- `.drop-zone.drag-over` - When dragging files over
- Shows visual feedback for file upload

### Person Radio Selector

```html
<div class="person-radio-item">
  <input type="radio" name="person" id="person1" value="1">
  <label for="person1">
    <div class="person-name">John Doe</div>
    <div class="person-details">DOB: 1990-01-01 | Passport: AB123456</div>
  </label>
</div>
```

### Application List Item

```html
<div class="app-item" data-app-id="123">
  <div class="app-info">
    <div class="app-name">John Doe</div>
    <div class="app-details">
      <span class="app-id">ID: DS160123</span>
      <span class="app-date">Created: 2025-10-30</span>
    </div>
  </div>
  <div class="app-actions">
    <button class="btn btn-sm btn-outline">Edit</button>
    <button class="btn btn-sm btn-destructive">Delete</button>
  </div>
</div>
```

### Photo Preview

```html
<div class="photo-preview">
  <img src="photo.jpg" alt="Uploaded photo">
  <button class="btn btn-sm btn-destructive remove-photo">✕</button>
</div>
```

### Postal Dual Container (Split View)

```html
<div class="postal-dual-container">
  <div class="postal-column">
    <h4>English Address</h4>
    <p>123 Main Street<br>Tokyo, 100-0001</p>
  </div>
  <div class="postal-column">
    <h4>Japanese Address</h4>
    <p>東京都千代田区千代田1-1<br>〒100-0001</p>
  </div>
</div>
```

---

## Component Combinations

Common patterns for combining components.

### Form Section

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Contact Information</h2>
  </div>
  <div class="card-content">
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" class="form-input" placeholder="user@example.com">
    </div>
    <div class="form-group">
      <label class="form-label">Phone</label>
      <input type="tel" class="form-input" placeholder="(555) 123-4567">
    </div>
    <div class="flex gap-2 mt-3">
      <button class="btn btn-primary">Save</button>
      <button class="btn btn-outline">Cancel</button>
    </div>
  </div>
</div>
```

### Action Bar

```html
<div class="flex items-center justify-between mb-4">
  <div class="flex items-center gap-2">
    <span class="icon">📄</span>
    <h3 class="font-semibold">Extracted Data</h3>
  </div>
  <div class="flex gap-2">
    <button class="btn btn-sm btn-ghost">📋 Copy JSON</button>
    <button class="btn btn-sm btn-ghost">{ } Raw</button>
    <button class="btn btn-sm btn-ghost">Expand All</button>
  </div>
</div>
```

### Data Section with Search

```html
<div class="mb-3">
  <input
    type="text"
    class="form-input"
    placeholder="🔍 Search fields...">
</div>

<div class="editable-data-viewer">
  <div class="data-section">
    <div class="section-header">
      <div class="section-title">
        <span>👤</span><span>Personal Information</span>
      </div>
      <span class="section-chevron">▶</span>
    </div>
    <div class="section-content">
      <!-- Fields -->
    </div>
  </div>
</div>
```

---

## Accessibility

All components follow accessibility best practices:

- ✅ Semantic HTML elements
- ✅ ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Focus visible states
- ✅ Sufficient color contrast

### Keyboard Navigation

- **Tab** - Navigate between interactive elements
- **Enter/Space** - Activate buttons
- **Escape** - Close modals/cancel actions
- **Arrow keys** - Navigate within components

---

## Browser Support

All components work in:
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

---

## See Also

- [Style Guide](./STYLE_GUIDE.md) - Design tokens and variables
- [Quick Start](./QUICK_START.md) - Getting started guide
- [Architecture](./ARCHITECTURE.md) - System overview
- [Examples](./examples.html) - Live component showcase
