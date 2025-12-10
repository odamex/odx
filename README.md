# ODX

Cross-platform Electron + Angular 20 launcher for Odamex with single player, multiplayer, and server management capabilities.

[![Tests](https://github.com/odamex/odx/actions/workflows/test.yml/badge.svg)](https://github.com/odamex/odx/actions/workflows/test.yml) [![Build and Release](https://github.com/odamex/odx/actions/workflows/build.yml/badge.svg)](https://github.com/odamex/odx/actions/workflows/build.yml)

**Built with:** [![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-000000?logo=githubcopilot&logoColor=fff)](#) [![Anthropic Claude](https://img.shields.io/badge/Anthropic%20Claude-191919?logo=anthropic&logoColor=fff)](#)

## Features

- 🎮 **Single Player** - Launch Odamex with custom WADs, difficulty, and map selection
- 🌐 **Multiplayer** - Browse and join servers with real-time server list updates
- 🔍 **Local Network Discovery** - Automatically find Odamex servers on your local network
- ⚡ **Quick Match** - Instant matchmaking that finds the best server based on ping, player count, and your available games
- 🖥️ **Server Hosting** - Manage local Odamex servers with configuration and logs
- 💬 **Discord Integration** - Rich Presence and embedded Discord chat
- 📦 **Auto-Updates** - Automatic launcher and game file updates
- 🔔 **System Tray** - Minimize to tray with quick actions and match monitoring
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
│   │   └── app.component.ts        # Root component
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

### Key Services

**OdalPapi Service** - UDP master server communication for server list queries  
**File Manager** - Odamex installation detection, GitHub Releases integration, download management  
**IWAD Manager** - Automatic IWAD detection with Steam integration and WAD directory management  
**Local Network Discovery** - Subnet detection and UDP scanning for local servers not on the master list  
**Quick Match Service** - Client-side matchmaking with filtering, ranking, and monitoring  
**Updates Service** - Automatic launcher and game file updates via GitHub Releases  
**Notification Service** - Desktop notifications with system tray integration  

## Implemented Features

- ✅ Server browser with real-time master server queries
- ✅ Local network discovery for servers not on the master list
- ✅ OdalPapi UDP protocol implementation for server discovery
- ✅ Quick Match system with automatic server selection
- ✅ IWAD detection and management (Steam integration)
- ✅ Game file management with GitHub Releases API
- ✅ Settings persistence via localStorage
- ✅ System tray with contextual actions
- ✅ Auto-update system for launcher
- ✅ Responsive UI with Bootstrap 5 theming
- ✅ First-run configuration wizard

## Upcoming Features

- [ ] Discord RPC integration for game status
- [ ] Local server hosting management
- [ ] Server favorites and history
- [ ] Advanced server filtering options
- [ ] User profiles and cloud settings sync
- [ ] In-app game statistics and leaderboards

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
- `/multiplayer` - Quick Match for instant matchmaking
- `/servers` - Server browser
- `/hosting` - Local server management
- `/community` - Discord integration and links
- `/settings` - Application settings

### Quick Match System

The Quick Match feature provides automatic server selection based on player preferences:

**Filtering Criteria:**
- Maximum ping threshold (default: 100ms)
- Player count range (min/max)
- Preferred game types (DM, TDM, CTF, Coop, Survival, Horde)
- Available IWAD detection
- Excludes password-protected servers
- Optional filters for empty/full servers

**Ranking Algorithm:**
- Scores servers based on player count (prioritizes active games)
- Penalizes high ping for better connection quality
- Formula: `score = min(playerCount, 8) * 10 - (ping / 10)`

**Lightweight Monitoring Queue:**
- If no match is found immediately, users can enable background monitoring
- Checks for suitable servers every 30 seconds
- Runs for up to 10 minutes
- Desktop notifications when a match is found
- Integrated with system tray menu
- No central server dependency - all client-side

**Settings:**
- Fully customizable criteria in Settings → Quick Match
- Persisted in localStorage
- Game type multi-select
- Real-time criteria display on Quick Match page

### Local Network Discovery

Automatically discover Odamex servers running on your local network that may not be registered with the master server.

**Features:**
- Auto-detects private network subnets (10.x, 172.16.x, 192.168.x, 169.254.x)
- UDP scanning with Odamex LAUNCHER_CHALLENGE protocol
- Configurable port range (default: 10666-10675)
- Automatic refresh at customizable intervals (default: 60 seconds)
- Concurrent query throttling to prevent network flooding
- First-time confirmation dialog with network activity disclosure

**Configuration:**
- Enable/disable in Settings → Network
- Advanced settings panel:
  - Port range customization
  - Scan timeout (default: 200ms)
  - Refresh interval (default: 60s)
  - Max concurrent queries (default: 50)
- Manual "Scan Now" button for immediate discovery
- Displays detected network interfaces with CIDR notation

**UI Integration:**
- Local servers display with blue "Local" badge
- Always appear first in server list
- Server count shows: "Found X server(s) (Y local)"
- Works seamlessly alongside master server list
- Opt-in feature (disabled by default)

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

GPL-2.0

## Links

- [Odamex Website](https://odamex.net)
- [Odamex GitHub](https://github.com/odamex/odamex)
- [Discord](https://discord.gg/3mKEnjx5P9)
