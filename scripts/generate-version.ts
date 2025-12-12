import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Read package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

// Get git information
let gitCommitHash = '';
let gitCommitDate = '';
let gitTag = '';

try {
  gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  gitCommitDate = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();
  
  try {
    gitTag = execSync('git describe --tags --exact-match', { encoding: 'utf-8' }).trim();
  } catch (e) {
    // No exact tag match
    gitTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
  }
} catch (error) {
  console.warn('Warning: Could not retrieve git information');
}

// Generate version file content
const versionFileContent = `export interface TsAppVersion {
    version: string;
    name: string;
    description?: string;
    versionLong?: string;
    versionDate: string;
    gitCommitHash?: string;
    gitCommitDate?: string;
    gitTag?: string;
};
export const versions: TsAppVersion = {
    version: '${packageJson.version}',
    name: '${packageJson.name}',
    versionDate: '${new Date().toISOString()}',
    description: '${packageJson.description}',
    gitCommitHash: '${gitCommitHash ? 'g' + gitCommitHash : ''}',
    gitCommitDate: '${gitCommitDate}',
    versionLong: '${packageJson.version}${gitCommitHash ? '-g' + gitCommitHash : ''}',
    gitTag: '${gitTag}',
};
export default versions;
`;

// Write to file
const outputPath = path.join(__dirname, '../src/_versions.ts');
fs.writeFileSync(outputPath, versionFileContent, 'utf-8');

console.log(`Generated ${outputPath}`);
