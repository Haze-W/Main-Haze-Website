# Component Rendering Comparison: Desktop vs Preview Mode

## Summary
This document maps the 16 key Haze components, their container/variant names, and implementation differences between desktop (SceneNodeRenderer.tsx) and preview (scene-export.ts + scene-export-presets.ts) modes.

---

## 1. Icon Button

**Container/Variant Name:** `BUTTON` type with `variant === "icon"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~365-375
- Type: BUTTON with variant="icon"
- Renders: DynamicIcon component from lucide-react
- Styling: Uses CSS classes (btnIcon) + merged styles
- Interactivity: Click handlers, resize handles when selected
- Classes: styles.button, styles.btnIcon
```

### Preview Mode (scene-export.ts)
```html
<!-- Line ~400-420 -->
- Renders: <div class="btnIcon"> with inline styles
- SVG Icon: getIconSvg() converts icon name to SVG HTML
- Classes: "button", "btnIcon"
- Styling: Inline CSS from sceneExportCss()
```

### **DIFFERENCES:**
- Desktop uses React `<DynamicIcon>` component for interactive icons
- Preview converts to static SVG HTML via `getIconSvg()`
- Desktop supports hover effects, preview uses CSS classes
- Icon size calculation: Desktop uses `Math.min(size, width, height) - 4`, Preview uses calculated size

---

## 2. Listbox

**Container/Variant Name:** `node.name === "Listbox"` or `node.name === "Dropdown"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~531-535 (under LIST type or as CONTAINER variant)
- Renders: LIST node or CONTAINER with listbox name
- Items: ["Item one", "Item two", "Item three"]
- Styling: className={styles.listNode}
- Structure: Uses <div> with listItem children
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~443-448 -->
- Renders: <div class="listNode"> with listItem divs
- HTML: joins items as `<div class="listItem">${item}</div>`
- Classes: "listNode"
- No interactive selection in preview
```

### **DIFFERENCES:**
- Both use identical markup structure
- Desktop: CSS module classes, interactive pointer handlers
- Preview: Plain HTML with CSS class strings
- Preview is static rendering; desktop supports item selection

---

## 3. Footer

**Container/Variant Name:** `node.name === "Footer"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1222-1230
- Renders: <div className={styles.footerNode}>
- Content: Brand span + links div
- Structure: footerBrand and footerLinks elements
- Classes: styles.footerNode, styles.footerLinks, styles.footerBrand
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~545-560 -->
- Layout: 3-column grid (Product, Company, Legal)
- Each column has title and items
- No responsive behavior
- Uses H.surfaceSubtle background, border-top styling
- Inline styles for colors and spacing
```

### **DIFFERENCES:**
- Desktop: Simple 2-element layout (brand + links)
- Preview: 3-column content grid with sections and subsections
- Desktop uses CSS modules, preview uses inline styles
- Preview has more structured footer content (multiple columns)

---

## 4. Section Content

**Container/Variant Name:** `node.name === "Section"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Rendered as generic CONTAINER with section-specific styling
- Type: CONTAINER
- Renders: Children inside with layout support
- No specialized section rendering
- Uses standard flex layout for auto-layout
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~566-576 -->
- Specialized preset: Title + description text
- HTML: Section title (font-size:16px, font-weight:700) + descriptive text
- Styling: background (H.surface), border, border-radius:8px
- Layout: padding:16px
```

### **DIFFERENCES:**
- Desktop: No specialized rendering; uses generic container rules
- Preview: Dedicated preset with title/description template
- Desktop supports child layout; preview has fixed content structure
- Preview renders placeholder content for preview purposes

---

## 5. Search Box

**Container/Variant Name:** `INPUT` type with `props.search === true` OR `node.name === "Search Box"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~375-391
- Type: INPUT with isSearch property
- Renders: Shows 🔍 icon + placeholder text
- Styling: Uses styles.inputNode, inputPlaceholder classes
- Icon: Hardcoded 🔍 emoji when isSearch=true
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~520-530 -->
- Name: "Search" or "Search Box"
- Renders: <input type="text"> inside flex container
- Icon: 🔍 span + actual input element
- Styling: H.inputBg background, border, border-radius:6px
- Flexbox layout with gap:8px
```

### **DIFFERENCES:**
- Desktop: Shows placeholder text only (no functional input)
- Preview: Actual HTML `<input>` element (functional in exported HTML)
- Desktop icon is hardcoded emoji; preview also uses emoji but in proper input wrapper
- Desktop uses CSS classes; preview uses inline styles

---

