$cfg = Get-Clipboard -Raw
if ($cfg -notmatch "apiKey") {
  Write-Host "Clipboard is not the Firebase config. Click the copy icon in Firebase first." -ForegroundColor Red
  return
}
$obj = [regex]::Match($cfg, "(?s)\{[^}]*\}").Value
@"
export const FIREBASE_CONFIG = $obj;

export const ALLOWED_EMAILS = ["siddhartharaja36@gmail.com"];

export const FIREBASE_VERSION = "10.12.2";
"@ | Set-Content js\firebase-config.js -Encoding UTF8
Get-Content js\firebase-config.js
