<#
.SYNOPSIS
  Builds out/image-manifest.csv from the live ApplicationCatalog SharePoint list.

.DESCRIPTION
  Use this instead of convert-to-sharepoint.js when the source Excel isn't available.
  Pulls ProjectKey + Title from the list, computes the same human-friendly Slug
  (kebab-cased Title; collisions get a 6-char ProjectKey suffix), and writes
  out/image-manifest.csv — the file upload-catalog-images.ps1 reads to resolve
  folder name (Slug) -> ProjectKey.

.PARAMETER SiteUrl
  Target SharePoint site URL.

.PARAMETER ListName
  Default "ApplicationCatalog".

.PARAMETER OutPath
  Output CSV. Default ./out/image-manifest.csv relative to this script.

.EXAMPLE
  pwsh ./generate-manifest-from-list.ps1 -SiteUrl "https://soco365.sharepoint.com/sites/DataAnalytics-KruseConsulting"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [string]$ListName = "ApplicationCatalog",
  [string]$OutPath  = (Join-Path $PSScriptRoot "out/image-manifest.csv")
)

$ErrorActionPreference = "Stop"

# Mirrors slugify() in convert-to-sharepoint.js — keep in sync if that changes.
function Get-Slug([string]$title) {
  if ([string]::IsNullOrWhiteSpace($title)) { return "untitled" }
  $s = $title.ToLower().Trim()
  $s = [regex]::Replace($s, '[^a-z0-9]+', '-')
  $s = $s.Trim('-')
  if ($s.Length -gt 60) { $s = $s.Substring(0, 60) }
  if ([string]::IsNullOrEmpty($s)) { $s = "untitled" }
  return $s
}

# CSV field escaper — mirrors the script's escape(): quote if it contains , " CR or LF.
function Out-CsvField([string]$v) {
  if ($null -eq $v) { $v = "" }
  if ($v -match '[",\r\n]') { return '"' + ($v -replace '"', '""') + '"' }
  return $v
}

Write-Host "Connecting to $SiteUrl ..."
Connect-PnPOnline -Url $SiteUrl -Interactive

Write-Host "Reading '$ListName' ..."
$items = Get-PnPListItem -List $ListName -Fields "Title", "ProjectKey" -PageSize 500

$rows = foreach ($it in $items) {
  $pk    = [string]$it.FieldValues.ProjectKey
  $title = [string]$it.FieldValues.Title
  if ([string]::IsNullOrWhiteSpace($pk)) {
    Write-Warning "Item id=$($it.Id) '$title' has blank ProjectKey — skipped."
    continue
  }
  [pscustomobject]@{ ProjectKey = $pk; Title = $title; Base = (Get-Slug $title) }
}

# De-dup base slugs: a base shared by >1 row gets a -{key6} suffix.
$counts = @{}
$rows | Group-Object Base | ForEach-Object { $counts[$_.Name] = $_.Count }

$lines = @("ProjectKey,Title,Slug")
foreach ($r in $rows) {
  $slug = if ($counts[$r.Base] -gt 1) { "$($r.Base)-$($r.ProjectKey.Substring(0, [Math]::Min(6, $r.ProjectKey.Length)))" } else { $r.Base }
  $lines += ("{0},{1},{2}" -f $r.ProjectKey, (Out-CsvField $r.Title), $slug)
}

$outDir = Split-Path $OutPath -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
Set-Content -Path $OutPath -Value $lines -Encoding UTF8

# Warn on any residual duplicate slugs (only possible when two rows share Title AND ProjectKey).
$slugVals = $lines | Select-Object -Skip 1 | ForEach-Object { ($_ -split ',')[-1] }
$dupe = $slugVals | Group-Object | Where-Object { $_.Count -gt 1 }

Write-Host "`nWrote $($rows.Count) rows -> $OutPath"
if ($dupe) {
  Write-Warning "$($dupe.Count) duplicate slug(s): $($dupe.Name -join ', ') (rows sharing Title+ProjectKey)."
}
Write-Host "Next: stage images in project-data/upload-images/{slug}/ then run upload-catalog-images.ps1"
