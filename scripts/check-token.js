#!/usr/bin/env node
/**
 * Check if GitHub token is available before building
 * This script helps ensure production builds include the token for higher API rate limits
 */

const hasToken = !!process.env.GITHUB_TOKEN;

console.log('\n🔍 Checking GitHub Token Configuration...\n');

if (hasToken) {
  const tokenPreview = process.env.GITHUB_TOKEN.substring(0, 10) + '...';
  console.log('✓ GitHub Token Found:', tokenPreview);
  console.log('  API Rate Limit: 5000 requests/hour');
  console.log('  The token will be embedded in the production build.\n');
} else {
  console.log('⚠ No GitHub Token Found');
  console.log('  API Rate Limit: 60 requests/hour (per IP)');
  console.log('  This may be insufficient for frequent update checks.\n');
  console.log('To add a token:');
  console.log('  1. Get a token from: https://github.com/settings/tokens');
  console.log('  2. Set it before building:');
  console.log('     GITHUB_TOKEN=your_token npm run package\n');
}

// Exit with appropriate code
process.exit(0);
