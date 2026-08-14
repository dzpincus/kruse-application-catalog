<#
.SYNOPSIS
  Normalizes CatalogImages.ImageUrl to the DIRECT file URL so the Power Apps
  Image control can render it.

.WHY
  Images added via SharePoint "Copy link" store a sharing URL
  (https://<host>/:i:/r/sites/.../file.png). The Power Apps Image control cannot
  render those - it needs the direct file URL
  (https://<host>/sites/.../CatalogImages/file.png). This script rebuilds ImageUrl
  from each file's actual ServerRelativeUrl, which is always the direct form.
  It also backfills a default SortOrder and warns on rows with a blank ProjectKey.

  Idempotent: rows already in direct form are rewritten to the identical value.

.EXAMPLE
  pwsh ./fix-catalog-image-urls.ps1 -SiteUrl "https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting"
#>
param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [string]$LibraryName = "CatalogImages",
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

Write-Host "Connecting to $SiteUrl ..."
Connect-PnPOnline -Url $SiteUrl -UseWebLogin

$web     = Get-PnPWeb
$rootUri = [Uri]$web.Url
$absBase = "$($rootUri.Scheme)://$($rootUri.Host)"

# Pull every item; need the File (for ServerRelativeUrl) + metadata fields.
$items = Get-PnPListItem -List $LibraryName -PageSize 500

$fixed = 0; $ok = 0; $noKey = 0
foreach ($it in $items) {
  $fileRef = $it.FieldValues["FileRef"]          # server-relative path of the file
  if (-not $fileRef) { continue }                # folders / non-file rows
  $name    = $it.FieldValues["FileLeafRef"]
  $want    = "$absBase$fileRef"                  # DIRECT url, always renderable
  $have    = $it.FieldValues["ImageUrl"]
  $sort    = $it.FieldValues["SortOrder"]
  $pk      = $it.FieldValues["ProjectKey"]

  if (-not $pk) { Write-Warning "  [no ProjectKey] $name - set it manually or the image won't link to a project."; $noKey++ }

  $patch = @{}
  if ($have -ne $want)        { $patch["ImageUrl"]  = $want }
  if ($null -eq $sort)        { $patch["SortOrder"] = 1 }     # default; adjust per project if multiple images

  if ($patch.Count -eq 0) { $ok++; continue }

  if ($WhatIf) {
    Write-Host "  [would fix] $name"
    if ($patch.ContainsKey("ImageUrl"))  { Write-Host "      ImageUrl : $have  ->  $want" }
    if ($patch.ContainsKey("SortOrder")) { Write-Host "      SortOrder: (blank) -> 1" }
  } else {
    Set-PnPListItem -List $LibraryName -Identity $it.Id -Values $patch | Out-Null
    Write-Host "  [fixed] $name"
  }
  $fixed++
}

Write-Host ""
Write-Host "Done. Fixed: $fixed  Already-ok: $ok  Blank-ProjectKey (needs manual fix): $noKey"
if ($WhatIf) { Write-Host "(WhatIf mode - no changes written. Re-run without -WhatIf to apply.)" }
Write-Host "Note: cards/detail read the in-memory colImages (built in App.OnStart), so reopen/replay the app after fixing."
