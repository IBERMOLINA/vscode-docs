# GitHub MCP Server Setup Guide

The GitHub MCP server installation has been fixed and configured. Here are the available options:

## Option 1: Local GitHub MCP Server (Recommended for Development)

**Configuration File**: `.vscode/mcp.json`

This uses the `github-mcp-server` npm package that provides comprehensive Git operations and GitHub integration.

### Features:
- 30 MCP operations + 33 CLI aliases
- Complete Git workflow management
- Local execution for better performance
- Comprehensive Git operations (init, add, commit, push, pull, branch management, etc.)
- Advanced workflows (merge, rebase, cherry-pick, tagging, etc.)

### Setup:
1. ✅ **Already installed**: `github-mcp-server` package
2. ✅ **Configuration created**: `.vscode/mcp.json`
3. **Required**: GitHub Personal Access Token (PAT)

### To use:
1. Open VS Code in this workspace
2. When prompted, enter your GitHub Personal Access Token
3. The MCP server will be available in Copilot Chat agent mode

## Option 2: Remote GitHub MCP Server (Official GitHub)

**Configuration File**: `.vscode/mcp-remote.json`

This uses GitHub's official remote MCP server hosted at `https://api.githubcopilot.com/mcp`.

### Features:
- Official GitHub MCP server
- Remote execution (no local dependencies)
- Integrated with GitHub Copilot authentication
- Repository management, issues, pull requests

### Setup:
1. ✅ **Configuration created**: `.vscode/mcp-remote.json`
2. **Required**: GitHub Copilot subscription and authentication

### To switch to remote server:
1. Rename `.vscode/mcp.json` to `.vscode/mcp-local.json`
2. Rename `.vscode/mcp-remote.json` to `.vscode/mcp.json`
3. Restart VS Code

## Creating GitHub Personal Access Token (PAT)

For the local server option, you'll need a PAT with these scopes:
- `repo` - Full control of private repositories
- `issues` - Read/write access to issues
- `pull_requests` - Read/write access to pull requests

### Steps:
1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the required scopes above
4. Copy the generated token
5. Enter it when VS Code prompts for the GitHub token

## Usage in VS Code

1. Open the Chat view (Ctrl+Shift+P → "Chat: Open Chat")
2. Select "Agent" mode from the dropdown
3. Click the "Tools" button to see available MCP tools
4. Use prompts like:
   - "List my GitHub repositories"
   - "Show the status of this Git repository"
   - "Create a new branch called feature-xyz"
   - "Commit all changes with message 'Fix bug'"

## Troubleshooting

### If MCP server doesn't start:
1. Check VS Code output panel (View → Output → select "MCP")
2. Verify your GitHub token has correct permissions
3. Try restarting VS Code
4. Use Command Palette: "MCP: Restart Server"

### If authentication fails:
1. Verify your GitHub PAT is valid and not expired
2. Check that the token has the required scopes
3. Try regenerating the token

### Switch between configurations:
- Use `.vscode/mcp.json` for the active configuration
- Keep backup configurations with different names
- Restart VS Code after changing configurations

## Files Created:
- ✅ `.vscode/mcp.json` - Local GitHub MCP server configuration
- ✅ `.vscode/mcp-remote.json` - Remote GitHub MCP server configuration
- ✅ `GITHUB_MCP_SETUP.md` - This setup guide

The GitHub MCP server is now ready to use! 🚀