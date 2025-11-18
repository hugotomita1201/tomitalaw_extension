# Quick Start Guide

Get up to speed with the TomitaLaw extension frontend in 5 minutes.

## Table of Contents
- [Adding a Button](#adding-a-button)
- [Creating a Form](#creating-a-form)
- [Adding a Card Section](#adding-a-card-section)
- [Working with Data Display](#working-with-data-display)
- [Common Patterns](#common-patterns)
- [Tips & Tricks](#tips--tricks)

---

## Adding a Button

### Basic Button

```html
<button class="btn btn-primary">Click Me</button>
```

### Button with Icon

```html
<button class="btn btn-primary">
  <span class="icon-sm">🚀</span>
  Launch
</button>
```

### Multiple Buttons

```html
<div class="flex gap-2">
  <button class="btn btn-primary">Save</button>
  <button class="btn btn-outline">Cancel</button>
</div>
```

### Button Variants Cheat Sheet

```html
<!-- Primary (blue) -->
<button class="btn btn-primary">Primary</button>

<!-- Secondary (gray) -->
<button class="btn btn-secondary">Secondary</button>

<!-- Outline -->
<button class="btn btn-outline">Outline</button>

<!-- Ghost (transparent) -->
<button class="btn btn-ghost">Ghost</button>

<!-- Destructive (red) -->
<button class="btn btn-destructive">Delete</button>

<!-- Small size -->
<button class="btn btn-sm btn-outline">Small</button>
```

---

## Creating a Form

### Simple Form

```html
<div class="form-group">
  <label class="form-label" for="email">Email Address</label>
  <input
    type="email"
    id="email"
    class="form-input"
    placeholder="you@example.com"
    required>
</div>

<div class="form-group">
  <label class="form-label" for="message">Message</label>
  <textarea
    id="message"
    class="textarea"
    rows="4"
    placeholder="Your message here..."></textarea>
</div>

<div class="flex gap-2 mt-3">
  <button class="btn btn-primary">Submit</button>
  <button class="btn btn-outline">Cancel</button>
</div>
```

### Form in a Card

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Contact Form</h2>
    <p class="card-description">Send us a message</p>
  </div>
  <div class="card-content">
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" placeholder="Your name">
    </div>
    <div class="flex gap-2 mt-3">
      <button class="btn btn-primary">Submit</button>
    </div>
  </div>
</div>
```

---

## Adding a Card Section

### Basic Card

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Section Title</h2>
  </div>
  <div class="card-content">
    <p>Your content here</p>
  </div>
</div>
```

### Card with Icon

```html
<div class="card">
  <div class="card-header">
    <div class="flex items-center gap-2">
      <span class="icon">📝</span>
      <h2 class="card-title">Form Filler</h2>
    </div>
    <p class="card-description">Automatically fill forms with your data</p>
  </div>
  <div class="card-content">
    <!-- Content -->
  </div>
</div>
```

---

## Working with Data Display

### Collapsible Data Section

```html
<div class="data-section">
  <div class="section-header" onclick="toggleSection(this)">
    <div class="section-title">
      <span>👤</span>
      <span>Personal Information</span>
    </div>
    <span class="section-chevron">▶</span>
  </div>
  <div class="section-content">
    <div class="data-field">
      <div class="field-label">Name:</div>
      <div class="field-value">John Doe</div>
    </div>
    <div class="data-field">
      <div class="field-label">Email:</div>
      <div class="field-value">john@example.com</div>
    </div>
  </div>
</div>

<script>
function toggleSection(header) {
  header.classList.toggle('active');
  header.nextElementSibling.classList.toggle('expanded');
}
</script>
```

### Data Field with Editing

```html
<div class="data-field">
  <div class="field-label">Email:</div>
  <div class="field-value" contenteditable="true">
    john@example.com
  </div>
</div>
```

---

## Common Patterns

### Action Bar

Header with title and action buttons:

```html
<div class="flex items-center justify-between mb-4">
  <div class="flex items-center gap-2">
    <span class="icon">📄</span>
    <h3 class="font-semibold">Document Title</h3>
  </div>
  <div class="flex gap-2">
    <button class="btn btn-sm btn-ghost">Edit</button>
    <button class="btn btn-sm btn-outline">Export</button>
  </div>
</div>
```

### Alert Messages

```html
<!-- Success -->
<div class="alert alert-success">
  <strong>Success!</strong> Your changes have been saved.
</div>

<!-- Error -->
<div class="alert alert-error">
  <strong>Error:</strong> Something went wrong. Please try again.
</div>

<!-- Warning -->
<div class="alert alert-warning">
  <strong>Warning:</strong> This action cannot be undone.
</div>

<!-- Info -->
<div class="alert alert-info">
  <strong>Tip:</strong> You can use keyboard shortcuts to save time.
</div>
```

### Loading State

```html
<button class="btn btn-primary" disabled>
  <span class="spinner"></span>
  Loading...
</button>
```

### Empty State

```html
<div class="empty-state">
  <span class="icon-lg">📭</span>
  <h3>No data yet</h3>
  <p>Click the button below to get started</p>
  <button class="btn btn-primary mt-3">Add Data</button>
</div>
```

---

## Tips & Tricks

### 1. Consistent Spacing

Always use the spacing scale:

```html
<!-- ✅ Good -->
<div class="flex gap-2 mt-3 mb-4">

<!-- ❌ Bad -->
<div style="margin-top: 13px; gap: 7px;">
```

### 2. Use Flex for Layout

```html
<!-- Horizontal layout -->
<div class="flex gap-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Space between -->
<div class="flex items-center justify-between">
  <span>Label</span>
  <button class="btn btn-sm">Action</button>
</div>
```

### 3. Semantic HTML

Use the right elements:

```html
<!-- ✅ Good -->
<button class="btn">Click</button>
<input type="email" class="form-input">

<!-- ❌ Bad -->
<div class="btn" onclick="...">Click</div>
<div contenteditable="true">...</div>
```

### 4. Always Add Labels

```html
<!-- ✅ Good -->
<label for="email">Email</label>
<input type="email" id="email" class="form-input">

<!-- ❌ Bad -->
<input type="email" class="form-input" placeholder="Email">
```

### 5. Use CSS Variables

```css
/* ✅ Good */
.my-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* ❌ Bad */
.my-component {
  background: #ffffff;
  color: #1a202c;
}
```

### 6. Group Related Actions

```html
<div class="flex gap-2">
  <button class="btn btn-primary">Save</button>
  <button class="btn btn-outline">Cancel</button>
  <button class="btn btn-destructive">Delete</button>
</div>
```

### 7. Use Separators

```html
<section>
  <h2>Section 1</h2>
  <p>Content...</p>
</section>

<div class="separator-horizontal"></div>

<section>
  <h2>Section 2</h2>
  <p>Content...</p>
</section>
```

---

## Troubleshooting

### Button Not Styled

**Problem:** Button has no styling

```html
<!-- ❌ Missing base class -->
<button class="btn-primary">Button</button>
```

**Solution:** Always include `.btn` base class

```html
<!-- ✅ Correct -->
<button class="btn btn-primary">Button</button>
```

### Flex Items Not Aligned

**Problem:** Items not aligning as expected

```html
<!-- May not work as expected -->
<div class="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

**Solution:** Add alignment classes

```html
<!-- ✅ Better -->
<div class="flex items-center gap-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Colors Look Wrong

**Problem:** Hardcoded colors don't match theme

```css
/* ❌ Don't do this */
.my-element {
  background: #4A90E2;
}
```

**Solution:** Use CSS variables

```css
/* ✅ Do this */
.my-element {
  background: hsl(var(--primary));
}
```

---

## Quick Reference

### Most Used Classes

```html
<!-- Buttons -->
.btn .btn-primary .btn-outline .btn-ghost .btn-destructive
.btn-sm .btn-lg

<!-- Layout -->
.flex .gap-2 .gap-3 .items-center .justify-between

<!-- Spacing -->
.mt-3 .mb-3 .mb-4 .mb-6

<!-- Typography -->
.font-semibold .text-sm .text-lg

<!-- Components -->
.card .card-header .card-title .card-content
.form-input .textarea .form-label
.alert .alert-info .alert-success .alert-warning .alert-error
```

### Color Variables

```css
--primary         /* Blue #4A90E2 */
--secondary       /* Gray #F4F6F8 */
--destructive     /* Red #EF4444 */
--border          /* Border Gray */
--foreground      /* Text Color */
--background      /* Background */
```

---

## Next Steps

1. **Read the full docs:**
   - [Components](./COMPONENTS.md) - All components
   - [Style Guide](./STYLE_GUIDE.md) - Design system
   - [Architecture](./ARCHITECTURE.md) - How it works

2. **See examples:**
   - [examples.html](./examples.html) - Live showcase

3. **Explore the code:**
   - `/sidebar/components.css` - Component styles
   - `/sidebar/sidebar.html` - Real examples

---

## Getting Help

**Common Questions:**

Q: **What button variant should I use?**
A: Primary for main actions, outline for secondary, ghost for subtle, destructive for delete.

Q: **How do I add custom spacing?**
A: Use the spacing scale: `.gap-2` (8px), `.gap-3` (12px), `.mt-3` (12px), etc.

Q: **Can I customize colors?**
A: Yes! Modify CSS variables in `components.css` root section.

Q: **How do I make components responsive?**
A: Extension sidebar is fixed-width (420px), so responsive design is less critical.

---

**Ready to build? Start with a simple button and work your way up!**

```html
<button class="btn btn-primary">Let's Go! 🚀</button>
```
