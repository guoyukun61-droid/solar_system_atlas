# Solaris Atlas

Solaris Atlas is a cinematic 3D solar system atlas built with React, Vite, Three.js, and React Three Fiber.

## Features

- Full-screen interactive 3D solar system.
- Sun, eight planets, Pluto, asteroid belt, Kuiper Belt, and Oort Cloud.
- Two-stage body focus: click once for a close detail view, click again for a full close-up.
- Chinese detail panel with physical data and educational descriptions.
- Toggleable celestial coordinate grid.
- Mobile-friendly bottom-sheet layout.
- High-resolution planet textures with attribution in `public/textures/planets/ATTRIBUTION.md`.

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` or the port Vite prints in the terminal.

## Build

```bash
npm run build
npm run preview
```

## Project Notes

- Visual scale is intentionally stylized for cinematic readability; distances and sizes are not rendered at true astronomical scale.
- Scientific data in the UI uses common approximate values.
- QA notes and screenshot references are tracked in `design-qa.md`.

## Attribution

Texture credits are listed in `public/textures/planets/ATTRIBUTION.md`.
