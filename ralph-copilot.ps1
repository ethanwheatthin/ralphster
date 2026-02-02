# Ralph Copilot CLI Integration
# Creates and manages Ralph agents for GitHub Copilot CLI
#
# Usage: .\ralph-copilot.ps1 [-Command <command>] [-AgentName <name>] [options]

param(
    [ValidateSet('create', 'list', 'delete', 'run', 'help')]
    [string]$Command = 'help',
    
    [string]$AgentName = '',
    [string]$Description = '',
    [string]$Model = 'gpt-5-mini',
    [string]$PromptFile = '',
    [string[]]$Tools = @('read', 'edit', 'search', 'run_terminal'),
    [string]$TargetEnvironment = '', # 'vscode', 'github-copilot', or empty for both
    [switch]$OrganizationLevel
)

$ErrorActionPreference = "Stop"

# Configuration
$script:AgentsDir = if ($OrganizationLevel) {
    Join-Path $PSScriptRoot ".github-private\agents"
} else {
    Join-Path $PSScriptRoot ".github\agents"
}

$script:Colors = @{
    Info = "Cyan"
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Accent = "Magenta"
}

function Show-Banner {
    $banner = @"

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🍩 RALPH COPILOT CLI MANAGER 🍩                           ║
║                                                            ║
║  Create and manage Ralph agents for Copilot CLI            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

"@
    Write-Host $banner -ForegroundColor $script:Colors.Accent
}

function Show-Help {
    Show-Banner
    $helpText = @"
Ralph Copilot CLI Manager - Create and manage custom Ralph agents

USAGE:
    .\ralph-copilot.ps1 -Command <command> [options]

COMMANDS:
    create      Create a new Ralph agent
    list        List all Ralph agents
    delete      Delete a Ralph agent
    run         Run a Ralph agent with Copilot CLI
    help        Show this help message

CREATE OPTIONS:
    -AgentName <name>           Name for the agent (required)
    -Description <text>         Agent description
    -Model <model>              AI model to use (default: gpt-5-mini)
    -PromptFile <path>          Path to custom prompt template
    -Tools <tools>              Comma-separated list of tools
    -TargetEnvironment <env>    'vscode', 'github-copilot', or empty for both
    -OrganizationLevel          Create org-level agent (in .github-private)

EXAMPLES:
    # Create a basic Ralph agent
    .\ralph-copilot.ps1 -Command create -AgentName "code-reviewer" -Description "Reviews code for quality"

    # Create agent with custom model and tools
    .\ralph-copilot.ps1 -Command create -AgentName "test-writer" -Model "gpt-4o" -Tools "read","edit","search"

    # Create from a template prompt
    .\ralph-copilot.ps1 -Command create -AgentName "api-builder" -PromptFile ".\templates\api-prompt.md"

    # Create organization-level agent
    .\ralph-copilot.ps1 -Command create -AgentName "company-standard" -OrganizationLevel

    # List all agents
    .\ralph-copilot.ps1 -Command list

    # Delete an agent
    .\ralph-copilot.ps1 -Command delete -AgentName "old-agent"

    # Run an agent with Copilot CLI
    .\ralph-copilot.ps1 -Command run -AgentName "code-reviewer" -PromptFile "PROMPT.md"

"@
    Write-Host $helpText -ForegroundColor $script:Colors.Info
}

function Ensure-AgentsDirectory {
    if (-not (Test-Path $script:AgentsDir)) {
        New-Item -Path $script:AgentsDir -ItemType Directory -Force | Out-Null
        Write-Host "✅ Created agents directory: $script:AgentsDir" -ForegroundColor $script:Colors.Success
    }
}

function Get-RalphAgents {
    Ensure-AgentsDirectory
    
    $agentFiles = Get-ChildItem -Path $script:AgentsDir -Filter "*.agent.md" -File
    $agents = @()
    
    foreach ($file in $agentFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Parse YAML frontmatter
        if ($content -match '(?s)^---\s*\n(.*?)\n---') {
            $yamlContent = $matches[1]
            $agent = @{
                FileName = $file.Name
                AgentName = $file.BaseName -replace '\.agent$', ''
                FilePath = $file.FullName
            }
            
            # Extract YAML properties
            if ($yamlContent -match 'name:\s*(.+)') { $agent.Name = $matches[1].Trim() }
            if ($yamlContent -match 'description:\s*(.+)') { $agent.Description = $matches[1].Trim() }
            if ($yamlContent -match 'model:\s*(.+)') { $agent.Model = $matches[1].Trim() }
            if ($yamlContent -match 'target:\s*(.+)') { $agent.Target = $matches[1].Trim() }
            
            $agents += [PSCustomObject]$agent
        }
    }
    
    return $agents
}

