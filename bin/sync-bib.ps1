# sync-bib.ps1 — Inline lihui.bib into tabs/publications.html.
#
# Why: when the page is opened via file:// (no HTTP server), fetch() is blocked
# by the browser, so the publications iframe can't load lihui.bib directly.
# As a fallback, publications.html embeds a <script type="text/x-bib" id="bib-source">
# block containing the latest bib text. This script keeps that block in sync
# with lihui.bib.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File bin\sync-bib.ps1          # sync
#   powershell -ExecutionPolicy Bypass -File bin\sync-bib.ps1 -Check   # check-only
#
# Equivalent Python: bin/sync-bib.py

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$bib  = Join-Path $root 'lihui.bib'
$pub  = Join-Path $root 'tabs\publications.html'

if (-not (Test-Path $bib)) { Write-Error "lihui.bib not found at $bib"; exit 1 }
if (-not (Test-Path $pub)) { Write-Error "tabs/publications.html not found at $pub"; exit 1 }

$bibText = Get-Content $bib -Raw -Encoding UTF8
$bibSafe = $bibText -replace '</script>', '<\\/script>'

$pubText = Get-Content $pub -Raw -Encoding UTF8
$markerStart = '<script type="text/x-bib" id="bib-source">'
$markerEnd   = '</script>'

$startIdx = $pubText.IndexOf($markerStart)
if ($startIdx -lt 0) { Write-Error "marker <script type='text/x-bib'> not found"; exit 1 }
$contentStart = $startIdx + $markerStart.Length
$endIdx = $pubText.IndexOf($markerEnd, $contentStart)
if ($endIdx -lt 0) { Write-Error "closing </script> after bib marker not found"; exit 1 }

$before = $pubText.Substring(0, $contentStart)
$after  = $pubText.Substring($endIdx)
$newPub = $before + "`n" + $bibSafe + "`n    " + $after

if ($Check) {
    if ($newPub -eq $pubText) {
        Write-Output "ok: tabs/publications.html is in sync with lihui.bib"
        exit 0
    } else {
        Write-Output "STALE: tabs/publications.html is out of sync with lihui.bib"
        Write-Output "       run: powershell -ExecutionPolicy Bypass -File bin\sync-bib.ps1"
        exit 1
    }
}

Set-Content -Path $pub -Value $newPub -Encoding UTF8 -NoNewline
Write-Output "synced lihui.bib -> tabs/publications.html"
Write-Output ("  bib size:  {0:N0} bytes" -f $bibText.Length)
Write-Output ("  pub size:  {0:N0} bytes (was {1:N0})" -f $newPub.Length, $pubText.Length)
