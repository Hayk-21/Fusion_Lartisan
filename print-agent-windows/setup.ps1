# Fusion L'Artisan — configuration de l'agent d'impression (appelé par INSTALLER.bat)
# 1. installe Node.js s'il manque   2. installe les dépendances   3. demande l'adresse du serveur + PIN admin
# 4. récupère le jeton de l'agent   5. choisit l'imprimante   6. règle le serveur en mode "agent"
# 7. écrit print-agent.json   8. ajoute l'agent au démarrage de Windows
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$cfgPath = Join-Path $here 'print-agent.json'
$old = $null
if (Test-Path $cfgPath) { try { $old = Get-Content $cfgPath -Raw | ConvertFrom-Json } catch {} }

function Ask($label, $default) {
  if ($default) { $v = Read-Host "$label [$default]" } else { $v = Read-Host $label }
  if ([string]::IsNullOrWhiteSpace($v)) { return $default } else { return $v.Trim() }
}
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }

# ---------------------------------------------------------------- 1. Node.js
Refresh-Path
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -or ([int]((& node -v).TrimStart('v').Split('.')[0]) -lt 22)) {
  Write-Host "Node.js 22+ n'est pas installé : installation (2-3 minutes)..." -ForegroundColor Yellow
  $ok = $false
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    try { & winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null; $ok = $true } catch {}
  }
  if (-not $ok) {
    $msi = Join-Path $env:TEMP 'node-lts.msi'
    $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ver = (Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing | Where-Object { $_.version -like 'v22.*' } | Select-Object -First 1).version
    Invoke-WebRequest -Uri "https://nodejs.org/dist/$ver/node-$ver-$arch.msi" -OutFile $msi -UseBasicParsing
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
  }
  Refresh-Path
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js n'a pas pu être installé. Installez-le depuis https://nodejs.org (version LTS) puis relancez INSTALLER.bat." }
}
Write-Host ("Node.js " + (& node -v)) -ForegroundColor Green

# ---------------------------------------------------------------- 2. dépendances
if (-not (Test-Path (Join-Path $here 'node_modules\ws'))) {
  Write-Host 'Installation des dépendances...'
  & npm install --omit=dev --no-audit --no-fund | Out-Null
}

# ---------------------------------------------------------------- 3. serveur + PIN
Write-Host ''
$server = Ask "Adresse du serveur en ligne" $(if ($old) { $old.server_url } else { 'https://fusionlartisan-production.up.railway.app' })
if ($server -notmatch '^https?://') { $server = 'https://' + $server }
$server = $server.TrimEnd('/')
try { $health = Invoke-RestMethod -Uri "$server/api/health" -TimeoutSec 15 } catch { throw "Impossible de joindre $server ($($_.Exception.Message)). Vérifiez l'adresse et la connexion Internet." }
Write-Host ("Serveur trouvé : " + $health.cafe_name + " (version " + $health.version + ")") -ForegroundColor Green

$token = $null
for ($i = 0; $i -lt 3 -and -not $token; $i++) {
  $pin = Read-Host "Code PIN du panneau d'administration" -AsSecureString
  $pinPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pin))
  try {
    $login = Invoke-RestMethod -Method Post -Uri "$server/api/admin/login" -ContentType 'application/json' -Body (@{ pin = $pinPlain } | ConvertTo-Json)
    $token = $login.token
  } catch { Write-Host 'PIN incorrect.' -ForegroundColor Red }
}
if (-not $token) { throw 'Connexion au panneau impossible.' }
$h = @{ Authorization = "Bearer $token" }