function New-RalphAgent {
    param(
        [string]$Name,
        [string]$Description,
        [string]$Model,
        [string[]]$Tools,
        [string]$PromptTemplate,
        [string]$TargetEnv
    )
    
    Ensure-AgentsDirectory
    
    # Sanitize agent name for filename
    $sanitizedName = $Name -replace '[^a-zA-Z0-9\-_\.]', '-' -replace '--+', '-'
    $agentFilePath = Join-Path $script:AgentsDir "$sanitizedName.agent.md"
    
    if (Test-Path $agentFilePath) {
        throw "Agent already exists: $sanitizedName"
    }
    
    # Load or create prompt content
    if ($PromptTemplate -and (Test-Path $PromptTemplate)) {
        $promptContent = Get-Content -Path $PromptTemplate -Raw
    } else {
$promptContent = @"
# $Name - Ralph Wiggum Agent

You are $Name, a specialized Ralph Wiggum coding agent with focused expertise.

## Your Purpose

$Description

## Core Behavior

- **Iterative Development**: Work in small, incremental steps
- **Self-Verification**: Check your work after each change
- **Clear Communication**: Explain what you're doing and why
- **Persistent**: Keep working until the task is complete

## Your Workflow

1. Read and understand the task from PROMPT.md (if available)
2. Break down complex tasks into manageable steps
3. Implement one step at a time
4. Verify each step works before proceeding
5. Report progress and blockers clearly

## Special Instructions

- Always read PROMPT.md at the start to understand the current task
- Make incremental changes rather than large rewrites
- Respect any constraints listed in PROMPT.md
- If you encounter errors, explain them and propose solutions
- Follow existing code patterns and project conventions

## Code Quality

- Write clean, well-commented code
- Use appropriate naming conventions
- Keep functions focused and small
- Include error handling where appropriate

*"Me fail coding? That's unpossible!"* 🍩
"@
    }
    
    # Build tools array for YAML
    $toolsYaml = if ($Tools -and $Tools.Count -gt 0) {
        '["' + ($Tools -join '", "') + '"]'
    } else {
        '["read", "edit", "search", "run_terminal"]'
    }
    
    # Build YAML frontmatter
    $frontmatter = @"
---
name: $sanitizedName
description: $Description
model: $Model
tools: $toolsYaml
"@
    
    if ($TargetEnv) {
        $frontmatter += "`ntarget: $TargetEnv"
    }
    
    $frontmatter += "`n---`n`n"
    
    # Combine frontmatter and content
    $agentContent = $frontmatter + $promptContent
    
    # Write agent file
    Set-Content -Path $agentFilePath -Value $agentContent -Encoding UTF8
    
    Write-Host "✅ Created Ralph agent: $sanitizedName" -ForegroundColor $script:Colors.Success
    Write-Host "   File: $agentFilePath" -ForegroundColor $script:Colors.Info
    Write-Host "   Model: $Model" -ForegroundColor $script:Colors.Info
    Write-Host "   Tools: $($Tools -join ', ')" -ForegroundColor $script:Colors.Info
    
    return $agentFilePath
}

function Remove-RalphAgent {
    param([string]$Name)
    
    $sanitizedName = $Name -replace '[^a-zA-Z0-9\-_\.]', '-'
    $agentFilePath = Join-Path $script:AgentsDir "$sanitizedName.agent.md"
    
    if (-not (Test-Path $agentFilePath)) {
        throw "Agent not found: $sanitizedName"
    }
    
    Remove-Item -Path $agentFilePath -Force
    Write-Host "✅ Deleted Ralph agent: $sanitizedName" -ForegroundColor $script:Colors.Success
}

