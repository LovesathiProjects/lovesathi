$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot

function Resolve-Jdk17Home {
    $candidates = @(
        $env:JAVA_HOME,
        [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User'),
        [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine'),
        (Join-Path $env:USERPROFILE 'scoop\apps\temurin17-jdk\current')
    ) | Where-Object { $_ } | Select-Object -Unique

    foreach ($candidate in $candidates) {
        $javaPath = Join-Path $candidate 'bin\java.exe'
        $releaseFile = Join-Path $candidate 'release'

        if (-not (Test-Path -LiteralPath $javaPath -PathType Leaf) -or -not (Test-Path -LiteralPath $releaseFile -PathType Leaf)) {
            continue
        }

        $releaseContents = Get-Content -LiteralPath $releaseFile -Raw
        $match = [regex]::Match($releaseContents, 'JAVA_VERSION="(?<major>\d+)')

        if ($match.Success -and [int]$match.Groups['major'].Value -ge 17) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw 'JDK 17 or newer was not found. Set JAVA_HOME to a JDK 17+ installation before building Android.'
}

function Resolve-AndroidSdkHome {
    $candidates = @(
        $env:ANDROID_SDK_ROOT,
        $env:ANDROID_HOME,
        [Environment]::GetEnvironmentVariable('ANDROID_SDK_ROOT', 'User'),
        [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User'),
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
    ) | Where-Object { $_ } | Select-Object -Unique

    foreach ($candidate in $candidates) {
        $adbPath = Join-Path $candidate 'platform-tools\adb.exe'
        $platformPath = Join-Path $candidate 'platforms\android-36\android.jar'

        if ((Test-Path -LiteralPath $adbPath -PathType Leaf) -and (Test-Path -LiteralPath $platformPath -PathType Leaf)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw 'Android SDK Platform 36 and platform-tools were not found. Install them with Android Studio SDK Manager first.'
}

$env:JAVA_HOME = Resolve-Jdk17Home
$env:ANDROID_HOME = Resolve-AndroidSdkHome
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

foreach ($pathEntry in @(
    (Join-Path $env:JAVA_HOME 'bin'),
    (Join-Path $env:ANDROID_HOME 'platform-tools'),
    (Join-Path $env:ANDROID_HOME 'emulator')
)) {
    if ($env:Path -notlike "*$pathEntry*") {
        $env:Path = "$pathEntry;$env:Path"
    }
}

$script:AndroidRepositoryRoot = $repositoryRoot