## 6. Carousel

**Container/Variant Name:** `node.name === "Carousel"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1205-1221
- Renders: Slide display + navigation dots and arrows
- Updates activeSlide via updateNode() on nav click
- Slide array: props.slides ?? ["Slide 1", "Slide 2", "Slide 3"]
- Navigation: Left/right arrows + interactive dots
- State management: Updates props.activeSlide
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~512-522 -->
- Renders: Slides with inline styles (display:none for inactive)
- Navigation dots: Static rendering, first selected
- No interactivity in preview HTML
- All slides in DOM but hidden except first
- Uses H.accent and H.accentSoftBg colors
```

### **DIFFERENCES:**
- Desktop: Interactive slide switching via state update
- Preview: Static HTML with CSS display:none for inactive slides
- Desktop: Pointer event handlers on arrows and dots
- Preview: One slide visible, others hidden in HTML
- Desktop uses CSS module styling; preview uses inline styles

---

## 7. Line Chart

**Container/Variant Name:** `node.name === "Line Chart"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~853-867
- Renders: <svg> with polyline + polygon for area
- Data: props.data parsed as comma-separated values (default: "50,35,45,20,30,15,25")
- Scaling: Values normalized to 0-100 range then mapped to SVG coordinates
- Path: polyline points connect values, polygon creates fill area
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~499-510 -->
- Renders: Static SVG with hardcoded points
- Points: '10,60 40,40 70,50 100,30 130,45 160,20'
- SVG viewBox: "0 0 170 80"
- Uses H.accent color for line stroke
- Simpler implementation: no data parsing
```

### **DIFFERENCES:**
- Desktop: Dynamically calculates SVG path from props.data
- Preview: Hardcoded SVG path points (static representation)
- Desktop: Uses polyline + polygon for filled area chart
- Preview: Simple polyline only
- Desktop scales data; preview uses fixed visualization

---

## 8. Pie Chart

**Container/Variant Name:** `node.name === "Pie Chart"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~868-897
- Renders: <svg> with multiple <path> arcs
- Data: props.data parsed as comma-separated values (default: "50,30,20")
- Calculation: Uses arc angle math to create pie slices
- Segments: Each value becomes one slice with different color
- Colors: Array cycles through 6 predefined colors
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~513-519 -->
- Renders: Simplified <svg> donut chart
- Structure: Uses circles and path for donut effect
- Fixed visual: No data parsing
- Hardcoded look with H.accent accent color
- Simpler math: donut shape, not dynamic pie slices
```

### **DIFFERENCES:**
- Desktop: True pie chart with dynamic slice calculation
- Preview: Simplified donut/pie visual representation
- Desktop: Data-driven slices; Preview: Static visualization
- Desktop: Complex arc math; Preview: Simple fixed circles
- Desktop: Multiple color slices; Preview: Accent color focus

---

## 9. Color Picker

**Container/Variant Name:** `node.name === "Color Picker"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1083-1091
- Renders: Grid of color swatches + hex input
- Swatches: 6 predefined colors as square divs
- Hex Input: Shows "#5e5ce6" (non-functional in desktop)
- Classes: styles.colorPickerNode, styles.colorSwatches, styles.colorSwatch
- Size: Determined by node width/height
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~551-556 -->
- Renders: Flex row of color swatches
- Count: 5 colors (slightly different set)
- Colors: ["#5e5ce6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"]
- Each swatch: 24px square with border and shadow
- HTML: Pure inline styles, no classes
```

### **DIFFERENCES:**
- Desktop: 6 colors, includes color picker hex input field
- Preview: 5 colors, no input field
- Desktop: color swatches styled with CSS modules
- Preview: Inline CSS styling
- Desktop: Hex input shown but non-functional
- Preview: Simpler color display only

---

## 10. Settings

**Container/Variant Name:** `node.name === "Settings"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1276-1284
- Renders: Panel structure with header and body
- Header: "Settings" text
- Body: 3 items (Theme, Language, Notifications)
- Classes: styles.panelNode, styles.panelHeader, styles.panelBody
- Each item: Simple list-like structure with text and border
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~557-565 -->
- Renders: Flex column of settings toggles
- Items: Dark Mode, Notifications, Privacy (different from desktop)
- Each item: Flex row with toggle switch visualization
- No actual toggle functionality
- Uses H.accent for toggle and theme colors
```

### **DIFFERENCES:**
- Desktop: Simple list layout with text items
- Preview: Settings with visual toggle switches
- Desktop items: Theme, Language, Notifications
- Preview items: Dark Mode, Notifications, Privacy
- Desktop: Text only; Preview: Includes toggle switch UI
- Desktop uses CSS modules; Preview uses inline styles

