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
    [string]$WorkingDirectory = '',
    [string[]]$Tools = @('read', 'edit', 'search', 'run_terminal'),
    [string]$TargetEnvironment = '', # 'vscode', 'github-copilot', or empty for both
    [switch]$OrganizationLevel,
    
    # Loop control parameters
    [int]$Iterations = 1,
    [string]$SourceFiles = '', # Comma-separated list of files to reference (e.g., "plans/prd.json,progress.txt")
    [string]$CompletionMarker = '<promise>COMPLETE</promise>',
    [switch]$NotifyOnComplete
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

================================================================
                                                                
  [RALPH] COPILOT CLI MANAGER [RALPH]                           
                                                                
  Create and manage Ralph agents for Copilot CLI                
                                                                
================================================================

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
    -WorkingDirectory <path>    Working directory for the agent task
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

    # Run an agent with single iteration
    .\ralph-copilot.ps1 -Command run -PromptFile "PROMPT.md"

    # Run with multiple iterations and source files
    .\ralph-copilot.ps1 -Command run -PromptFile "PROMPT.md" -Iterations 10 -SourceFiles "plans/prd.json,progress.txt" -Model "gpt-4o"

    # Run with working directory and completion detection
    .\ralph-copilot.ps1 -Command run -PromptFile "PROMPT.md" -WorkingDirectory "C:\projects\myapp" -Iterations 20 -NotifyOnComplete

"@
    Write-Host $helpText -ForegroundColor $script:Colors.Info
}

