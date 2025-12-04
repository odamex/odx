# ODX

Cross-platform Electron + Angular 20 launcher for Odamex with single player, multiplayer, and server management capabilities.

## Features

- 🎮 **Single Player** - Launch Odamex with custom WADs, difficulty, and map selection
- 🌐 **Multiplayer** - Browse and join servers with real-time server list updates
- 🖥️ **Server Hosting** - Manage local Odamex servers with configuration and logs
- 💬 **Discord Integration** - Rich Presence and embedded Discord chat
- 📦 **Auto-Updates** - Automatic launcher and game file updates
- 🔔 **System Tray** - Minimize to tray with quick actions
- 📊 **State Management** - NgRx Signals for reactive state
- 🚀 **Cross-Platform** - Windows, macOS, and Linux support

## Tech Stack

- **Electron 34** - Desktop application framework
- **Angular 20** - Modern web framework with signals and standalone components
- **Bootstrap 5.3** - UI framework for consistent styling
- **ng-bootstrap 19** - Angular Bootstrap components
- **@ngrx/signals** - Reactive state management
- **electron-builder** - Multi-platform packaging and distribution
- **electron-updater** - Automatic application updates
- **discord-rpc** - Discord Rich Presence integration

## Project Structure

```
odx/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry point
│   └── preload.ts        # Preload script for IPC
├── src/                  # Angular application
│   ├── app/
│   │   ├── core/         # Core components (title bar, nav)
│   │   ├── features/     # Feature modules (home, multiplayer, etc.)
│   │   ├── shared/       # Shared services and utilities
│   │   └── app.ts        # Root component
│   ├── styles.scss       # Global styles
│   └── main.ts           # Angular bootstrap
├── public/               # Static assets
├── dist/                 # Angular build output
├── dist-electron/        # Electron build output
├── release/              # Packaged application output
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
cd c:\Users\Mike\projects\odx
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server (Angular + Electron):
```bash
npm start
```

This will:
1. Start Angular dev server on http://localhost:4200
2. Watch and compile Electron TypeScript
3. Launch Electron with hot reload

### Building

Build the Angular app and Electron:
```bash
npm run build
```

### Packaging

Package the application for distribution:

**Important**: Before packaging, you should set the `GITHUB_TOKEN` environment variable to avoid GitHub API rate limits (60 requests/hour without token vs 5000 with token).

**All platforms:**
```bash
# With GitHub token (recommended)
GITHUB_TOKEN=your_token_here npm run package

# Without token (will work but with rate limits)
npm run package
```

**Specific platforms:**
```bash
GITHUB_TOKEN=your_token_here npm run package:win    # Windows (ZIP)
GITHUB_TOKEN=your_token_here npm run package:mac    # macOS (DMG)
GITHUB_TOKEN=your_token_here npm run package:linux  # Linux (AppImage & DEB)
```

**For CI/CD**: Set `GITHUB_TOKEN` as a secret in your CI/CD pipeline:
- GitHub Actions: Add as repository secret and use `${{ secrets.GITHUB_TOKEN }}`
- GitLab CI: Add as CI/CD variable
- Other CI: Follow your platform's secret management

**Getting a GitHub Token**:
1. Go to https://github.com/settings/tokens
2. Generate a new token (classic) with `public_repo` scope
3. Copy the token and use it in builds (never commit it to the repository)

## Configuration

### Electron Builder

electron-builder configuration is in `package.json` under the `build` key:

- **Windows**: NSIS installer with custom install directory option
- **macOS**: DMG with proper app signing (configure in build settings)
- **Linux**: AppImage and DEB packages

### Auto-Updates

Auto-updates are configured to use GitHub Releases. Set the repository in `package.json`:

```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "odamex",
    "repo": "odx-launcher"
  }
}
```

## Architecture

### Electron Process Communication

- **Main Process** (`electron/main.ts`): Window management, system tray, auto-updates
- **Preload Script** (`electron/preload.ts`): Safe IPC bridge between main and renderer
- **Renderer Process** (Angular app): UI and application logic

### Angular Application

- **Standalone Components**: All components use the standalone API
- **Signals**: Reactive state management with @ngrx/signals
- **Router Animations**: Smooth transitions between views
- **Bootstrap 5**: Consistent UI with custom Odamex theming

### Key Features To Implement

1. **Server Browser** - Port OdalPapi service from old project for UDP master server queries
2. **File Management** - Game file detection, download manager, GitHub Releases API integration
3. **Discord Integration** - Discord RPC for game status, embedded Discord widget
4. **Local Server Management** - Start/stop servers, view logs, configuration
5. **Settings Persistence** - Local storage for preferences, sync-able account settings

## Development Notes

### Window Controls

The application uses a frameless window with custom title bar controls. The title bar is implemented in `src/app/core/title-bar/`.

### Navigation

The left sidebar navigation is implemented in `src/app/core/navigation/` with:
- Icon-based menu
- User profile at top
- Settings at bottom
- Active route highlighting

### Routing

All routes use lazy loading for optimal performance:
- `/home` - Dashboard with news and stats
- `/singleplayer` - Single player launcher
- `/multiplayer` - Server browser
- `/servers` - Local server management
- `/community` - Discord integration and links
- `/settings` - Application settings

## Contributing

This is the initial scaffold. The following areas need implementation:

- [ ] Server browser with master server queries
- [ ] OdalPapi service port from old project
- [ ] Game file management and updates
- [ ] Discord RPC integration
- [ ] Local server management
- [ ] Settings persistence
- [ ] User authentication
- [ ] Splash screen/loading states

## License

GPL-2.0

## Links

- [Odamex Website](https://odamex.net)
- [Odamex GitHub](https://github.com/odamex/odamex)
- [Discord](https://discord.gg/3mKEnjx5P9)
