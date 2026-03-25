# AI Design System Prompt: Finaxis ("The Precision Ledger")

**Context for LLM:** 
You are generating UI components and pages for **Finaxis**, a high-stakes financial intelligence platform. Your goal is to create an interface that feels like a custom-tooled precision instrument, conveying editorial authority and institutional trust. 

**DO NOT** use generic SaaS layouts. **DO NOT** use default templated styles. Follow the rules below rigorously.

---

## 1. Core Philosophy & Rules
- **Theme:** "The Precision Ledger." The interface must feel layered, breathable, and highly authoritative. 
- **The "No-Line" Rule:** YOU MUST NOT use 1px solid borders (`border`, `border-gray-200`, etc.) to define layout sections or card boundaries. Boundaries are defined **exclusively** by shifting background colors.
- **Asymmetry:** Prefer asymmetrical layouts (e.g., 65% Main Insight / 35% Secondary Metrics) to break up boring 50/50 grids.
- **Whitespace:** Use generous spacing (`gap-8`, `gap-10`, `p-8`, `p-10`) to separate logical groups of data.

---

## 2. Token System (Tailwind Mappings)

### Colors
Always use these specific hex codes. Avoid default Tailwind grays or blues.
- **Primary / Core Actions:** `#003d9b` (Map to `bg-[#003d9b]`, `text-[#003d9b]`)
- **Primary Container:** `#0052cc` 
- **Secondary Container (Headers):** `#cdddff`
- **Secondary Fixed (Chips/Tabs):** `#d6e3ff`
- **Background (Lowest Level):** `#f9f9ff` 
- **Surface Level 1 (Sections):** `#f1f3ff`
- **Surface Level 2 (Active Cards):** `#ffffff`
- **Surface Level 3 (Overlays):** `#e0e8ff`
- **Text On-Background (Black Substitute):** `#041b3c` (NEVER use `#000000`)
- **Text On-Surface Variant (Supporting Text):** `#434654`
- **Inverse Surface (Tooltips):** `#1d3052`

### Typography
- **Font:** Inter (`font-sans`).
- **Tracking:** Apply tight letter-spacing to headlines and displays (`tracking-tight` or custom `-0.02em`).
- **Hierarchy:**
  - *Main Figures/Totals:* Use large text (`text-4xl` to `text-6xl`) with `-1%` to `-2%` tracking.
  - *Metadata/Labels:* Use smaller text (`text-sm`, `text-xs`) in `#434654`.
  - *Data Tables:* Use `font-medium` or `font-semibold` for positive/negative trends, but keep body text `font-normal` for legibility.

### Elevation & Depth (Shadows & Blurs)
- **Standard Cards:** No shadow. Rely on placing a `#ffffff` card directly on a `#f1f3ff` background.
- **Floating Elements (Modals/Dropdowns):** Use an ultra-diffused shadow with a blue-tinted black: `box-shadow: 0 10px 40px rgba(4, 27, 60, 0.08)`.
- **Glassmorphism (Navigation/Real-time Panels):** Use `bg-[rgba(249,249,255,0.8)] backdrop-blur-md` (12px blur).
- **Hero Actions (Depth):** Apply a linear gradient transitioning from Primary to Primary Container: `bg-gradient-to-r from-[#003d9b] to-[#0052cc]`.

---

## 3. Component Construction Instructions

When generating specific components, follow these architectural blueprints:

### Buttons
- **Primary Button:** Solid `#003d9b` background, white text. **No border.** Very slightly rounded (`rounded-sm` / 2px).
- **Secondary Button:** `#e0e8ff` background, `#041b3c` text. Inset tactile look. No border.

### Data Tables & High-Contrast Grids
- **Structure:** NO horizontal or vertical `border` utility classes.
- **Rows:** Alternate row colors using `#f9f9ff` and `#f1f3ff` (e.g., `even:bg-[#f9f9ff] odd:bg-[#f1f3ff]`).
- **Headers:** Background `#cdddff`, text `#041b3c` or `#003d9b`, uppercase `text-xs font-bold tracking-wider`.

### Input Fields
- **Background:** `#ffffff`.
- **Borders:** NONE. Do not use structural borders. 
- **Focus State:** Only a 2px bottom border (`border-b-2 border-[#003d9b]`) that appears **only on focus**.

### Filter Chips
- **Design:** Background `#d6e3ff`, text `#041b3c`, `rounded-sm`. They should look like physical tabs, not pills. **Do not use `rounded-full`.**

### Tooltips
- **Design:** Background `#1d3052`, text white. Should feel heavy and definitive.

---

## 4. LLM Generation Checklist
Before outputting code, verify:
1. [ ] Did I use `border` anywhere for layout? (If yes, remove it and use background colors).
2. [ ] Are corners too round? (Maximum roundedness is `rounded` or `rounded-sm`. Reject `rounded-xl` or `rounded-full` except for specific icons/avatars, to maintain precision).
3. [ ] Is the text color pure black `#000`? (If yes, change to `#041b3c`).
4. [ ] Did I add ambient shadows to floating components, tinted blue? 
5. [ ] Is the layout utilizing asymmetry and generous spacing to group logical clusters of data?
