import { LIVING } from "./tags";
import {
  Archer,
  Bandit,
  Champion,
  Monk,
  Piper,
  RageKnight,
  Rat,
  RoyalGuard,
  ShellKnight,
  TheKing,
  Villager,
  Wizard,
} from "./objects";
import { randomInt } from "./helpers";
import { GameObject } from "./game";

// Signals (positive signals are spawn counters)
const END_OF_LEVEL = 99;
const END_OF_WAVE = 98;

// Spawn IDs
const VILLAGER = 0;
const ARCHER = 1;
const MONK = 2;
const CHAMPION = 3;
const PIPER = 4;
const RAGE_KNIGHT = 5;
const ROYAL_GUARD = 6;
const SHELL_KNIGHT = 7;
const WIZARD = 8;
const THE_KING = 9;
const RAT = 10;
const MOB = 11;
const BANDIT = 12;

type Spawn = () => GameObject;

const LOOKUP: Spawn[] = [
  Villager,
  Archer,
  Monk,
  Champion,
  Piper,
  RageKnight,
  RoyalGuard,
  ShellKnight,
  Wizard,
  TheKing,
  Rat,
  Villager,
  Bandit,
];

const DELAYS: Record<string | number, () => number> = {
  [RAT]: () => randomInt(500),
  [VILLAGER]: () => randomInt(200),
  [BANDIT]: () => randomInt(200),
  [MOB]: () => -randomInt(250),
};

const LEVEL_TEMPLATE = [
  // Level 1 - Learn aiming, corpses, and resurrection
  2, VILLAGER, END_OF_WAVE,
  3, VILLAGER, END_OF_WAVE,
  2, VILLAGER, 1, BANDIT, END_OF_LEVEL,

  // Level 2 - Introduce tougher villagers and archer timing
  2, VILLAGER, 1, ARCHER, END_OF_WAVE,
  2, BANDIT, END_OF_WAVE,
  3, VILLAGER, 2, ARCHER, END_OF_LEVEL,

  // Level 3 - Introduce support enemies and the first bruiser
  1, MONK, END_OF_WAVE,
  3, VILLAGER, 1, MONK, END_OF_WAVE,
  2, BANDIT, 1, ARCHER, END_OF_WAVE,
  1, CHAMPION, END_OF_LEVEL,

  // Level 4 - Introduce shields without stacking too many counters
  1, SHELL_KNIGHT, END_OF_WAVE,
  3, BANDIT, 1, ARCHER, END_OF_WAVE,
  1, SHELL_KNIGHT, 1, MONK, END_OF_WAVE,
  1, CHAMPION, 2, VILLAGER, END_OF_LEVEL,

  // Level 5 - Pied Piper (Miniboss)
  2, RAT, END_OF_WAVE,
  4, RAT, END_OF_WAVE,
  5, RAT, 1, PIPER, END_OF_LEVEL,

  // Level 6 - Introduce rage and portals
  3, BANDIT, END_OF_WAVE,
  1, RAGE_KNIGHT, END_OF_WAVE,
  3, BANDIT, 1, MONK, 1, ARCHER, END_OF_WAVE,
  1, WIZARD, END_OF_LEVEL,

  // Level 7 - Angry Mob
  12, MOB, 1, RAGE_KNIGHT, 12, MOB, END_OF_WAVE,
  14, MOB, 1, RAGE_KNIGHT, 1, MONK, 14, MOB, END_OF_WAVE,
  2, CHAMPION, END_OF_LEVEL,

  // Level 8
  6, BANDIT, 1, MONK, 6, BANDIT, END_OF_WAVE,
  6, BANDIT, 1, WIZARD, 1, SHELL_KNIGHT, END_OF_WAVE,
  3, ARCHER, 2, RAGE_KNIGHT, END_OF_WAVE,
  1, CHAMPION, 1, WIZARD, END_OF_LEVEL,

  // Level 9 - Guards Approaching
  1, ROYAL_GUARD, END_OF_WAVE,
  2, ROYAL_GUARD, 1, ARCHER, END_OF_WAVE,
  4, ROYAL_GUARD, END_OF_WAVE,
  4, ROYAL_GUARD, 1, MONK, 4, ROYAL_GUARD, END_OF_WAVE,
  2, ROYAL_GUARD, 1, SHELL_KNIGHT, 1, CHAMPION, END_OF_WAVE,
  2, ROYAL_GUARD, 1, WIZARD, END_OF_LEVEL,

  // Level 10 - The King (Boss Fight)
  1, THE_KING, END_OF_LEVEL,
];

let timer = 0;
let cursor = 0;
let levels = LEVEL_TEMPLATE.slice();

export function resetLevels() {
  timer = 0;
  cursor = 0;
  levels = LEVEL_TEMPLATE.slice();
}

export function isLevelFinished() {
  return levels[cursor] === END_OF_LEVEL && isCleared();
}

export function isComplete() {
  return cursor >= levels.length - 1;
}

export let nextLevel = () => {
  cursor++;
  game.level++;
  game.onLevelStart();
};

export function updateLevel(dt: number) {
  let cmd = levels[cursor];
  if ((timer -= dt) > 0) {}
  else if (cmd === END_OF_WAVE) isCleared() && cursor++;
  else if (cmd === END_OF_LEVEL) {}
  else if (cmd) {
    levels[cursor]--; // Decrement quantity
    let id = levels[cursor + 1];
    let unit = LOOKUP[id]();
    game.spawn(unit);
    timer = unit.updateSpeed + (DELAYS[id]?.() || 0);
  } else {
    cursor += 2;
  }
}

function isCleared() {
  return !game.objects.some(object => object.is(LIVING));
}