---

## 11. Map

**Container/Variant Name:** `node.name === "Map"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1240-1246
- Renders: Centered placeholder map
- Icon: "🗺" emoji
- Text: "Map placeholder"
- Styling: Flex centering with margin-top
- Classes: styles.mapNode
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~567-571 -->
- Renders: Full-height gradient background map
- Gradient: linear-gradient(135deg, #e0f2fe 0%, #cffafe 50%, #a5f3fc 100%)
- Icon: 🗺️ emoji centered
- More visually complete than desktop
- Uses full container space with gradient
```

### **DIFFERENCES:**
- Desktop: Simple centered placeholder with text
- Preview: Gradient background with emoji (more realistic map appearance)
- Desktop includes descriptive text "Map placeholder"
- Preview uses gradient-based visual without text
- Desktop: Minimal styling; Preview: Full visual treatment

---

## 12. Gauge

**Container/Variant Name:** `node.name === "Gauge"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~855-866
- Renders: SVG arc gauge with percentage
- SVG path: Arc from 10,50 to 90,50 with strokeDasharray
- Visual: Gray background arc + colored progress arc
- Percentage: "75%" text displayed
- Styling: 80% width SVG, centered
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~471-477 -->
- Renders: Percentage text + progress bar
- Text: "72%" (different from desktop 75%)
- Progress: Simple horizontal bar (6px height)
- Both background and fill bars shown
- Simpler implementation than SVG arc
```

### **DIFFERENCES:**
- Desktop: SVG arc gauge (circular visualization)
- Preview: Horizontal progress bar (linear visualization)
- Desktop: Percentage 75%; Preview: Percentage 72%
- Desktop: Complex SVG path math; Preview: Simple bar styling
- Desktop: Arc visualization; Preview: Linear fill visualization

---

## 13. Top Bar (Windows, macOS, Custom)

**Container/Variant Name:** `node.type === "TOPBAR"` + `props.style === "windows"` or `"mac"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Rendered via TopBarNode component (imported separately)
- Type: TOPBAR
- Variant: Windows or macOS based on props.style
- Uses dedicated TopBarNode component for rendering
- Supports drag region, window controls
- Interactive window control buttons
```

### Preview Mode (scene-export.ts + scene-export-presets.ts)
```html
<!-- Lines ~905-1022 in scene-export.ts -->
- topBarToHtml() function
- Windows layout: Title on left, controls on right (min/max/close buttons)
- macOS layout: Controls on left (traffic lights), title centered
- Real frameless titlebar HTML with data-haze-titlebar attribute
- Tauri integration support for window controls
- SVG icons for minimize, maximize, close
```

### **DIFFERENCES:**
- Desktop: Separate TopBarNode React component
- Preview: HTML string generation with topBarToHtml()
- Desktop: Interactive with event handlers
- Preview: Static HTML but supports Tauri window control JavaScript
- Windows: Title left, controls right
- macOS: Traffic lights left, title center
- Preview includes functional window control JavaScript; desktop is purely UI

---

## 14. Timeline

**Container/Variant Name:** `node.name === "Timeline"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1193-1202
- Renders: Vertical timeline with dots and content
- Items: ["Project started", "First release", "Version 2.0"]
- Structure: timelineItem container with dot + content
- Classes: styles.timelineNode, styles.timelineItem, styles.timelineDot, styles.timelineContent
- Styling: Flex column layout with items
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~458-468 -->
- Renders: Timeline events with dots and labels
- Items: ["Event 1", "Event 2", "Event 3"] (different labels)
- Each event: Flex row with dot + event title + timestamp
- Styling: H.accent dots, H.text labels, H.textMuted timestamps
- Fixed "Just now" timestamp for all events
- Inline styles for layout and colors
```

### **DIFFERENCES:**
- Desktop items: Project-focused ("Project started", "First release", "Version 2.0")
- Preview items: Generic events ("Event 1", "Event 2", "Event 3")
- Desktop uses CSS module classes
- Preview uses inline HTML styles
- Preview includes timestamp display ("Just now")
- Desktop simpler structure; Preview more complete event display

---

## 15. Comment

