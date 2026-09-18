param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$Width = 1920,
  [int]$Height = 1080
)

$ErrorActionPreference = 'Stop'

$ppt = $null
$pres = $null

try {
  $ppt = New-Object -ComObject PowerPoint.Application
  # Open read-only and windowless. PowerPoint refuses to hide its main window
  # outright, so this is as unobtrusive as the automation interface allows.
  $pres = $ppt.Presentations.Open($InputPath, $true, $false, $false)
  $count = $pres.Slides.Count
  $pres.Export($OutDir, 'PNG', $Width, $Height)
  Write-Output "OK $count"
}
finally {
  if ($pres) {
    $pres.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
  }
  if ($ppt) {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
