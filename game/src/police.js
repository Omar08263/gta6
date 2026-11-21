// Wanted stars and the Solmar Bay patrol: spawn, chase, ram, box in, decay, clear.
import { CAR_TOP_SPEED, POLICE_RAM_DAMAGE, WANTED_DECAY_SECONDS, WANTED_MAX } from './config.js';
import { createCar, placeCarAt } from './driving.js';

export function createPolice(scene, world, random) {
  const cops = [];
  let wanted = 0;
  let hiddenTimer = 0;
  let spawnTimer = 0;

  function addWanted(n) {
    wanted = Math.min(WANTED_MAX, wanted + n);
    hiddenTimer = 0;
  }
  function clearWanted() { wanted = 0; for (const c of cops) c.group.visible = false; cops.length = 0; }

  function spawnCop(near) {
    const angle = random.range(0, Math.PI * 2);
    const x = near.x + Math.sin(angle) * 60;
    const z = near.z + Math.cos(angle) * 60;
    const cop = createCar(scene, {
      x, z, heading: Math.atan2(near.x - x, near.z - z),
      color: 0x1a1a1a, name: 'Patrol Cruiser', police: true, topSpeed: CAR_TOP_SPEED + 6,
    });
    cops.push(cop);
    return cop;
  }

  function update(dt, player, frozen) {
    if (frozen) return;
    const target = player.inCar ? player.inCar : player;
    const speed = player.inCar ? Math.abs(player.inCar.speed) : 0;
    // Break line of sight: slow down and hide to cool the heat off.
    const nearCop = cops.some((c) => Math.hypot(c.pos.x - target.pos.x, c.pos.z - target.pos.z) < 45);
    if (wanted > 0 && !nearCop && speed < 4) hiddenTimer += dt;
    else hiddenTimer = 0;
    if (hiddenTimer > WANTED_DECAY_SECONDS) { wanted = Math.max(0, wanted - 1); hiddenTimer = 0; }

    const wantCops = Math.min(wanted, 4);
    spawnTimer -= dt;
    if (cops.length < wantCops && spawnTimer <= 0) {
      spawnCop(target.pos);
      spawnTimer = 1.2;
    }
    // Chase: steer toward the player, ram on contact, ease off when the heat is gone.
    for (const cop of cops) {
      if (!cop.group.visible) cop.group.visible = true;
      if (wanted === 0) {
        cop.speed *= 1 - Math.min(1, dt * 2);
        cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
        continue;
      }
      const dx = target.pos.x - cop.pos.x, dz = target.pos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const targetSpeed = dist > 8 ? cop.topSpeed : cop.topSpeed * 0.55;
      cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.2);
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.group.rotation.y = cop.heading;
      for (const w of cop.wheels) w.rotation.x += cop.speed * dt * 2.4;
      if (dist < 3.6) {
        cop.speed *= 0.4;
        if (player.inCar) {
          player.inCar.speed *= 0.85;
          player.health -= POLICE_RAM_DAMAGE * dt * 4;
        } else {
          player.health -= POLICE_RAM_DAMAGE * dt * 6;
        }
      }
    }
    // Despawn distant cops once the heat is off.
    for (let i = cops.length - 1; i >= 0; i -= 1) {
      const c = cops[i];
      if (wanted === 0 && Math.hypot(c.pos.x - target.pos.x, c.pos.z - target.pos.z) > 120) {
        scene.remove(c.group); cops.splice(i, 1);
      }
    }
  }

  return {
    cops,
    get wanted() { return wanted; },
    addWanted, clearWanted, update, spawnCop,
    setWanted(n) { wanted = Math.min(WANTED_MAX, Math.max(0, n)); },
  };
}
