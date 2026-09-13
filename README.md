# Plotline — Garden & Property Planner

## Garden studio

Crop, herb, and berry palette entries draw planted polygon beds, with editable
crop and spacing. Trees remain individual objects; grapes follow a drawn row.
Bed patterns are clipped to the outline and use a capped representative density
for large areas. The plan remains one editable bed, not hundreds of objects.
Planting rows automatically follow the bed's longest edge and can be rotated
independently in 15-degree steps without changing the bed boundary or its area.

The crop library includes spinach, beetroot, Portuguese tall kale (Couve Galega),
tomatoes, basil, sweet and chilli peppers, peas, cucumbers, climbing beans,
courgettes, squash, potatoes, autumn greens, sweet potatoes, favas, dry beans,
and chickpeas. Tall brassicas and climbing crops use distinct 2D and 3D forms.

Every movable object in the measured 2D design supports a rotation angle and a
90-degree turn. Bed-outline rotation preserves area, while the planting row
angle is controlled independently. Once created, the garden boundary is a
locked ground layer; retrace it
to replace it instead of moving it accidentally.
Paths default to 0.5 m, retain their physical width when changing units, and
render below beds, plants, and structures regardless of creation order.

The garden palette includes a hoop greenhouse and a pirate ship playground.
The 3D view includes hoop ribs and doors, a ship hull/deck/railings/mast/sail,
planted beds, directional foliage shading, soil texture, automatic framing to
the actual garden boundary, and persistent bed-name labels.

The local studio now opens in a clean illustrated 2D plan. `studio.css` and
`studio.js` extend the original planner; publish these alongside `index.html`.

- Start with garden dimensions in meters, an uploaded calibrated image, or a
  boundary traced on the satellite map. **Use traced area in design** converts
  satellite coordinates to a local metric plan. The satellite source is retained
  separately, so later design edits do not modify the original tracing.
- Select and drag plants, beds, paths, and pergolas. Arrow keys move the selected
  object by 10 cm; Shift moves it by one meter. Duplicate and undo/redo are available.
- The categorized plant library includes orchard trees, grape rows, berries,
  herbs, and common vegetable crops. The 2D footprint represents mature spread;
  grape rows are drawn as measured multi-point lines.
- Plant forms are species-aware in both views. Avocado trees have a broad,
  layered evergreen crown, visible branching, and subtle fruit details rather
  than reusing the generic round-tree model.
- A five-stage rotation reminder is built into the crop library: potato, dry
  bean, sweet potato, fava or chickpea, then potato again.
- Irrigation is an independent visibility layer. Draw editable multi-point drip,
  supply, or sprinkler routes and inspect the same network in 2D and 3D.
- Measured garden objects include compost bins, water butts, tool sheds,
  greenhouses, cold frames, and benches, each with a distinct plan and 3D form.
- **3D garden** shows the same plan geometry in an orthographic scene. Drag to
  orbit and scroll to zoom. Edit objects in 2D. Heights can be set individually in
  meters; defaults are illustrative, not measurements inferred from imagery.
- **Explore a sample garden** loads a 20 x 15 meter example. Replacing a design
  through the studio can be undone until the page reloads.
- Complete designs, including their reference images, save in this browser.
  Export JSON for a portable backup. Storage capacity is browser-dependent.

This version reconstructs a clean visual from explicit geometry. It does not
automatically recognize boundaries, terrain elevation, buildings, or plants in
satellite photographs. Image calibration and source imagery limit accuracy.
The 3D renderer uses flat terrain and stylized plant forms. For garden-scale
satellite conversion it uses a local equirectangular projection.

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

The public app is served by the `garden-planner-viz` Cloudflare Worker at
`https://garden.viableplanet.eu/`. Its source is kept in
`cloudflare-worker.js`. It serves the latest files from `main` with a short
cache and removes GitHub Raw response headers that would block browser scripts.

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
- Satellite geometry must be converted to the measured design before arbitrary rotation.
- No user accounts/cloud database yet.
- AI images are not generated directly yet because the static app intentionally contains no secret API key.

## Logical next features

1. Direct rotation handles
2. Curved paths and path material presets
3. Sun/shade analysis
4. Plant library and mature spacing
5. Irrigation zones
6. Multiple saved designs/scenarios
7. Serverless AI image generation
8. Optional accounts + cloud sync
