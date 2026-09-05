# Rankless Rally design thesis

## Direction

Rankless Rally uses a **printed transit dispatch map** rather than a game-menu shell. The board is a clear signal map: a dark ink grid, junction symbols, a route marker, and a physical score card. It fits a routing puzzle because movement, order, and detours are visible at a glance. The first screen contains the playable board and direction controls.

The interface deliberately avoids badges, rank tables, avatar slots, and large promotional art. The visual reward is the player’s own route card.

## Tokens

| Token | Light value | Dark value | Use |
| --- | --- | --- | --- |
| Canvas | `#e8f0ee` | `#081d2c` | map background |
| Surface | `#fffdf8` | `#102a43` | game and information panels |
| Ink | `#102a43` | `#f8f5ed` | primary text and board border |
| Route | `#005a80` | `#6bd4df` | actions, player route, links |
| Relay | `#a44900` | `#ffbb78` | ordered relay symbols |
| Rescue | `#196f62` | `#88e1cd` | optional rescue circles |
| Gold | `#f6c85f` | `#ffe097` | focus and route highlights |
| Danger | `#a62b2b` | `#ffaaa4` | irreversible run-end action |

Primary body text and controls meet 4.5:1 contrast in both treatments. Relay shapes are diamond, triangle, and square, so color never carries the order alone. Rescue circles and the exit arrow also have distinct symbols.

## Type, rhythm, and layout

The display face is the local system `ui-rounded` stack; body copy uses the local system sans stack. No network font is loaded. The type scale uses 16 px body text, 1.25–1.5× section titles, and a responsive 2.15–4.8 rem game title. Spacing follows 4/8 px increments.

Desktop keeps the board and controls adjacent. At 720 px the board stacks above the controls and retains 44 px direction targets. The mobile layout is designed at 390 px: the board remains the first substantial object, navigation wraps, and archive buttons form five columns.

## Motion and sound

The player marker transitions between grid positions in 180 ms. A short, quiet route tone is created only after a player input; the mute control persists. The fixed simulation advances at 60 Hz, pauses when the tab is hidden, and clamps frame delays to 250 ms. `prefers-reduced-motion` and the in-game Reduce movement setting remove transitions and replay pacing.

## Difficulty and content

The standard session is 90 seconds. Practice 01 has three teaching walls. Practice 02–04 introduce four walls; later seeded boards add one wall per three-board group up to ten. Every generated board preserves a guaranteed route through the three relays and exit. The daily board uses ten deterministic walls from its UTC date seed. Optional rescues reward careful detours without blocking a win.

## Asset provenance

All visual assets are hand-authored SVG or CSS/HTML shapes in this repository: the route-map favicon, social card, and all board symbols. No generated or third-party raster art, fonts, logos, or image CDN assets are used. The footer discloses this code-drawn artwork.