function Ensure-AgentsDirectory {
    if (-not (Test-Path $script:AgentsDir)) {
        New-Item -Path $script:AgentsDir -ItemType Directory -Force | Out-Null
        Write-Host "[OK] Created agents directory: $script:AgentsDir" -ForegroundColor $script:Colors.Success
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

- Iterative Development: Work in small, incremental steps
- Self-Verification: Check your work after each change
- Clear Communication: Explain what you're doing and why
- Persistent: Keep working until the task is complete

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

"Me fail coding? That's unpossible!"
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
    
    Write-Host "[OK] Created Ralph agent: $sanitizedName" -ForegroundColor $script:Colors.Success
    Write-Host "     File: $agentFilePath" -ForegroundColor $script:Colors.Info
    Write-Host "     Model: $Model" -ForegroundColor $script:Colors.Info
    Write-Host "     Tools: $($Tools -join ', ')" -ForegroundColor $script:Colors.Info
    
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
    Write-Host "[OK] Deleted Ralph agent: $sanitizedName" -ForegroundColor $script:Colors.Success
}

function Invoke-RalphCopilotCLI {
    param(
        [string]$Prompt,
        [string]$WorkingDir = '',
        [string]$ModelName = '',
        [string[]]$SourceFileRefs = @()
    )

    # Check if copilot CLI is available
    $copilotExists = Get-Command copilot -ErrorAction SilentlyContinue
    if (-not $copilotExists) {
        throw "GitHub Copilot CLI not found. Install it with: npm install -g @githubnext/github-copilot-cli"
    }

    # Change to working directory if specified
    $originalLocation = Get-Location
    if ($WorkingDir -and (Test-Path $WorkingDir)) {
        Set-Location $WorkingDir
    }

    try {
        # Build arguments list with safety flags
        $argsList = @(
            '--allow-all-tools',
            '--allow-tool', 'write',
            '--allow-tool', 'shell(composer)',
            '--allow-tool', 'shell(npm)',
            '--allow-tool', 'shell(npx)',
            '--allow-tool', 'shell(git)',
            '--deny-tool', 'shell(rm)',
            '--deny-tool', 'shell(git push)'
        )
        
        # Change to working directory if specified to scope file operations
        # Note: Copilot CLI does not support --allow-path or --deny-path flags

        # Add model if specified
        if ($ModelName) { 
            $argsList += @('--model', $ModelName) 
        }

        # Build prompt with source file references
        $fullPrompt = ""
        if ($SourceFileRefs -and $SourceFileRefs.Count -gt 0) {
            # Add file references in the format @filename
            $fileRefs = ($SourceFileRefs | ForEach-Object { "@$_" }) -join ' '
            $fullPrompt = "$fileRefs $Prompt"
        } else {
            $fullPrompt = $Prompt
        }

        if ($fullPrompt) {
            $argsList += @('-p', $fullPrompt)
        }

        # Prepare temp files to capture stdout/stderr (UTF8)
        $outFile = [System.IO.Path]::GetTempFileName()
        $errFile = [System.IO.Path]::GetTempFileName()

        # Build quoted command for cmd.exe
        $quotedArgs = $argsList | ForEach-Object {
            if ($_.Contains(' ') -or $_.Contains('(') -or $_.Contains(')')) { 
                '"' + ($_.Replace('"', '""')) + '"' 
            } else { 
                $_ 
            }
        }
        $fullCmd = 'copilot ' + ($quotedArgs -join ' ')

        # Run through cmd.exe to handle Windows shims properly
        $proc = Start-Process -FilePath 'cmd.exe' `
            -ArgumentList @('/c', $fullCmd) `
            -NoNewWindow `
            -Wait `
            -PassThru `
            -RedirectStandardOutput $outFile `
            -RedirectStandardError $errFile

        # Read captured output
        try {
            $stdOut = Get-Content -Path $outFile -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        } catch {
            $stdOut = Get-Content -Path $outFile -Raw -ErrorAction SilentlyContinue
        }
        try {
            $stdErr = Get-Content -Path $errFile -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        } catch {
            $stdErr = Get-Content -Path $errFile -Raw -ErrorAction SilentlyContinue
        }

        # Combine output for return value
        $result = if ($stdOut) { $stdOut } else { "" }
        if ($stdErr) { $result += "`n$stdErr" }

        # Clean up temp files
        Remove-Item -Path $outFile,$errFile -ErrorAction SilentlyContinue

        # Return result object with output and exit code
        return @{
            Output = $result
            ExitCode = $proc.ExitCode
        }
    }
    catch {
        Write-Host "[WARN] Error launching Copilot CLI: $_" -ForegroundColor $script:Colors.Warning
        return @{
            Output = $_.Exception.Message
            ExitCode = -1
        }
    }
    finally {
        # Restore original location
        Set-Location $originalLocation
    }
}

function Invoke-RalphLoop {
    param(
        [string]$Prompt,
        [string]$WorkingDir = '',
        [string]$ModelName = '',
        [int]$MaxIterations = 1,
        [string[]]$SourceFileRefs = @(),
        [string]$CompletionTag = '<promise>COMPLETE</promise>',
        [switch]$Notify
    )

    Write-Host "[RALPH] Starting Ralph Loop" -ForegroundColor $script:Colors.Accent
    Write-Host "        Iterations: $MaxIterations" -ForegroundColor $script:Colors.Info
    Write-Host "        Model: $ModelName" -ForegroundColor $script:Colors.Info
    if ($SourceFileRefs -and $SourceFileRefs.Count -gt 0) {
        Write-Host "        Source Files: $($SourceFileRefs -join ', ')" -ForegroundColor $script:Colors.Info
    }
    Write-Host "        Working Directory: $(if ($WorkingDir) { $WorkingDir } else { Get-Location })" -ForegroundColor $script:Colors.Info
    Write-Host ""

    for ($i = 1; $i -le $MaxIterations; $i++) {
        Write-Host "`n============================================" -ForegroundColor $script:Colors.Accent
        Write-Host "[LOOP] Iteration $i of $MaxIterations" -ForegroundColor $script:Colors.Accent
        Write-Host "============================================" -ForegroundColor $script:Colors.Accent
        Write-Host ""

        # Invoke Copilot CLI and capture result
        $result = Invoke-RalphCopilotCLI -Prompt $Prompt -WorkingDir $WorkingDir -ModelName $ModelName -SourceFileRefs $SourceFileRefs

        # Display output
        if ($result.Output) {
            Write-Host $result.Output
        }

        # Check exit code
        if ($result.ExitCode -ne 0) {
            Write-Host "`n[WARN] Copilot exited with status $($result.ExitCode); continuing to next iteration." -ForegroundColor $script:Colors.Warning
            continue
        } else {
            Write-Host "`n[OK] Iteration $i completed successfully." -ForegroundColor $script:Colors.Success
        }

        # Check for completion marker
        if ($CompletionTag -and $result.Output -like "*$CompletionTag*") {
            Write-Host "`n[DONE] Completion marker detected!" -ForegroundColor $script:Colors.Success
            Write-Host "       Found: $CompletionTag" -ForegroundColor $script:Colors.Info
            Write-Host "       Completed after $i iteration$(if ($i -ne 1) { 's' })." -ForegroundColor $script:Colors.Success
            
            # Send notification if requested
            if ($Notify) {
                $title = "Ralph Complete"
                $message = "PRD complete after $i iteration$(if ($i -ne 1) { 's' })"
                
                # Try Windows notification
                try {
                    Add-Type -AssemblyName System.Windows.Forms
                    $notification = New-Object System.Windows.Forms.NotifyIcon
                    $notification.Icon = [System.Drawing.SystemIcons]::Information
                    $notification.BalloonTipTitle = $title
                    $notification.BalloonTipText = $message
                    $notification.Visible = $true
                    $notification.ShowBalloonTip(5000)
                    Start-Sleep -Seconds 1
                    $notification.Dispose()
                } catch {
                    # Fallback to simple beep
                    [Console]::Beep(800, 200)
                    [Console]::Beep(1000, 200)
                }
            }
            
            return
        }
    }

    Write-Host "`n============================================" -ForegroundColor $script:Colors.Accent
    Write-Host "[END] Loop completed: $MaxIterations iteration$(if ($MaxIterations -ne 1) { 's' }) finished." -ForegroundColor $script:Colors.Info
    Write-Host "============================================" -ForegroundColor $script:Colors.Accent
}

# Main execution
switch ($Command.ToLower()) {
    'create' {
        Show-Banner
        
        if (-not $AgentName) {
            Write-Host "[X] Agent name is required" -ForegroundColor $script:Colors.Error
            Write-Host "    Usage: .\ralph-copilot.ps1 -Command create -AgentName YOUR-NAME" -ForegroundColor $script:Colors.Info
            exit 1
        }
        
        if (-not $Description) {
            $Description = "A specialized Ralph Wiggum coding agent"
        }
        
        try {
            New-RalphAgent -Name $AgentName -Description $Description -Model $Model -Tools $Tools -PromptTemplate $PromptFile -TargetEnv $TargetEnvironment
            
            Write-Host "`n[NOTE] Next steps:" -ForegroundColor $script:Colors.Info
            Write-Host "       1. Edit the agent file to customize the prompt" -ForegroundColor $script:Colors.Info
            Write-Host "       2. Run: .\ralph-copilot.ps1 -Command run -AgentName $AgentName" -ForegroundColor $script:Colors.Info
            Write-Host "       3. Or use directly: copilot --agent=$AgentName" -ForegroundColor $script:Colors.Info
        }
        catch {
            Write-Host "[X] Error: $_" -ForegroundColor $script:Colors.Error
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
            Write-Host "[LIST] Ralph Agents ($($agents.Count) found):`n" -ForegroundColor $script:Colors.Success
            
            foreach ($agent in $agents) {
                Write-Host "  [RALPH] $($agent.AgentName)" -ForegroundColor $script:Colors.Accent
                Write-Host "          Name: $($agent.Name)" -ForegroundColor $script:Colors.Info
                Write-Host "          Description: $($agent.Description)" -ForegroundColor $script:Colors.Info
                Write-Host "          Model: $($agent.Model)" -ForegroundColor $script:Colors.Info
                if ($agent.Target) {
                    Write-Host "          Target: $($agent.Target)" -ForegroundColor $script:Colors.Info
                }
                Write-Host "          File: $($agent.FileName)" -ForegroundColor $script:Colors.Info
                Write-Host ""
            }
        }catch {
            Write-Host "[X] Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    'delete' {
        Show-Banner
        
        if (-not $AgentName) {
            Write-Host "[X] Agent name is required" -ForegroundColor $script:Colors.Error
            exit 1
        }
        
        try {
            Remove-RalphAgent -Name $AgentName
        }
        catch {
            Write-Host "[X] Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    'run' {
        Show-Banner
        
        # Build the prompt
        $promptText = ""
        
        # Check if PromptFile is actually a file path or inline text
        if ($PromptFile) {
            if (Test-Path $PromptFile) {
                # It's a file, read the content
                $promptText = Get-Content -Path $PromptFile -Raw
            } else {
                # It's inline text (multi-line string passed directly)
                $promptText = $PromptFile
            }
        } else {
            # Default to reading PROMPT.md
            $promptText = "Read PROMPT.md and start working on the task"
        }
        
        # Add working directory instruction if specified
        if ($WorkingDirectory) {
            $promptText = "Your working directory is: $WorkingDirectory`n`nIMPORTANT: All file operations (create, read, edit) must be done in this directory or its subdirectories. Do not create files in any other location.`n`n$promptText"
        }
        
        # Parse source files if provided
        $sourceFileArray = @()
        if ($SourceFiles) {
            $sourceFileArray = $SourceFiles -split ',' | ForEach-Object { $_.Trim() }
        }
        
        try {
            if ($Iterations -gt 1) {
                # Use the loop function
                Invoke-RalphLoop -Prompt $promptText `
                    -WorkingDir $WorkingDirectory `
                    -ModelName $Model `
                    -MaxIterations $Iterations `
                    -SourceFileRefs $sourceFileArray `
                    -CompletionTag $CompletionMarker `
                    -Notify:$NotifyOnComplete
            } else {
                # Single iteration
                Write-Host "[START] Launching Copilot CLI..." -ForegroundColor $script:Colors.Success
                if ($sourceFileArray.Count -gt 0) {
                    Write-Host "        Source Files: $($sourceFileArray -join ', ')" -ForegroundColor $script:Colors.Info
                }
                Write-Host ""
                
                $result = Invoke-RalphCopilotCLI -Prompt $promptText `
                    -WorkingDir $WorkingDirectory `
                    -ModelName $Model `
                    -SourceFileRefs $sourceFileArray
                
                if ($result.Output) {
                    Write-Host $result.Output
                }
                
                if ($result.ExitCode -ne 0) {
                    Write-Host "`n[WARN] Copilot exited with status $($result.ExitCode)" -ForegroundColor $script:Colors.Warning
                } else {
                    Write-Host "`n[OK] Copilot completed successfully" -ForegroundColor $script:Colors.Success
                }
            }
        }
        catch {
            Write-Host "[X] Error: $_" -ForegroundColor $script:Colors.Error
            exit 1
        }
    }
    
    default {
        Show-Help
    }
}
