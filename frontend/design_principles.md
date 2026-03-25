# Design Principles: The Precision Ledger

## 1. Overview & Theme
The foundational theme for the Finaxis platform is **"The Precision Ledger."** Targeted toward high-stakes financial intelligence, it adopts an editorial and authoritative aesthetic. The platform abandons the generic "boxed-in" SaaS dashboard look, replacing it with an expansive, layered environment that allows dense financial data to breathe. It leverages intentional asymmetry, subtle glassmorphism, and a high-contrast typographic scale to build institutional trust and technical precision.

## 2. Platform Features Covered
The design system systematically unifies multiple complex financial capabilities across the user journey:
- **Decision Sandbox:** Scenario modeling and mitigation path selection (Optimal, Conservative, Custom Path) during liquidity crisis events.
- **Action & Execution:** Managing decision logic, execution queues, and vendor correspondence, concluding with confident transfer confirmations.
- **Document Intelligence:** Intuitive drag-and-drop parsing for invoices with instantaneous layout and extraction rendering.
- **Cash Flow Forecast & Active Obligations:** Dynamic, high-visibility dashboards for tracking active obligations and modeling upcoming cash flows.
- **Obligations Ledger:** Granular, easily scannable tracking of liabilities without visual clutter.

## 3. Core Design Principles

### Colors & Surface Architecture
Emphasis on institutional trust using deep blues and surgical neutrals.
- **Tonal Foundation:** `primary` (#003d9b) and `primary_container` (#0052cc) are used strictly for high-impact navigation and actions.
- **The "No-Line" Rule:** 1px solid borders are prohibited for layout boundaries. Separation is implicitly created through background color shifts.
- **Layered Nesting:** The UI mimics physically stacked layers:
  - Base: `surface` (#f9f9ff)
  - Sections: `surface_container_low` (#f1f3ff)
  - Active Cards: `surface_container_lowest` (#ffffff)
  - Interactive Overlays: `surface_container_high` (#e0e8ff)
- **Signature Textures:** Hero sections and primary CTAs use a linear gradient from `primary` to `primary_container` to add depth.

### Typography
Editorial authority is achieved through deliberate contrast using **Inter**.
- **Tight Tracking:** A tight letter-spacing (`-1%` to `-2%`) on all `headline` and `display` classes evokes dense financial reporting.
- **Hierarchy of Truth:** Primary portfolio figures take dominance with `display-md`, while supporting labels drop back to `on_surface_variant` (#434654) via `label-md` and `label-sm`.
- **Weight as Signpost:** `medium` and `semibold` weights distinguish changing trends, allowing data table bodies to remain `regular` for legibility.

### Elevation & Depth
Depth is constructed through ambient light, tone, and strategic stacking rather than heavy drop shadows.
- **Structural Stacking:** Placing a white (lowest container) card onto a tinted background provides a "soft lift" that feels architectural.
- **Ambient Shadows:** Floating elements map to a diffused 20-40px blur at 4-8% opacity colored with tinted `on_background` (#041b3c).
- **Glassmorphism:** Navigation and real-time panels use 80% surface opacity backed by a `12px` backdrop blur, merging the interface with underlying data.
- **Ghost Borders:** For accessibility on dense grids, `outline_variant` at 15% opacity is the only allowed delineator.

### Component Precision
The atomic elements of the UI function as fine-tuned instruments.
- **Buttons:** Solid colors, strictly no borders, corner radius of 2px (`sm`). Secondary buttons inset via a `surface_container_high` background.
- **Data Tables:** Alternating backgrounds (`surface` and `surface_container_low`) with no line dividers. Headers use `secondary_container` (#cdddff).
- **Inputs:** Minimalist footprints utilizing just a 2px `primary` underline on focus against a `surface_container_lowest` background.
- **Chips & Tooltips:** Filter chips feel tactile (`secondary_fixed`, #d6e3ff, `sm` border radius) while tooltips act as heavy, definitive anchors (`inverse_surface`).

### Do's and Don'ts
- **Do:** Use ample whitespace (spacing scale 8 to 10) to cluster logic.
- **Do:** Embrace asymmetrical layouts (e.g., 65/35 splits) over perfectly symmetrical grids.
- **Do:** Perfectly baseline-align 20px/24px linear typography and iconography.
- **Don't:** Rely on global borders or heavily rounded corners (restrict to 2px or 4px) to avoid a "consumer toy" aesthetic.
- **Don't:** Use pure black (#000000). Always opt for `on_background` (#041b3c) to preserve the tonal integrity of the palette.