**Container/Variant Name:** `node.name === "Comment"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1103-1109
- Renders: Input-like interface for adding comments
- Icon: "+" button for comment
- Structure: commentIconBtn + commentInputWrap
- Placeholder: "Add comment..."
- Classes: styles.commentNode, styles.commentIconBtn, styles.commentInputWrap
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~485-490 -->
- Renders: Actual comment display, not input
- Layout: Avatar + user info + comment text
- Content: "User Name" + "This is a great component!" + "2 hours ago"
- Avatar: 32px circle with accent color
- Full comment card with text, time
- Inline styles with box styling
```

### **DIFFERENCES:**
- Desktop: Comment input interface ("Add comment..." prompt)
- Preview: Display of existing comment (different use case)
- Desktop: Plus icon button for adding
- Preview: Avatar-based comment display
- Different purposes: Input vs Display
- Desktop simpler; Preview shows complete comment structure

---

## 16. User Profile

**Container/Variant Name:** `node.name === "User Profile"`

### Desktop Mode (SceneNodeRenderer.tsx)
```jsx
// Line ~1170-1176
- Renders: Avatar + user info
- Structure: userAvatar + userInfo
- User info: userName + userEmail
- Labels: "John Doe" + "john@example.com"
- Classes: styles.userProfileNode, styles.userAvatar, styles.userInfo, styles.userName, styles.userEmail
```

### Preview Mode (scene-export-presets.ts)
```html
<!-- Line ~492-496 -->
- Renders: Avatar + display name + handle
- Avatar: 40px circle with accent color
- Content: "John Doe" (name) + "@johndoe" (handle/mention)
- Layout: Flex row with gap
- Styling: Inline CSS, simpler user identification
- Uses H.accent for avatar
```

### **DIFFERENCES:**
- Desktop: Includes email address ("john@example.com")
- Preview: Includes @ handle ("@johndoe") instead of email
- Desktop avatar referenced via class
- Preview avatar: inline styled 40px circle
- Desktop: 2-line info (name + email)
- Preview: 2-line info (name + @handle)
- Desktop uses CSS modules; Preview uses inline styles
- Same visual layout, different user metadata

---

## Summary Table

| # | Component | Desktop Variant | Preview Node Name | Key Desktop Difference | Key Preview Difference |
|---|-----------|-----------------|-------------------|----------------------|----------------------|
| 1 | Icon Button | `BUTTON` + `variant="icon"` | Same | React DynamicIcon | Static SVG via getIconSvg() |
| 2 | Listbox | `LIST` or CONTAINER | "Listbox"/"Dropdown" | CSS module styling | HTML class strings |
| 3 | Footer | CONTAINER | "Footer" | Simple 2-elem layout | 3-column content grid |
| 4 | Section Content | CONTAINER | "Section" | Generic layout | Fixed title/desc template |
| 5 | Search Box | INPUT + search=true | "Search"/"SearchBox" | Placeholder only | Functional `<input>` element |
| 6 | Carousel | CONTAINER | "Carousel" | Interactive slide switching | Static HTML (display:none) |
| 7 | Line Chart | CONTAINER | "Line Chart" | Data-driven SVG paths | Hardcoded SVG points |
| 8 | Pie Chart | CONTAINER | "Pie Chart" | Dynamic arc calculation | Simplified donut visual |
| 9 | Color Picker | CONTAINER | "Color Picker" | 6 colors + hex input | 5 colors, no input |
| 10 | Settings | PANEL | "Settings" | Simple list | Settings with toggles |
| 11 | Map | CONTAINER | "Map" | Centered emoji + text | Full gradient background |
| 12 | Gauge | CONTAINER | "Gauge" | SVG arc | Horizontal progress bar |
| 13 | Top Bar | TOPBAR | "Top Bar" | TopBarNode component | HTML string + Tauri JS |
| 14 | Timeline | CONTAINER | "Timeline" | Project event labels | Generic event labels |
| 15 | Comment | CONTAINER | "Comment" | Input interface | Comment display |
| 16 | User Profile | CONTAINER | "User Profile" | Name + email | Name + @handle |

---

## Technical Architecture Notes

### Desktop Rendering (SceneNodeRenderer.tsx)
- React components with state management
- CSS Modules for styling (styles.*)
- Interactive event handlers (onClick, onPointerDown)
- Real-time updates via useEditorStore
- Selection and resize handles
- Hover effects with _hoverPreset support

### Preview Rendering (scene-export.ts & scene-export-presets.ts)
- Static HTML string generation
- Inline CSS styles
- buildPresetEmptyContainerHtml() for empty containers
- Interaction via onclick/onchange attributes with JS handlers
- Supports Tauri window controls
- getIconSvg() for SVG conversion
- Theme token colors from component-content-tokens (HAZE_COMP constants)
