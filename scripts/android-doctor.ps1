$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\android-toolchain.ps1"

$javaRelease = Get-Content -LiteralPath (Join-Path $env:JAVA_HOME 'release') -Raw
$javaVersion = [regex]::Match($javaRelease, 'JAVA_VERSION="(?<version>[^"]+)').Groups['version'].Value
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
$emulator = Join-Path $env:ANDROID_HOME 'emulator\emulator.exe'
$signingPropertiesFile = Join-Path $AndroidRepositoryRoot 'android\key.properties'

Write-Host "JDK: $javaVersion ($env:JAVA_HOME)"
Write-Host "Android SDK: $env:ANDROID_HOME"
Write-Host 'Android SDK Platform 36: available'

if (Test-Path -LiteralPath $signingPropertiesFile -PathType Leaf) {
    $requiredProperties = @('storeFile', 'storePassword', 'keyAlias', 'keyPassword')
    $configuredProperties = @{}

    foreach ($line in Get-Content -LiteralPath $signingPropertiesFile) {
        if ($line -match '^\s*(?<key>[^#=\s]+)\s*=\s*(?<value>.+?)\s*$') {
            $configuredProperties[$matches['key']] = $matches['value']
        }
    }

    $missingProperties = $requiredProperties | Where-Object { -not $configuredProperties.ContainsKey($_) }
    if ($missingProperties.Count -eq 0) {
        Write-Host 'Release signing: configured'
    } else {
        Write-Warning "Release signing: key.properties is incomplete (${missingProperties -join ', '})."
    }
} else {
    Write-Warning 'Release signing: not configured. Copy android/key.properties.example to android/key.properties before creating a Play bundle.'
}

Write-Host 'Connected Android devices:'
& $adb devices -l

if (Test-Path -LiteralPath $emulator -PathType Leaf) {
    Write-Host 'Available Android emulators:'
    & $emulator -list-avds
} else {
    Write-Warning 'Android Emulator is not installed. Physical USB devices can still be tested with adb.'
}
