# Ralph Wiggum Loop - Batch Wrapper
# Launches the PowerShell Ralph loop script
# Double-click this file or run from command prompt

@echo off
title Ralph Wiggum Loop - Ollama + Claude Code
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "ralph.ps1" %*
pause
