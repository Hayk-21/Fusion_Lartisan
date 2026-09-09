# Fusion L'Artisan — configuration de l'agent d'impression (appelé par INSTALLER.bat)
# Mode automatique (installateur téléchargé depuis le panneau : LARTISAN_SERVER + LARTISAN_TOKEN définis) : aucune question.
# Mode manuel : demande l'adresse du serveur, le PIN admin, l'imprimante et le nom de l'ordinateur.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$logPath = if ($env:LARTISAN_LOG) { $env:LARTISAN_LOG } else { Join-Path $here 'install.log' }
try { Start-Transcript -Path $logPath -Force | Out-Null } catch {}
trap { Write-Host $_ -ForegroundColor Red; try { Stop-Transcript | Out-Null } catch {}; exit 1 }
$cfgPath = Join-Path $here 'print-agent.json'
$old = $null
if (Test-Path $cfgPath) { try { $old = Get-Content $cfgPath -Raw | ConvertFrom-Json } catch {} }
$AUTO = [bool]($env:LARTISAN_SERVER -and $env:LARTISAN_TOKEN)

function Ask($label, $default) {
  if ($default) { $v = Read-Host "$label [$default]" } else { $v = Read-Host $label }
  if ([string]::IsNullOrWhiteSpace($v)) { return $default } else { return $v.Trim() }
}
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
function Step($n, $msg) { Write-Host ("  [" + $n + "/6] " + $msg) -ForegroundColor Cyan }

# ---------------------------------------------------------------- 1. Node.js
Step 1 'Node.js'
Refresh-Path
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -or ([int]((& node -v).TrimStart('v').Split('.')[0]) -lt 22)) {
  Write-Host "        Node.js 22+ n'est pas installé : installation (2-3 minutes)..." -ForegroundColor Yellow
  $ok = $false
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    try { & winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null; $ok = $true } catch {}
  }
  Refresh-Path
  if (-not $ok -or -not (Get-Command node -ErrorAction SilentlyContinue)) {
    $msi = Join-Path $env:TEMP 'node-lts.msi'
    $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ver = (Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing | Where-Object { $_.version -like 'v22.*' } | Select-Object -First 1).version
    Invoke-WebRequest -Uri "https://nodejs.org/dist/$ver/node-$ver-$arch.msi" -OutFile $msi -UseBasicParsing
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
  }
  Refresh-Path
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js n'a pas pu être installé. Installez-le depuis https://nodejs.org (version LTS) puis relancez." }
}
Write-Host ("        " + (& node -v)) -ForegroundColor Green

# ---------------------------------------------------------------- 2. serveur
Step 2 'Serveur en ligne'
$server = if ($AUTO) { $env:LARTISAN_SERVER } else { Ask "        Adresse du serveur en ligne" $(if ($old) { $old.server_url } else { 'https://fusionlartisan-production.up.railway.app' }) }
if ($server -notmatch '^https?://') { $server = 'https://' + $server }
$server = $server.TrimEnd('/')
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { $health = Invoke-RestMethod -Uri "$server/api/health" -TimeoutSec 20 } catch { throw "Impossible de joindre $server ($($_.Exception.Message)). Vérifiez la connexion Internet." }
Write-Host ("        " + $health.cafe_name + " (version " + $health.version + ")") -ForegroundColor Green

# ---------------------------------------------------------------- 3. jeton de l'agent
Step 3 'Autorisation'
$h = $null; $agentToken = $null
if ($AUTO) {
  $agentToken = $env:LARTISAN_TOKEN
  Write-Host '        jeton fourni par le panneau' -ForegroundColor Green
} else {
  $token = $null
  for ($i = 0; $i -lt 3 -and -not $token; $i++) {
    $pin = Read-Host "        Code PIN du panneau d'administration" -AsSecureString
    $pinPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pin))
    try {
      $login = Invoke-RestMethod -Method Post -Uri "$server/api/admin/login" -ContentType 'application/json' -Body (@{ pin = $pinPlain } | ConvertTo-Json)
      $token = $login.token
    } catch { Write-Host '        PIN incorrect.' -ForegroundColor Red }
  }
  if (-not $token) { throw 'Connexion au panneau impossible.' }
  $h = @{ Authorization = "Bearer $token" }
  $ag = Invoke-RestMethod -Uri "$server/api/admin/print/agent-token" -Headers $h
  $agentToken = $ag.token
  $reuse = ($agentToken -and $old -and $old.token -eq $agentToken)
  if (-not $agentToken -or (-not $reuse -and $ag.agents.Count -eq 0)) {
    $agentToken = (Invoke-RestMethod -Method Post -Uri "$server/api/admin/print/agent-token" -Headers $h).token
  } elseif (-not $reuse -and $ag.agents.Count -gt 0) {
    Write-Host ("        Un autre agent est déjà connecté (" + (($ag.agents | ForEach-Object { $_.name }) -join ', ') + ").") -ForegroundColor Yellow
    $r = Ask "        Générer un nouveau jeton ? L'autre agent sera déconnecté (o/N)" 'N'
    if ($r -match '^[oOyY]') { $agentToken = (Invoke-RestMethod -Method Post -Uri "$server/api/admin/print/agent-token" -Headers $h).token }
    else { throw "Installation annulée." }
  }
}