# ---------------------------------------------------------------- 4. jeton de l'agent (réutilise celui du serveur, sinon en crée un)
$ag = Invoke-RestMethod -Uri "$server/api/admin/print/agent-token" -Headers $h
$agentToken = $ag.token
$reuse = $false
if ($agentToken -and $old -and $old.token -eq $agentToken) { $reuse = $true }
if (-not $agentToken -or (-not $reuse -and $ag.agents.Count -eq 0)) {
  $agentToken = (Invoke-RestMethod -Method Post -Uri "$server/api/admin/print/agent-token" -Headers $h).token
} elseif (-not $reuse -and $ag.agents.Count -gt 0) {
  Write-Host ("Un autre agent est déjà connecté (" + ($ag.agents | ForEach-Object { $_.name }) + ").") -ForegroundColor Yellow
  $r = Ask "Générer un nouveau jeton ? L'autre agent sera déconnecté (o/N)" 'N'
  if ($r -match '^[oOyY]') { $agentToken = (Invoke-RestMethod -Method Post -Uri "$server/api/admin/print/agent-token" -Headers $h).token }
  else { throw "Copiez le jeton depuis le panneau (Paramètres → Imprimante) dans print-agent.json, ou relancez en acceptant un nouveau jeton." }
}

# ---------------------------------------------------------------- 5. imprimante
$printers = @(& node agent.js --printers 2>$null | Where-Object { $_ -and $_ -notmatch '^(Fax|Microsoft Print to PDF|Microsoft XPS|OneNote)' })
Write-Host ''
if ($printers.Count -eq 0) { throw "Aucune imprimante installée dans Windows. Installez d'abord le pilote Star (l'imprimante doit apparaître dans Paramètres → Imprimantes), puis relancez." }
Write-Host 'Imprimantes trouvées :'
for ($i = 0; $i -lt $printers.Count; $i++) { Write-Host ("  " + ($i + 1) + ". " + $printers[$i]) }
$star = $printers | Where-Object { $_ -match 'Star|TSP' -and $_ -notmatch 'COM6' } | Select-Object -First 1
if (-not $star) { $star = $printers | Where-Object { $_ -match 'Star|TSP' } | Select-Object -First 1 }
$defaultIdx = if ($star) { [array]::IndexOf($printers, $star) + 1 } else { 1 }
$choice = Ask "Numéro de l'imprimante à utiliser" "$defaultIdx"
$printer = $printers[[int]$choice - 1]
if (-not $printer) { throw 'Choix invalide.' }
Write-Host ("Imprimante : " + $printer) -ForegroundColor Green

# ---------------------------------------------------------------- 6. serveur en mode agent
$agentName = Ask "Nom de cet ordinateur (affiché dans le panneau)" $(if ($old) { $old.agent_name } else { $env:COMPUTERNAME })
$patch = @{ print_enabled = $true; print_mode = 'agent'; print_printer_name = $printer } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$server/api/admin/settings" -Headers $h -ContentType 'application/json' -Body $patch | Out-Null

# ---------------------------------------------------------------- 7. print-agent.json
@{ server_url = $server; token = $agentToken; printer_name = $printer; print_mode = 'windows'; agent_name = $agentName } |
  ConvertTo-Json | Set-Content -Path $cfgPath -Encoding UTF8
Write-Host "Configuration enregistrée : $cfgPath" -ForegroundColor Green

# ---------------------------------------------------------------- 8. démarrage automatique
$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup "L'Artisan - Agent d'impression.lnk"
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = Join-Path $here 'start-print-agent.bat'
$sc.WorkingDirectory = $here
$sc.WindowStyle = 7   # réduit
$sc.Save()
Write-Host "Démarrage automatique ajouté : $lnk" -ForegroundColor Green

# ---------------------------------------------------------------- test
Write-Host ''
$r = Ask "Imprimer un ticket de test maintenant ? (O/n)" 'O'
if ($r -match '^[oOyY]') {
  $job = Start-Process -FilePath 'node' -ArgumentList 'agent.js' -WorkingDirectory $here -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 4
  try {
    $body = @{ print_mode = 'agent'; print_printer_name = $printer; print_cmd = 'star'; print_width = 42; print_copies = 1; print_cut = $true; print_prices = $true } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$server/api/admin/print/test" -Headers $h -ContentType 'application/json' -Body $body | Out-Null
    Write-Host 'Ticket de test envoyé : il doit sortir de l''imprimante.' -ForegroundColor Green
  } catch { Write-Host ("Le test a échoué : " + $_.Exception.Message) -ForegroundColor Red }
  Start-Sleep -Seconds 3
  try { Stop-Process -Id $job.Id -Force } catch {}
}
exit 0
