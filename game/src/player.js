// Rae "Rook" Marlow on foot: third-person movement, jump, melee, enter/exit cars.
import * as THREE from 'three';
import { GRAVITY, JUMP_SPEED, PLAYER_MAX_HEALTH, SPRINT_SPEED, WALK_SPEED } from './config.js';

export function createPlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xd85a2e });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc89878 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3448 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.34), jacket);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), skin);
  head.position.y = 1.82; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.44), new THREE.MeshLambertMaterial({ color: 0x1a1210 }));
  hair.position.y = 2.04; g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
  legL.position.set(-0.17, 0.36, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.17; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), jacket);
  armL.position.set(-0.44, 1.2, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.44; g.add(armR);
  return { group: g, legL, legR, armL, armR };
}

export function createPlayer(scene, world) {
  const mesh = createPlayerMesh();
  mesh.group.position.set(world.playerSpawn.x, 0, world.playerSpawn.z);
  scene.add(mesh.group);
  return {
    group: mesh.group, legs: [mesh.legL, mesh.legR], arms: [mesh.armL, mesh.armR],
    pos: mesh.group.position, heading: 0, vy: 0, grounded: true,
    health: PLAYER_MAX_HEALTH, inCar: null, walkPhase: 0, punchTimer: 0,
  };
}

// Move on foot; returns 'enter' when the player asks to take the nearest car.
export function stepPlayer(player, input, world, cars, dt, camYaw) {
  const axis = input.axis();
  const speed = input.sprint() ? SPRINT_SPEED : WALK_SPEED;
  const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
  let mx = 0, mz = 0;
  if (axis.y !== 0 || axis.x !== 0) {
    // Forward is away from the camera; right is cross(forward, up).
    mx = sin * axis.y - cos * axis.x;
    mz = cos * axis.y + sin * axis.x;
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;
    player.heading = Math.atan2(mx, mz);
  }
  const nx = player.pos.x + mx * speed * dt;
  const nz = player.pos.z + mz * speed * dt;
  if (!world.collides(nx, player.pos.z, 0.5)) player.pos.x = nx;
  if (!world.collides(player.pos.x, nz, 0.5)) player.pos.z = nz;
  if (player.grounded && input.down('KeyJ')) { player.vy = JUMP_SPEED; player.grounded = false; }
  if (!player.grounded) {
    player.vy -= GRAVITY * dt;
    player.pos.y += player.vy * dt;
    if (player.pos.y <= 0) { player.pos.y = 0; player.vy = 0; player.grounded = true; }
  }
  const moving = Math.abs(mx) + Math.abs(mz) > 0;
  if (moving) player.walkPhase += dt * speed * 1.6;
  const swing = moving ? Math.sin(player.walkPhase) * 0.55 : 0;
  player.legs[0].rotation.x = swing; player.legs[1].rotation.x = -swing;
  player.arms[0].rotation.x = -swing * 0.8; player.arms[1].rotation.x = swing * 0.8;
  if (player.punchTimer > 0) {
    player.punchTimer -= dt;
    player.arms[0].rotation.x = -1.4;
  }
  player.group.rotation.y = player.heading;
  return moving;
}

export function nearestCar(player, cars, maxDist) {
  let best = null, bestD = maxDist;
  for (const c of cars) {
    const d = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function enterCar(player, car) {
  player.inCar = car;
  player.group.visible = false;
  car.occupied = true;
}

export function exitCar(player) {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  player.pos.set(car.pos.x + Math.sin(car.heading + Math.PI / 2) * 2.4, 0, car.pos.z + Math.cos(car.heading + Math.PI / 2) * 2.4);
  player.group.visible = true;
  car.occupied = false;
}
