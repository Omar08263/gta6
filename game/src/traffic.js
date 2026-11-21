// Traffic cars that follow the road lanes, pedestrians on the sidewalks, parked cars to steal.
import * as THREE from 'three';
import { CAR_COLORS, CAR_NAMES, createCar } from './driving.js';

function pedMesh(colorHex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.32), new THREE.MeshLambertMaterial({ color: colorHex }));
  body.position.y = 1.1; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), new THREE.MeshLambertMaterial({ color: 0xc89878 }));
  head.position.y = 1.72; g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.68, 0.22), new THREE.MeshLambertMaterial({ color: 0x333a48 }));
  legL.position.set(-0.14, 0.34, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
  return { group: g, legL, legR };
}

export function createTraffic(scene, world, random) {
  const cars = [];
  const peds = [];
  const parked = [];
  const pedColors = [0xe8e8e8, 0x4a7ab8, 0xd8a84a, 0x7a4a8a, 0x38b878, 0xe88a4a];

  function addTrafficCar() {
    const p = world.randomRoadPoint();
    const alongX = Math.abs(p.x - world.nearestRoadCoord(p.x)) < 0.1;
    const heading = alongX ? (random.chance(0.5) ? 0 : Math.PI) : (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const lane = (random.chance(0.5) ? 1 : -1) * 3.2;
    const car = createCar(scene, {
      x: alongX ? p.x + lane : p.x, z: alongX ? p.z : p.z + lane,
      heading, color: random.pick(CAR_COLORS), name: random.pick(CAR_NAMES),
      topSpeed: random.range(16, 26),
    });
    car.cruise = car.topSpeed;
    car.lane = lane;
    cars.push(car);
    return car;
  }
  for (let i = 0; i < 14; i += 1) addTrafficCar();

  function addParked() {
    const p = world.randomRoadPoint();
    const alongX = Math.abs(p.x - world.nearestRoadCoord(p.x)) < 0.1;
    const heading = alongX ? (random.chance(0.5) ? 0 : Math.PI) : (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const side = (random.chance(0.5) ? 1 : -1) * 5.2;
    const car = createCar(scene, {
      x: alongX ? p.x + side : p.x, z: alongX ? p.z : p.z + side,
      heading, color: random.pick(CAR_COLORS), name: random.pick(CAR_NAMES),
      parked: true, occupied: random.chance(0.4),
    });
    parked.push(car);
    return car;
  }
  for (let i = 0; i < 10; i += 1) addParked();

  function addPed() {
    const p = world.randomSidewalkPoint();
    const m = pedMesh(random.pick(pedColors));
    m.group.position.set(p.x, 0, p.z);
    scene.add(m.group);
    const ped = { ...m, pos: m.group.position, heading: random.range(0, Math.PI * 2), speed: random.range(1.2, 2.4), phase: random.range(0, 6), fleeing: false, wait: 0 };
    peds.push(ped);
    return ped;
  }
  for (let i = 0; i < 22; i += 1) addPed();

  const HALF = 348;
  function update(dt, player, danger, frozen) {
    // Traffic: cruise along its road; slow for a car ahead; wrap around the city edge.
    for (const car of cars) {
      if (frozen) continue;
      let blocked = false;
      for (const o of cars) {
        if (o === car) continue;
        const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        if (ahead > 0 && ahead < 9 && Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading)) < 2.5) { blocked = true; break; }
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      if (Math.abs(car.pos.x) > HALF || Math.abs(car.pos.z) > HALF) {
        const p = world.randomRoadPoint();
        car.pos.set(p.x, 0, p.z);
        car.heading = Math.abs(p.x - world.nearestRoadCoord(p.x)) < 0.1 ? (random.chance(0.5) ? 0 : Math.PI) : (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      }
      car.group.rotation.y = car.heading;
      for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
    }
    // Pedestrians: stroll the sidewalks, step aside for the player, run from danger.
    for (const ped of peds) {
      if (frozen) continue;
      const dx = ped.pos.x - player.pos.x, dz = ped.pos.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (danger && d < 26) { ped.fleeing = true; ped.heading = Math.atan2(dx, dz); }
      else if (d < 3) { ped.heading = Math.atan2(dx, dz); ped.wait = 0.4; }
      else if (ped.wait > 0) { ped.wait -= dt; }
      else if (random.chance(dt * 0.05)) ped.heading += random.range(-1.2, 1.2);
      const sp = ped.fleeing ? 5.5 : ped.speed;
      if (ped.wait <= 0) {
        ped.pos.x += Math.sin(ped.heading) * sp * dt;
        ped.pos.z += Math.cos(ped.heading) * sp * dt;
        if (world.isOnRoad(ped.pos.x, ped.pos.z) || Math.abs(ped.pos.x) > HALF || Math.abs(ped.pos.z) > HALF) {
          ped.heading += Math.PI / 2;
          ped.pos.x -= Math.sin(ped.heading) * sp * dt * 2;
          ped.pos.z -= Math.cos(ped.heading) * sp * dt * 2;
        }
      }
      ped.phase += dt * sp * 3;
      const swing = Math.sin(ped.phase) * 0.4;
      ped.legL.rotation.x = swing; ped.legR.rotation.x = -swing;
      ped.group.rotation.y = ped.heading;
      if (ped.fleeing && d > 40) ped.fleeing = false;
    }
  }

  return { cars, peds, parked, update, addTrafficCar, addParked, addPed };
}
