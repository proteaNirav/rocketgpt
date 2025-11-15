[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3000/api/edge",
  [string]$Origin  = "http://localhost:5173",
  [string[]]$Routes = @("ping","echo","test","hello"),
  [switch]$Json
)
$ErrorActionPreference = "Stop"
$results = New-Object System.Collections.Generic.List[object]
function Write-Section($t){ Write-Host "`n$t" -ForegroundColor Cyan }
function HasCors($h,$o){ ($h["Access-Control-Allow-Origin"] -eq $o) -or ($h["Access-Control-Allow-Origin"] -eq "*") }
function TryParseJson($text){ try { ,($true,($text|ConvertFrom-Json)) } catch { ,($false,$null) } }
function Validate-Body {
  param($route,$obj,$postedMsg)
  if ($null -eq $obj) { return $false }
  $r = $route.ToLower()
  if ($r -eq "ping")  { return ($obj.pong -eq $true) -or ($obj.status -eq "ok") }
  elseif ($r -eq "hello") { return ($null -ne $obj.greeting) -or ($obj.status -eq "ok") }
  elseif ($r -eq "test")  { return ($obj.ok -eq $true) -or ($obj.success -eq $true) -or ($null -ne $obj.status) }
  elseif ($r -eq "echo")  {
    if ($null -ne $obj.message) { return ($obj.message -eq $postedMsg) }
    if ($null -ne $obj.data)    { return ($obj.data -eq $postedMsg) }
    return $true
  } else { return $true }
}
Write-Section "=== RocketGPT Edge CORS + API Test ==="
Write-Host "Base URL : $BaseUrl"
Write-Host "Origin   : $Origin"
Write-Host "Routes   : $(($Routes -join ', '))"
Write-Host "--------------------------------------"
foreach ($route in $Routes) {
  $url = "$BaseUrl/$route"
  Write-Host "`n▶ Testing: $url" -ForegroundColor Yellow
  $row = [PSCustomObject]@{ Route=$route; OPTIONS=$false; GET=$false; POST=$null; CORS=$false; Notes="" }
  try {
    $preHeaders = @{ "Origin"=$Origin; "Access-Control-Request-Method"="POST"; "Access-Control-Request-Headers"="Content-Type, Authorization" }
    $pre = Invoke-WebRequest -Uri $url -Method OPTIONS -Headers $preHeaders
    $row.OPTIONS = ($pre.StatusCode -in 200,204)
    $row.CORS = HasCors $pre.Headers $Origin
    Write-Host ("{0} OPTIONS {1}" -f ($(if($row.OPTIONS){"✅"}else{"❌"})),$pre.StatusCode)
    Write-Host "   Allow-Origin : $($pre.Headers['Access-Control-Allow-Origin'])"
    Write-Host "   Allow-Methods: $($pre.Headers['Access-Control-Allow-Methods'])"
    Write-Host "   Allow-Headers: $($pre.Headers['Access-Control-Allow-Headers'])"
    $get = Invoke-WebRequest -Uri $url -Method GET -Headers @{ Origin=$Origin }
    $corsGet = HasCors $get.Headers $Origin
    $okGet,$getJson = TryParseJson $get.Content
$validGet = ($get.StatusCode -ge 200 -and $get.StatusCode -lt 300)
    $row.GET = $validGet
    $row.CORS = $row.CORS -and $corsGet
    Write-Host ("{0} GET {1}" -f ($(if($validGet){"✅"}else{"❌"})),$get.StatusCode)
    if (-not $okGet) { $row.Notes += "[GET JSON parse failed] " }
    if ($route -eq "echo") {
      $msg = "RocketGPT Edge Test OK"
      $post = Invoke-WebRequest -Uri $url -Method POST -Headers @{ Origin=$Origin; "Content-Type"="application/json" } -Body (@{ message=$msg }|ConvertTo-Json -Depth 6)
      $corsPost = HasCors $post.Headers $Origin
      $okPost,$postJson = TryParseJson $post.Content
$validPost = ($post.StatusCode -ge 200 -and $post.StatusCode -lt 300)
      $row.POST = $validPost
      $row.CORS = $row.CORS -and $corsPost
      Write-Host ("{0} POST {1}" -f ($(if($validPost){"✅"}else{"❌"})),$post.StatusCode)
      if (-not $okPost) { $row.Notes += "[POST JSON parse failed] " }
    }
  } catch {
    $row.Notes += $_.Exception.Message
    Write-Host ("❌ Error on route {0}: {1}" -f $route,$_.Exception.Message) -ForegroundColor Red
  }
  if (-not $row.CORS) { $row.Notes = ($row.Notes + "[CORS headers missing or mismatched] ").Trim() }
  $results.Add($row) | Out-Null
}
Write-Section "=== Summary ==="
$pretty = $results | Select-Object Route,OPTIONS,GET,POST,CORS,Notes
$pretty | Format-Table -AutoSize
$failed = $results | Where-Object {
  ($_.OPTIONS -ne $true) -or
  ($_.GET     -ne $true) -or
  (($_.Route -eq "echo") -and ($_.POST -ne $true)) -or
  ($_.CORS    -ne $true)
}
if ($Json) { $results | ConvertTo-Json -Depth 6 | Write-Output }
if ($failed) { Write-Host "`n❌ One or more checks failed." -ForegroundColor Red; exit 1 }
else { Write-Host "`n✅ All checks passed." -ForegroundColor Green; exit 0 }

