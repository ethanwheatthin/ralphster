# Ralph Web - Setup Script
# Run this to set up the development environment

Write-Host "🍩 Ralph Agent Manager - Setup" -ForegroundColor Yellow
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found. Please install Node.js v16 or higher." -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green

# Check npm
$npmVersion = npm --version 2>$null
Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
Write-Host ""

# Check if ralph.ps1 exists
Write-Host "Checking for ralph.ps1..." -ForegroundColor Cyan
$ralphPath = Join-Path $PSScriptRoot "..\ralph.ps1"
if (Test-Path $ralphPath) {
    Write-Host "✅ Found ralph.ps1" -ForegroundColor Green
} else {
    Write-Host "⚠️  ralph.ps1 not found at expected location" -ForegroundColor Yellow
    Write-Host "   Expected: $ralphPath" -ForegroundColor Yellow
    Write-Host "   You may need to update the path in backend/ralph-manager.js" -ForegroundColor Yellow
}
Write-Host ""

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
npm install
$frontendResult = $LASTEXITCODE
Pop-Location

if ($frontendResult -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Create .env file if it doesn't exist
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    @"
PORT=5000
NODE_ENV=development
"@ | Out-File -FilePath $envPath -Encoding utf8
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

# Success message
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Development mode (recommended):" -ForegroundColor Yellow
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Or start backend and frontend separately:" -ForegroundColor Yellow
Write-Host "    npm run server  " -ForegroundColor White -NoNewline
Write-Host "  # Backend on port 5000" -ForegroundColor Gray
Write-Host "    npm run client  " -ForegroundColor White -NoNewline
Write-Host "  # Frontend on port 3000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Production mode:" -ForegroundColor Yellow
Write-Host "    npm run build && npm start" -ForegroundColor White
Write-Host ""
Write-Host "Then open: " -ForegroundColor Cyan -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor White -NoNewline
Write-Host " (dev) or " -ForegroundColor Cyan -NoNewline
Write-Host "http://localhost:5000" -ForegroundColor White -NoNewline
Write-Host " (prod)" -ForegroundColor Cyan
Write-Host ""
