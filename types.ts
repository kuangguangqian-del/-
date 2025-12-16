export enum GameState {
  LOGIN = 'LOGIN',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED'
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  maxLevel: number;
  highScore: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  avatarUrl: string;
  date: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  type: 'FRUIT' | 'BOMB' | 'HIDDEN_CHARACTER';
  content: string; // Emoji or image char
  isSliced: boolean;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface LevelConfig {
  levelNumber: number;
  title: string;
  spawnRate: number; // ms
  gravity: number;
  bombChance: number;
  targetScore: number;
  isHidden: boolean;
  backgroundMusic?: string;
}