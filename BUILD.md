# Building ODX for Production

## Quick Start

### Development Build (No Token Required)
```bash
npm install
npm start
```

### Production Package (Token Recommended)

**Windows:**
```powershell
# PowerShell
$env:GITHUB_TOKEN="your_token_here"; npm run package:win
```

**macOS/Linux:**
```bash
export GITHUB_TOKEN="your_token_here"
npm run package:mac  # or package:linux
```

**Cross-platform (requires token as single command):**
```bash
GITHUB_TOKEN=your_token_here npm run package
```

## GitHub Token Setup

### Why Do We Need It?

The launcher checks GitHub for Odamex game updates. Without a token:
- **Rate limit**: 60 API requests per hour per IP
- **With token**: 5000 API requests per hour

For most users, this is fine, but during testing or if many users download the launcher from the same IP, you'll hit the limit.

### Getting a Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "ODX Build"
4. Select scope: **public_repo** only (read access to public repositories)
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)

### Development Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env  # Linux/Mac
copy .env.example .env  # Windows
```

2. Edit `.env` and add your token:
```env
GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
```

3. The token is automatically loaded during `npm start`

### Production Builds

**Option 1: Environment Variable (Recommended)**
```bash
# Linux/Mac
export GITHUB_TOKEN="your_token_here"
npm run package

# Windows PowerShell
$env:GITHUB_TOKEN="your_token_here"
npm run package

# Windows CMD
set GITHUB_TOKEN=your_token_here
npm run package
```

**Option 2: CI/CD Pipeline**

The token will be automatically embedded in the build if it's available in the environment.

**GitHub Actions Example:**
```yaml
- name: Package Application
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run package
```

**GitLab CI Example:**
```yaml
package:
  script:
    - npm run package
  variables:
    GITHUB_TOKEN: $CI_JOB_TOKEN
```

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit your `.env` file (it's in `.gitignore`)
- Never commit tokens directly to the repository
- Tokens in environment variables are embedded at build time
- The token only has read access to public repositories
- Rotate tokens regularly (every 90 days recommended)
- If a token is compromised, revoke it immediately at https://github.com/settings/tokens

## Build Output

After running package commands, find builds in:
```
release/
├── win-unpacked/     # Windows unpacked files
├── mac/              # macOS app bundle
├── linux-unpacked/   # Linux unpacked files
└── odx-launcher-*.* # Distributable packages
```

## Troubleshooting

### "Warning: GITHUB_TOKEN not set"
This is just a warning. The build will succeed but the launcher will have lower GitHub API rate limits.

### "GitHub API rate limit exceeded" during build
This happens if you're building without a token and have made many GitHub API requests recently. Wait an hour or add a token.

### Token not being embedded
Make sure the environment variable is set BEFORE running the npm command:
```bash
# Good
GITHUB_TOKEN=xxx npm run package

# Bad (token set after npm starts)
npm run package
GITHUB_TOKEN=xxx
```

### Build fails with "command not found"
Make sure you've run `npm install` first:
```bash
npm install
npm run package
```

## Distribution Checklist

Before distributing builds:

- [ ] GitHub token is set in environment
- [ ] Version number updated in `package.json`
- [ ] Changelog updated
- [ ] Built on clean machine or fresh `node_modules`
- [ ] Tested on target platform
- [ ] Code signed (for macOS/Windows, if applicable)
- [ ] Release notes prepared

## Additional Resources

- [Electron Builder Docs](https://www.electron.build/)
- [GitHub Token Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)
- [ODX System Repository](https://github.com/odamex/odx)
