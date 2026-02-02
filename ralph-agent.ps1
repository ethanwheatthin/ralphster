# Ralph Web Agent Launcher
# Simplified launcher for web application use
# This directly executes the Ralph loop without relying on complex function definitions

param(
    [string]$PromptFile = "PROMPT.md",
    [string]$Model = "qwen3-coder",
    [int]$MaxIterations = 0
)

$ErrorActionPreference = "Continue"

Write-Host "🍩 Ralph Agent Starting..." -ForegroundColor Yellow
Write-Host "Model: $Model" -ForegroundColor Cyan
Write-Host "Prompt: $PromptFile" -ForegroundColor Cyan
Write-Host "Max Iterations: $(if ($MaxIterations -eq 0) { '∞' } else { $MaxIterations })" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
if (-not (Test-Path $PromptFile)) {
    Write-Host "❌ Prompt file not found: $PromptFile" -ForegroundColor Red
    exit 1
}

# Test Ollama connection
try {
    $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Ollama not running. Start it with: ollama serve" -ForegroundColor Red
    exit 1
}

# Test claude command
$claudeExists = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeExists) {
    Write-Host "❌ Claude Code not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Claude Code found" -ForegroundColor Green
Write-Host ""

# Set environment variables for Ollama
$env:ANTHROPIC_AUTH_TOKEN = "ollama"
$env:ANTHROPIC_API_KEY = ""
$env:ANTHROPIC_BASE_URL = "http://localhost:11434"

$iteration = 0
$startTime = Get-Date

Write-Host "🚀 Starting Ralph Loop (Ctrl+C to stop)..." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        $iteration++
        
        if ($MaxIterations -gt 0 -and $iteration -gt $MaxIterations) {
            Write-Host "✅ Completed $MaxIterations iterations" -ForegroundColor Green
            break
        }

        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta
        Write-Host "🍩 Iteration #$iteration - $timestamp" -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta

        # Read prompt
        $promptContent = Get-Content -Path $PromptFile -Raw
        
        # Execute claude
        try {
            $promptContent | claude --model $Model --print --dangerously-skip-permissions --verbose 2>&1
            
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
                Write-Host "⚠️ Claude exited with code: $LASTEXITCODE" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }

        # Brief pause between iterations
        Start-Sleep -Seconds 2
    }
}
finally {
    $endTime = Get-Date
    $duration = $endTime - $startTime
    Write-Host ""
    Write-Host "🛑 Ralph stopped after $iteration iterations" -ForegroundColor Yellow
    Write-Host "   Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
}
