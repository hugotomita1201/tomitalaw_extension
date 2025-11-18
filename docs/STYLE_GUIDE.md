# Style Guide

Design system and styling guidelines for the TomitaLaw extension.

## Table of Contents
- [Design Philosophy](#design-philosophy)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing](#spacing)
- [Shadows & Effects](#shadows--effects)
- [CSS Variables](#css-variables)
- [Naming Conventions](#naming-conventions)

---

## Design Philosophy

Our component system is inspired by the [shadcn/ui](https://ui.shadcn.com) design system, which emphasizes:

- **Consistency** - Predictable patterns across components
- **Accessibility** - WCAG AA compliant
- **Customization** - CSS variables for easy theming
- **Simplicity** - Clean, minimal design
- **Semantic** - HTML that makes sense

---

## Color System

We use an HSL-based color system for flexibility and consistency.

### Color Variables

All colors are defined using HSL (Hue, Saturation, Lightness) for easy manipulation:

```css
:root {
  /* Primary colors */
  --primary: 219 79% 58%;              /* #4A90E2 - Blue */
  --primary-foreground: 0 0% 100%;     /* White */

  /* Secondary colors */
  --secondary: 210 40% 96%;            /* Light Gray */
  --secondary-foreground: 222 47% 11%; /* Dark Gray */

  /* Muted colors */
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;

  /* Accent colors */
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;

  /* Destructive (Red) */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  /* Border */
  --border: 214 32% 91%;

  /* Input */
  --input: 214 32% 91%;
  --ring: 219 79% 58%;

  /* Background */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;

  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  /* Popover */
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
}
```

### How to Use HSL Colors

```css
/* Convert HSL variable to usable color */
background-color: hsl(var(--primary));
color: hsl(var(--primary-foreground));

/* With opacity */
background-color: hsl(var(--primary) / 0.8);

/* Hover states */
.btn-primary:hover {
  background: hsl(var(--primary) / 0.9);
}
```

### Color Palette

| Color | Variable | Hex | Usage |
|-------|----------|-----|-------|
| **Primary Blue** | `--primary` | `#4A90E2` | Primary buttons, links, active states |
| **Secondary Gray** | `--secondary` | `#F4F6F8` | Secondary buttons, backgrounds |
| **Muted Gray** | `--muted` | `#F4F6F8` | Disabled states, subtle backgrounds |
| **Destructive Red** | `--destructive` | `#EF4444` | Delete buttons, error states |
| **Border Gray** | `--border` | `#E2E8F0` | Borders, dividers |
| **Foreground** | `--foreground` | `#1A202C` | Text color |

### Additional Colors

```css
/* Success (Green) */
--success: 142 76% 36%;
--success-foreground: 0 0% 100%;

/* Warning (Yellow) */
--warning: 38 92% 50%;
--warning-foreground: 0 0% 100%;

/* Info (Blue) */
--info: 199 89% 48%;
--info-foreground: 0 0% 100%;
```

---

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
             'Helvetica Neue', sans-serif;
```

System font stack for optimal performance and native feel on each platform.

### Monospace Font

Used for code, JSON, and technical content:

```css
font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
```

### Font Sizes

| Size | Class | Value | Usage |
|------|-------|-------|-------|
| **XS** | `.text-xs` | 12px | Captions, labels |
| **SM** | `.text-sm` | 14px | Secondary text, descriptions |
| **Base** | (default) | 14px | Body text, inputs |
| **LG** | `.text-lg` | 16px | Emphasis |
| **XL** | `.text-xl` | 18px | Section headers |
| **2XL** | `.text-2xl` | 20px | Page headers |

### Font Weights

| Weight | Class | Value | Usage |
|--------|-------|-------|-------|
| **Normal** | (default) | 400 | Body text |
| **Medium** | `.font-medium` | 500 | Emphasis |
| **Semibold** | `.font-semibold` | 600 | Headings, buttons |
| **Bold** | `.font-bold` | 700 | Strong emphasis |

### Line Height

```css
line-height: 1.5; /* Default for body text */
line-height: 1.2; /* For headings */
```

---

## Spacing

Consistent spacing using a base unit of 4px.

### Spacing Scale

| Size | Value | Usage |
|------|-------|-------|
| **1** | 4px | Tight spacing |
| **2** | 8px | Standard gap |
| **3** | 12px | Section padding |
| **4** | 16px | Card padding |
| **6** | 24px | Large margins |
| **8** | 32px | Section spacing |

### Gap Classes (Flexbox)

```css
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
```

**Usage:**
```html
<div class="flex gap-2">
  <button class="btn">Button 1</button>
  <button class="btn">Button 2</button>
</div>
```

### Margin Classes

```css
.mt-3 { margin-top: 12px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
```

### Padding

Most components use consistent padding:

```css
/* Buttons */
padding: 8px 16px;  /* btn default */
padding: 6px 12px;  /* btn-sm */
padding: 10px 20px; /* btn-lg */

/* Cards */
padding: 20px;      /* card-content */
padding: 16px 20px; /* card-header */

/* Inputs */
padding: 8px 12px;  /* form-input */
```

---

## Shadows & Effects

### Border Radius

```css
:root {
  --radius: 0.5rem; /* 8px */
}

/* Usage */
border-radius: var(--radius);         /* Standard */
border-radius: calc(var(--radius) - 2px); /* Nested elements */
```

### Box Shadows

```css
/* Card shadow */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1),
            0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Hover shadow */
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Focus ring */
box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
```

### Transitions

Smooth transitions for interactive elements:

```css
transition: all 0.2s ease;      /* Buttons, links */
transition: opacity 0.2s ease;  /* Fades */
transition: transform 0.2s ease; /* Movement */
```

---

## CSS Variables

Complete reference of all CSS variables.

### Layout Variables

```css
:root {
  --sidebar-width: 420px;
  --header-height: 60px;
  --radius: 0.5rem;
}
```

### Component Variables

```css
/* Buttons */
--btn-padding: 8px 16px;
--btn-height: 36px;

/* Inputs */
--input-height: 36px;
--input-padding: 8px 12px;

/* Cards */
--card-padding: 20px;
--card-border: 1px solid hsl(var(--border));
```

---

## Naming Conventions

### Component Classes

Follow BEM-inspired naming:

```css
/* Block */
.btn { }

/* Block with modifier */
.btn-primary { }
.btn-outline { }
.btn-sm { }

/* Block with state */
.btn:hover { }
.btn:focus { }
.btn:disabled { }
```

### Semantic Classes

Use descriptive, semantic names:

✅ **Good:**
```css
.card-header { }
.section-title { }
.field-label { }
```

❌ **Bad:**
```css
.blue-box { }
.big-text { }
.container-1 { }
```

### Utility Classes

Keep utilities single-purpose:

```css
.flex { display: flex; }
.gap-2 { gap: 8px; }
.mt-3 { margin-top: 12px; }
```

---

## Accessibility

### Focus States

All interactive elements must have visible focus states:

```css
button:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Color Contrast

All text must meet WCAG AA standards:

- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio
- Interactive elements: 3:1 contrast ratio

**Tools to check contrast:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Lighthouse

### Screen Readers

Use semantic HTML and ARIA labels:

```html
<!-- Good -->
<button aria-label="Close dialog">×</button>

<!-- Good -->
<input type="text" id="email" aria-describedby="email-help">
<small id="email-help">We'll never share your email</small>
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
```

**Note:** Chrome extensions typically run in fixed-width sidebars (420px), so responsive design is less critical.

---

## Dark Mode (Future)

Our color system is designed to support dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: 222 47% 11%;
    --foreground: 0 0% 100%;
    --primary: 219 79% 58%;
    --border: 217 33% 17%;
    /* ... */
  }
}
```

**Status:** Not yet implemented, but infrastructure is ready.

---

## Best Practices

### ✅ DO

- Use CSS variables for colors
- Follow the spacing scale
- Use semantic class names
- Ensure sufficient contrast
- Test keyboard navigation
- Use consistent border radius

### ❌ DON'T

- Hardcode color values
- Use arbitrary spacing (17px, 23px, etc.)
- Use `!important` (except rare cases)
- Mix different naming conventions
- Forget hover/focus states

---

## Examples

### Creating a New Component

```css
/* 1. Use CSS variables */
.my-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

/* 2. Follow spacing scale */
.my-component {
  padding: 12px; /* Use 12px (gap-3), not 13px */
  margin-bottom: 16px; /* Use 16px (mb-4), not 15px */
}

/* 3. Add states */
.my-component:hover {
  background: hsl(var(--accent));
}

/* 4. Make accessible */
.my-component:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

---

## See Also

- [Components](./COMPONENTS.md) - Component library
- [Quick Start](./QUICK_START.md) - Getting started
- [Architecture](./ARCHITECTURE.md) - System overview
- [Examples](./examples.html) - Live examples
