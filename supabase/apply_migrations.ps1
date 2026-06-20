param(
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL
)

if (-not $DatabaseUrl) {
  Write-Error "SUPABASE_DB_URL is required to apply migrations with psql."
  exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Error "psql was not found. Install PostgreSQL tools or use Supabase CLI."
  exit 1
}

Get-ChildItem -Path "$PSScriptRoot\migrations" -Filter "*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "Applying $($_.Name)..."
  & psql $DatabaseUrl -v ON_ERROR_STOP=1 -f $_.FullName
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host "All migrations applied."
