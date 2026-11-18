# Deployment script for ROB RUN Character Scan (isolated Docker stack + Nginx vhost)
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root "secrets\deploy.env"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

$Target = $env:DEPLOY_TARGET
$Key = $env:DEPLOY_SSH_KEY
$Domain = if ($env:DEPLOY_DOMAIN) { $env:DEPLOY_DOMAIN } else { "mypartypancakes.ru" }
$Remote = "/opt/rob-run-scan"
$Incoming = "/tmp/rob-run-scan-incoming"

if (-not $Target) {
    throw "DEPLOY_TARGET is required (set in secrets\deploy.env, e.g. DEPLOY_TARGET=root@your-server-ip)."
}
if (-not $Key -or -not (Test-Path $Key)) {
    throw "DEPLOY_SSH_KEY is missing or file not found: $Key"
}

$Ssh = @(
    "-i", $Key,
    "-o", "IdentitiesOnly=yes",
    "-o", "StrictHostKeyChecking=accept-new"
)

function Invoke-Remote([string]$Cmd) {
    & ssh @Ssh $Target $Cmd
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $Cmd" }
}

$items = @(
    "lib",
    "public",
    "deploy",
    "server.js",
    "package.json",
    "package-lock.json",
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore"
)

foreach ($item in $items) {
    if (-not (Test-Path (Join-Path $Root $item))) {
        throw "Missing required project path: $item"
    }
}

Write-Host "1. Staging clean archive..."
$TarPath = Join-Path $env:TEMP "rob-run-scan-deploy.tar.gz"
if (Test-Path $TarPath) { Remove-Item -Force $TarPath }

Push-Location $Root
try {
    & tar -czf $TarPath @items
    if ($LASTEXITCODE -ne 0) { throw "tar archive failed" }
} finally {
    Pop-Location
}

Write-Host "2. Uploading bundle to $Target..."
Invoke-Remote "rm -rf $Incoming && mkdir -p $Incoming $Remote"
& scp @Ssh $TarPath "${Target}:${Incoming}/bundle.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }
Remove-Item -Force $TarPath -ErrorAction SilentlyContinue

Write-Host "3. Unpacking & running isolated remote setup..."
$Setup = @"
set -euo pipefail
Incoming=/tmp/rob-run-scan-incoming
Remote=/opt/rob-run-scan
rm -rf "`$Remote/app"
mkdir -p "`$Remote/app"
tar -xzf "`$Incoming/bundle.tar.gz" -C "`$Remote/app"
rm -rf "`$Incoming"
chmod 755 "`$Remote" "`$Remote/app"
sed -i 's/\r`$//' "`$Remote/app/deploy/"*.sh
chmod +x "`$Remote/app/deploy/"*.sh
DEPLOY_DOMAIN=$Domain bash "`$Remote/app/deploy/remote-setup.sh"
"@
$Setup = $Setup -replace "`r`n", "`n"
Invoke-Remote $Setup

Write-Host "Deployment completed cleanly for $Domain"
