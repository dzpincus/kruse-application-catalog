# Build Guide — In-App Edit / Add Project + Image Upload

Authoring path: **build everything by hand in Power Apps Studio.** The `.pa.yaml` source is an
**export-only snapshot** — packing hand-edited YAML back into an msapp (`pac canvas pack`) and importing
it is unproven for this app and not part of the working toolchain, so we do not rely on it. Studio is the
single source of truth for all five phases. After publishing, unpack to refresh the YAML snapshot and
commit (see "Snapshot to git").

All formulas below are meant to be typed into Studio directly. Do Phase 1 by hand first.

App: `SOCO - Kruse Deliverables`. Site: `https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting`.
Data sources already connected: `ApplicationCatalog` (list), `CatalogImages` (library).

> **Verified against the live 08/13 export.** All hook-point controls below exist, data sources are
> unchanged, and the app still makes zero SharePoint writes. Two things differ from an older snapshot and
> are already reflected in this guide: (1) **card thumbnails now come from `CatalogImages`, not `field_14`** —
> `App.OnStart` builds `colImages = CatalogImages` and `colThumbnails` (first image per `ProjectKey` by
> `SortOrder`), and `CardThumb.Image = LookUp(colThumbnails, ProjectKey = ThisItem.ProjectKey).ThumbUrl`.
> `'Thumbnail (field_14)'` now only feeds a card text-width calc, so **after an upload you must refresh
> `colImages` + `colThumbnails`** (Phase 4) or the card won't change. The detail gallery (`galLegend_1`)
> reads `CatalogImages` directly and refreshes on its own. (2) The screen also now has a `GalSummary` KPI
> strip and an image lightbox (`varLightboxOpen`) — unrelated, just don't collide with them when placing
> the Add button.

---

## Phase 1 — Foundation (do by hand in Studio)

In Studio, edit **App.OnStart** — add:
```
ClearCollect(colEditors,
    {Email: "dpincus95@gmail.com"}      // TODO: replace with real Kruse member @southernco.com accounts
);
Set(varCanEdit, Lower(User().Email) in colEditors.Email);
Set(varEditOpen, false);
Set(varEditMode, "");
```
> **Action required:** `User().Email` returns the signed-in **@southernco.com** account in the tenant, so
> the placeholder `dpincus95@gmail.com` will gate everyone out. Replace `colEditors` with the real Kruse
> members' org emails before go-live. (Better long term: `Office365Groups.CheckMemberByEmail(...)` against
> a security group — deferred, adds a connector.)

Two bug fixes on the detail-panel image gallery (select the control in Studio, set its `Visible`):
- **`galLegend_1`** `.Visible`: `varFiltersOpen` → `varPanelOpen` (copy-paste bug — gallery was tied to the filter rail).
- **`dtlImagesLabel`** `.Visible`: `varSelectedProject.Title = "3 Phase Critical Stock Dashboard"` → `varPanelOpen && !IsBlank(LookUp(colThumbnails, ProjectKey = varSelectedProject.ProjectKey).ThumbUrl)` (was hardcoded to one project). Test the in-memory `colThumbnails`, **not** `CatalogImages` — `CountRows`/`Filter` over the SharePoint connector throws a delegation warning; `colThumbnails` is a local collection (already built in `OnStart`, one row per project) so it's delegation-safe.

---

## Phase 2 — Edit existing project

### 2a. Edit overlay (mirror the detail overlay)
Add two controls at screen level, mirroring `pnlDetailOverlay` and `pnlScroll`:

- **`pnlEditOverlay`** — Rectangle, dim backdrop.
  - `Fill = RGBA(0,0,0,0.35)`, `Height = Parent.Height`, `Width = Parent.Width`
  - `Visible = varEditOpen`
  - `OnSelect = Set(varEditOpen, false)`
- **`pnlEditScroll`** — GroupContainer (Vertical AutoLayout), the form card.
  - `Visible = varEditOpen`, centered, `Width ≈ 560`, scrollable, white fill, padding 24.

### 2b. Form controls inside `pnlEditScroll`
Text inputs (Classic/TextInput): `txtTitle`, `txtTeamManager`, `txtTeamName`, `txtStakeholder`,
`txtLink`, `txtDescription` (multiline), `txtNotes` (multiline).

Dropdowns (Classic/DropDown) — bind Items to `Choices(...)` so `OpCo` (FillIn:false) can't get an invalid value:
| Control | Items |
|---|---|
| `ddEditCategory` | `Choices(ApplicationCatalog.Category)` |
| `ddEditFunction` | `Choices(ApplicationCatalog.Function)` |
| `ddEditStatus` | `Choices(ApplicationCatalog.Status)` |
| `ddEditOpCo` | `Choices(ApplicationCatalog.OpCo)` |
| `ddEditDepartment` | `Choices(ApplicationCatalog.Department)` |
| `ddEditValueCategory` | `Choices(ApplicationCatalog.ValueCategory)` |

