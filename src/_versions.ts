export interface TsAppVersion {
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
    version: '0.1.0',
    name: 'odx-launcher',
    versionDate: '2025-12-04T21:18:10.506Z',
    description: 'Cross-platform Odamex launcher with single player, multiplayer, and server management',
};
export default versions;
