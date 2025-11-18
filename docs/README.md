# TomitaLaw Extension Frontend Documentation

Complete guide to the TomitaLaw Chrome Extension frontend component system.

## 📚 Documentation

### [Quick Start Guide](./QUICK_START.md)
**Start here!** Get up and running in 5 minutes with the most common components and patterns.

**What you'll learn:**
- How to add buttons, forms, and cards
- Common UI patterns
- Quick reference for classes
- Troubleshooting tips

---

### [Component Library](./COMPONENTS.md)
Complete catalog of all available components with code examples.

**Includes:**
- Buttons (6 variants, 3 sizes)
- Cards & containers
- Forms & inputs
- Alerts & badges
- Data display components
- Layout utilities
- Specialized components

---

### [Style Guide](./STYLE_GUIDE.md)
Design system, colors, typography, and styling guidelines.

**Covers:**
- HSL color system
- CSS variables
- Typography scale
- Spacing system
- Shadows & effects
- Naming conventions
- Accessibility standards

---

### [Architecture Overview](./ARCHITECTURE.md)
Deep dive into how the frontend is structured and why.

**Topics:**
- Technology stack (Vanilla JS + Custom CSS)
- File structure & organization
- Module system
- Data flow patterns
- State management
- Chrome extension integration
- Performance considerations

---

### [Live Examples](./examples.html)
Interactive showcase with copy-paste code snippets.

**Features:**
- Visual examples of all components
- Copy code with one click
- See components in action
- Multiple variants demonstrated

---

## 🚀 Quick Links

### For New Developers

1. **Start here:** [Quick Start Guide](./QUICK_START.md)
2. **See examples:** [Live Examples](./examples.html)
3. **Learn components:** [Component Library](./COMPONENTS.md)

### For Existing Developers

1. **Reference:** [Component Library](./COMPONENTS.md)
2. **Design tokens:** [Style Guide](./STYLE_GUIDE.md)
3. **Architecture:** [Architecture Overview](./ARCHITECTURE.md)

### Common Tasks