# ---------------------------------------------------------------- 4. imprimante
Step 4 'Imprimante'
$ErrorActionPreference = 'Continue'
$rawList = cmd /c "node agent.js --printers 2>&1"
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -ne 0) { throw ("La liste des imprimantes a échoué : " + ($rawList -join ' ')) }
$printers = @($rawList | Where-Object { $_ -and $_ -notmatch '^(Fax|Microsoft Print to PDF|Microsoft XPS|OneNote)' })
if ($printers.Count -eq 0) { throw "Aucune imprimante installée dans Windows. Installez d'abord le pilote Star (l'imprimante doit apparaître dans Paramètres → Imprimantes), puis relancez." }
# preferred: the printer already chosen on the server, then a Star (Bluetooth: the COM7-type link, not the offline COM6), then the first one
$serverPrinter = $null
try { $serverPrinter = (Invoke-RestMethod -Uri "$server/api/settings/public").print_printer_name } catch {}
$star = $printers | Where-Object { $_ -match 'Star|TSP' -and $_ -notmatch 'COM6' } | Select-Object -First 1
if (-not $star) { $star = $printers | Where-Object { $_ -match 'Star|TSP' } | Select-Object -First 1 }
$pref = if ($old -and $old.printer_name -and ($printers -contains $old.printer_name)) { $old.printer_name } elseif ($serverPrinter -and ($printers -contains $serverPrinter)) { $serverPrinter } elseif ($star) { $star } else { $printers[0] }
$defaultIdx = [array]::IndexOf($printers, $pref) + 1
if (-not $AUTO) {
  Write-Host '        Imprimantes trouvées :'
  for ($i = 0; $i -lt $printers.Count; $i++) { Write-Host ("          " + ($i + 1) + ". " + $printers[$i]) }
}
$choice = if ($AUTO) { "$defaultIdx" } else { Ask "        Numéro de l'imprimante à utiliser" "$defaultIdx" }
$printer = $printers[[int]$choice - 1]
if (-not $printer) { throw 'Choix invalide.' }
Write-Host ("        " + $printer) -ForegroundColor Green

# ---------------------------------------------------------------- 5. enregistrement + configuration
Step 5 'Configuration'
$agentName = if ($AUTO) { $(if ($old -and $old.agent_name) { $old.agent_name } else { $env:COMPUTERNAME }) } else { Ask "        Nom de cet ordinateur (affiché dans le panneau)" $(if ($old -and $old.agent_name) { $old.agent_name } else { $env:COMPUTERNAME }) }
if ($AUTO) {
  $body = @{ token = $agentToken; printer_name = $printer; agent_name = $agentName } | ConvertTo-Json
  try { Invoke-RestMethod -Method Post -Uri "$server/api/print-agent/register" -ContentType 'application/json' -Body $body | Out-Null }
  catch { throw "Le serveur a refusé ce fichier d'installation (jeton périmé ?). Téléchargez-en un nouveau depuis le panneau : Paramètres → Imprimante." }
} else {
  $patch = @{ print_enabled = $true; print_mode = 'agent'; print_printer_name = $printer } | ConvertTo-Json
  Invoke-RestMethod -Method Put -Uri "$server/api/admin/settings" -Headers $h -ContentType 'application/json' -Body $patch | Out-Null
}
$json = @{ server_url = $server; token = $agentToken; printer_name = $printer; print_mode = 'windows'; agent_name = $agentName } | ConvertTo-Json
[IO.File]::WriteAllText($cfgPath, $json, (New-Object System.Text.UTF8Encoding $false))
# démarrage automatique avec Windows (fenêtre réduite)
$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup "L'Artisan - Agent d'impression.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnk)
$sc.TargetPath = Join-Path $here 'start-print-agent.bat'
$sc.WorkingDirectory = $here
$sc.WindowStyle = 7
$sc.Save()
Write-Host '        panneau réglé en mode agent, démarrage automatique ajouté' -ForegroundColor Green

# ---------------------------------------------------------------- 6. ticket "tout est connecté"
Step 6 'Ticket de test'
# stop any agent already running from a previous installation, then start a temporary one for the test
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'agent\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$job = Start-Process -FilePath 'node' -ArgumentList 'agent.js' -WorkingDirectory $here -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 6
try {
  if ($AUTO) {
    Invoke-RestMethod -Method Post -Uri "$server/api/print-agent/welcome" -ContentType 'application/json' -Body (@{ token = $agentToken; agent_name = $agentName } | ConvertTo-Json) | Out-Null
  } else {
    $body = @{ print_mode = 'agent'; print_printer_name = $printer; print_cmd = 'star'; print_width = 42; print_copies = 1; print_cut = $true; print_prices = $true } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$server/api/admin/print/test" -Headers $h -ContentType 'application/json' -Body $body | Out-Null
  }
  Write-Host '        ticket envoyé : il sort de l''imprimante' -ForegroundColor Green
} catch { Write-Host ("        le ticket de test a échoué : " + $_.Exception.Message + " (vérifiez que l'imprimante est allumée ; l'agent réessaiera à chaque commande)") -ForegroundColor Yellow }
Start-Sleep -Seconds 3
try { Stop-Process -Id $job.Id -Force } catch {}

Write-Host ''
Write-Host '  ================================================' -ForegroundColor Green
Write-Host '   TOUT EST CONNECTÉ : l''agent démarre maintenant' -ForegroundColor Green
Write-Host '   et se relancera à chaque démarrage de Windows.' -ForegroundColor Green
Write-Host '  ================================================' -ForegroundColor Green
try { Stop-Transcript | Out-Null } catch {}
exit 0
