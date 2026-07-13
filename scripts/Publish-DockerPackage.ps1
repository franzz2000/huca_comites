<#
.SYNOPSIS
Empaqueta el código de la aplicación y lo sube por SCP a un servidor.

.DESCRIPTION
Excluye secretos, dependencias instaladas, datos locales y artefactos de compilación.
El servidor construye la imagen mediante Docker Compose a partir del paquete recibido.

.EXAMPLE
.\scripts\Publish-DockerPackage.ps1 -Server 10.36.160.121 -User franz
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Server,

    [Parameter(Mandatory)]
    [string]$User,

    [string]$RemotePath = "~/huca-comites.tar.gz",

    [string]$ArchivePath = (Join-Path $PSScriptRoot "..\huca-comites.tar.gz")
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$archiveFullPath = [System.IO.Path]::GetFullPath($ArchivePath)
$archiveDirectory = Split-Path -Parent $archiveFullPath

if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
    throw "No se encontró 'tar'. Instala o habilita las herramientas de archivado de Windows."
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "No se encontró 'scp'. Instala el cliente OpenSSH de Windows."
}

New-Item -ItemType Directory -Path $archiveDirectory -Force | Out-Null
Remove-Item -LiteralPath $archiveFullPath -Force -ErrorAction SilentlyContinue

Push-Location $projectRoot
try {
    # El archivo .env se crea y se conserva exclusivamente en el servidor.
    & tar -czf $archiveFullPath `
        --exclude=.env `
        --exclude=.git `
        --exclude=node_modules `
        --exclude=frontend/node_modules `
        --exclude=data `
        --exclude=frontend/dist `
        --exclude=dist `
        --exclude=huca-comites.tar.gz `
        .

    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear el paquete."
    }
}
finally {
    Pop-Location
}

Write-Host "Paquete creado: $archiveFullPath"
Write-Host "Subiendo a ${User}@${Server}:$RemotePath ..."
& scp $archiveFullPath "${User}@${Server}:$RemotePath"

if ($LASTEXITCODE -ne 0) {
    throw "La transferencia SCP no se completó."
}

Write-Host "Transferencia completada. En el servidor ejecuta:"
Write-Host "  sudo mkdir -p /opt/huca_comites"
Write-Host "  sudo chown $User`:$User /opt/huca_comites"
Write-Host "  tar -xzf $RemotePath -C /opt/huca_comites"
Write-Host "  cd /opt/huca_comites && docker compose up --build -d"
