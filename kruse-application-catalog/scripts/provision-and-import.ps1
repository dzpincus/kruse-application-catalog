<#
.SYNOPSIS
  Provisions the ApplicationCatalog SharePoint list and imports rows from projects.csv.

.DESCRIPTION
  Reads schema.json (column types + seeded choices) and projects.csv (208 rows).
  Idempotent for columns: skips existing columns rather than erroring.
  NOT idempotent for items: re-running will create duplicates. Clear the list first.

.PARAMETER SiteUrl
  Target SharePoint site URL, e.g. https://soco365.sharepoint.com/sites/MyTeam

.PARAMETER ListName
  Defaults to "ApplicationCatalog". Override only if you must.

.PARAMETER OutDir
  Path to the script output dir. Defaults to "./out" relative to this script.

.PARAMETER ColumnsOnly
  Skip data import; only create columns + index + view.

.PARAMETER DataOnly
  Skip column creation; only import rows. Assumes columns already exist.

.EXAMPLE
  pwsh ./provision-and-import.ps1 -SiteUrl "https://soco365.sharepoint.com/sites/MyTeam"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [string]$ListName = "ApplicationCatalog",
  [string]$OutDir   = (Join-Path $PSScriptRoot "out"),
  [switch]$ColumnsOnly,
  [switch]$DataOnly
)

$ErrorActionPreference = "Stop"

# --- Connect -----------------------------------------------------------------
Write-Host "Connecting to $SiteUrl ..."
Connect-PnPOnline -Url $SiteUrl -Interactive

# --- Ensure list exists ------------------------------------------------------
$list = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
if (-not $list) {
  Write-Host "Creating list '$ListName' ..."
  $list = New-PnPList -Title $ListName -Template GenericList -Url "Lists/$ListName"
} else {
  Write-Host "List '$ListName' already exists."
}

# --- Load artifacts ----------------------------------------------------------
$schemaPath = Join-Path $OutDir "schema.json"
$csvPath    = Join-Path $OutDir "projects.csv"
if (-not (Test-Path $schemaPath)) { throw "schema.json not found at $schemaPath. Run convert-to-sharepoint.js first." }
if (-not (Test-Path $csvPath))    { throw "projects.csv not found at $csvPath." }
$schema = Get-Content $schemaPath -Raw | ConvertFrom-Json

# --- Column definitions ------------------------------------------------------
# Order matches grid-view display order; ProjectKey first.
$columns = @(
  @{ Name="ProjectKey";    Type="Text";    MaxLength=16 },
  @{ Name="Category";      Type="Choice";  Choices=$schema.Category.choices;      FillIn=$true },
  @{ Name="TeamManager";   Type="Text" },
  @{ Name="Function";      Type="Choice";  Choices=$schema.Function.choices;      FillIn=$true },
  @{ Name="Stakeholder";   Type="Text" },
  @{ Name="Department";    Type="Text" },
  @{ Name="Status";        Type="Choice";  Choices=$schema.Status.choices;        FillIn=$true },
  @{ Name="OpCo";          Type="Choice";  Choices=$schema.OpCo.choices;          FillIn=$false },
  @{ Name="TeamName";      Type="Text" },
  @{ Name="ValueCategory"; Type="Choice";  Choices=$schema.ValueCategory.choices; FillIn=$true },
  @{ Name="Link";          Type="Note" },  # multi-line plain text (no 255 cap)
  @{ Name="Description";   Type="Note" },
  @{ Name="Notes";         Type="Note" },
  @{ Name="Thumbnail";     Type="URL" },
  @{ Name="HasLogo";       Type="Boolean"; Default="0" },
  @{ Name="ShowInCatalog"; Type="Boolean"; Default="1" }
)

