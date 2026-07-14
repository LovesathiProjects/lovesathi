[CmdletBinding()]
param(
    [ValidateSet('unit', 'connected')]
    [string]$Target = 'unit'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\android-toolchain.ps1"

if ($Target -eq 'connected') {
    $adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
    $connectedDevices = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice$' }

    if ($connectedDevices.Count -eq 0) {
        throw 'No Android device is connected. Start an emulator or connect a USB-debugging-enabled phone before running connected tests.'
    }
}

$gradleTask = if ($Target -eq 'connected') {
    ':app:connectedDebugAndroidTest'
} else {
    ':app:testDebugUnitTest'
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
