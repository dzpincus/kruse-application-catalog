<#
.SYNOPSIS
  Uploads per-project images to CatalogImages and patches ApplicationCatalog thumbnails.

.DESCRIPTION
  Walks $UploadDir for one subfolder per project, named by the human-friendly Slug from
  out/image-manifest.csv. For each folder:
    1. Resolves Slug -> ProjectKey via the manifest.
    2. Uploads each file (alphabetical order = render order) to the CatalogImages library,
       renamed {ProjectKey}-{NN}.{ext}. NN -> SortOrder (1 = cover).
    3. Sets ProjectKey / SortOrder / ImageUrl (absolute URL) / Caption metadata on each file.
    4. Patches the ApplicationCatalog row (matched by ProjectKey): Thumbnail = cover ImageUrl,
       HasLogo = Yes.

  Re-runnable: re-uploading the same filename overwrites in place (-Force). It does NOT delete
  images removed from a folder - clean those in the library by hand if a project's set shrinks.

.PARAMETER SiteUrl
  Target SharePoint site URL.

.PARAMETER UploadDir
  Local staging dir holding one subfolder per Slug. Defaults to ../../project-data/upload-images
  relative to this script.

.PARAMETER ManifestPath
  Path to image-manifest.csv. Defaults to ./out/image-manifest.csv relative to this script.

.PARAMETER ListName
  ApplicationCatalog main list. Default "ApplicationCatalog".

.PARAMETER LibraryName
  Image document library. Default "CatalogImages".

.EXAMPLE
  pwsh ./upload-catalog-images.ps1 -SiteUrl "https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [string]$UploadDir    = (Join-Path $PSScriptRoot "../../project-data/upload-images"),
  [string]$ManifestPath = (Join-Path $PSScriptRoot "out/image-manifest.csv"),
  [string]$ListName     = "ApplicationCatalog",
  [string]$LibraryName  = "CatalogImages"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ManifestPath)) { throw "Manifest not found at $ManifestPath. Run convert-to-sharepoint.js first." }
if (-not (Test-Path $UploadDir))    { throw "Upload dir not found at $UploadDir. Create it and add one subfolder per project slug." }

# --- Connect -----------------------------------------------------------------
Write-Host "Connecting to $SiteUrl ..."
Connect-PnPOnline -Url $SiteUrl -UseWebLogin

# Absolute URL base (scheme://host) for building ImageUrl from server-relative paths.
$web     = Get-PnPWeb
$rootUri = [Uri]$web.Url
$absBase = "$($rootUri.Scheme)://$($rootUri.Host)"

# Resolve main-list internal names by display name. CSV import auto-renames columns
# (e.g. ProjectKey -> field_0), so never assume internal == display on ApplicationCatalog.
# (The CatalogImages library columns ARE named literally, since provision sets InternalName.)
$catFields    = Get-PnPField -List $ListName
$pkField      = ($catFields | Where-Object { $_.Title -eq "ProjectKey" }).InternalName
$thumbField   = ($catFields | Where-Object { $_.Title -eq "Thumbnail" }).InternalName
$hasLogoField = ($catFields | Where-Object { $_.Title -eq "HasLogo" }).InternalName
if (-not $pkField)    { throw "No 'ProjectKey' column on '$ListName'." }
if (-not $thumbField) { throw "No 'Thumbnail' column on '$ListName'." }
Write-Host "Main-list field map: ProjectKey=$pkField Thumbnail=$thumbField HasLogo=$hasLogoField"

# --- Load manifest: Slug -> {ProjectKey, Title} ------------------------------
$manifest = Import-Csv $ManifestPath
$bySlug = @{}
foreach ($m in $manifest) { $bySlug[$m.Slug] = $m }
Write-Host "Loaded $($manifest.Count) manifest rows."

$imageExt = @(".png", ".jpg", ".jpeg", ".gif", ".webp")

# --- Walk slug folders -------------------------------------------------------
$folders = Get-ChildItem -Path $UploadDir -Directory | Sort-Object Name
if (-not $folders) { Write-Warning "No subfolders in $UploadDir. Nothing to upload."; return }

$patched = 0; $skipped = 0; $uploaded = 0
foreach ($folder in $folders) {
  $slug = $folder.Name
  $entry = $bySlug[$slug]
  if (-not $entry) {
    Write-Warning "[skip] folder '$slug' has no manifest match (check spelling against image-manifest.csv)."
    $skipped++
    continue
  }
  $pk = $entry.ProjectKey

  $files = Get-ChildItem -Path $folder.FullName -File |
    Where-Object { $imageExt -contains $_.Extension.ToLower() } |
    Sort-Object Name
  if (-not $files) { Write-Warning "[skip] '$slug' has no image files."; $skipped++; continue }

  Write-Host "`n$slug -> $pk  ($($files.Count) image(s))"
  $coverUrl = $null
  $idx = 0
  foreach ($file in $files) {
    $idx++
    $nn      = "{0:D2}" -f $idx
    $ext     = $file.Extension.ToLower()
    $target  = "$pk-$nn$ext"
    $upFile  = Add-PnPFile -Path $file.FullName -Folder $LibraryName -NewFileName $target
    $absUrl  = "$absBase$($upFile.ServerRelativeUrl)"
    if ($idx -eq 1) { $coverUrl = $absUrl }

    # PnP 1.12 doesn't hydrate ListItemAllFields on the returned file — load it explicitly.
    $imgItem = Get-PnPProperty -ClientObject $upFile -Property ListItemAllFields
    Set-PnPListItem -List $LibraryName -Identity $imgItem.Id -Values @{
      ProjectKey = $pk
      SortOrder  = $idx
      ImageUrl   = $absUrl
      Caption    = ""
    } | Out-Null
    $uploaded++
    Write-Host "  [ok]   $target  (SortOrder $idx)"
  }

  # --- Patch the main list row (match by ProjectKey) -------------------------
  $caml = "<View><Query><Where><Eq><FieldRef Name='$pkField'/><Value Type='Text'>$pk</Value></Eq></Where></Query><RowLimit>2</RowLimit></View>"
  $rows = Get-PnPListItem -List $ListName -Query $caml
  if (-not $rows) {
    Write-Warning "  no ApplicationCatalog row with ProjectKey=$pk - image uploaded but card not linked."
  } else {
    # Thumbnail is a Text column -> store the plain cover URL (not "url, description").
    $patch = @{ $thumbField = $coverUrl }
    if ($hasLogoField) { $patch[$hasLogoField] = $true }
    foreach ($r in $rows) {
      Set-PnPListItem -List $ListName -Identity $r.Id -Values $patch | Out-Null
    }
    $patched++
    Write-Host "  [ok]   patched ApplicationCatalog Thumbnail + HasLogo"
  }
}

Write-Host "`nDone. uploaded=$uploaded  projectsPatched=$patched  skipped=$skipped"
Write-Host "Verify: open $SiteUrl/$LibraryName and the ApplicationCatalog list."
