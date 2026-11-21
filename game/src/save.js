// Save to localStorage: cash, completed jobs, health and position. Auto-saves on mission end.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch { return null; }
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash.value,
      completed: state.missions.completed,
      current: state.missions.current,
      health: Math.round(state.player.health),
      x: Math.round(state.player.pos.x),
      z: Math.round(state.player.pos.z),
    }));
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
