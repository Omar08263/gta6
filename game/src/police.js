// Wanted stars and the Solmar Bay patrol: spawn, chase, ram, box in, decay, clear.
// Air One: at 3 stars or more a police helicopter circles overhead with a
// spinning rotor and a searchlight cone, and vanishes when the heat hits zero.
// Roadblocks: at 4 stars or more two patrol cruisers park across the road ahead
// of the player with a real collision — they block the way until the heat dies.
import * as THREE from 'three';
import { CAR_TOP_SPEED, POLICE_RAM_DAMAGE, WANTED_DECAY_SECONDS, WANTED_MAX } from './config.js';
import { createCar, placeCarAt } from './driving.js';

export function createPolice(scene, world, random) {
  const cops = [];
  const roadblock = [];
  let wanted = 0;
  let hiddenTimer = 0;
  let spawnTimer = 0;
  let roadblockWarned = false;

  // Air One helicopter: body, tail, spinning rotor, searchlight cone.
  // Scaled up so it reads at contact-sheet size from 40 units away.
  const heli = new THREE.Group();
  heli.scale.setScalar(1.4);
  const heliBody = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 6.5), new THREE.MeshLambertMaterial({ color: 0x1a2a44 }));
  heliBody.position.y = 0; heli.add(heliBody);
  const heliTail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 4.5), new THREE.MeshLambertMaterial({ color: 0x1a2a44 }));
  heliTail.position.set(0, 0.2, -5); heli.add(heliTail);
  const heliStripe = new THREE.Mesh(new THREE.BoxGeometry(3.44, 0.5, 6.54), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  heliStripe.position.y = 0.1; heli.add(heliStripe);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  rotor.position.y = 1.2; heli.add(rotor);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(5, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  spot.position.y = -13.5; spot.rotation.x = Math.PI; heli.add(spot);
  heli.visible = false;
  scene.add(heli);

  function addWanted(n) {
    wanted = Math.min(WANTED_MAX, wanted + n);
    hiddenTimer = 0;
  }
  function clearWanted() {
    wanted = 0;
    for (const c of cops) c.group.visible = false;
    cops.length = 0;
    clearRoadblock();
    heli.visible = false;
  }

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

  // Park two cruisers across the road ahead of the player. They stay put as a
  // solid wall (the driving code collides with them like any other car) until
  // the wanted level drops below 4, then they are towed away.
  function deployRoadblock(target, heading) {
    if (roadblock.length > 0) return;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const px = Math.cos(heading), pz = -Math.sin(heading);
    const ax = target.x + fx * 26, az = target.z + fz * 26;
    for (const side of [-1, 1]) {
      const car = createCar(scene, {
        x: ax + px * side * 3.4, z: az + pz * side * 3.4,
        heading: heading + Math.PI / 2, color: 0x1a1a1a,
        name: 'Roadblock', police: true, topSpeed: 0,
      });
      car.speed = 0;
      roadblock.push(car);
    }
    roadblockWarned = true;
  }

  function clearRoadblock() {
    for (const c of roadblock) scene.remove(c.group);
    roadblock.length = 0;
    roadblockWarned = false;
  }

  function placeRoadblockAt(x, z, heading) {
    clearRoadblock();
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const px = Math.cos(heading), pz = -Math.sin(heading);
    for (const side of [-1, 1]) {
      const car = createCar(scene, {
        x: x + px * side * 3.4, z: z + pz * side * 3.4,
        heading: heading + Math.PI / 2, color: 0x1a1a1a,
        name: 'Roadblock', police: true, topSpeed: 0,
      });
      car.speed = 0;
      roadblock.push(car);
    }
    roadblockWarned = true;
  }

  function update(dt, player, frozen, armorMult) {
    if (frozen) return;
    const target = player.inCar ? player.inCar : player;
    const speed = player.inCar ? Math.abs(player.inCar.speed) : 0;
    const heading = player.inCar ? player.inCar.heading : player.heading;
    // Break line of sight: slow down and hide to cool the heat off.
    const nearCop = cops.some((c) => Math.hypot(c.pos.x - target.pos.x, c.pos.z - target.pos.z) < 45);
    if (wanted > 0 && !nearCop && speed < 4) hiddenTimer += dt;
    else hiddenTimer = 0;
    if (hiddenTimer > WANTED_DECAY_SECONDS) { wanted = Math.max(0, wanted - 1); hiddenTimer = 0; }

    // Air One: 3 stars or more, circling above the player. It flies low (y 16)
    // and wide (radius 26) so it stays inside the chase camera's frame — the
    // camera looks down ~19 degrees, so a high helicopter would be out of shot.
    if (wanted >= 3) {
      heli.visible = true;
      const a = performance.now() / 1000 * 0.55;
      heli.position.set(target.pos.x + Math.sin(a) * 26, 16, target.pos.z + Math.cos(a) * 26);
      heli.rotation.y = Math.atan2(target.pos.x - heli.position.x, target.pos.z - heli.position.z);
      rotor.rotation.y += dt * 22;
    } else {
      heli.visible = false;
    }

    // Roadblocks: 4 stars or more, re-planted ahead whenever the player closes in.
    if (wanted >= 4) {
      if (roadblock.length === 0) deployRoadblock(target.pos, heading);
      else {
        const mid = roadblock[0].pos;
        const d = Math.hypot(mid.x - target.pos.x, mid.z - target.pos.z);
        const ahead = (mid.x - target.pos.x) * Math.sin(heading) + (mid.z - target.pos.z) * Math.cos(heading);
        if (d < 16 || ahead < 0) { clearRoadblock(); deployRoadblock(target.pos, heading); }
      }
    } else if (roadblock.length > 0) {
      clearRoadblock();
    }

    const wantCops = Math.min(wanted, 4);
    spawnTimer -= dt;
    if (cops.length < wantCops && spawnTimer <= 0) {
      spawnCop(target.pos);
      spawnTimer = 1.2;
    }
    // Chase: steer toward the player, ram on contact, ease off when the heat is gone.
    const ramDamage = POLICE_RAM_DAMAGE * (armorMult || 1);
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
          player.health -= ramDamage * dt * 4;
        } else {
          player.health -= ramDamage * dt * 6;
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
    cops, roadblock, heli,
    get wanted() { return wanted; },
    get roadblockActive() { return roadblock.length > 0; },
    get roadblockWarned() { return roadblockWarned; },
    addWanted, clearWanted, update, spawnCop,
    deployRoadblock, clearRoadblock, placeRoadblockAt,
    showHeliAt(x, z, y) {
      heli.visible = true;
      heli.position.set(x, y === undefined ? 16 : y, z);
      heli.rotation.y = 0;
      rotor.rotation.y = 0.6;
    },
    hideHeli() { heli.visible = false; },
    setWanted(n) { wanted = Math.min(WANTED_MAX, Math.max(0, n)); },
  };
}
