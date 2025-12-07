// IWAD identification database
// Extracted from odamex/common/w_ident.cpp

export interface IWADEntry {
  name: string;
  filename: string;
  md5: string;
  groupName: string;
  game: string; // doom, doom2, tnt, plutonia, freedoom1, freedoom2, freedm, chex, hacx, rekkr
  deprecated: boolean;
  weight: number;
  id24?: boolean; // DOOM + DOOM II release with ID24 features
  isLatest?: boolean; // Mark the latest version of each game
}

// Game type enum for easy filtering
export enum GameType {
  DOOM = 'doom',
  DOOM_SHAREWARE = 'doom_shareware',
  DOOM_REGISTERED = 'doom_registered',
  DOOM2 = 'doom2',
  TNT = 'tnt',
  PLUTONIA = 'plutonia',
  FREEDOOM1 = 'freedoom1',
  FREEDOOM2 = 'freedoom2',
  FREEDM = 'freedm',
  CHEX = 'chex',
  HACX = 'hacx',
  REKKR = 'rekkr'
}

export const IWAD_DATABASE: IWADEntry[] = [
  // DOOM2.WAD - Latest versions (non-deprecated)
  {
    name: 'DOOM II: Hell on Earth v1.9',
    filename: 'DOOM2.WAD',
    md5: '25E1459CA71D321525F84628F45CA8CD',
    groupName: 'DOOM II: Hell on Earth v1.9',
    game: GameType.DOOM2,
    deprecated: false,
    weight: 100,
    isLatest: true
  },
  {
    name: 'DOOM II: Hell on Earth (DOOM + DOOM II) Oct 2024',
    filename: 'DOOM2.WAD',
    md5: '64A4C88A871DA67492AAA2020A068CD8',
    groupName: 'DOOM II: Hell on Earth v1.9',
    game: GameType.DOOM2,
    deprecated: false,
    weight: 140,
    id24: true,
    isLatest: true
  },
  {
    name: 'DOOM II: Hell on Earth (DOOM + DOOM II)',
    filename: 'DOOM2.WAD',
    md5: '9AA3CBF65B961D0BDAC98EC403B832E1',
    groupName: 'DOOM II: Hell on Earth v1.9',
    game: GameType.DOOM2,
    deprecated: false,
    weight: 140,
    id24: true
  },
  {
    name: 'DOOM II: Hell on Earth Classic Unity v1.3',
    filename: 'DOOM2.WAD',
    md5: '8AB6D0527A29EFDC1EF200E5687B5CAE',
    groupName: 'DOOM II: Hell on Earth v1.9',
    game: GameType.DOOM2,
    deprecated: false,
    weight: 145
  },
  {
    name: 'DOOM II: Hell on Earth (DOOM 3 BFG Edition)',
    filename: 'DOOM2.WAD',
    md5: 'C3BEA40570C23E511A7ED3EBCD9865F7',
    groupName: 'DOOM II: Hell on Earth v1.9',
    game: GameType.DOOM2,
    deprecated: false,
    weight: 130
  },

  // PLUTONIA.WAD
  {
    name: 'The Plutonia Experiment v1.9',
    filename: 'PLUTONIA.WAD',
    md5: '75C8CF89566741FA9D22447604053BD7',
    groupName: 'The Plutonia Experiment v1.9',
    game: GameType.PLUTONIA,
    deprecated: false,
    weight: 100,
    isLatest: true
  },
  {
    name: 'The Plutonia Experiment (DOOM + DOOM II) Oct 2024',
    filename: 'PLUTONIA.WAD',
    md5: 'E47CF6D82A0CCEDF8C1C16A284BB5937',
    groupName: 'The Plutonia Experiment v1.9',
    game: GameType.PLUTONIA,
    deprecated: false,
    weight: 140,
    id24: true,
    isLatest: true
  },
  {
    name: 'The Plutonia Experiment (DOOM + DOOM II)',
    filename: 'PLUTONIA.WAD',
    md5: '24037397056E919961005E08611623F4',
    groupName: 'The Plutonia Experiment v1.9',
    game: GameType.PLUTONIA,
    deprecated: false,
    weight: 140,
    id24: true
  },
  {
    name: 'The Plutonia Experiment (DOOM + DOOM II) Old',
    filename: 'PLUTONIA.WAD',
    md5: 'C40470C873B06FDD6B150B0EB8D44F17',
    groupName: 'The Plutonia Experiment v1.9',
    game: GameType.PLUTONIA,
    deprecated: false,
    weight: 140,
    id24: true
  },
  {
    name: 'The Plutonia Experiment Classic Unity v1.3',
    filename: 'PLUTONIA.WAD',
    md5: '9CD7BAA2488A6582BC18EB0E61DB0E8C',
    groupName: 'The Plutonia Experiment v1.9',
    game: GameType.PLUTONIA,
    deprecated: false,
    weight: 145
  },

  // TNT.WAD
  {
    name: 'TNT: Evilution v1.9',
    filename: 'TNT.WAD',
    md5: '4E158D9953C79CCF97BD0663244CC6B6',
    groupName: 'TNT: Evilution v1.9',
    game: GameType.TNT,
    deprecated: false,
    weight: 100,
    isLatest: true
  },
  {
    name: 'TNT: Evilution (DOOM + DOOM II) Oct 2024',
    filename: 'TNT.WAD',
    md5: 'AD7885C17A6B9B79B09D7A7634DD7E2C',
    groupName: 'TNT: Evilution v1.9',
    game: GameType.TNT,
    deprecated: false,
    weight: 140,
    id24: true,
    isLatest: true
  },
  {
    name: 'TNT: Evilution (DOOM + DOOM II)',
    filename: 'TNT.WAD',
    md5: '8974E3117ED4A1839C752D5E11AB1B7B',
    groupName: 'TNT: Evilution v1.9',
    game: GameType.TNT,
    deprecated: false,
    weight: 140,
    id24: true
  },
  {
    name: 'TNT: Evilution (DOOM + DOOM II) Old',
    filename: 'TNT.WAD',
    md5: 'CDC5F43EF9B23DCFED74B2BBBE115173',
    groupName: 'TNT: Evilution v1.9',
    game: GameType.TNT,
    deprecated: false,
    weight: 140,
    id24: true
  },
  {
    name: 'TNT: Evilution Classic Unity v1.3',
    filename: 'TNT.WAD',
    md5: '4927F67EF8708BF15E720D7C0F86B2D1',
    groupName: 'TNT: Evilution v1.9',
    game: GameType.TNT,
    deprecated: false,
    weight: 145
  },

  // DOOM.WAD (Ultimate Doom)
  {
    name: 'The Ultimate DOOM v1.9',
    filename: 'DOOM.WAD',
    md5: 'C4FE9FD920207691A9F493668E0A2083',
    groupName: 'The Ultimate DOOM v1.9',
    game: GameType.DOOM,
    deprecated: false,
    weight: 200,
    isLatest: true
  },
  {
    name: 'The Ultimate DOOM (DOOM + DOOM II) Oct 2024',
    filename: 'DOOM.WAD',
    md5: '3B37188F6337F15718B617C16E6E7A9C',
    groupName: 'The Ultimate DOOM v1.9',
    game: GameType.DOOM,
    deprecated: false,
    weight: 140,
    id24: true,
    isLatest: true
  },
  {
    name: 'The Ultimate DOOM (DOOM + DOOM II)',
    filename: 'DOOM.WAD',
    md5: '6C3F5C8781706DB62F69FD47BF7F97B4',
    groupName: 'The Ultimate DOOM v1.9',
    game: GameType.DOOM,
    deprecated: false,
    weight: 140,
    id24: true
  },
  {
    name: 'The Ultimate DOOM Classic Unity v1.3',
    filename: 'DOOM.WAD',
    md5: '4D8DE2CA75D32B822C2C65D40EB21DD9',
    groupName: 'The Ultimate DOOM v1.9',
    game: GameType.DOOM,
    deprecated: false,
    weight: 145
  },
  {
    name: 'The Ultimate DOOM (DOOM 3 BFG Edition)',
    filename: 'DOOM.WAD',
    md5: 'FB35C4A5A9FD49EC29AB6E900572C524',
    groupName: 'The Ultimate DOOM v1.9',
    game: GameType.DOOM,
    deprecated: false,
    weight: 130
  },

  // DOOM.WAD (Registered - 3 episodes)
  {
    name: 'DOOM Registered v1.9',
    filename: 'DOOM.WAD',
    md5: '1CD63C5DDFF1BF8CE844237F580E9CF3',
    groupName: 'DOOM Registered v1.9',
    game: GameType.DOOM_REGISTERED,
    deprecated: false,
    weight: 190,
    isLatest: true
  },

  // DOOM1.WAD (Shareware - 1 episode)
  {
    name: 'DOOM Shareware v1.9',
    filename: 'DOOM1.WAD',
    md5: 'F0CEFCA49926D00903CF57551D901ABE',
    groupName: 'DOOM Shareware v1.9',
    game: GameType.DOOM_SHAREWARE,
    deprecated: false,
    weight: 180,
    isLatest: true
  },
  {
    name: 'DOOM Shareware v1.8',
    filename: 'DOOM1.WAD',
    md5: '5F4EB849B1AF12887DEC04A2A12E5E62',
    groupName: 'DOOM Shareware v1.9',
    game: GameType.DOOM_SHAREWARE,
    deprecated: false,
    weight: 180
  },

  // FREEDOOM1.WAD
  {
    name: 'Freedoom: Phase 1 v0.13.0',
    filename: 'FREEDOOM1.WAD',
    md5: '6D00C49520BE26F08A6BD001814A32AB',
    groupName: 'Freedoom: Phase 1',
    game: GameType.FREEDOOM1,
    deprecated: false,
    weight: 300,
    isLatest: true
  },
  {
    name: 'Freedoom: Phase 1 v0.12.1',
    filename: 'FREEDOOM1.WAD',
    md5: 'ACA90CF5AC36E996EDC58BD0329B979A',
    groupName: 'Freedoom: Phase 1',
    game: GameType.FREEDOOM1,
    deprecated: false,
    weight: 300
  },

  // FREEDOOM2.WAD
  {
    name: 'Freedoom: Phase 2 v0.13.0',
    filename: 'FREEDOOM2.WAD',
    md5: 'E70C19F43A23EA28C9B6AD8B1CBF1E33',
    groupName: 'Freedoom: Phase 2',
    game: GameType.FREEDOOM2,
    deprecated: false,
    weight: 300,
    isLatest: true
  },
  {
    name: 'Freedoom: Phase 2 v0.12.1',
    filename: 'FREEDOOM2.WAD',
    md5: '8FA57DBC7687F84528EBA39DDE3A20E0',
    groupName: 'Freedoom: Phase 2',
    game: GameType.FREEDOOM2,
    deprecated: false,
    weight: 300
  },

  // FREEDM.WAD
  {
    name: 'FreeDM v0.13.0',
    filename: 'FREEDM.WAD',
    md5: '3AB99BF2B5B51B88C07A43BA8F83BFCE',
    groupName: 'FreeDM',
    game: GameType.FREEDM,
    deprecated: false,
    weight: 300,
    isLatest: true
  },

  // CHEX.WAD
  {
    name: 'Chex Quest',
    filename: 'CHEX.WAD',
    md5: '25485721882B050AFA96A56E5758DD52',
    groupName: 'Chex Quest',
    game: GameType.CHEX,
    deprecated: false,
    weight: 600,
    isLatest: true
  },

  // HACX.WAD
  {
    name: 'HACX v1.2',
    filename: 'HACX.WAD',
    md5: '65ED74D522BDF6649C2831B13B9E02B4',
    groupName: 'HACX',
    game: GameType.HACX,
    deprecated: false,
    weight: 600,
    isLatest: true
  },

  // REKKRSA.WAD
  {
    name: 'REKKR v1.16a',
    filename: 'REKKRSA.WAD',
    md5: 'B6F4BB3A80F096B6045CFAEB57D4CF29',
    groupName: 'REKKR',
    game: GameType.REKKR,
    deprecated: false,
    weight: 600,
    isLatest: true
  }
];

