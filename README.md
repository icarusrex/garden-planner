# Plotline — Garden & Property Planner

A static, browser-only property and garden planning web app designed around a simple workflow: start from satellite imagery or a screenshot/site plan, draw to scale, then place planting areas and landscape elements.

## Current MVP

- Satellite property planning with Mapbox Standard Satellite
- Optional uploaded screenshot / aerial image / site plan workflow
- Image calibration from any known real-world distance
- Property boundary polygons with area + perimeter
- Planting-bed polygons with area + perimeter
- Paths with measured centerline length and configurable width
- Pergolas with explicit width/depth and editable sizing
- Trees with configurable canopy diameter
- Rename, select, edit, move (satellite-drawn geometry), and delete objects
- Imperial or metric units
- Browser autosave
- JSON export + import backup
- AI-visualization prompt builder based on the measured plan
- Responsive desktop/mobile layout

## Why the AI visualization is prompt-based in this version

The planner itself is static and has no backend. Putting an OpenAI or other image-generation secret key directly in browser JavaScript would expose that key publicly. The MVP therefore keeps measured geometry authoritative and generates a structured visualization prompt that can be paired with a property screenshot. A later serverless function can connect the same button directly to an image-generation API without changing the core plan model.

## Satellite imagery

Satellite mode uses Mapbox Standard Satellite and therefore requires a **public Mapbox token** (`pk...`). The app asks for it the first time satellite mode is opened and stores it only in that browser's localStorage.

If you do not want a Mapbox account, the entire planner still works in **Upload image** mode with a satellite screenshot, survey, drone image, or site plan.

## Deploy from GitHub

This app deliberately has **no build step**. The repository root can be published directly.

### GitHub Pages

1. Create a GitHub repository.
2. Upload every file in this folder so `index.html` is at the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.
6. After GitHub publishes the site, add your own domain under **Custom domain**.
7. Follow GitHub's DNS instructions at your domain provider and enable **Enforce HTTPS** once available.

The included `.nojekyll` file keeps GitHub Pages from applying Jekyll processing.

### Vercel / Cloudflare Pages / Netlify

You can also connect the same GitHub repository to any of these hosts. There is no framework preset or build command required; publish the repository root.

## Backups

The plan autosaves in browser localStorage. Use **Export plan** to download a JSON backup before switching browsers/devices. **Import** restores the JSON plan. Uploaded image data is also included in exported backups, so those files can be large.

## Known MVP limits

- Satellite mode requires a Mapbox public token.
- Tree canopy is measured but represented as a fixed map marker in satellite mode; uploaded-image mode draws the canopy to scale.
- Pergolas are axis-aligned north/south when first placed in satellite mode; arbitrary rotation is a next-step feature.
- No user accounts/cloud database yet.
- AI images are not generated directly yet because the static app intentionally contains no secret API key.

## Logical next features

1. Pergola/bed rotation handles
2. Curved paths and path material presets
3. Sun/shade analysis
4. Plant library and mature spacing
5. Irrigation zones
6. Multiple saved designs/scenarios
7. Serverless AI image generation
8. Optional accounts + cloud sync
