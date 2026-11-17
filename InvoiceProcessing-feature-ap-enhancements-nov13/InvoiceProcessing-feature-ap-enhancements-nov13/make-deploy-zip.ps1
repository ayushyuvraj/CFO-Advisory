# Builds fcc-deploy.zip (next to this project folder) for upload to Cloud Shell.
# Includes app/ and backend/ and DEPLOY.md; leaves out node_modules, .venv, .env,
# local data, builds and tests. The two cloudrun-*.env.yaml files ARE included —
# gcloud reads them in Cloud Shell (they are never uploaded to Cloud Build).
#
#   powershell -ExecutionPolicy Bypass -File make-deploy-zip.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = $PSScriptRoot
$zip = Join-Path (Split-Path $root -Parent) 'fcc-deploy.zip'
# Skipped anywhere in the tree.
$skipDirs = @('node_modules', 'dist', '.venv', '__pycache__', '.pytest_cache', '.vite', '.git')
# Skipped only at these exact places — app/src/data is source code and must ship.
$skipPaths = @('backend/data', 'backend/samples', 'backend/tests','backend/test_emails','backend/email_attachments')
$skipFiles = @('.env', 'tsconfig.tsbuildinfo')

if (Test-Path $zip) { Remove-Item $zip -Force }
$archive = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
$count = 0
try {
    foreach ($part in @('app', 'backend', 'DEPLOY.md')) {
        $path = Join-Path $root $part
        $files = if (Test-Path $path -PathType Leaf) { @(Get-Item $path) } else { Get-ChildItem $path -Recurse -File -Force }
        foreach ($f in $files) {
            $rel = $f.FullName.Substring($root.Length + 1)
            $parts = $rel -split '[\\/]'
            if ($parts | Where-Object { $skipDirs -contains $_ -or $_ -like '.venv*' }) { continue }
            $relPath = $parts -join '/'
            if ($skipPaths | Where-Object { $relPath -like "$_/*" }) { continue }
            if ($skipFiles -contains $f.Name -or $f.Extension -eq '.pyc') { continue }
            $entry = 'finance-command-center/' + ($parts -join '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, $entry) | Out-Null
            $count++
        }
    }
} finally {
    $archive.Dispose()
}
"{0} files -> {1} ({2:N1} MB)" -f $count, $zip, ((Get-Item $zip).Length / 1MB)
