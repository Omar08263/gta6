// The five-job story arc: courier, timed drive, tailing, getaway chase, marina heist finale.
import * as THREE from 'three';
import { MISSION_REWARDS } from './config.js';

export const MISSION_DEFS = [
  { id: 0, title: 'Job 1 — First Delivery', text: 'Drive the package to the orange beacon in Downtown. No heat, no fuss.', kind: 'deliver', time: 0 },
  { id: 1, title: 'Job 2 — Sunset Sprint', text: 'Race to the Beachfront beacon before the timer runs out.', kind: 'timed', time: 75 },
  { id: 2, title: 'Job 3 — Tail the Courier', text: 'Follow the grey sedan without spooking it. Stay close, stay quiet.', kind: 'tail', time: 0 },
  { id: 3, title: 'Job 4 — Hot Getaway', text: 'The patrol is on you. Reach the Marina beacon with the heat still on.', kind: 'getaway', time: 0 },
  { id: 4, title: 'Job 5 — The Marina Heist', text: 'Grab the crew cash at the marina, then lose the patrol and reach the hideout.', kind: 'heist', time: 0 },
];

// Beacon spots sit on road lines so the player can always reach them.
const BEACON_SPOTS = [
  { x: 0, z: 58 }, { x: 0, z: 290 }, { x: -174, z: -174 }, { x: 290, z: -116 }, { x: 340, z: 58 },
];

export function createMissions(scene, world, random) {
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff8a2e, transparent: true, opacity: 0.75 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffb03c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 24), beaconMat);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.6, 90, 12, 1, true), beamMat);
  beam.position.y = 45;
  const beaconGroup = new THREE.Group();
  beaconGroup.add(beacon); beaconGroup.add(beam);
  beaconGroup.visible = false;
  scene.add(beaconGroup);

  let current = 0;
  let state = 'idle'; // idle | active | done
  let timer = 0;
  let tailCar = null;
  let tailTime = 0;
  let heistStage = 0;
  let completed = 0;
  let beaconPos = { x: 0, z: 0 };

  function spot(i) {
    if (state === 'active' && i === current) return beaconPos;
    return BEACON_SPOTS[i % BEACON_SPOTS.length];
  }

  function start(i, traffic) {
    current = i;
    state = 'active';
    timer = MISSION_DEFS[i].time;
    heistStage = 0;
    tailTime = 0;
    const s = spot(i);
    beaconPos = { x: s.x, z: s.z };
    beaconGroup.position.set(s.x, 0.3, s.z);
    beaconGroup.visible = true;
    if (MISSION_DEFS[i].kind === 'tail' && traffic) {
      const p = world.randomRoadPoint();
      tailCar = traffic.addTrafficCar();
      tailCar.pos.set(p.x, 0, p.z);
      tailCar.color = 0x777777;
    }
    return MISSION_DEFS[i];
  }

  function complete(cash) {
    const reward = MISSION_REWARDS[current];
    cash.value += reward;
    state = 'done';
    completed += 1;
    beaconGroup.visible = false;
    return { reward, title: MISSION_DEFS[current].title };
  }

  function fail() {
    state = 'idle';
    beaconGroup.visible = false;
    return MISSION_DEFS[current];
  }

  function objectiveText() {
    if (state === 'idle') return { title: 'Free roam — Solmar Bay', text: 'Press M to start the next job. Steal a car with E.' };
    const def = MISSION_DEFS[current];
    let extra = '';
    if (def.kind === 'timed') extra = ` — ${Math.max(0, Math.ceil(timer))}s left`;
    if (def.kind === 'tail') extra = ` — stay on it ${Math.max(0, Math.ceil(12 - tailTime))}s`;
    if (def.kind === 'heist') extra = heistStage === 0 ? ' — grab the cash first' : ' — now reach the hideout';
    return { title: def.title + extra, text: def.text };
  }

  // Returns 'complete' | 'fail' | null. `pos` is the player's position, `wanted` the star count.
  function update(dt, pos, wanted, traffic) {
    if (state !== 'active') return null;
    const def = MISSION_DEFS[current];
    const s = spot(current);
    if (def.kind === 'timed') {
      timer -= dt;
      if (timer <= 0) return 'fail';
    }
    const d = Math.hypot(pos.x - s.x, pos.z - s.z);
    if (def.kind === 'tail' && tailCar) {
      const td = Math.hypot(pos.x - tailCar.pos.x, pos.z - tailCar.pos.z);
      if (td < 26) tailTime += dt; else tailTime = Math.max(0, tailTime - dt * 2);
      if (tailTime >= 12) return 'complete';
      if (td > 70) return 'fail';
      return null;
    }
    if (def.kind === 'heist') {
      if (heistStage === 0) {
        if (d < 7) { heistStage = 1; beaconPos = { x: -290, z: -290 }; beaconGroup.position.set(-290, 0.3, -290); }
        return null;
      }
      if (Math.hypot(pos.x + 290, pos.z + 290) < 8 && wanted === 0) return 'complete';
      return null;
    }
    if (def.kind === 'getaway') {
      if (d < 8 && wanted > 0) return 'complete';
      return null;
    }
    if (d < 8) return 'complete';
    return null;
  }

  return {
    beaconGroup,
    get current() { return current; },
    get state() { return state; },
    get completed() { return completed; },
    get tailCar() { return tailCar; },
    start, complete, fail, objectiveText, update, spot,
    setCompleted(n) { completed = n; },
    setCurrent(n) { current = n; },
  };
}
