# Ralph Wiggum Loop - PowerShell Implementation
# A continuous loop that feeds PROMPT.md to Claude Code via Ollama
#
# Usage: .\ralph.ps1 [-PromptFile "PROMPT.md"] [-Model "qwen3-coder"] [-MaxIterations 0]
#        -MaxIterations 0 means infinite loop (default Ralph behavior)

param(
    [string]$PromptFile = "PROMPT.md",
    [string]$Model = "qwen3-coder",
    [int]$MaxIterations = 0,
    [switch]$DryRun,
    [switch]$Help
)

# Colors for output
$script:Colors = @{
    Ralph = "Yellow"
    Info = "Cyan"
    Success = "Green"
    Error = "Red"
    Iteration = "Magenta"
}

function Show-RalphBanner {
    $banner = @"
    
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║   🍩 RALPH WIGGUM LOOP 🍩                                     ║
    ║                                                               ║
    ║   "Me fail English? That's unpossible!"                       ║
    ║                                                               ║
    ║   Running Claude Code with Ollama in a continuous loop        ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝

"@
    Write-Host $banner -ForegroundColor $script:Colors.Ralph
}

function Show-Help {
    Write-Host @"
Ralph Wiggum Loop - Continuous AI Coding Agent

USAGE:
    .\ralph.ps1 [OPTIONS]

OPTIONS:
    -PromptFile <path>     Path to prompt file (default: PROMPT.md)
    -Model <model>         Ollama model to use (default: qwen3-coder)
    -MaxIterations <n>     Max iterations, 0 = infinite (default: 0)
    -DryRun                Show what would run without executing
    -Help                  Show this help message

EXAMPLES:
    .\ralph.ps1                                    # Run with defaults
    .\ralph.ps1 -Model "gpt-oss:20b"              # Use different model
    .\ralph.ps1 -MaxIterations 5                   # Run 5 iterations
    .\ralph.ps1 -PromptFile "my-task.md"          # Use custom prompt

RECOMMENDED MODELS:
    - qwen3-coder (default, good balance)
    - glm-4.7 
    - gpt-oss:20b
    - gpt-oss:120b (if you have the VRAM)

STOPPING:
    Press Ctrl+C to stop the loop gracefully.

"@ -ForegroundColor $script:Colors.Info
}

function Test-Prerequisites {
    Write-Host "`n🔍 Checking prerequisites..." -ForegroundColor $script:Colors.Info
    
    # Check if claude is available
    $claudeExists = Get-Command claude -ErrorAction SilentlyContinue
    if (-not $claudeExists) {
        Write-Host "❌ Claude Code not found. Install it first:" -ForegroundColor $script:Colors.Error
        Write-Host "   npm install -g @anthropic-ai/claude-code" -ForegroundColor $script:Colors.Info
        Write-Host "   Or: curl -fsSL https://claude.ai/install.sh | bash" -ForegroundColor $script:Colors.Info
        return $false
    }
    Write-Host "✅ Claude Code found" -ForegroundColor $script:Colors.Success

    # Check if ollama is running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Ollama is running" -ForegroundColor $script:Colors.Success
    }
    catch {
        Write-Host "❌ Ollama not running. Start it with: ollama serve" -ForegroundColor $script:Colors.Error
        return $false
    }

    # Check if prompt file exists
    if (-not (Test-Path $PromptFile)) {
        Write-Host "❌ Prompt file not found: $PromptFile" -ForegroundColor $script:Colors.Error
        Write-Host "   Create a PROMPT.md file with your task description" -ForegroundColor $script:Colors.Info
        return $false
    }
    Write-Host "✅ Prompt file found: $PromptFile" -ForegroundColor $script:Colors.Success

    return $true
}