# --- Create columns ----------------------------------------------------------
if (-not $DataOnly) {
  Write-Host "`nProvisioning columns ..."
  foreach ($col in $columns) {
    $existing = Get-PnPField -List $ListName -Identity $col.Name -ErrorAction SilentlyContinue
    if ($existing) {
      Write-Host "  [skip] $($col.Name) already exists"
      continue
    }
    switch ($col.Type) {
      "Text" {
        $f = Add-PnPField -List $ListName -DisplayName $col.Name -InternalName $col.Name -Type Text -AddToDefaultView
      }
      "Note" {
        # Note = multi-line plain text. RichText off via Set-PnPField afterwards.
        $f = Add-PnPField -List $ListName -DisplayName $col.Name -InternalName $col.Name -Type Note -AddToDefaultView
        Set-PnPField -List $ListName -Identity $col.Name -Values @{ RichText = $false } | Out-Null
      }
      "Choice" {
        $f = Add-PnPField -List $ListName -DisplayName $col.Name -InternalName $col.Name -Type Choice -Choices $col.Choices -AddToDefaultView
        Set-PnPField -List $ListName -Identity $col.Name -Values @{ FillInChoice = [bool]$col.FillIn } | Out-Null
      }
      "URL" {
        $f = Add-PnPField -List $ListName -DisplayName $col.Name -InternalName $col.Name -Type URL -AddToDefaultView
      }
      "Boolean" {
        $f = Add-PnPField -List $ListName -DisplayName $col.Name -InternalName $col.Name -Type Boolean -AddToDefaultView
        Set-PnPField -List $ListName -Identity $col.Name -Values @{ DefaultValue = $col.Default } | Out-Null
      }
    }
    Write-Host "  [ok]   $($col.Name) ($($col.Type))"
  }

  # Index ProjectKey for fast LookUp
  Write-Host "`nIndexing ProjectKey ..."
  Set-PnPField -List $ListName -Identity "ProjectKey" -Values @{ Indexed = $true } | Out-Null
  Write-Host "  [ok]   ProjectKey indexed"

  # Default view item limit
  Write-Host "`nUpdating default view limit ..."
  $view = Get-PnPView -List $ListName -Identity "All Items" -ErrorAction SilentlyContinue
  if ($view) {
    Set-PnPView -List $ListName -Identity $view.Id -Values @{ RowLimit = 500 } | Out-Null
    Write-Host "  [ok]   item limit -> 500"
  }
}

# --- Import rows -------------------------------------------------------------
if (-not $ColumnsOnly) {
  Write-Host "`nImporting rows from $csvPath ..."
  $rows = Import-Csv $csvPath
  $i = 0
  foreach ($r in $rows) {
    $i++
    $values = @{
      Title         = $r.Title
      ProjectKey    = $r.ProjectKey
      Category      = $r.Category
      TeamManager   = $r.TeamManager
      Function      = $r.Function
      Stakeholder   = $r.Stakeholder
      Department    = $r.Department
      Status        = $r.Status
      OpCo          = $r.OpCo
      TeamName      = $r.TeamName
      ValueCategory = $r.ValueCategory
      Link          = $r.Link
      Description   = $r.Description
      Notes         = $r.Notes
      Thumbnail     = $r.Thumbnail
      HasLogo       = if ($r.HasLogo -eq "Yes") { $true } else { $false }
      ShowInCatalog = if ($r.ShowInCatalog -eq "Yes") { $true } else { $false }
    }
    # Strip empty strings for Choice columns so they don't fail validation
    foreach ($k in @("Category","Function","Status","OpCo","ValueCategory")) {
      if ([string]::IsNullOrWhiteSpace($values[$k])) { $values.Remove($k) | Out-Null }
    }
    try {
      Add-PnPListItem -List $ListName -Values $values | Out-Null
      if ($i % 25 -eq 0) { Write-Host "  $i / $($rows.Count) ..." }
    } catch {
      Write-Warning "Row $i ($($r.Title)) failed: $($_.Exception.Message)"
    }
  }
  Write-Host "Done: $i items processed."
}

Write-Host "`nFinished. Verify in browser: $SiteUrl/Lists/$ListName"
