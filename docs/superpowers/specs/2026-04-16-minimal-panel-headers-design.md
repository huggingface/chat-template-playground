# Minimal Panel Headers Redesign

## Goal

Replace the colored gradient panel headers with clean, neutral styling. The green/orange/purple gradients feel dated and heavy. The new headers should be minimal, modern, and blend into the editor panels.

## Scope

**In scope:**
- Panel title bar backgrounds (all 3 panels)
- Merging the two header rows (title + toolbar) into one
- Simplifying the `btn` utility gradient to flat styling

**Out of scope:**
- Layout structure (three-panel drag-to-resize stays)
- CodeMirror editor theming
- Functionality (template switching, model changing, examples, format toggle)
- Alert/tooltip/search styling

## Changes

### 1. ChatTemplateViewer.svelte — title bar

**Current (line 36):**
```
bg-linear-to-r from-green-200 to-white dark:from-green-700 dark:to-green-900
text-lg
```

**New:**
```
bg-white dark:bg-gray-900
text-sm font-semibold
```

The title row and toolbar row merge into a single row:
- Left side: "Chat template for {modelId}" (text-sm font-semibold) + "change model" button
- Right side: Reset, Copy, Formatted, LineWrap buttons (same small ghost buttons, just moved up)
- Template tabs (for multi-template models) remain as a second row only when needed

### 2. JsonEditor.svelte — title bar

**Current (line 196):**
```
bg-linear-to-r from-orange-200 to-white dark:from-orange-700 dark:to-orange-900
text-lg
```

**New:**
```
bg-white dark:bg-gray-900
text-sm font-semibold
```

Single merged row:
- Left side: "JSON Input" label
- Right side: example dropdown + Reset, Copy, LineWrap buttons

### 3. OutputViewer.svelte — title bar

**Current (line 16):**
```
bg-linear-to-r from-purple-200 to-white dark:from-purple-700 dark:to-purple-900
text-lg
```

**New:**
```
bg-white dark:bg-gray-900
text-sm font-semibold
```

Single merged row:
- Left side: "Rendered Output" label
- Right side: Copy, LineWrap buttons

Error alert remains as a separate row below (unchanged).

### 4. app.css — btn utility

**Current:**
```css
@utility btn {
  @apply btn-base;
  @apply border-gray-200 bg-linear-to-b from-white to-gray-100 text-gray-800
         hover:shadow-inner
         dark:border-gray-800 dark:from-gray-800 dark:to-gray-950
         dark:text-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-950;
}
```

**New:**
```css
@utility btn {
  @apply btn-base;
  @apply border-gray-200 bg-gray-100 text-gray-800
         hover:bg-gray-200
         dark:border-gray-700 dark:bg-gray-800
         dark:text-gray-200 dark:hover:bg-gray-700;
}
```

Same treatment for `btn-widget`: replace gradient with flat background.

### 5. Border treatment

All panel title bars use `border-b border-gray-200 dark:border-gray-700` (softer than the current `border-gray-500`). This provides enough visual separation without being heavy.

## Light + Dark Mode

Both modes receive identical treatment: neutral flat backgrounds, 1px subtle border as the only separator. No color accent per panel — the panels are distinguished by their labels and content.

## Files Modified

1. `src/lib/ChatTemplateViewer/ChatTemplateViewer.svelte` — header markup
2. `src/lib/JsonEditor/JsonEditor.svelte` — header markup
3. `src/lib/OutputViewer/OutputViewer.svelte` — header markup
4. `src/app.css` — `btn` and `btn-widget` utilities
