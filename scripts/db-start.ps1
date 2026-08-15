param(
    [int]$Port = 5432
)

# Starts the local (portable) PostgreSQL used for development.
# No admin rights required. See DATABASE.md for details.

$pg = Join-Path $env:LOCALAPPDATA "PostgreSQL\pgsql"
$data = Join-Path $env:LOCALAPPDATA "PostgreSQL\data"
$log = Join-Path $env:LOCALAPPDATA "PostgreSQL\pg.log"

if (-not (Test-Path "$pg\bin\pg_ctl.exe")) {
    Write-Error "PostgreSQL binaries not found at $pg. Run scripts\db-install.ps1 first."
    exit 1
}
if (-not (Test-Path "$data\PG_VERSION")) {
    Write-Error "Database cluster not found at $data. Run scripts\db-install.ps1 first."
    exit 1
}

& "$pg\bin\pg_isready.exe" -h 127.0.0.1 -p $Port *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL is already running on port $Port."
    exit 0
}

& "$pg\bin\pg_ctl.exe" -D $data -l $log -o "-p $Port -c listen_addresses=127.0.0.1" start
exit $LASTEXITCODE
