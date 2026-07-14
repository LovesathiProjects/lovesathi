[CmdletBinding()]
param(
    [ValidateSet('debug', 'release', 'bundle')]
    [string]$Target = 'debug'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\android-toolchain.ps1"

$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $npx) {
    $npx = Get-Command npx -ErrorAction Stop
}

Push-Location $AndroidRepositoryRoot
try {
    & $npx.Source cap sync android
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

$gradleTask = switch ($Target) {
    'debug' { ':app:assembleDebug' }
    'release' { ':app:assembleRelease' }
    'bundle' { ':app:bundleRelease' }
}

Push-Location (Join-Path $AndroidRepositoryRoot 'android')
try {
    & '.\gradlew.bat' $gradleTask '--console=plain'
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
