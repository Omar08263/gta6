// HUD: wanted stars, cash, health, clock, objective, speed — and the 2D canvas minimap.
import { CITY_SIZE } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const starsEl = el('stars');
  const cashEl = el('cash');
  const healthEl = el('healthBar');
  const clockEl = el('clockTime');
  const districtEl = el('district');
  const objTitle = el('objectiveTitle');
  const objText = el('objectiveText');
  const speedEl = el('speedNum');
  const carEl = el('carName');
  const bannerEl = el('banner');
  const map = el('minimap');
  const mctx = map.getContext('2d');
  let bannerTimer = 0;

  function showBanner(main, sub, ms) {
    bannerEl.innerHTML = `${main}<small>${sub}</small>`;
    bannerEl.style.display = 'block';
    bannerTimer = ms / 1000;
  }

  function drawMinimap(state) {
    const S = 180, R = S / 2;
    const scale = S / (CITY_SIZE + 120);
    const toMap = (x, z) => [R + x * scale, R + z * scale];
    mctx.clearRect(0, 0, S, S);
    mctx.fillStyle = '#0e1622'; mctx.fillRect(0, 0, S, S);
    // Beach + water strip at the south edge.
    mctx.fillStyle = '#e8d49a'; mctx.fillRect(0, S - 16, S, 8);
    mctx.fillStyle = '#2e7fb8'; mctx.fillRect(0, S - 8, S, 8);
    // Roads.
    mctx.strokeStyle = '#5a6270'; mctx.lineWidth = 2;
    for (const line of state.world.roadLines) {
      const [x] = toMap(line, 0);
      mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, S); mctx.stroke();
      const [, z] = toMap(0, line);
      mctx.beginPath(); mctx.moveTo(0, z); mctx.lineTo(S, z); mctx.stroke();
    }
    // Spray shop + hospital.
    mctx.fillStyle = '#3ec8ff';
    const [sx, sy] = toMap(state.world.sprayShop.x, state.world.sprayShop.z);
    mctx.fillRect(sx - 3, sy - 3, 6, 6);
    mctx.fillStyle = '#ff5a5a';
    const [hx, hy] = toMap(state.world.hospital.x, state.world.hospital.z);
    mctx.fillRect(hx - 3, hy - 3, 6, 6);
    // Mission beacon blip (pulsing orange).
    if (state.missions.state === 'active') {
      const s = state.missions.spot(state.missions.current);
      const [bx, by] = toMap(s.x, s.z);
      const pulse = 4 + Math.sin(state.time * 5) * 2;
      mctx.fillStyle = '#ffb03c';
      mctx.beginPath(); mctx.arc(bx, by, pulse, 0, Math.PI * 2); mctx.fill();
    }
    // Police blips.
    mctx.fillStyle = '#3a86ff';
    for (const cop of state.police.cops) {
      const [cx, cy] = toMap(cop.pos.x, cop.pos.z);
      mctx.beginPath(); mctx.arc(cx, cy, 3, 0, Math.PI * 2); mctx.fill();
    }
    // Player arrow.
    const [px, py] = toMap(state.player.pos.x, state.player.pos.z);
    const heading = state.player.inCar ? state.player.inCar.heading : state.player.heading;
    mctx.save();
    mctx.translate(px, py); mctx.rotate(heading + Math.PI); // canvas up is -z; heading 0 drives +z
    mctx.fillStyle = '#ffffff';
    mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill();
    mctx.restore();
    // North indicator.
    mctx.fillStyle = '#ffffff'; mctx.font = 'bold 12px Arial'; mctx.textAlign = 'center';
    mctx.fillText('N', R, 12);
  }

  function update(state, dt) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) bannerEl.style.display = 'none';
    }
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < state.police.wanted ? '★' : '<span class="off">★</span>';
    starsEl.innerHTML = stars;
    cashEl.textContent = `$${state.cash.value.toLocaleString('en-US')}`;
    healthEl.style.width = `${Math.max(0, state.player.health)}%`;
    const hour = (17 + Math.floor(state.time / 3600)) % 24;
    const min = Math.floor(state.time / 60) % 60;
    clockEl.textContent = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    districtEl.textContent = state.world.districtAt(state.player.pos.x, state.player.pos.z);
    const obj = state.missions.objectiveText();
    objTitle.textContent = obj.title;
    objText.textContent = obj.text;
    const car = state.player.inCar;
    speedEl.textContent = String(Math.round(Math.abs(car ? car.speed : 0) * 1.6));
    carEl.textContent = car ? car.name : 'On foot — Rae "Rook" Marlow';
    drawMinimap(state);
  }

  return { update, showBanner };
}
