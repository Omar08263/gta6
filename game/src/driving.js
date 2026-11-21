// Arcade car: mesh factory, handling, collisions, and the player-car chase state.
import * as THREE from 'three';
import { CAR_ACCEL, CAR_BRAKE, CAR_REVERSE_SPEED, CAR_STEER, CAR_TOP_SPEED } from './config.js';

export const CAR_NAMES = ['Comet', 'Stinger', 'Falcon', 'Vortex', 'Sunrunner', 'Patrol Cruiser'];
export const CAR_COLORS = [0xd83a2e, 0x2e7ad8, 0xe8c832, 0x38b878, 0xe8e8e8, 0x2a2a2e];

export function createCarMesh(colorHex, police) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), bodyMat);
  body.position.y = 0.65; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
  cabin.position.set(0, 1.3, -0.2); cabin.castShadow = true; g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.75, -0.2); g.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.3, 4.62), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.72; g.add(stripe);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  head.position.set(0, 0.7, 2.32); g.add(head);
  return { group: g, wheels };
}

export function createCar(scene, opts) {
  const mesh = createCarMesh(opts.color, opts.police);
  mesh.group.position.set(opts.x, 0, opts.z);
  mesh.group.rotation.y = opts.heading || 0;
  scene.add(mesh.group);
  const car = {
    group: mesh.group, wheels: mesh.wheels,
    pos: mesh.group.position, heading: opts.heading || 0,
    speed: 0, steer: 0, name: opts.name || 'Comet', color: opts.color,
    police: !!opts.police, parked: !!opts.parked, occupied: !!opts.occupied,
    topSpeed: opts.topSpeed || CAR_TOP_SPEED, driver: null, health: 100,
  };
  return car;
}

function collideWorld(car, world) {
  const r = 1.6;
  const nx = car.pos.x + Math.sin(car.heading) * car.speed * 0.016;
  const nz = car.pos.z + Math.cos(car.heading) * car.speed * 0.016;
  if (world.collides(nx, nz, r)) { car.speed *= -0.25; return true; }
  return false;
}

// Arcade step: accelerate / brake / reverse, steering that bites with speed, handbrake drift.
export function driveCar(car, input, world, dt, others) {
  const axis = input.axis();
  const forward = axis.y;
  const handbrake = input.handbrake();
  if (forward > 0) car.speed += CAR_ACCEL * dt * (car.speed < 0 ? 2.2 : 1);
  else if (forward < 0) {
    if (car.speed > 0.5) car.speed -= CAR_BRAKE * dt;
    else car.speed -= CAR_ACCEL * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), (handbrake ? 30 : 8) * dt);
  }
  car.speed = Math.max(-CAR_REVERSE_SPEED, Math.min(car.topSpeed, car.speed));
  const steerTarget = -axis.x * CAR_STEER * (handbrake ? 1.5 : 1);
  const grip = handbrake ? 0.35 : 1;
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  car.heading += car.steer * dt * Math.min(1, Math.abs(car.speed) / 12) * Math.sign(car.speed || 1) * grip;
  if (collideWorld(car, world)) car.speed *= 0.5;
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  // Soft bumps against other cars.
  if (others) {
    for (const o of others) {
      if (o === car) continue;
      const dx = car.pos.x - o.pos.x, dz = car.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 12 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (3.5 - d) * 0.5;
        car.pos.x += (dx / d) * push; car.pos.z += (dz / d) * push;
        car.speed *= 0.82;
        if (o.police || car.police) return 'ram';
      }
    }
  }
  car.group.rotation.y = car.heading;
  const spin = car.speed * dt * 2.4;
  for (const w of car.wheels) w.rotation.x += spin;
  return null;
}

export function placeCarAt(car, x, z, heading) {
  car.pos.set(x, 0, z);
  car.heading = heading;
  car.speed = 0;
  car.group.rotation.y = heading;
}