function Get-RalphQuote {
    $quotes = @(
        "I'm learnding!",
        "Me fail English? That's unpossible!",
        "I bent my wookiee.",
        "My cat's breath smells like cat food.",
        "I found a moonrock in my nose!",
        "The doctor said I wouldn't have so many nose bleeds if I kept my finger outta there.",
        "I'm a unitard!",
        "That's where I saw the leprechaun. He tells me to burn things.",
        "My parents won't let me use scissors.",
        "I eated the purple berries.",
        "Slow down, I want to get there too!",
        "I'm helping!",
        "Hi, Super Nintendo Chalmers!",
        "When I grow up, I'm going to Bovine University!"
    )
    return $quotes | Get-Random
}

function Invoke-RalphIteration {
    param(
        [int]$Iteration
    )
    
    $quote = Get-RalphQuote
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "`n" -NoNewline
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $script:Colors.Iteration
    Write-Host "🍩 RALPH ITERATION #$Iteration - $timestamp" -ForegroundColor $script:Colors.Iteration
    Write-Host "💬 `"$quote`"" -ForegroundColor $script:Colors.Ralph
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $script:Colors.Iteration
    Write-Host ""

    # Read the prompt
    $promptContent = Get-Content -Path $PromptFile -Raw

    if ($DryRun) {
        Write-Host "[DRY RUN] Would execute: claude --model $Model with prompt from $PromptFile" -ForegroundColor $script:Colors.Info
        return $true
    }

    # Set environment variables for Ollama
    $env:ANTHROPIC_AUTH_TOKEN = "ollama"
    $env:ANTHROPIC_API_KEY = ""
    $env:ANTHROPIC_BASE_URL = "http://localhost:11434"

    # Execute claude with the prompt piped in
    try {
        # Use claude with --print flag for non-interactive mode, pipe in the prompt
        # --dangerously-skip-permissions allows autonomous execution without prompts
        # --verbose shows full turn-by-turn output for debugging
        $promptContent | claude --model $Model --print --dangerously-skip-permissions --verbose
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Claude exited with code: $LASTEXITCODE" -ForegroundColor $script:Colors.Error
        }
    }
    catch {
        Write-Host "❌ Error running Claude: $_" -ForegroundColor $script:Colors.Error
        return $false
    }

    return $true
}

function Start-RalphLoop {
    Show-RalphBanner

    if ($Help) {
        Show-Help
        return
    }

    Write-Host "📋 Configuration:" -ForegroundColor $script:Colors.Info
    Write-Host "   Prompt File: $PromptFile" -ForegroundColor $script:Colors.Info
    Write-Host "   Model: $Model" -ForegroundColor $script:Colors.Info
    Write-Host "   Max Iterations: $(if ($MaxIterations -eq 0) { 'Infinite ∞' } else { $MaxIterations })" -ForegroundColor $script:Colors.Info
    
    if (-not (Test-Prerequisites)) {
        return
    }

    Write-Host "`n🚀 Starting Ralph Loop... (Ctrl+C to stop)" -ForegroundColor $script:Colors.Success
    Write-Host ""

    $iteration = 0
    $startTime = Get-Date

    try {
        while ($true) {
            $iteration++
            
            # Check if we've hit max iterations
            if ($MaxIterations -gt 0 -and $iteration -gt $MaxIterations) {
                Write-Host "`n✅ Completed $MaxIterations iterations" -ForegroundColor $script:Colors.Success
                break
            }

            $success = Invoke-RalphIteration -Iteration $iteration

            if (-not $success) {
                Write-Host "⚠️  Iteration $iteration had issues, continuing..." -ForegroundColor $script:Colors.Error
            }

            # Small pause between iterations to prevent hammering
            Start-Sleep -Seconds 2
        }
    }
    catch {
        # Handle Ctrl+C gracefully
    }
    finally {
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        Write-Host "`n" -NoNewline
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $script:Colors.Ralph
        Write-Host "🛑 Ralph Loop Stopped" -ForegroundColor $script:Colors.Ralph
        Write-Host "   Total Iterations: $iteration" -ForegroundColor $script:Colors.Info
        Write-Host "   Total Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor $script:Colors.Info
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $script:Colors.Ralph
    }
}

# Run the loop
Start-RalphLoop
