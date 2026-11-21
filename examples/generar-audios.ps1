# Genera audios de prueba sinteticos (voz de Windows) a partir de examples/textos/*.txt
# y los convierte a .ogg Opus como los audios de WhatsApp. Requiere Windows + ffmpeg.
# Uso: powershell -ExecutionPolicy Bypass -File examples/generar-audios.ps1
# Para la demo real, reemplazalos por audios grabados con tu celular.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$textos = Join-Path $raiz 'textos'
$audios = Join-Path $raiz 'audios'
New-Item -ItemType Directory -Force $audios | Out-Null

$voz = New-Object System.Speech.Synthesis.SpeechSynthesizer
$es = $voz.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'es-*' } | Select-Object -First 1
if (-not $es) { throw 'No hay voces en espanol instaladas (Configuracion > Hora e idioma > Voz).' }
$voz.SelectVoice($es.VoiceInfo.Name)
$voz.Rate = 1

Get-ChildItem $textos -Filter *.txt | ForEach-Object {
  $texto = Get-Content -Raw -Encoding UTF8 $_.FullName
  $wav = Join-Path $env:TEMP ($_.BaseName + '.wav')
  $ogg = Join-Path $audios ($_.BaseName + '.ogg')
  $voz.SetOutputToWaveFile($wav)
  $voz.Speak($texto)
  $voz.SetOutputToNull()
  & ffmpeg -hide_banner -loglevel error -y -i $wav -c:a libopus -b:a 24k -ac 1 -ar 16000 $ogg
  Remove-Item $wav
  Write-Host "OK $ogg"
}
$voz.Dispose()