Toggle: `tglShow` (label "Show in catalog").

### 2c. Seed the form (Edit button)
Add **`BtnEditProject`** in the detail overlay (near `dtlLinkBtn` / `pnlClose`):
- `Visible = varCanEdit && varPanelOpen`
- `OnSelect`:
```
Set(varEditMode, "edit");
Set(varEditKey, varSelectedProject.ProjectKey);
Reset(txtTitle); Reset(txtTeamManager); /* reset all inputs, or rely on Default */
Set(varEditOpen, true)
```
Bind each input's **Default** to the selected project (populates on open):
- `txtTitle.Default = varSelectedProject.Title`
- `txtTeamManager.Default = varSelectedProject.TeamManager` (same for TeamName/Stakeholder/Link/Description/Notes)
- `ddEditCategory.DefaultSelectedItems = Table({Value: varSelectedProject.Category.Value})`
  (same pattern for Function/Status/OpCo/Department/ValueCategory)
- `tglShow.Default = varSelectedProject.ShowInCatalog`

### 2d. Save (edit)
**`BtnSaveProject`**, `OnSelect` (edit branch):
```
Set(varEditResult,
    Patch(ApplicationCatalog,
        LookUp(ApplicationCatalog, ProjectKey = varEditKey),
        {
            Title:         txtTitle.Text,
            Category:      {Value: ddEditCategory.Selected.Value},
            Function:      {Value: ddEditFunction.Selected.Value},
            Status:        {Value: ddEditStatus.Selected.Value},
            OpCo:          {Value: ddEditOpCo.Selected.Value},
            Department:    {Value: ddEditDepartment.Selected.Value},
            ValueCategory: {Value: ddEditValueCategory.Selected.Value},
            TeamManager:   txtTeamManager.Text,
            TeamName:      txtTeamName.Text,
            Stakeholder:   txtStakeholder.Text,
            Link:          txtLink.Text,
            Description:   txtDescription.Text,
            Notes:         txtNotes.Text,
            ShowInCatalog: tglShow.Value
        }
    )
);
Set(varSelectedProject, varEditResult);   // re-bind detail overlay to fresh data
Set(varEditOpen, false)
```
**`BtnCancelEdit`**: `Set(varEditOpen, false)`.

---

## Phase 3 — Add new project

**`BtnAddProject`** in `HeaderBar` (after `BtnFiltersToggle`), `Visible = varCanEdit`, `OnSelect`:
```
Set(varEditMode, "add");
Set(varEditKey, "PRJ-" & Upper(Mid(Text(GUID()), 1, 8)));   // unique, <=16 chars
Reset(txtTitle); Reset(txtTeamManager); /* reset every input + dropdown */
Set(varEditOpen, true)
```
Save button must branch on `varEditMode`. Add branch:
```
Set(varEditResult,
    Patch(ApplicationCatalog, Defaults(ApplicationCatalog),
        {
            Title:         txtTitle.Text,
            ProjectKey:    varEditKey,
            Category:      {Value: ddEditCategory.Selected.Value},
            Function:      {Value: ddEditFunction.Selected.Value},
            Status:        {Value: ddEditStatus.Selected.Value},
            OpCo:          {Value: ddEditOpCo.Selected.Value},
            Department:    {Value: ddEditDepartment.Selected.Value},
            ValueCategory: {Value: ddEditValueCategory.Selected.Value},
            TeamManager:   txtTeamManager.Text,
            TeamName:      txtTeamName.Text,
            Stakeholder:   txtStakeholder.Text,
            Link:          txtLink.Text,
            Description:   txtDescription.Text,
            Notes:         txtNotes.Text,
            ShowInCatalog: tglShow.Value,
            HasLogo:       false,
            'Thumbnail (field_14)': ""
        }
    )
)
```
Full Save `OnSelect` = `If(varEditMode = "add", <add Patch>, <edit Patch>)` then image upload (Phase 4)
then `Set(varEditOpen, false)`.

> `'Thumbnail (field_14)'` is written as plain text. If the first write errors, the live column is a
> Hyperlink type — switch that one field to `{Value: <url>}`.

---

## Phase 4 — Image upload

### 4a. Flow `KruseUploadCatalogImage` (Power Automate)
1. **Trigger** — *PowerApps (V2)*. Text inputs: `ProjectKey`, `FileName`, `SortOrder`, `FileContentBase64`.
2. **Compose `CleanBase64`** — strip the data-URI prefix:
   `last(split(triggerBody()['text_3'], ','))`  *(map to the FileContentBase64 input)*
