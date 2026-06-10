# Image staging

Local drop zone for project images before upload to the `CatalogImages` SharePoint library.

## How to add images for a project

1. Open `kruse-application-catalog/scripts/out/image-manifest.csv`. Find the project's row;
   note its **Slug** (the kebab-case column).
2. Make a subfolder here named exactly that slug, e.g. `3-phase-critical-stock-dashboard/`.
3. Drop the project's full-resolution images into that folder. **Alphabetical filename order =
   render order** — the first file becomes the card thumbnail (cover). Name them `01.png`,
   `02.png`, … to control order explicitly.
4. From `kruse-application-catalog/scripts/`, run:
   ```
   pwsh ./upload-catalog-images.ps1 -SiteUrl "https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting"
   ```

The script renames files to `{ProjectKey}-{NN}.{ext}` on upload, sets metadata, and patches the
`ApplicationCatalog` row's `Thumbnail` + `HasLogo`. Re-running overwrites same-named files.

## Notes
- Use PNG or high-quality JPG; source at least 2× the on-screen display size to stay sharp.
- A project with no folder here simply renders the OpCo fallback icon — no error.
- One-off folder per project; you don't need all 208 at once. Fill them in over time.