function Invoke-RalphCopilotCLI {
    param(
        [string]$AgentName,
        [string]$Prompt
    )
    
    # Check if copilot CLI is available
    $copilotExists = Get-Command copilot -ErrorAction SilentlyContinue
    if (-not $copilotExists) {
        throw "GitHub Copilot CLI not found. Install it with: npm install -g @githubnext/github-copilot-cli"
    }
    
    Write-Host "🚀 Launching Ralph agent '$AgentName' with Copilot CLI..." -ForegroundColor $script:Colors.Success
    
    # Build command with safety flags
    $command = "copilot --allow-all-tools --allow-all-paths --agent=$AgentName"

    # Include model flag if specified
    if ($Model) {
        $command += " --model `"$Model`""
    }

    if ($Prompt) {
        $command += " --prompt `"$Prompt`""
    }
    
    Write-Host "   Command: $command" -ForegroundColor $script:Colors.Info
    Write-Host ""
    
    # Execute
    Invoke-Expression $command
}

# Main execution
switch ($Command.ToLower()) {
    'create' {
        Show-Banner
        
        if (-not $AgentName) {
            Write-Host "❌ Agent name is required" -ForegroundColor $script:Colors.Error
            Write-Host "   Usage: .\ralph-copilot.ps1 -Command create -AgentName YOUR-NAME" -ForegroundColor $script:Colors.Info
            exit 1
        }
        
        if (-not $Description) {
            $Description = "A specialized Ralph Wiggum coding agent"
        }
        
        try {
            New-RalphAgent -Name $AgentName -Description $Description -Model $Model -Tools $Tools -PromptTemplate $PromptFile -TargetEnv $TargetEnvironment
            
            Write-Host "`n📝 Next steps:" -ForegroundColor $script:Colors.Info
            Write-Host "   1. Edit the agent file to customize the prompt" -ForegroundColor $script:Colors.Info
            Write-Host "   2. Run: .\ralph-copilot.ps1 -Command run -AgentName $AgentName" -ForegroundColor $script:Colors.Info
            Write-Host "   3. Or use directly: copilot --agent=$AgentName" -ForegroundColor $script:Colors.Info
        }
        catch {
            Write-Host "❌ Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    'list' {
        Show-Banner
        $agents = Get-RalphAgents
        
        if ($agents.Count -eq 0) {
            Write-Host "No Ralph agents found in: $script:AgentsDir" -ForegroundColor $script:Colors.Warning
            Write-Host "`nCreate one with: .\ralph-copilot.ps1 -Command create -AgentName YOUR-NAME" -ForegroundColor $script:Colors.Info
        }
        else {
            Write-Host "📋 Ralph Agents ($($agents.Count) found):`n" -ForegroundColor $script:Colors.Success
            
            foreach ($agent in $agents) {
                Write-Host "  🍩 $($agent.AgentName)" -ForegroundColor $script:Colors.Accent
                Write-Host "     Name: $($agent.Name)" -ForegroundColor $script:Colors.Info
                Write-Host "     Description: $($agent.Description)" -ForegroundColor $script:Colors.Info
                Write-Host "     Model: $($agent.Model)" -ForegroundColor $script:Colors.Info
                if ($agent.Target) {
                    Write-Host "     Target: $($agent.Target)" -ForegroundColor $script:Colors.Info
                }
                Write-Host "     File: $($agent.FileName)" -ForegroundColor $script:Colors.Info
                Write-Host ""
            }
        }catch {
            Write-Host "❌ Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    'delete' {
        Show-Banner
        
        if (-not $AgentName) {
            Write-Host "❌ Agent name is required" -ForegroundColor $script:Colors.Error
            exit 1
        }
        
        try {
            Remove-RalphAgent -Name $AgentName
        }
        catch {
            Write-Host "❌ Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    'run' {
        Show-Banner
        
        if (-not $AgentName) {
            Write-Host "❌ Agent name is required" -ForegroundColor $script:Colors.Error
            exit 1
        }
        
        # Build prompt from PromptFile if provided
        $prompt = if ($PromptFile -and (Test-Path $PromptFile)) {
            "Read $PromptFile and start working on the task"
        } else {
            "Read PROMPT.md and start working on the task"
        }
        
        try {
            Invoke-RalphCopilotCLI -AgentName $AgentName -Prompt $prompt
        }
        catch {
            Write-Host "❌ Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    default {
        Show-Help
    }
}