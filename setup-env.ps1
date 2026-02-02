# Ralph Environment Setup
# Run this once to configure your shell for Ralph + Ollama + Claude Code

Write-Host @"

🔧 RALPH ENVIRONMENT SETUP
==========================

Setting environment variables for Claude Code with Ollama...

"@ -ForegroundColor Yellow

# Set environment variables for current session
$env:ANTHROPIC_AUTH_TOKEN = "ollama"
$env:ANTHROPIC_API_KEY = ""
$env:ANTHROPIC_BASE_URL = "http://localhost:11434"

Write-Host "✅ Environment variables set for this session:" -ForegroundColor Green
Write-Host "   ANTHROPIC_AUTH_TOKEN = ollama" -ForegroundColor Cyan
Write-Host "   ANTHROPIC_API_KEY = (empty)" -ForegroundColor Cyan
Write-Host "   ANTHROPIC_BASE_URL = http://localhost:11434" -ForegroundColor Cyan

Write-Host @"

📝 To make these permanent, add to your PowerShell profile:
   
   `$env:ANTHROPIC_AUTH_TOKEN = "ollama"
   `$env:ANTHROPIC_API_KEY = ""
   `$env:ANTHROPIC_BASE_URL = "http://localhost:11434"

   Profile location: $PROFILE

🚀 You can now run:
   
   claude --model qwen3-coder
   
   Or start the Ralph loop:
   
   .\ralph.ps1

"@ -ForegroundColor White

# Optionally add to profile
$addToProfile = Read-Host "Add to PowerShell profile for permanence? (y/n)"
if ($addToProfile -eq 'y') {
    $profileContent = @"

# Ralph/Ollama/Claude Code environment
`$env:ANTHROPIC_AUTH_TOKEN = "ollama"
`$env:ANTHROPIC_API_KEY = ""
`$env:ANTHROPIC_BASE_URL = "http://localhost:11434"
"@
    
    # Create profile if doesn't exist
    if (-not (Test-Path $PROFILE)) {
        New-Item -Path $PROFILE -ItemType File -Force | Out-Null
    }
    
    Add-Content -Path $PROFILE -Value $profileContent
    Write-Host "`n✅ Added to profile: $PROFILE" -ForegroundColor Green
    Write-Host "   Restart PowerShell or run: . `$PROFILE" -ForegroundColor Cyan
}

Write-Host "`n🍩 Setup complete! Ralph is ready." -ForegroundColor Yellow
