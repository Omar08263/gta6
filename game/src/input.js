// Keyboard + mouse-drag input. Actions are consumed once per frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_MELEE = 8;
export const ACTION_MISSION = 16;
export const ACTION_RESTART = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let lookDX = 0;
  let lookDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') actions |= ACTION_CONFIRM;
    if (e.code === 'Escape' || e.code === 'KeyP') actions |= ACTION_PAUSE;
    if (e.code === 'KeyE' || e.code === 'KeyF') actions |= ACTION_ENTER;
    if (e.code === 'KeyQ') actions |= ACTION_MELEE;
    if (e.code === 'KeyM') actions |= ACTION_MISSION;
    if (e.code === 'KeyR') actions |= ACTION_RESTART;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onPointerDown(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); }
  function onPointerMove(e) {
    if (!dragging) return;
    lookDX += e.clientX - lastX;
    lookDY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  }
  function onPointerUp() { dragging = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return {
    keys,
    down(code) { return keys.has(code); },
    // WASD / arrows as a -1..1 pair, relative to the camera heading.
    axis() {
      let x = 0, y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return { x, y };
    },
    sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    handbrake() { return keys.has('Space'); },
    takeActions() { const a = actions; actions = 0; return a; },
    peekActions() { return actions; },
    queueActions(bits) { actions |= bits; },
    takeLook() { const l = { dx: lookDX, dy: lookDY }; lookDX = 0; lookDY = 0; return l; },
  };
}
