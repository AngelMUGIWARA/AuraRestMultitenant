# Quick route verification script
# Usage: .\scripts\verify-routes.ps1

$port = 3000
$baseUrl = "http://localhost:$port"

$routes = @(
    "/auth/login",
    "/auth/forgot-password",
    "/auth/change-password",
    "/dashboard",
    "/admin/users",
    "/admin/settings",
    "/"
)

Write-Host "`n=== Route Verification ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Gray

$results = @()

foreach ($route in $routes) {
    $url = "$baseUrl$route"
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -SkipHttpErrorCheck
        $status = $response.StatusCode
        $color = if ($status -eq 200) { "Green" } else { "Red" }
        $icon = if ($status -eq 200) { "✓" } else { "✗" }

        Write-Host "$icon $route`t$status" -ForegroundColor $color

        $results += @{
            Route = $route
            Status = $status
            Success = ($status -eq 200)
        }
    } catch {
        Write-Host "✗ $route`tERROR: Connection failed" -ForegroundColor Red
        $results += @{
            Route = $route
            Status = "ERROR"
            Success = $false
        }
    }
}

$successCount = ($results | Where-Object { $_.Success }).Count
$totalCount = $results.Count

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "$successCount/$totalCount routes returned 200 OK" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($successCount -eq $totalCount) {
    Write-Host "`n✓ All routes verified successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n✗ Some routes failed" -ForegroundColor Red
    exit 1
}
