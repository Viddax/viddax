param(
    [Parameter(Mandatory)] [string] $Installer,
    [Parameter(Mandatory)] [string] $PreviousInstaller
)

$ErrorActionPreference = 'Stop'
$Installer = (Resolve-Path -LiteralPath $Installer).Path
$PreviousInstaller = (Resolve-Path -LiteralPath $PreviousInstaller).Path
$version = (Get-Item -LiteralPath $Installer).VersionInfo.ProductVersion -replace '(?<=^\d+\.\d+\.\d+)\.0$', ''
$previousVersion = (Get-Item -LiteralPath $PreviousInstaller).VersionInfo.ProductVersion -replace '(?<=^\d+\.\d+\.\d+)\.0$', ''
$runtimeModule = Join-Path $PSScriptRoot '..\node_modules\electron'
$electron = node -e "console.log(require(process.argv[1]))" $runtimeModule | Select-Object -Last 1
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $electron)) { throw 'Could not locate the Electron test runtime.' }
$existing = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
    Where-Object DisplayName -Like 'Viddax*'
if ($existing) { throw 'Use a Windows test machine without an existing Viddax installation.' }

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('viddax-release-check-' + [guid]::NewGuid().ToString('N'))
$directory = Join-Path $testRoot 'Viddax'
$exe = Join-Path $directory 'Viddax.exe'
$uninstaller = Join-Path $directory 'Uninstall Viddax.exe'
$benchmark = Join-Path $testRoot 'startup.jsonl'
$profile = Join-Path $testRoot 'profile'
$updateProfile = Join-Path $testRoot 'updater'
$previousPerfLog = $env:VIDDAX_PERF_LOG
New-Item -ItemType Directory -Path $testRoot, $updateProfile | Out-Null

function Assert-Version([string] $Expected) {
    $actual = if (Test-Path -LiteralPath $exe) { (Get-Item -LiteralPath $exe).VersionInfo.ProductVersion }
    if ($actual -ne $Expected -and $actual -ne "$Expected.0") { throw "Expected installed version $Expected, found $actual." }
}

function Install-Viddax([string] $File) {
    $process = Start-Process -FilePath $File -ArgumentList '/S', '/currentuser', "/D=$directory" -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Installation failed with exit code $($process.ExitCode)." }
}

function Uninstall-Viddax {
    $process = Start-Process -FilePath $uninstaller -ArgumentList '/S', '/currentuser' -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0 -or (Test-Path -LiteralPath $exe)) { throw 'Uninstall did not remove Viddax.' }
}

function Stop-TestApp {
    Get-Process -Name Viddax -ErrorAction SilentlyContinue | Where-Object Path -EQ $exe | Stop-Process -ErrorAction SilentlyContinue
}

try {
    Install-Viddax $Installer
    Assert-Version $version
    Write-Output "Fresh install passed ($version)."
    compact.exe /Q "/S:$directory" '*' | Select-Object -Last 5
    if ($LASTEXITCODE -ne 0) { throw 'Unable to measure installed disk use.' }

    $env:VIDDAX_PERF_LOG = $benchmark
    $process = Start-Process -FilePath $exe -ArgumentList "--user-data-dir=`"$profile`"" -WindowStyle Hidden -PassThru
    for ($i = 0; $i -lt 100 -and !(Test-Path -LiteralPath $benchmark); $i++) {
        if ($process.HasExited) { throw 'Viddax closed before reporting startup readiness.' }
        Start-Sleep -Milliseconds 150
    }
    if (!(Test-Path -LiteralPath $benchmark)) { throw 'Viddax did not report startup readiness.' }
    Get-Content -LiteralPath $benchmark
    Stop-TestApp
    Uninstall-Viddax
    Write-Output 'Uninstall passed.'

    Install-Viddax $PreviousInstaller
    Assert-Version $previousVersion
    Install-Viddax $Installer
    Assert-Version $version
    Write-Output "Direct upgrade passed ($previousVersion to $version)."
    Uninstall-Viddax

    Install-Viddax $PreviousInstaller
    Assert-Version $previousVersion
    $script = Join-Path $PSScriptRoot 'verify-update.js'
    $arguments = @($script, $Installer, $previousVersion, $directory, $updateProfile) | ForEach-Object { '"' + $_ + '"' }
    $updateLog = Join-Path $testRoot 'updater.log'
    $updateErrorLog = Join-Path $testRoot 'updater-error.log'
    $test = Start-Process -FilePath $electron -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru `
        -RedirectStandardOutput $updateLog -RedirectStandardError $updateErrorLog
    Get-Content -LiteralPath $updateLog, $updateErrorLog
    if ($test.ExitCode -ne 0) { throw "Updater verification exited $($test.ExitCode)." }
    Assert-Version $version
    Write-Output "Electron updater download and install passed ($previousVersion to $version)."
    Uninstall-Viddax
} finally {
    $env:VIDDAX_PERF_LOG = $previousPerfLog
    Stop-TestApp
    if (Test-Path -LiteralPath $uninstaller) { Uninstall-Viddax }
    Write-Output "Verification files: $testRoot"
}