// Game metadata for UI display
export interface GameMetadata {
  type: GameType;
  displayName: string;
  description: string;
  imageFilename: string; // Image from odamex-website
  commercial: boolean;
}

export const GAME_METADATA: Record<GameType, GameMetadata> = {
  [GameType.DOOM]: {
    type: GameType.DOOM,
    displayName: 'The Ultimate DOOM',
    description: 'Original DOOM with 4 episodes',
    imageFilename: 'icon-doom-128.png',
    commercial: true
  },
  [GameType.DOOM_REGISTERED]: {
    type: GameType.DOOM_REGISTERED,
    displayName: 'DOOM Registered',
    description: 'Original DOOM with 3 episodes',
    imageFilename: 'icon-doom-128.png',
    commercial: true
  },
  [GameType.DOOM_SHAREWARE]: {
    type: GameType.DOOM_SHAREWARE,
    displayName: 'DOOM Shareware',
    description: 'Free DOOM demo (1 episode)',
    imageFilename: 'icon-doom-128.png',
    commercial: false
  },
  [GameType.DOOM2]: {
    type: GameType.DOOM2,
    displayName: 'DOOM II: Hell on Earth',
    description: 'DOOM II with 30+ levels',
    imageFilename: 'icon-doom2-128.png',
    commercial: true
  },
  [GameType.TNT]: {
    type: GameType.TNT,
    displayName: 'TNT: Evilution',
    description: 'Final DOOM - TNT',
    imageFilename: 'icon-finaldoom-128.png',
    commercial: true
  },
  [GameType.PLUTONIA]: {
    type: GameType.PLUTONIA,
    displayName: 'The Plutonia Experiment',
    description: 'Final DOOM - Plutonia',
    imageFilename: 'icon-finaldoom-128.png',
    commercial: true
  },
  [GameType.FREEDOOM1]: {
    type: GameType.FREEDOOM1,
    displayName: 'Freedoom: Phase 1',
    description: 'Free DOOM replacement',
    imageFilename: 'icon-freedoom-128.png',
    commercial: false
  },
  [GameType.FREEDOOM2]: {
    type: GameType.FREEDOOM2,
    displayName: 'Freedoom: Phase 2',
    description: 'Free DOOM II replacement',
    imageFilename: 'icon-freedoom-128.png',
    commercial: false
  },
  [GameType.FREEDM]: {
    type: GameType.FREEDM,
    displayName: 'FreeDM',
    description: 'Free deathmatch game',
    imageFilename: 'icon-freedoom-128.png',
    commercial: false
  },
  [GameType.CHEX]: {
    type: GameType.CHEX,
    displayName: 'Chex Quest',
    description: 'Family-friendly DOOM mod',
    imageFilename: 'icon-chexquest-128.png',
    commercial: false
  },
  [GameType.HACX]: {
    type: GameType.HACX,
    displayName: 'HACX',
    description: 'Cyberpunk total conversion',
    imageFilename: 'icon-hacx-128.png',
    commercial: false
  },
  [GameType.REKKR]: {
    type: GameType.REKKR,
    displayName: 'REKKR',
    description: 'Norse mythology themed',
    imageFilename: 'icon-rekkr-128.png',
    commercial: false
  }
};
