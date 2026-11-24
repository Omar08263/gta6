// Crew member "Diz": an invented character who follows Rook on foot, rides
// along as a passenger when Rook takes a car, and steps out with him.
// Real effect: finishing any job while Diz is with you pays a 15% crew bonus
// on top of the job reward, and the banner names the bonus amount.
import * as THREE from 'three';

export function createCrew(scene) {
  const jacket = new THREE.MeshLambertMaterial({ color: 0x18c8d8 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x22222a });
  const skin = new THREE.MeshLambertMaterial({ color: 0x8a5a3a });

  function buildFigure(scale) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.82, 0.34), jacket);
    body.position.y = 1.12; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.38), skin);
    head.position.y = 1.78; g.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.42), new THREE.MeshLambertMaterial({ color: 0xd82e7a }));
    cap.position.y = 2.0; g.add(cap);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), pants);
    legL.position.set(-0.16, 0.35, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.16; g.add(legR);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), jacket);
    armL.position.set(-0.42, 1.16, 0); g.add(armL);
    const armR = armL.clone(); armR.position.x = 0.42; g.add(armR);
    g.scale.setScalar(scale);
    return { group: g, legL, legR, armL, armR };
  }

  const walker = buildFigure(1);
  walker.group.position.set(-286, 0, 4);
  scene.add(walker.group);
  // Passenger figure, parented to the car the player drives.
  const rider = buildFigure(0.92);
  rider.group.position.set(0.55, 0.35, -0.2);
  rider.group.visible = false;
  rider.group.rotation.y = 0;

  let inCar = null;
  let phase = 0;

  function board(car) {
    if (inCar === car) return;
    if (inCar) inCar.group.remove(rider.group);
    inCar = car;
    car.group.add(rider.group);
    rider.group.visible = true;
    walker.group.visible = false;
  }

  function alight(playerPos) {
    if (!inCar) return;
    inCar.group.remove(rider.group);
    inCar = null;
    rider.group.visible = false;
    walker.group.visible = true;
    walker.group.position.set(playerPos.x + 1.6, 0, playerPos.z + 1.6);
  }

  function update(dt, player) {
    if (inCar) return; // riding: the car carries the passenger figure.
    if (!walker.group.visible) walker.group.visible = true;
    const dx = player.pos.x - walker.group.position.x;
    const dz = player.pos.z - walker.group.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 2.4) {
      const sp = 6.5;
      const step = Math.min(d - 2.2, sp * dt);
      walker.group.position.x += (dx / d) * step;
      walker.group.position.z += (dz / d) * step;
      walker.group.rotation.y = Math.atan2(dx, dz);
      phase += dt * sp * 1.6;
      const swing = Math.sin(phase) * 0.5;
      walker.legL.rotation.x = swing; walker.legR.rotation.x = -swing;
      walker.armL.rotation.x = -swing * 0.8; walker.armR.rotation.x = swing * 0.8;
    } else {
      walker.legL.rotation.x = 0; walker.legR.rotation.x = 0;
      walker.armL.rotation.x = 0; walker.armR.rotation.x = 0;
    }
  }

  return {
    get withPlayer() { return true; }, // Diz is always with Rook, on foot or riding.
    get riding() { return !!inCar; },
    get pos() { return walker.group.position; },
    board, alight, update,
    // 15% crew bonus on a job reward, rounded to whole dollars.
    bonusFor(reward) { return Math.round(reward * 0.15); },
  };
}
