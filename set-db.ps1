$secureUrl = Read-Host 'Neon direct DATABASE_URL' -AsSecureString
$urlPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)

try {
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($urlPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($urlPointer)
}