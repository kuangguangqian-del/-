import { LevelConfig } from './types';

// Updated to local assets
export const MUSIC_URL = "./assets/deck_the_halls.ogg"; 
export const SFX_SLICE = "./assets/ratchet_wrench.ogg"; 
export const SFX_GAME_OVER = "./assets/cartoon_boing.ogg";

export const FRUITS = [
  { content: '🍎', color: '#ef4444' },
  { content: '🍌', color: '#eab308' },
  { content: '🍉', color: '#22c55e' },
  { content: '🍊', color: '#f97316' },
  { content: '🥥', color: '#ebd5c1' },
  { content: '🥝', color: '#84cc16' },
  { content: '🍓', color: '#ef4444' },
  { content: '🎄', color: '#15803d' }, // Christmas Tree Cookie
  { content: '🍪', color: '#d97706' }, // Gingerbread
];

export const HIDDEN_CHARACTERS = [
  { content: '✈️', color: '#ef4444', name: 'Super Jet' }, // Super Wings style
  { content: '🦸', color: '#3b82f6', name: 'Ultra Hero' }, // Ultraman style
  { content: '🤖', color: '#6366f1', name: 'Mecha' },
  { content: '👾', color: '#a855f7', name: 'Alien Monster' },
  { content: '🎅', color: '#ef4444', name: 'Santa' },
];

export const LEVELS: LevelConfig[] = [
  {
    levelNumber: 1,
    title: "Warm Up Christmas",
    spawnRate: 1100,
    gravity: 0.15,
    bombChance: 0,
    targetScore: 100,
    isHidden: false
  },
  {
    levelNumber: 2,
    title: "Snowy Speed",
    spawnRate: 900,
    gravity: 0.22,
    bombChance: 0.15,
    targetScore: 300,
    isHidden: false
  },
  {
    levelNumber: 3,
    title: "Blizzard Blitz",
    spawnRate: 700,
    gravity: 0.28,
    bombChance: 0.25,
    targetScore: 600,
    isHidden: false
  },
  {
    levelNumber: 4,
    title: "Santa's Nightmare",
    spawnRate: 500,
    gravity: 0.35,
    bombChance: 0.35, // High bomb rate
    targetScore: 1000,
    isHidden: false
  },
  {
    levelNumber: 99, // Boss Level
    title: "HERO DIMENSION",
    spawnRate: 350, // Extreme speed
    gravity: 0.4,
    bombChance: 0.1, // Less bombs, more heroes to slice
    targetScore: 99999,
    isHidden: true
  }
];

export const MAX_TRAIL_LENGTH = 12;
export const BLADE_COLOR = '#ef4444'; // Red