| Task | Documentation |
|------|--------------|
| Add a button | [Quick Start - Buttons](./QUICK_START.md#adding-a-button) |
| Create a form | [Quick Start - Forms](./QUICK_START.md#creating-a-form) |
| Use a card | [Quick Start - Cards](./QUICK_START.md#adding-a-card-section) |
| Find a color | [Style Guide - Colors](./STYLE_GUIDE.md#color-system) |
| Add spacing | [Style Guide - Spacing](./STYLE_GUIDE.md#spacing) |
| See all components | [Component Library](./COMPONENTS.md) |
| View live examples | [Examples Page](./examples.html) |
| Understand architecture | [Architecture Overview](./ARCHITECTURE.md) |

---

## 🎨 Design System

### Color Palette

| Color | Variable | Usage |
|-------|----------|-------|
| **Primary Blue** | `--primary` | Main actions, links |
| **Secondary Gray** | `--secondary` | Secondary buttons |
| **Destructive Red** | `--destructive` | Delete, errors |
| **Border Gray** | `--border` | Borders, dividers |

**See more:** [Style Guide - Colors](./STYLE_GUIDE.md#color-system)

### Component Overview

- **Buttons:** 6 variants (primary, secondary, outline, ghost, destructive, orange)
- **Cards:** Container components with headers and content
- **Forms:** Inputs, textareas, labels
- **Alerts:** 4 types (info, success, warning, error)
- **Badges:** Status indicators
- **Layout:** Flexbox utilities, spacing, separators

**Full catalog:** [Component Library](./COMPONENTS.md)

---

## 💻 Technology Stack

**Framework:** Vanilla JavaScript (ES6+)
- No React, Vue, or other frameworks
- Direct DOM manipulation
- Native browser APIs

**Styling:** Custom CSS + shadcn-inspired components
- CSS Variables (HSL color system)
- Component classes
- Utility classes
- No Tailwind or Bootstrap

**Build System:** None
- Direct file loading
- No bundling
- ES6 modules

**Why?** Fast, lightweight (~110KB), simple, perfect for Chrome extensions

**Learn more:** [Architecture Overview](./ARCHITECTURE.md#technology-stack)

---

## 📖 Component Examples

### Button

```html
<button class="btn btn-primary">Click Me</button>
```

### Card

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Title</h2>
  </div>
  <div class="card-content">
    Content here
  </div>
</div>
```

### Form Input

```html
<label class="form-label">Email</label>
<input type="email" class="form-input" placeholder="you@example.com">
```

### Alert

```html
<div class="alert alert-success">
  <strong>Success:</strong> Operation completed!
</div>
```

**See all examples:** [Live Examples Page](./examples.html)

---

## 🎯 Best Practices

### ✅ DO

- Use CSS variables for colors
- Follow the spacing scale (4px, 8px, 12px, 16px, 24px)
- Use semantic class names (`.btn-primary`, not `.blue-btn`)
- Always pair inputs with labels
- Test keyboard navigation
- Use consistent component patterns

### ❌ DON'T

- Hardcode color values
- Use arbitrary spacing (13px, 17px, etc.)
- Mix different naming conventions
- Use `!important` (except rare cases)
- Forget hover/focus states
- Create one-off components without reason

**Learn more:** [Style Guide - Best Practices](./STYLE_GUIDE.md#best-practices)

---

## 🔍 Quick Reference

### Most Used Classes

```html
<!-- Buttons -->
.btn .btn-primary .btn-outline .btn-ghost .btn-sm

<!-- Layout -->
.flex .gap-2 .items-center .justify-between

<!-- Spacing -->
.mt-3 .mb-3 .mb-4

<!-- Typography -->
.font-semibold .text-lg

<!-- Components -->
.card .card-header .card-title .card-content
.form-input .textarea .form-label
.alert .alert-success .alert-error
```

### Color Variables

```css
--primary          /* Blue #4A90E2 */
--destructive      /* Red #EF4444 */
--border           /* Gray #E2E8F0 */
--foreground       /* Text color */
--background       /* White */
```

**Full reference:** [Style Guide](./STYLE_GUIDE.md)

---

## 🏗️ File Structure

```
/docs/
├── README.md           # This file - documentation index
├── QUICK_START.md      # 5-minute getting started guide
├── COMPONENTS.md       # Complete component library
├── STYLE_GUIDE.md      # Design system & guidelines
├── ARCHITECTURE.md     # System architecture overview
└── examples.html       # Live interactive examples

/sidebar/
├── sidebar.html        # Main UI template
├── sidebar.js          # Main controller
├── sidebar.css         # Core styles
└── components.css      # Component library
```

---

## 🤝 Contributing

### Adding a New Component

1. **Add styles** to `/sidebar/components.css`
2. **Document** in [COMPONENTS.md](./COMPONENTS.md)
3. **Add example** to [examples.html](./examples.html)
4. **Update** [QUICK_START.md](./QUICK_START.md) if commonly used

### Modifying Existing Components

1. **Update styles** in `/sidebar/components.css`
2. **Update docs** in [COMPONENTS.md](./COMPONENTS.md)
3. **Test** across all modules
4. **Update examples** if behavior changed

### Guidelines

- Follow existing patterns
- Use CSS variables for colors
- Follow spacing scale
- Test keyboard navigation
- Update documentation
- Keep components reusable

---

## 📝 Changelog

### Recent Updates

**2025-10-30:** Initial documentation created
- Complete component library documentation
- Style guide with design tokens
- Quick start guide for developers
- Architecture overview
- Live examples page

---

## 🆘 Getting Help

### Common Questions

**Q: What button variant should I use?**
A: See [Quick Start - Buttons](./QUICK_START.md#adding-a-button)

**Q: How do I customize colors?**
A: See [Style Guide - Colors](./STYLE_GUIDE.md#color-system)

**Q: Where are component styles defined?**
A: See `/sidebar/components.css` and [Architecture](./ARCHITECTURE.md#file-structure)

**Q: How do I add a new module?**
A: See [Architecture - Module System](./ARCHITECTURE.md#module-system)

### Resources

- [Quick Start Guide](./QUICK_START.md) - Get started fast
- [Component Library](./COMPONENTS.md) - All components
- [Live Examples](./examples.html) - Visual examples
- [Architecture](./ARCHITECTURE.md) - How it works

---

## 🎓 Learning Path

### Beginner

1. ✅ Read [Quick Start Guide](./QUICK_START.md)
2. ✅ Browse [Live Examples](./examples.html)
3. ✅ Try adding a button and form
4. ✅ Explore [Component Library](./COMPONENTS.md)

### Intermediate

1. ✅ Study [Style Guide](./STYLE_GUIDE.md)
2. ✅ Learn CSS variables and design tokens
3. ✅ Create a new card-based UI
4. ✅ Understand [Architecture](./ARCHITECTURE.md)

### Advanced

1. ✅ Deep dive [Architecture Overview](./ARCHITECTURE.md)
2. ✅ Understand module system
3. ✅ Learn data flow patterns
4. ✅ Add a new module
5. ✅ Contribute new components

---

## 📄 License

Internal documentation for TomitaLaw extension development.

---

**Ready to build?** Start with the [Quick Start Guide](./QUICK_START.md)!
