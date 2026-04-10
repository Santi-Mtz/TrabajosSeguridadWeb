$ErrorActionPreference = 'Stop'

$root = "$env:USERPROFILE\Seguridad Web\Practica_2"

$services = @(
  @{ Name = 'user-service'; Path = "$root\backend\user-service"; Port = 3001; Health = 'http://localhost:3001/health' },
  @{ Name = 'group-service'; Path = "$root\backend\group-service"; Port = 3003; Health = 'http://localhost:3003/health' },
  @{ Name = 'ticket-service'; Path = "$root\backend\ticket-service"; Port = 3002; Health = 'http://localhost:3002/health' },
  @{ Name = 'api-gateway'; Path = "$root\backend\api-gateway"; Port = 3000; Health = 'http://localhost:3000/health' }
)

function Get-ListeningPidsByPort([int]$port) {
  $lines = netstat -ano | Select-String 'LISTENING' | Select-String ":$port\s"
  $pids = @()

  foreach ($line in $lines) {
    $parts = ($line.ToString() -replace '\s+', ' ').Trim().Split(' ')
    if ($parts.Length -ge 5) {
      $pidText = $parts[-1]
      if ($pidText -match '^\d+$') {
        $pids += [int]$pidText
      }
    }
  }

  return $pids | Sort-Object -Unique
}

function Stop-Port([int]$port) {
  $pids = Get-ListeningPidsByPort $port

  if ($pids.Count -eq 0) {
    Write-Host "Puerto $port libre"
    return
  }

  foreach ($procId in $pids) {
    try {
      $proc = Get-Process -Id $procId -ErrorAction Stop
      Write-Host "Deteniendo PID $procId ($($proc.ProcessName)) en puerto $port"
      Stop-Process -Id $procId -Force -ErrorAction Stop
    } catch {
      Write-Host "No se pudo detener PID $procId en puerto ${port}: $($_.Exception.Message)"
    }
  }
}

function Start-Service($service) {
  Write-Host "Iniciando $($service.Name) en puerto $($service.Port)"

  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$($service.Path)'; npm run dev"
  ) | Out-Null
}

function Wait-Health($url, $name, [int]$maxAttempts = 30, [int]$delayMs = 1000) {
  for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        Write-Host "$name OK (200)"
        return $true
      }
    } catch {
      # Retry until maxAttempts
    }

    Start-Sleep -Milliseconds $delayMs
  }

  Write-Host "$name no respondió 200 en $url"
  return $false
}

Write-Host 'Liberando puertos...'
$ports = $services.Port | Sort-Object -Unique
foreach ($port in $ports) {
  Stop-Port $port
}

Write-Host 'Arrancando servicios...'
foreach ($service in $services) {
  Start-Service $service
}

Write-Host 'Esperando health checks...'
$allOk = $true
foreach ($service in $services) {
  $ok = Wait-Health -url $service.Health -name $service.Name
  if (-not $ok) {
    $allOk = $false
  }
}

if ($allOk) {
  Write-Host 'Stack completo levantado sin conflictos.'
} else {
  Write-Host 'Algunos servicios no levantaron correctamente. Revisa las ventanas de servicio.'
}