// Solmar Bay: a seeded procedural grid city — roads, towers, palms, beach and marina.
import * as THREE from 'three';
import { BLOCK, CITY_BLOCKS, CITY_SIZE, ROAD } from './config.js';

const PITCH = BLOCK + ROAD;
const HALF = CITY_SIZE / 2;

function windowTexture(random) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#8a8f98'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = random.chance(0.42);
      g.fillStyle = lit ? (random.chance(0.6) ? '#ffd98a' : '#9fd8ff') : '#2c3440';
      g.fillRect(x, y, 8, 7);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(seedRandom) {
  const random = seedRandom;
  const group = new THREE.Group();
  const buildings = [];
  const roadLines = [];
  for (let k = 0; k <= CITY_BLOCKS; k += 1) roadLines.push(-HALF + k * PITCH);

  // Ground: sidewalk grey base, dark road strips, sand beach and water to the south.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE + 260, CITY_SIZE + 260),
    new THREE.MeshLambertMaterial({ color: 0x9a938a }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; group.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33363d });
  for (const line of roadLines) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, CITY_SIZE), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(line, 0.01, 0); group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(CITY_SIZE, ROAD), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.01, line); group.add(h);
  }
  // Lane dashes down the middle of every road.
  const dashGeo = new THREE.BoxGeometry(0.5, 0.06, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c95a });
  const dashCount = roadLines.length * Math.floor(CITY_SIZE / 12) * 2;
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
  const m4 = new THREE.Matrix4();
  let di = 0;
  for (const line of roadLines) {
    for (let s = -HALF + 6; s < HALF; s += 12) {
      m4.makeTranslation(line, 0.05, s); dashes.setMatrixAt(di, m4); di += 1;
      m4.makeTranslation(s, 0.05, line); dashes.setMatrixAt(di, m4); di += 1;
    }
  }
  dashes.count = di; group.add(dashes);

  // Beach sand + water along the south edge (z positive).
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CITY_SIZE + 260, 90), new THREE.MeshLambertMaterial({ color: 0xe8d49a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.0, HALF + 45); group.add(sand);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x2e7fb8, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(CITY_SIZE + 400, 300), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.4, HALF + 240); group.add(water);

  // Marina water (east edge, resubmit — mandatory, not conditional): the marina
  // boats and docks stood on dry ground, because the only water was 300 units
  // south of them and the ground plane (y -0.05) would hide any water below it.
  // So this strip rides just above the ground (y 0.02), east of the marina road
  // (x 356..568, clear of the road at x <= 355 and of every building at x <= 339),
  // z -210..210, putting real water under all ten boats and all four docks.
  const marinaWaterMat = new THREE.MeshLambertMaterial({ color: 0x2e7fb8, transparent: true, opacity: 0.95 });
  const marinaWater = new THREE.Mesh(new THREE.PlaneGeometry(212, 420), marinaWaterMat);
  marinaWater.rotation.x = -Math.PI / 2; marinaWater.position.set(462, 0.02, 0); group.add(marinaWater);

  // Buildings: one instanced box per tower, tinted per instance, window texture shared.
  const spots = [];
  for (let i = 0; i < CITY_BLOCKS; i += 1) {
    for (let j = 0; j < CITY_BLOCKS; j += 1) {
      const cx = -HALF + i * PITCH + PITCH / 2;
      const cz = -HALF + j * PITCH + PITCH / 2;
      const downtown = Math.hypot(cx, cz) < 150;
      const n = downtown ? 1 : random.chance(0.5) ? 4 : 2;
      for (let b = 0; b < n; b += 1) {
        const ox = n === 1 ? 0 : (b % 2 === 0 ? -11 : 11);
        const oz = n === 1 ? 0 : (b < 2 ? -11 : 11);
        const w = n === 1 ? 34 : 17;
        const h = downtown ? random.range(28, 78) : random.range(8, 30);
        spots.push({ x: cx + ox, z: cz + oz, w, d: w, h });
      }
    }
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshLambertMaterial({ map: windowTexture(random) });
  const inst = new THREE.InstancedMesh(bGeo, bMat, spots.length);
  const palette = [0xd8cfc0, 0xc0b8a8, 0xa8b8c8, 0xd8a890, 0xb8c8a8, 0xe8e0d0, 0x98a8b8];
  const col = new THREE.Color();
  spots.forEach((s, idx) => {
    m4.makeScale(s.w, s.h, s.d);
    m4.setPosition(s.x, s.h / 2, s.z);
    inst.setMatrixAt(idx, m4);
    inst.setColorAt(idx, col.setHex(random.pick(palette)));
    buildings.push({ x: s.x, z: s.z, hx: s.w / 2, hz: s.d / 2, h: s.h });
  });
  group.add(inst);

  // Palm trees along sidewalks.
  const palmCount = 130;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a48 }), palmCount);
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(3.2, 3.4, 7), new THREE.MeshLambertMaterial({ color: 0x3f8a4a }), palmCount);
  for (let p = 0; p < palmCount; p += 1) {
    const line = random.pick(roadLines);
    const along = random.range(-HALF + 10, HALF - 10);
    const side = random.chance(0.5) ? 1 : -1;
    const px = random.chance(0.5) ? line + side * (ROAD / 2 + 2.5) : along;
    const pz = px === line + side * (ROAD / 2 + 2.5) ? along : line + side * (ROAD / 2 + 2.5);
    m4.makeTranslation(px, 3.5, pz); trunk.setMatrixAt(p, m4);
    m4.makeTranslation(px, 8.2, pz); crown.setMatrixAt(p, m4);
  }
  group.add(trunk); group.add(crown);

  // Streetlights at intersections.
  const lampCount = roadLines.length * roadLines.length;
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 5), new THREE.MeshLambertMaterial({ color: 0x44484e }), lampCount);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), lampCount);
  let li = 0;
  for (const lx of roadLines) {
    for (const lz of roadLines) {
      m4.makeTranslation(lx + ROAD / 2 + 1, 3, lz + ROAD / 2 + 1); poles.setMatrixAt(li, m4);
      m4.makeTranslation(lx + ROAD / 2 + 1, 6.1, lz + ROAD / 2 + 1); bulbs.setMatrixAt(li, m4);
      li += 1;
    }
  }
  group.add(poles); group.add(bulbs);

  // Marina: docks and boats on the east edge (x positive), plus a spray shop and hospital.
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  for (let d = 0; d < 4; d += 1) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(46, 1, 5), dockMat);
    dock.position.set(HALF + 26, 0.4, -140 + d * 80); group.add(dock);
  }
  const boatColors = [0xe8e8e8, 0x4a7ab8, 0xd84a4a, 0xe8c84a];
  for (let b = 0; b < 10; b += 1) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 1.6, 3.4), new THREE.MeshLambertMaterial({ color: random.pick(boatColors) }));
    hull.position.y = 0.6; boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2.6), new THREE.MeshLambertMaterial({ color: 0xf0f0e8 }));
    cabin.position.set(-0.5, 2.2, 0); boat.add(cabin);
    boat.position.set(HALF + 14 + random.range(0, 30), 0, -160 + b * 34 + random.range(-6, 6));
    boat.rotation.y = random.range(-0.15, 0.15);
    boat.scale.setScalar(1.3); // larger hulls read as boats, not boxes, at shot distance
    group.add(boat);
  }
  // Spray shop (repaint clears wanted) and hospital (respawn point), as glowing sign boxes.
  function landmark(x, z, color, label) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 10), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    box.position.set(x, 3, z); group.add(box);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(14.4, 1.6, 10.4), new THREE.MeshBasicMaterial({ color }));
    sign.position.set(x, 6.6, z); group.add(sign);
    return { x, z, label };
  }
  const sprayShop = landmark(-284, -290, 0x3ec8ff, 'Spray Shop');
  const hospital = landmark(284, 290, 0xff5a5a, 'Solmar General');
  // Rook's Garage (upgrade shop): south-west corner, the west-end corner
  // opposite the hospital side. The garage module builds its own sign box.
  const garage = { x: -284, z: 290, label: "Rook's Garage" };

  const playerSpawn = { x: -290, z: 0 };

  function nearestRoadCoord(v) {
    let best = roadLines[0];
    for (const l of roadLines) if (Math.abs(l - v) < Math.abs(best - v)) best = l;
    return best;
  }
  function isOnRoad(x, z) {
    return Math.abs(x - nearestRoadCoord(x)) < ROAD / 2 + 1 || Math.abs(z - nearestRoadCoord(z)) < ROAD / 2 + 1;
  }
  function randomRoadPoint() {
    const line = random.pick(roadLines);
    const along = random.range(-HALF + 20, HALF - 20);
    return random.chance(0.5) ? { x: line, z: along } : { x: along, z: line };
  }
  function randomSidewalkPoint() {
    const line = random.pick(roadLines);
    const along = random.range(-HALF + 20, HALF - 20);
    const off = (random.chance(0.5) ? 1 : -1) * (ROAD / 2 + 1);
    return random.chance(0.5) ? { x: line + off, z: along } : { x: along, z: line + off };
  }
  function collides(x, z, r) {
    if (Math.abs(x) > HALF + 30 || Math.abs(z) > HALF + 30) return true;
    for (const b of buildings) {
      if (Math.abs(x - b.x) < b.hx + r && Math.abs(z - b.z) < b.hz + r) return true;
    }
    return false;
  }
  function districtAt(x, z) {
    if (x > HALF - 90) return 'Marina District';
    if (z > HALF - 90) return 'Beachfront';
    if (Math.hypot(x, z) < 150) return 'Downtown Solmar Bay';
    if (x < -HALF + 120) return 'West End';
    if (z < -HALF + 120) return 'Northside';
    return 'Solmar Bay';
  }

  return {
    group, buildings, roadLines, sprayShop, hospital, garage, playerSpawn, water,
    nearestRoadCoord, isOnRoad, randomRoadPoint, randomSidewalkPoint, collides, districtAt,
    update(dt, t) { water.position.y = -0.4 + Math.sin(t * 0.7) * 0.12; },
  };
}
