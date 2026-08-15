param(
    [int]$Port = 5432
)

# Stops the local (portable) PostgreSQL used for development.

$pg = Join-Path $env:LOCALAPPDATA "PostgreSQL\pgsql"
$data = Join-Path $env:LOCALAPPDATA "PostgreSQL\data"

if (-not (Test-Path "$pg\bin\pg_ctl.exe")) {
    Write-Error "PostgreSQL binaries not found at $pg."
    exit 1
}

& "$pg\bin\pg_ctl.exe" -D $data stop -m fast
exit $LASTEXITCODE
