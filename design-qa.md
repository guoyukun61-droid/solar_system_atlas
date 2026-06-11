**Findings**
- No actionable P0/P1/P2 findings remain.

**Upgrade Target**
- Add Pluto as a selectable dwarf planet.
- Add a distant Oort Cloud particle shell to the overview.
- Expand every body description from a short summary into summary plus detail bullets.
- Improve comet tails so they read as glowing dust/ion trails, not thin line segments.
- Improve Uranus and Neptune texture rendering.
- Rebuild Saturn's rings as multiple visible concentric bands with gaps.

**Implementation Evidence**
- Desktop overview with Oort Cloud, Pluto, comet tail: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\desktop-overview-oort-pluto-final.png`
- Desktop Pluto selected: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\desktop-pluto-final.png`
- Desktop Saturn rings: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\desktop-saturn-rings-final.png`
- Desktop Uranus texture: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\desktop-uranus-final.png`
- Desktop Neptune texture: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\desktop-neptune-final.png`
- Mobile selector scrolled to Pluto: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\mobile-selector-pluto-final.png`
- Mobile Pluto selected: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-outer-qa\mobile-pluto-final.png`

**Build And Runtime Checks**
- `npm run build`: passed.
- Page identity: `Solaris Atlas | 太阳系漫游`.
- Browser path: Browser plugin not available; validated with Playwright Chromium.
- Desktop viewport: 1440 x 1024.
- Mobile viewport: 390 x 844.
- Selector count: 10 selectable bodies, including Pluto.
- Console health: passed; no relevant app errors.
- Failed requests: passed; no failed requests after removing external font import.
- Note: Chromium emitted screenshot-time WebGL `ReadPixels` performance warnings in one smoke run; these are capture-related and not app runtime failures.

**Interaction QA**
- Return Orbit shows the full overview with expanded outer system composition.
- Pluto can be selected from the desktop selector and displays `矮行星` detail content.
- Saturn can be selected and displays expanded ring-focused detail copy.
- Uranus and Neptune can be selected and display expanded ice-giant detail copy.
- Mobile selector scrolls to Pluto and Pluto can be selected without breaking the bottom sheet.

**Visual QA**
- Pluto: passed; added New Horizons/JPL texture and shader fill for unmapped dark regions.
- Oort Cloud: passed; added distant cool particle shell around the orbital system.
- Comet tails: passed; added wider additive sprite tail plus particle/line core, giving a softer solar-wind trail.
- Saturn rings: passed; rings now render as multiple concentric bands with dark gaps, including a Cassini-like separation.
- Uranus: passed; uses upgraded texture path with subtle band shader response and pale cyan atmosphere.
- Neptune: passed; uses upgraded texture path with stronger blue banding and visible storm/cloud features.
- Detail panel: passed; added summary plus detail bullets while preserving right-half translucent column layout.

**Files Changed**
- `src/data/bodies.js`: added Pluto, expanded descriptions, updated Uranus/Neptune/Saturn ring texture paths, added Pluto texture fill metadata.
- `src/components/BodyPanel.jsx`: renders detail bullets below the summary.
- `src/components/SolarSystemScene.jsx`: added Oort Cloud particles, wider comet tails, Pluto dark-fill shader support, and multi-band Saturn rings.
- `src/styles.css`: added detail-list styling, resized selector grid for 10 bodies, removed external Google Fonts import.
- `public/textures/planets/hires/`: added Uranus, Neptune, Pluto, and Saturn ring texture assets.
- `public/textures/planets/ATTRIBUTION.md`: updated texture attribution.

**Remaining P3 Polish**
- Oort Cloud is intentionally compressed and stylized for visibility; a future true-scale mode could explain the enormous real distance.
- Pluto's source map includes real New Horizons coverage plus shader fill for unmapped regions; a future custom texture pass could create a more seamless full-surface educational map.

final result: passed

## 2026-06-11 Focus Stability, Pluto Map, And Celestial Grid QA

**Findings**
- No actionable P0/P1/P2 findings remain.

**Upgrade Target**
- Fix remaining full-focus flicker/black-screen perception.
- Replace Pluto's single-view image with a 2:1 sphere-friendly map texture.
- Add a clear `退出近景` button for stage-two close focus and stop using `Esc` for app exit.
- Recalibrate visual orbit spacing so Mercury no longer enters the Sun and the asteroid belt no longer collides with Mars/Jupiter.
- Add a toggleable celestial coordinate grid.

**Implementation Evidence**
- Desktop celestial grid: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-final-pass\desktop-grid-stable.png`
- Desktop Neptune full focus: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-final-pass\desktop-neptune-full-stable-0.png`
- Desktop Pluto with new map texture: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-final-pass\desktop-pluto-map-stable.png`
- Mobile close focus with exit button: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-final-pass\mobile-earth-full-exit-stable.png`

**Build And Runtime Checks**
- `npm run build`: passed.
- Browser path: Browser plugin not available; validated with Playwright Chromium.
- Desktop viewport: 1440 x 1024.
- Mobile viewport: 390 x 844.
- Failed requests: passed; no failed requests.
- Console health: passed; only screenshot-time WebGL `ReadPixels` performance warnings during Playwright capture.

**Interaction QA**
- Celestial grid toggle: passed; right-top grid button activates/deactivates the grid state.
- `Esc` key: passed; no longer changes app focus state.
- `退出近景`: passed; stage-two focus returns to stage-one focus while keeping the selected body.
- Pluto texture: passed; app loads `textures/planets/hires/pluto-color-mapmosaic.jpg`.

**Full-Focus Stability Checks**
- Removed postprocessing Bloom/EffectComposer to avoid render-target flicker during close focus.
- Full-focus camera now approaches the lit side of non-Sun bodies.
- Full-focus near/far clipping is adjusted dynamically to improve depth precision.
- Orbital paths and particle belts are hidden during stage-two close focus to reduce overdraw and z fighting.
- Neptune stage-two sampled 4 frames: non-black ratios `0.7103`, `0.6744`, `0.6686`, `0.6681`.

**Orbit Spacing Checks**
- Mercury/Sun visual clearance: `0.710`.
- Mars to asteroid belt clearance: `0.720`.
- Asteroid belt to Jupiter clearance: `0.820`.
- Asteroid belt visual span: `10.439` to `11.620`.

**Files Changed**
- `src/App.jsx`: removed `Esc` exit behavior, added close-focus exit state and celestial grid state.
- `src/components/TopControls.jsx`: added `退出近景` and celestial grid toggle controls.
- `src/components/SolarSystemScene.jsx`: added celestial coordinate grid, lit-side full-focus camera, dynamic clipping, hidden full-focus orbit context, and recalibrated asteroid/Kuiper belt spacing.
- `src/data/bodies.js`: recalibrated visual orbit radii/eccentricities and switched Pluto texture to the map mosaic.
- `src/styles.css`: styled the new controls and active grid state.
- `public/textures/planets/hires/pluto-color-mapmosaic.jpg`: added Pluto 2:1 map texture.
- `public/textures/planets/ATTRIBUTION.md`: updated Pluto attribution.

**Remaining P3 Polish**
- The celestial grid is intentionally subtle; a future pass could add optional RA/Dec labels if the interface needs educational annotation.

final result: passed

## 2026-06-11 Interaction And Light Cleanup QA

**Findings**
- No actionable P0/P1/P2 findings remain.

**Upgrade Target**
- Remove the distracting surface glow/halo from the Sun, Venus, Earth, Mars, Uranus, and Neptune.
- Add a Kuiper Belt particle band beyond Neptune and before the Oort Cloud.
- Remove the comet passes and their tail effects.
- Remove the detail panel return button; use `Esc` to exit to overview.
- Refine the right-half translucent detail panel frame.
- Stabilize second-click full-focus camera behavior to avoid black-screen flicker.
- Correct the asteroid belt so it reads as a centered belt between Mars and Jupiter.

**Implementation Evidence**
- Desktop initial view with clean Sun glow and Kuiper/Oort particles: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-fix-qa-final\desktop-initial-clean-sun.png`
- Desktop Earth full focus with reduced halo: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-fix-qa-final\desktop-earth-full-no-glow.png`
- Desktop Neptune full focus without black-screen flicker: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-fix-qa-final\desktop-neptune-full-no-flicker.png`
- Desktop Esc overview state: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-fix-qa-final\desktop-esc-overview-final.png`
- Mobile panel layout: `C:\Users\gyk11\AppData\Local\Temp\solar-system-atlas-fix-qa-final\mobile-panel-final.png`

**Build And Runtime Checks**
- `npm run build`: passed.
- Browser path: Browser plugin not available; validated with Playwright Chromium.
- Desktop viewport: 1440 x 1024.
- Mobile viewport: 390 x 844.
- Selector count: 10 selectable bodies.
- Return button DOM: absent.
- `Esc` key: passed; selected body exits to overview and the overview callout returns.
- Failed requests: passed; no failed requests.
- Console health: passed; only screenshot-time WebGL `ReadPixels` performance warnings during Playwright capture.

**Canvas Pixel Checks**
- `desktop-initial-clean-sun.png`: average luma `30.01`, non-black ratio `0.6078`.
- `desktop-earth-full-no-glow.png`: average luma `53.30`, non-black ratio `0.7335`.
- `desktop-neptune-full-no-flicker.png`: average luma `22.81`, non-black ratio `0.7005`.
- `mobile-panel-final.png`: average luma `21.33`, non-black ratio `0.5795`.

**Visual QA**
- Sun halo: passed; removed the large corona shell that created orange arcs across the view.
- Planet halo: passed; disabled extra atmosphere shells for the requested planets and reduced rim-light intensity.
- Kuiper Belt: passed; added a cold, faint outer particle belt beyond Neptune.
- Comets: passed; removed comet render passes and unused tail code.
- Asteroid Belt: passed; repositioned into a centered annular band between Mars and Jupiter.
- Detail panel: passed; right-half panel is more transparent, has finer glass borders/grid, and no return button overlap.
- Full focus: passed; Earth and Neptune second-click focus remain rendered and nonblank.

**Files Changed**
- `src/App.jsx`: added `Esc` exit behavior and removed panel return callback wiring.
- `src/components/BodyPanel.jsx`: removed return button and decorative close chrome.
- `src/components/SolarSystemScene.jsx`: removed comets/corona shell, added Kuiper Belt, revised asteroid belt, softened rim light, and adjusted full-focus camera clipping/distance.
- `src/data/bodies.js`: added atmosphere/rim configuration for affected planets.
- `src/styles.css`: refined the detail panel and removed old return-button styles.

**Remaining P3 Polish**
- Mobile first-focus composition is usable but visually darker after removing the large Sun corona; a future mobile camera pass could expose more of the selected body above the sheet.

final result: passed
