# Ralph Quick Launcher
# Simplified launcher using ollama launch claude
# This sets up environment variables automatically

param(
    [string]$PromptFile = "PROMPT.md",
    [string]$Model = "qwen3-coder",
    [int]$MaxIterations = 0,
    [switch]$Configure,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Banner {
    Write-Host @"

    🍩 RALPH QUICK LAUNCHER 🍩
    Using: ollama launch claude
    
"@ -ForegroundColor Yellow
}

function Show-Help {
    Write-Host @"
Ralph Quick Launcher - Uses 'ollama launch claude' for easy setup

USAGE:
    .\ralph-quick.ps1 [OPTIONS]

OPTIONS:
    -PromptFile <path>     Path to prompt file (default: PROMPT.md)
    -Model <model>         Ollama model to use (default: qwen3-coder)
    -MaxIterations <n>     Max iterations, 0 = infinite (default: 0)
    -Configure             Run 'ollama launch claude --config' first
    -Help                  Show this help

FIRST TIME SETUP:
    .\ralph-quick.ps1 -Configure

THEN RUN:
    .\ralph-quick.ps1

"@ -ForegroundColor Cyan
}

function Start-Ralph {
    Show-Banner

    if ($Help) {
        Show-Help
        return
    }

    # First time configuration
    if ($Configure) {
        Write-Host "🔧 Running Ollama Claude configuration..." -ForegroundColor Cyan
        & ollama launch claude --config
        Write-Host "`n✅ Configuration complete! Now run: .\ralph-quick.ps1" -ForegroundColor Green
        return
    }

    # Check prompt file
    if (-not (Test-Path $PromptFile)) {
        Write-Host "❌ Prompt file not found: $PromptFile" -ForegroundColor Red
        Write-Host "   Create a PROMPT.md with your task description" -ForegroundColor Yellow
        return
    }

    Write-Host "📋 Prompt: $PromptFile" -ForegroundColor Cyan
    Write-Host "🤖 Model: $Model" -ForegroundColor Cyan
    Write-Host "🔄 Iterations: $(if ($MaxIterations -eq 0) { '∞' } else { $MaxIterations })" -ForegroundColor Cyan
    Write-Host "`n🚀 Starting Ralph Loop (Ctrl+C to stop)..." -ForegroundColor Green
    Write-Host ""

    $iteration = 0

    try {
        while ($true) {
            $iteration++
            
            if ($MaxIterations -gt 0 -and $iteration -gt $MaxIterations) {
                Write-Host "`n✅ Completed $MaxIterations iterations" -ForegroundColor Green
                break
            }

            $timestamp = Get-Date -Format "HH:mm:ss"
            Write-Host "`n═══════════════════════════════════════" -ForegroundColor Magenta
            Write-Host "🍩 Iteration #$iteration - $timestamp" -ForegroundColor Yellow
            Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta

            # Read prompt and pipe to ollama launch claude
            $promptContent = Get-Content -Path $PromptFile -Raw
            
            # Method 1: Use ollama launch claude (recommended - handles env vars)
            # This spawns a shell with claude configured
            # --dangerously-skip-permissions allows autonomous execution without prompts
            # --verbose shows full turn-by-turn output for debugging
            $promptContent | & ollama launch claude --model $Model --dangerously-skip-permissions --verbose

            # Brief pause between iterations
            Start-Sleep -Seconds 2
        }
    }
    finally {
        Write-Host "`n🛑 Ralph stopped after $iteration iterations" -ForegroundColor Yellow
    }
}

Start-Ralph
