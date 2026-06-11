<#
.SYNOPSIS
  Provisions the CatalogImages document library that backs project thumbnails/detail images.

.DESCRIPTION
  Creates the "CatalogImages" document library (if absent) and adds the metadata columns the
  upload script writes: ProjectKey (indexed, links to ApplicationCatalog), SortOrder (render
  order, 1 = cover), ImageUrl (absolute file URL), Caption (optional).
  Idempotent: skips the library and any column that already exists.

.PARAMETER SiteUrl
  Target SharePoint site URL, e.g. https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting

.PARAMETER LibraryName
  Defaults to "CatalogImages". Override only if you must (must match upload-catalog-images.ps1).

.EXAMPLE
  pwsh ./provision-catalog-images.ps1 -SiteUrl "https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [string]$LibraryName = "CatalogImages"
)

$ErrorActionPreference = "Stop"

Write-Host "Connecting to $SiteUrl ..."
Connect-PnPOnline -Url $SiteUrl -UseWebLogin

# --- Ensure document library exists ------------------------------------------
$lib = Get-PnPList -Identity $LibraryName -ErrorAction SilentlyContinue
if (-not $lib) {
  Write-Host "Creating document library '$LibraryName' ..."
  $lib = New-PnPList -Title $LibraryName -Template DocumentLibrary -Url "$LibraryName"
} else {
  Write-Host "Library '$LibraryName' already exists."
}

# --- Metadata columns --------------------------------------------------------
$columns = @(
  @{ Name="ProjectKey"; Type="Text";   Indexed=$true  },
  @{ Name="SortOrder";  Type="Number"; Indexed=$false },
  @{ Name="ImageUrl";   Type="Text";   Indexed=$false },
  @{ Name="Caption";    Type="Text";   Indexed=$false }
)

Write-Host "`nProvisioning columns ..."
foreach ($col in $columns) {
  $existing = Get-PnPField -List $LibraryName -Identity $col.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "  [skip] $($col.Name) already exists"
  } else {
    Add-PnPField -List $LibraryName -DisplayName $col.Name -InternalName $col.Name -Type $col.Type -AddToDefaultView | Out-Null
    Write-Host "  [ok]   $($col.Name) ($($col.Type))"
  }
  if ($col.Indexed) {
    Set-PnPField -List $LibraryName -Identity $col.Name -Values @{ Indexed = $true } | Out-Null
    Write-Host "         indexed"
  }
}

Write-Host "`nFinished. Verify in browser: $SiteUrl/$LibraryName"
Write-Host "Next: pwsh ./upload-catalog-images.ps1 -SiteUrl `"$SiteUrl`""
