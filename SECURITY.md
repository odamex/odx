# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please:

1. **Do NOT** open a public GitHub issue
2. Email the security team at: security@odamex.net
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

## Security Measures

This project implements several security measures:

### Input Validation
- All user inputs are validated and sanitized
- Network addresses (IP:port) are validated before use
- File paths are checked for directory traversal attempts
- URL validation with protocol whitelist

### Dependency Management
- Regular dependency audits via CI/CD
- Production dependencies audited at `high` severity level
- Automated security scanning on all pull requests

### Build Security
- GitHub token managed via environment variables (not hardcoded)
- Electron ASAR integrity checks
- Code signing for release builds

### Runtime Security
- Rate limiting on GitHub API requests
- Request timeout protection
- UDP socket cleanup to prevent leaks
- Error handling to prevent information disclosure

## Security Best Practices

When contributing:
- Never commit secrets or credentials
- Use environment variables for sensitive data
- Validate all external inputs
- Follow principle of least privilege
- Keep dependencies up to date
