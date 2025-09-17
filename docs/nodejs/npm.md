# npm in VS Code

npm (Node Package Manager) is the default package manager for Node.js and an essential tool for JavaScript and Node.js development. VS Code provides rich support for npm workflows, from package management to script execution and debugging.

## Installation and Setup

### Installing npm

npm is included with Node.js. To install the latest LTS version of Node.js (which includes npm):

1. Visit [nodejs.org](https://nodejs.org) and download the LTS version
2. Follow the installation instructions for your operating system
3. Verify installation by running:

```bash
node --version
npm --version
```

### npm in VS Code Terminal

You can run npm commands directly in VS Code's [integrated terminal](/docs/terminal/basics.md):

- **Windows**: `Ctrl+`` ` (backtick)
- **macOS**: `Cmd+`` ` (backtick)
- **Linux**: `Ctrl+`` ` (backtick)

## npm Scripts

### Running npm Scripts

VS Code provides multiple ways to run npm scripts defined in your `package.json`:

1. **Command Palette**: Press `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) and search for "Tasks: Run Task", then select your npm script.

2. **npm Scripts Explorer**: Enable the npm scripts view in the Explorer panel by adding this to your settings:

```json
{
    "npm.enableScriptExplorer": true
}
```

3. **Terminal**: Run scripts directly using:

```bash
npm run script-name
```

### npm Script Settings

Configure how VS Code handles npm scripts:

- `npm.exclude`: Exclude npm scripts in specific folders
- `npm.scriptExplorerAction`: Set default action when clicking scripts (open or run)
- `npm.enableRunFromFolder`: Enable running npm scripts from folder context menu

## IntelliSense and Extensions

### npm IntelliSense Extension

The [npm IntelliSense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.npm-intellisense) extension provides autocomplete for npm modules in import statements:

- Autocompletes npm modules in `import` and `require` statements
- Works with both local and global npm packages
- Supports TypeScript and JavaScript files

### Automatic Type Acquisition

VS Code automatically downloads and installs TypeScript type definitions for npm packages to improve IntelliSense:

- Requires npm to be installed and accessible
- Downloads `@types/*` packages automatically
- Configure with the `typescript.npm` setting if needed

## Package Management

### Installing Packages

Use the integrated terminal to manage npm packages:

```bash
# Install dependencies
npm install

# Install a specific package
npm install package-name

# Install as dev dependency
npm install --save-dev package-name

# Install globally
npm install -g package-name
```

### Package.json Management

VS Code provides helpful features for `package.json` files:

- **Syntax highlighting** and **validation**
- **IntelliSense** for package names and versions
- **Version hover information** showing latest available versions
- **Quick fixes** for outdated dependencies

## Debugging with npm

### Launch Configurations

You can debug Node.js applications launched via npm scripts. Add this to your `launch.json`:

```json
{
    "type": "node",
    "request": "launch",
    "name": "Launch via npm",
    "runtimeExecutable": "npm",
    "runtimeArgs": ["run-script", "debug"],
    "port": 9229
}
```

### npm Debug Script

Define a debug script in your `package.json`:

```json
{
    "scripts": {
        "debug": "node --inspect-brk=9229 app.js"
    }
}
```

## Tasks and Build Integration

### npm Tasks

Create tasks for npm commands in `.vscode/tasks.json`:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "build",
            "group": "build",
            "problemMatcher": []
        }
    ]
}
```

### Build Tasks

Common npm build task configurations:

- **Build task**: Run your build script
- **Watch task**: Run scripts with file watching
- **Test task**: Execute your test suite
- **Lint task**: Run code quality checks

## Troubleshooting

### npm Not Found

If VS Code can't find npm:

1. **Check PATH**: Ensure Node.js/npm is in your system PATH
2. **Restart VS Code**: After installing Node.js
3. **Specify npm path**: Set `typescript.npm` setting to the full path of npm executable

Example for Windows:
```json
{
    "typescript.npm": "C:\\Program Files\\nodejs\\npm.cmd"
}
```

### nvm Conflicts

If you're using nvm (Node Version Manager) and encountering prefix errors:

1. The error occurs because npm was installed globally with a different Node.js version
2. Remove conflicting npm installations:

```bash
# Find conflicting npm
which npm
ls -la /usr/local/bin | grep "np[mx]"

# Remove old versions
rm /usr/local/bin/npm /usr/local/lib/node_modules/npm/bin/npm-cli.js
rm /usr/local/bin/npx /usr/local/lib/node_modules/npm/bin/npx-cli.js
```

### Performance Issues

For better npm performance in VS Code:

- **Use npm cache**: `npm config set cache /path/to/cache`
- **Disable npm scripts auto-detection**: Set `npm.autoDetect` to `off` if not needed
- **Exclude node_modules**: Ensure `node_modules` is in your `.gitignore` and VS Code search exclusions

## Advanced Configuration

### Settings Reference

Key npm-related VS Code settings:

| Setting | Description |
|---------|-------------|
| `npm.autoDetect` | Auto-detect npm scripts |
| `npm.enableScriptExplorer` | Show npm scripts in Explorer |
| `npm.exclude` | Exclude npm scripts in folders |
| `npm.scriptExplorerAction` | Default action for script clicks |
| `npm.enableRunFromFolder` | Run scripts from folder context menu |
| `typescript.npm` | Path to npm executable |

### Workspace Configuration

Configure npm settings per workspace in `.vscode/settings.json`:

```json
{
    "npm.enableScriptExplorer": true,
    "npm.scriptExplorerAction": "run",
    "npm.exclude": "**/node_modules/**"
}
```

## Related Resources

- [Node.js Tutorial](/docs/nodejs/nodejs-tutorial.md)
- [JavaScript in VS Code](/docs/languages/javascript.md)
- [Debugging Node.js](/docs/nodejs/nodejs-debugging.md)
- [Tasks in VS Code](/docs/debugtest/tasks.md)
- [Terminal Basics](/docs/terminal/basics.md)