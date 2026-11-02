#Requires -Version 5.1
<#
.SYNOPSIS
Builds and verifies a standalone, update-compatible Android QA Release from a short physical path.
.EXAMPLE
.\build-android-qa.ps1
.EXAMPLE
.\build-android-qa.ps1 -ApiBaseUrl http://192.168.1.55:8080/api/v1 -ReferenceApk C:\backups\installed.apk
#>
[CmdletBinding()]
param(
    [string]$BuildRoot = 'C:\fp',
    [string]$ApiBaseUrl = 'http://192.168.1.55:8080/api/v1',
    [string[]]$Architectures = @('arm64-v8a', 'x86_64'),
    [string]$ReferenceApk,
    [string]$OutputDirectory,
    [string]$ExpectedCertificateSha256 = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c',
    [int]$VersionCode = 0,
    [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$source = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$build = [IO.Path]::GetFullPath($BuildRoot).TrimEnd('\')
if (!$OutputDirectory) { $OutputDirectory = Join-Path $source 'outputs\android-qa' }
$output = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
$markerName = '.finance-personal-android-qa.json'
$markerPath = Join-Path $build $markerName
$utf8 = New-Object Text.UTF8Encoding($false)

function Write-Utf8([string]$Path, [string]$Value) { [IO.File]::WriteAllText($Path, $Value, $utf8) }
function Read-Json([string]$Path) { Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json }
function Assert-PhysicalPath([string]$Path) {
    $part = $Path
    while ($part) {
        if (Test-Path -LiteralPath $part) {
            if ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Use a physical directory, not SUBST, a junction or symbolic link: $part"
            }
        }
        $part = [IO.Path]::GetDirectoryName($part)
    }
    $drive = $Path.Substring(0, 2)
    $substitutions = & subst.exe
    if ($substitutions | Where-Object { $_.StartsWith($drive + '\:', [StringComparison]::OrdinalIgnoreCase) }) { throw "SUBST is not supported: $drive" }
}
function Assert-SeparatePaths([string]$First, [string]$Second) {
    if ($First.Equals($Second, [StringComparison]::OrdinalIgnoreCase) -or
        $First.StartsWith($Second + '\', [StringComparison]::OrdinalIgnoreCase) -or
        $Second.StartsWith($First + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The build copy must be separate from the original project and output directory.'
    }
}
function Remove-BuildDirectory([string]$Path) {
    $full = [IO.Path]::GetFullPath($Path).TrimEnd('\')
    if (!$full.StartsWith($build + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe cleanup target: $full" }
    Assert-PhysicalPath $full
    if (Test-Path -LiteralPath $full) {
        $links = @(Get-ChildItem -LiteralPath $full -Force -Recurse -Attributes ReparsePoint)
        if ($links.Count) { throw "Refusing recursive cleanup containing links: $full" }
        Remove-Item -LiteralPath $full -Recurse -Force
    }
}
$excludedDirectories = @('node_modules', '.git', '.expo', '.tmp', '.gradle', '.cxx', '.kotlin', 'build', 'outputs', 'dist', 'web-build', 'ios')
function Get-SourceManifest([string]$Root) {
    $stack = New-Object 'Collections.Generic.Stack[string]'
    $stack.Push($Root)
    $rows = New-Object 'Collections.Generic.List[object]'
    while ($stack.Count) {
        foreach ($item in Get-ChildItem -LiteralPath $stack.Pop() -Force) {
            if ($item.PSIsContainer) {
                if ($excludedDirectories -contains $item.Name) { continue }
                if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Unexpected source directory link: $($item.FullName)" }
                $stack.Push($item.FullName)
            } else {
                if ($item.Name -like '.env*' -or $item.Name -like '*.apk' -or $item.Name -like '*.aab' -or
                    $item.Name -eq 'local.properties' -or $item.Name -eq $markerName -or $item.Name -eq 'finance-build.json') { continue }
                $relative = $item.FullName.Substring($Root.Length + 1).Replace('\', '/')
                $rows.Add([pscustomobject]@{ path = $relative; sha256 = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash })
            }
        }
    }
    return @($rows | Sort-Object path)
}
function Get-ManifestDigest($Manifest) {
    $lines = @($Manifest | ForEach-Object { $_.path + ':' + $_.sha256 }) -join "`n"
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($lines)))).Replace('-', '') }
    finally { $sha.Dispose() }
}
function Get-ApkCertificate([string]$Path) {
    $preference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue' # Windows PowerShell 5.1 wraps native stderr as ErrorRecord.
        $details = @(& $script:apksigner verify --verbose --print-certs $Path 2>&1)
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $preference }
    if ($code -ne 0) { throw "APK signature verification failed: $Path" }
    $match = [regex]::Match(($details -join "`n"), 'certificate SHA-256 digest:\s*([a-fA-F0-9]{64})')
    if (!$match.Success) { throw 'APK signer certificate was not found.' }
    return $match.Groups[1].Value.ToLowerInvariant()
}
function Get-ApkIdentity([string]$Path) {
    $badging = @(& $script:aapt dump badging $Path 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Could not read APK identity: $Path" }
    $match = [regex]::Match(($badging -join "`n"), "package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'")
    if (!$match.Success) { throw 'APK package/version metadata missing.' }
    if (($badging -join "`n") -match 'application-debuggable') { throw 'The APK must be a non-debuggable Release.' }
    return [pscustomobject]@{ package = $match.Groups[1].Value; versionCode = [int]$match.Groups[2].Value; versionName = $match.Groups[3].Value }
}
function Invoke-LoggedNative([string]$Program, [string[]]$Arguments, [string]$LogPath) {
    $preference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Program @Arguments 2>&1 | Tee-Object -FilePath $LogPath
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $preference }
    if ($code -ne 0) { throw "Native command failed ($code): $Program. See $LogPath" }
}

if ($build -notmatch '^[A-Za-z]:\\fp[\w-]*$') { throw 'Choose a short dedicated physical directory such as C:\fp or D:\fp-qa.' }
Assert-PhysicalPath $build
Assert-SeparatePaths $source $build
Assert-SeparatePaths $output $build
if ((Test-Path -LiteralPath $build) -and !(Test-Path -LiteralPath $markerPath)) {
    if (@(Get-ChildItem -LiteralPath $build -Force).Count) { throw 'The build directory is not empty and is not owned by this script. Nothing was deleted.' }
}
if (Test-Path -LiteralPath $markerPath) {
    $owner = Read-Json $markerPath
    if ($owner.tool -ne 'FinancePersonalAndroidQA' -or $owner.source -ne $source) { throw 'Build directory belongs to a different source/tool.' }
}
if ($ExpectedCertificateSha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid expected certificate SHA-256.' }
if (!$Architectures.Count -or @($Architectures | Where-Object { $_ -notin @('arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64') }).Count) { throw 'Invalid Android architectures.' }
$apiUri = [uri]$ApiBaseUrl
if (!$apiUri.IsAbsoluteUri -or $apiUri.Scheme -notin @('http', 'https') -or $apiUri.UserInfo -or $apiUri.Query -or $apiUri.Fragment -or
    $apiUri.AbsolutePath.TrimEnd('/') -ne '/api/v1' -or $apiUri.Host -in @('localhost', '127.0.0.1', '10.0.2.2')) {
    throw 'Use a phone-accessible API URL ending in /api/v1, without credentials or an emulator/loopback address.'
}
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
foreach ($command in @('node.exe', 'npm.cmd', 'robocopy.exe')) { Get-Command $command -ErrorAction Stop | Out-Null }
$localJdk = Join-Path $env:USERPROFILE '.jdks\ms-21.0.10'
if (!$env:JAVA_HOME -and (Test-Path -LiteralPath $localJdk)) { $env:JAVA_HOME = $localJdk }
if (!$env:JAVA_HOME -or !(Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { throw 'Set JAVA_HOME to the installed JDK (Java 21 in this project).' }
$sdk = $env:ANDROID_HOME
if (!$sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (!$sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (!(Test-Path -LiteralPath $sdk)) { throw 'Android SDK missing. Set ANDROID_HOME.' }
$buildTools = Get-ChildItem -LiteralPath (Join-Path $sdk 'build-tools') -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
if (!$buildTools) { throw 'Install Android SDK Build Tools.' }
$script:apksigner = Join-Path $buildTools.FullName 'apksigner.bat'
$script:aapt = Join-Path $buildTools.FullName 'aapt2.exe'
foreach ($required in @('package-lock.json', 'android\gradlew.bat', 'android\app\build.gradle', 'android\app\debug.keystore', 'scripts\android-qa-short-paths.gradle')) {
    if (!(Test-Path -LiteralPath (Join-Path $source $required))) { throw "Required source file missing: $required" }
}
$gradleSource = [IO.File]::ReadAllText((Join-Path $source 'android\app\build.gradle'))
$sourceVersion = [int]([regex]::Match($gradleSource, 'versionCode\s+(\d+)').Groups[1].Value)
$appVersion = (Read-Json (Join-Path $source 'app.json')).expo.version
$minimumVersion = $sourceVersion
$previousReport = Join-Path $output 'latest.json'
if (Test-Path -LiteralPath $previousReport) { $minimumVersion = [math]::Max($minimumVersion, (Read-Json $previousReport).versionCode) }
$referenceHash = $null
if ($ReferenceApk) {
    $ReferenceApk = (Resolve-Path -LiteralPath $ReferenceApk).Path
    if ((Get-ApkCertificate $ReferenceApk) -ne $ExpectedCertificateSha256.ToLowerInvariant()) { throw 'Reference APK certificate does not match the expected Xiaomi certificate.' }
    $referenceIdentity = Get-ApkIdentity $ReferenceApk
    if ($referenceIdentity.package -ne 'com.jr.financepersonal') { throw 'Reference APK belongs to another application.' }
    $minimumVersion = [math]::Max($minimumVersion, $referenceIdentity.versionCode)
    $referenceHash = (Get-FileHash -LiteralPath $ReferenceApk -Algorithm SHA256).Hash
}
if (!$VersionCode) { $VersionCode = [math]::Max([int](Get-Date -Format yyyyMMdd), $minimumVersion + 1) }
if ($VersionCode -le $minimumVersion -or $VersionCode -gt 2100000000) { throw "VersionCode must exceed $minimumVersion and be at most 2100000000." }
Write-Host "Source: $source`nPhysical build copy: $build`nAPI: $ApiBaseUrl`nVersion code: $VersionCode"
if ($ValidateOnly) { Write-Host 'Preflight passed. No files copied, no build, no phone changes.'; return }
$free = (Get-PSDrive -Name $build.Substring(0, 1) -ErrorAction Stop).Free
if ($free -lt 6GB) { throw 'At least 6 GiB of free space is required for the physical build copy.' }

$runId = [Guid]::NewGuid().ToString('N')
$started = [DateTime]::UtcNow
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$versionName = "$appVersion-qa.$stamp"
$lock = $null
$savedEnvironment = @{}
$environmentValues = @{
    ANDROID_HOME = $sdk; ANDROID_SDK_ROOT = $sdk; NODE_ENV = 'production'; CI = '1';
    EXPO_NO_DOTENV = '1'; EXPO_PUBLIC_APP_ENV = 'local'; EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl;
    EXPO_PUBLIC_CAPTURE_QA = 'true'; FINANCE_NATIVE_STAGING = (Join-Path $build '.tmp\cxx')
}
try {
    New-Item -ItemType Directory -Force -Path $build, $output | Out-Null
    if (!(Test-Path -LiteralPath $markerPath)) { Write-Utf8 $markerPath (@{ tool = 'FinancePersonalAndroidQA'; source = $source } | ConvertTo-Json) }
    $temp = Join-Path $build '.tmp'
    Assert-PhysicalPath $temp
    New-Item -ItemType Directory -Force -Path $temp | Out-Null
    $lock = [IO.File]::Open((Join-Path $temp 'build.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $manifest = Get-SourceManifest $source
    $sourceDigest = Get-ManifestDigest $manifest
    $gitCommit = (& git -C $source rev-parse HEAD 2>$null | Select-Object -First 1)
    $gitDirty = @(& git -C $source status --porcelain --untracked-files=normal 2>$null).Count -gt 0
    Write-Host '[1/6] Synchronizing current source; original project is read-only.'
    $copyLog = Join-Path $temp "copy-$runId.log"
    $copyArgs = @($source, $build, '/MIR', '/XJ', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', "/LOG:$copyLog", '/XD') +
        $excludedDirectories + @('/XF', '.env*', '*.apk', '*.aab', 'local.properties', $markerName, 'finance-build.json')
    & robocopy.exe @copyArgs | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "Source copy failed. See $copyLog" }
    if ((Get-ManifestDigest (Get-SourceManifest $build)) -ne $sourceDigest) { throw 'The physical copy does not match the current source snapshot.' }
    foreach ($key in $environmentValues.Keys) {
        $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $environmentValues[$key], 'Process')
    }
    Write-Utf8 (Join-Path $build 'android\local.properties') ('sdk.dir=' + $sdk.Replace('\', '/') + "`n")
    Write-Host '[2/6] Installing locked dependencies in the physical copy when needed.'
    $lockHash = (Get-FileHash -LiteralPath (Join-Path $build 'package-lock.json') -Algorithm SHA256).Hash
    $nodeVersion = (& node.exe --version | Select-Object -First 1)
    $dependencyStamp = Join-Path $temp 'dependencies.json'
    $needDependencies = !(Test-Path -LiteralPath $dependencyStamp) -or !(Test-Path -LiteralPath (Join-Path $build 'node_modules\react-native\package.json'))
    if (!$needDependencies) { $deps = Read-Json $dependencyStamp; $needDependencies = $deps.lockHash -ne $lockHash -or $deps.nodeVersion -ne $nodeVersion }
    Push-Location $build
    try {
        if ($needDependencies) {
            Invoke-LoggedNative 'npm.cmd' @('ci', '--prefer-offline', '--no-audit', '--no-fund') (Join-Path $temp "npm-$runId.log")
            Remove-BuildDirectory (Join-Path $temp 'cxx')
            Write-Utf8 $dependencyStamp (@{ lockHash = $lockHash; nodeVersion = $nodeVersion } | ConvertTo-Json)
        }
    } finally { Pop-Location }
    Assert-PhysicalPath (Join-Path $build 'node_modules\react-native-screens')
    Remove-BuildDirectory (Join-Path $build 'android\app\build')
    Remove-BuildDirectory (Join-Path $build 'android\build')
    $buildGradle = [regex]::Replace($gradleSource, 'versionCode\s+\d+', "versionCode $VersionCode")
    $buildGradle = [regex]::Replace($buildGradle, 'versionName\s+"[^"]+"', "versionName `"$versionName`"")
    Write-Utf8 (Join-Path $build 'android\app\build.gradle') $buildGradle
    $provenance = [ordered]@{ buildId = $runId; sourceCommit = $gitCommit; sourceDirty = $gitDirty; sourceSha256 = $sourceDigest;
        sourceFiles = $manifest.Count; api = $ApiBaseUrl; versionCode = $VersionCode; versionName = $versionName; startedUtc = $started.ToString('o') }
    $assets = Join-Path $build 'android\app\src\main\assets'
    New-Item -ItemType Directory -Force -Path $assets | Out-Null
    Write-Utf8 (Join-Path $assets 'finance-build.json') ($provenance | ConvertTo-Json)
    Write-Host '[3/6] Building signed standalone Release with short CMake paths.'
    $buildLog = Join-Path $temp "release-$runId.log"
    Push-Location (Join-Path $build 'android')
    try {
        Invoke-LoggedNative '.\gradlew.bat' @(':app:assembleRelease', '--console=plain', '--no-build-cache', '--no-parallel', '--max-workers=2',
            "-PreactNativeArchitectures=$($Architectures -join ',')", '-I', (Join-Path $build 'scripts\android-qa-short-paths.gradle')) $buildLog
    } finally { Pop-Location }
    $apk = Join-Path $build 'android\app\build\outputs\apk\release\app-release.apk'
    if (!(Test-Path -LiteralPath $apk) -or (Get-Item -LiteralPath $apk).LastWriteTimeUtc -lt $started) { throw 'Fresh APK was not generated.' }
    Write-Host '[4/6] Verifying signature, identity, native features and embedded UX code.'
    $certificate = Get-ApkCertificate $apk
    if ($certificate -ne $ExpectedCertificateSha256.ToLowerInvariant()) { throw 'Signature mismatch. APK will not be published.' }
    $identity = Get-ApkIdentity $apk
    if ($identity.package -ne 'com.jr.financepersonal' -or $identity.versionCode -ne $VersionCode -or $identity.versionName -ne $versionName) { throw 'Unexpected APK identity/version.' }
    $manifestText = @(& $script:aapt dump xmltree $apk --file AndroidManifest.xml) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the compiled manifest.' }
    foreach ($component in @('FinanceNotificationListener', 'FinanceHomeWidgetProvider', 'android.app.shortcuts')) {
        if (!$manifestText.Contains($component)) { throw "Full-app component missing: $component" }
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($apk)
    try {
        foreach ($abi in $Architectures) {
            foreach ($library in @('libappmodules.so', 'librnscreens.so', 'libreanimated.so', 'libworklets.so')) {
                if (!$archive.GetEntry("lib/$abi/$library")) { throw "Missing native library: $abi/$library" }
            }
        }
        $bundle = $archive.GetEntry('assets/index.android.bundle')
        $buildEntry = $archive.GetEntry('assets/finance-build.json')
        if (!$bundle -or !$buildEntry -or !$bundle.Length) { throw 'Standalone JS bundle or build provenance missing.' }
        $reader = [IO.StreamReader]::new($buildEntry.Open(), [Text.Encoding]::UTF8)
        try { $embedded = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
        if ($embedded.buildId -ne $runId -or $embedded.sourceSha256 -ne $sourceDigest) { throw 'An old or unrelated APK was detected.' }
        $reader = [IO.StreamReader]::new($bundle.Open(), [Text.Encoding]::UTF8)
        try { $bundleText = $reader.ReadToEnd() } finally { $reader.Dispose() }
        foreach ($needle in @($ApiBaseUrl, 'home-shortcuts', 'profile-form', 'displayName', 'cafe-outline', '/reports/transactions')) {
            if (!$bundleText.Contains($needle)) { throw "Expected current code missing from embedded JS: $needle" }
        }
        $bundleHash = [Security.Cryptography.SHA256]::Create()
        $bundleStream = $bundle.Open()
        try { $bundleDigest = ([BitConverter]::ToString($bundleHash.ComputeHash($bundleStream))).Replace('-', '') }
        finally { $bundleStream.Dispose(); $bundleHash.Dispose() }
    } finally { $archive.Dispose() }
    Write-Host '[5/6] Confirming source stayed unchanged during compilation.'
    if ((Get-ManifestDigest (Get-SourceManifest $source)) -ne $sourceDigest) { throw 'Source changed during compilation. Run again to include those changes.' }
    $apkHash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
    if ($referenceHash -and $apkHash -eq $referenceHash) { throw 'APK is identical to the old reference; refusing publication.' }
    Write-Host '[6/6] Publishing verified APK, source manifest and reproducibility report.'
    $name = "FinancePersonal-qa-$stamp-$($runId.Substring(0, 6))"
    $destination = Join-Path $output ($name + '.apk')
    Copy-Item -LiteralPath $apk -Destination $destination
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $apkHash) { throw 'Published APK copy failed hash verification.' }
    $report = [ordered]@{ apk = $destination; sha256 = $apkHash; bytes = (Get-Item -LiteralPath $destination).Length;
        certificateSha256 = $certificate; package = $identity.package; versionCode = $VersionCode; versionName = $versionName;
        architectures = $Architectures; standalone = $true; buildId = $runId; sourceCommit = $gitCommit; sourceDirty = $gitDirty;
        sourceSha256 = $sourceDigest; bundleSha256 = $bundleDigest; sourceFiles = $manifest.Count; api = $ApiBaseUrl;
        referenceSha256 = $referenceHash; verifiedUtc = [DateTime]::UtcNow.ToString('o'); buildRoot = $build }
    Write-Utf8 (Join-Path $output ($name + '.json')) ($report | ConvertTo-Json -Depth 5)
    Write-Utf8 (Join-Path $output ($name + '.sources.json')) ($manifest | ConvertTo-Json -Depth 4)
    Copy-Item -LiteralPath $buildLog -Destination (Join-Path $output ($name + '.build.log'))
    Copy-Item -LiteralPath $destination -Destination (Join-Path $output 'FinancePersonal-latest.apk') -Force
    Write-Utf8 $previousReport ($report | ConvertTo-Json -Depth 5)
    Write-Host "SUCCESS`nAPK: $destination`nSHA-256: $apkHash`nCertificate: $certificate"
} finally {
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
    if ($lock) { $lock.Dispose() }
}
