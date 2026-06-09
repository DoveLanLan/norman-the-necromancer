import { platform } from "./platform";

const STORAGE_KEY = "norman-necromancer-save";

export interface SaveState {
  highLevel: number;
  completed: boolean;
  muted: boolean;
}

let saveState: SaveState = load();

function load(): SaveState {
  const fallback = { highLevel: 1, completed: false, muted: false };
  const raw = platform.getStorage(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function persist() {
  platform.setStorage(STORAGE_KEY, JSON.stringify(saveState));
}

export function getSaveState() {
  return saveState;
}

export function recordProgress(level: number, completed = false) {
  const nextLevel = Math.max(saveState.highLevel, level);
  const nextCompleted = saveState.completed || completed;

  if (nextLevel !== saveState.highLevel || nextCompleted !== saveState.completed) {
    saveState.highLevel = nextLevel;
    saveState.completed = nextCompleted;
    persist();
  }
}

export function recordMuted(muted: boolean) {
  saveState.muted = muted;
  persist();
}
