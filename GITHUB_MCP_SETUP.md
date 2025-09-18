# GitHub MCP Server Setup Guide

## ✅ Installation Status

The GitHub MCP (Model Context Protocol) server has been configured successfully!

## 📁 Configuration Files Created

1. **Workspace Configuration**: `/workspace/.vscode/mcp.json`
2. **User Configuration**: `~/mcp.json`

Both files contain the following configuration:
```json
{
  "servers": {
    "github-mcp": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    }
  }
}
```

## 🔑 Authentication Setup Required

To use the GitHub MCP server, you need to set up authentication:

### Step 1: Generate a GitHub Personal Access Token

1. Go to [GitHub Settings - Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give your token a descriptive name (e.g., "MCP Server Access")
4. Select the following scopes based on your needs:
   - `repo` - Full control of private repositories
   - `read:org` - Read org and team membership
   - `read:user` - Read user profile data
   - `workflow` - Update GitHub Action workflows (optional)
5. Click **"Generate token"** and copy the token

### Step 2: Set the Environment Variable

#### Option A: Temporary (current session only)
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN='your_token_here'
```

#### Option B: Permanent (add to shell configuration)
```bash
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

## 🚀 How to Use

After setting up authentication and restarting Cursor/VS Code:

1. **In Chat View**: 
   - Type `#` to see available tools
   - Look for `github-mcp` in the tools list

2. **Example Prompts**:
   - "What are my open issues #github-mcp"
   - "List my GitHub repositories #github-mcp"
   - "Show recent pull requests #github-mcp"

3. **Command Palette**:
   - Press `Ctrl/Cmd + Shift + P`
   - Search for "MCP: List Servers"
   - Verify that `github-mcp` appears in the list

## 🔧 Troubleshooting

### Server Not Appearing
1. Ensure you've restarted Cursor/VS Code after configuration
2. Check that the mcp.json file exists in `.vscode/` directory
3. Verify the JSON syntax is correct

### Authentication Issues
1. Ensure your GitHub token is valid and not expired
2. Check that the environment variable is set correctly:
   ```bash
   echo $GITHUB_PERSONAL_ACCESS_TOKEN
   ```
3. Verify your token has the necessary scopes

### Testing the Setup
Run the included setup script to verify your configuration:
```bash
./setup-github-mcp.sh
```

## 📚 Additional Resources

- [GitHub MCP Server Documentation](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot/using-mcp-servers-with-github-copilot)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/mcp-servers)

## ⚠️ Security Notes

- Never commit your GitHub Personal Access Token to version control
- Consider using a `.env` file for token management (add to `.gitignore`)
- Regularly rotate your access tokens for security
- Use tokens with minimal required scopes