3. **Create file** — SharePoint, site `DataAnalytics-KruseConsulting`, folder `CatalogImages`,
   File Name `@{triggerBody()['text']}-@{formatNumber(int(triggerBody()['number']), '00')}.png`,
   File Content `@{base64ToBinary(outputs('CleanBase64'))}`.
4. **Compose `AbsoluteUrl`** — `concat('https://soco365.sharepoint.com', body('Create_file')?['Path'])`.
5. **Update file properties** — on the created item: `ProjectKey`, `SortOrder`, `Title` = FileName,
   `ImageUrl` = `outputs('AbsoluteUrl')`.
6. **Respond to PowerApps** — output `absoluteUrl` = `outputs('AbsoluteUrl')`.

### 4b. In the app
Add **`imgUpload`** (Add picture control) inside `pnlEditScroll`, plus an image preview
(`imgPreview.Image = imgUpload.Image`).

Single cover image (append to Save `OnSelect`, after the field Patch):
```
If(!IsBlank(imgUpload.Image),
    Set(varUp,
        KruseUploadCatalogImage.Run(
            varEditKey,
            "cover.png",
            "1",
            Substitute(JSON(imgUpload.Image, JSONFormat.IncludeBinaryData), """", "")
        )
    );
    // field_14 no longer drives the card image, but keep it in sync for HasLogo + the card width calc + desktop-pipeline parity
    Patch(ApplicationCatalog,
        LookUp(ApplicationCatalog, ProjectKey = varEditKey),
        { 'Thumbnail (field_14)': varUp.absoluteurl, HasLogo: true }
    );
    // REQUIRED: refresh the in-memory image collections so CardThumb + GalSummary reflect the new image
    ClearCollect(colImages, CatalogImages);
    ClearCollect(colThumbnails,
        AddColumns(
            GroupBy(colImages, ProjectKey, grpImages),
            ThumbUrl,
            First(Sort(grpImages, SortOrder, SortOrder.Ascending)).ImageUrl
        )
    )
);
```
> The `colImages`/`colThumbnails` rebuild is copied verbatim from `App.OnStart` — keep them identical so the
> card thumbnail matches what a fresh app load would show. Without this refresh the file lands in
> `CatalogImages` but the card keeps showing the old (or no) thumbnail until the app is reopened.

Multi-image (stage into `colPendingImages` as the user picks, then `ForAll` on Save, then the same refresh):
```
ForAll(
    Sequence(CountRows(colPendingImages)) As Idx,
    KruseUploadCatalogImage.Run(
        varEditKey,
        "img.png",
        Text(Idx.Value),
        Substitute(JSON(Index(colPendingImages, Idx.Value).Image, JSONFormat.IncludeBinaryData), """", "")
    )
);
// then the SAME ClearCollect(colImages...) + ClearCollect(colThumbnails...) refresh as above
```

> **Payload limit:** the base64 flow argument is reliable only to ~1–2 MB. Constrain `imgUpload`
> (`MaxImageWidth`/`MaxImageHeight`) to downscale, and block Save on oversize images.

---

## Phase 5 — Hardening

- **Validation:** `BtnSaveProject.DisplayMode = If(!IsBlank(txtTitle.Text) && !IsBlank(ddEditCategory.Selected.Value) && !IsBlank(ddEditStatus.Selected.Value), DisplayMode.Edit, DisplayMode.Disabled)`. Show inline error labels.
- **Oversize image guard** before calling the flow.
- **SharePoint versioning** on `ApplicationCatalog` + `CatalogImages` (per-field history + restore).
- **Permissions:** scope list/library write access to the Kruse members' security group. `varCanEdit` is UX only.
- **Soft delete:** "Remove from catalog" = set `ShowInCatalog = false` (reversible; already filtered by `galProjects.Items`). No hard delete.

---

## Snapshot to git (export only)

After building + publishing in Studio, export a fresh msapp and unpack it as a **read-only snapshot** for
version history. Do **not** edit the YAML and pack it back — that path is untested for this app.

```
# export latest.msapp from Studio (File > Save as > This computer), then unpack it however you did before
git add .msapp_unpacked latest.msapp docs/ && git commit -m "Add in-app edit/add project + image upload"
```
The YAML diff is a record of what Studio produced, not a source you build from.

## Verification

1. Allowlisted user **adds** a project → new `ApplicationCatalog` row + card in `galProjects`.
2. **Edit** a project (Status/Description) → detail overlay + SharePoint row both update.
3. **Upload** 2 images → 2 files in `CatalogImages` with correct `ProjectKey`/`SortOrder`, `Thumbnail` = cover URL, `HasLogo = true`, `CardThumb` + detail gallery render them.
4. Non-allowlisted user → Add/Edit buttons hidden.

## Open items

- Real `colEditors` @southernco.com emails + the security group for permission scoping.
- Confirm live `Thumbnail` column type (plain text vs Hyperlink) on first write.
