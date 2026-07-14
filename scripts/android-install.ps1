[CmdletBinding()]
param(
    [string]$Serial
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\android-toolchain.ps1"

$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
$apk = Join-Path $AndroidRepositoryRoot 'android\app\build\outputs\apk\debug\app-debug.apk'

if (-not (Test-Path -LiteralPath $apk -PathType Leaf)) {
    & "$PSScriptRoot\android-build.ps1" -Target debug
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

$devices = & $adb devices | Select-Object -Skip 1 | ForEach-Object {
    $parts = $_ -split '\s+'
    if ($parts.Count -ge 2 -and $parts[1] -eq 'device') {
        $parts[0]
    }
}

if (-not $Serial) {
    if ($devices.Count -eq 1) {
        $Serial = $devices[0]
    } elseif ($devices.Count -eq 0) {
        throw 'No Android device is connected. Start an emulator or enable USB debugging on a phone, then run this command again.'
    } else {
        throw "More than one Android device is connected. Re-run with -Serial. Available: $($devices -join ', ')"
    }
}

if ($devices -notcontains $Serial) {
    throw "Android device '$Serial' is not ready for adb installs."
}

& $adb -s $Serial install -r $apk
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $adb -s $Serial shell am force-stop com.lovesathi.app
& $adb -s $Serial shell monkey -p com.lovesathi.app 1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Installed and launched Lovesathi on $Serial."
