$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$server = Start-Process `
  -FilePath "node" `
  -ArgumentList "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4173" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -PassThru

try {
  $ready = $false
  for ($i = 0; $i -lt 40; $i += 1) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:4173" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $ready) {
    throw "Vite dev server did not become ready."
  }

  & npx.cmd playwright test --reporter=line
  exit $LASTEXITCODE
} finally {
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
