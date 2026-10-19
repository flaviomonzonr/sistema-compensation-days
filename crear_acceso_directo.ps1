$ws = New-Object -ComObject WScript.Shell
$userProfile = $env:USERPROFILE
$desktops = @(
    [System.IO.Path]::Combine($userProfile, 'OneDrive', 'Desktop'),
    [System.IO.Path]::Combine($userProfile, 'Desktop'),
    [System.IO.Path]::Combine($userProfile, 'OneDrive', 'Escritorio'),
    [System.IO.Path]::Combine($userProfile, 'Escritorio')
) | Where-Object { Test-Path $_ }

$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = 'c:\apps-flavio\sistema-compensation-days' }

$vbsPath = Join-Path $currentDir 'Abrir_Sistema.vbs'
$wscriptExe = Join-Path $env:WINDIR 'System32\wscript.exe'
$icoPath = Join-Path $currentDir 'app_icon.ico'

# Limpiar accesos directos antiguos
$oldNames = @(
    'Sistema Compensation Days.lnk',
    'Compensaciones.lnk',
    'Compensacion.lnk',
    'Dias de Compensacion.lnk',
    'Sistema Compensaciones.lnk'
)

foreach ($d in $desktops) {
    foreach ($old in $oldNames) {
        $oldP = Join-Path $d $old
        if (Test-Path $oldP) {
            Remove-Item $oldP -Force -ErrorAction SilentlyContinue
            Write-Host "🗑️ Eliminado acceso directo anterior: $old"
        }
    }

    $shortcutPath = Join-Path $d 'Días de Compensación (ADPmodul).lnk'
    $sc = $ws.CreateShortcut($shortcutPath)
    $sc.TargetPath = $wscriptExe
    $sc.Arguments = "`"$vbsPath`""
    $sc.WorkingDirectory = $currentDir
    $sc.IconLocation = "$icoPath,0"
    $sc.Description = "Días de Compensación (ADPmodul)"
    $sc.Save()

    Write-Host "✅ Acceso directo configurado en segundo plano en: $shortcutPath"
}
