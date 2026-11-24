// Rook's Garage: a real upgrade shop at the west end of Solmar Bay.
// Three one-time upgrades bought with cash near the garage (key G):
// tuned engine ($800, clearly higher top speed), armour ($600, police ram
// damage halved), racing tires ($500, faster steering). Each purchase deducts
// cash at once, shows a confirmation banner, and is saved with the game.
import * as THREE from 'three';

export const GARAGE_UPGRADES = [
  { id: 'engine', label: 'Tuned Engine', short: 'ENG', cost: 800, text: 'Top speed up — the Comet pulls harder now.' },
  { id: 'armor', label: 'Armour Plating', short: 'ARM', cost: 600, text: 'Police rams hurt half as much now.' },
  { id: 'tires', label: 'Racing Tires', short: 'TIR', cost: 500, text: 'Steering bites faster — corners feel glued.' },
];

export function createGarage(scene, world) {
  // The garage building: a glowing green-sign box at the south-west corner,
  // opposite side of the city from the hospital.
  const box = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 11), new THREE.MeshLambertMaterial({ color: 0x5a5a52 }));
  box.position.set(world.garage.x, 3.5, world.garage.z);
  scene.add(box);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.8, 11.4), new THREE.MeshBasicMaterial({ color: 0x2eff7a }));
  sign.position.set(world.garage.x, 7.6, world.garage.z);
  scene.add(sign);
  const door = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 0.4), new THREE.MeshLambertMaterial({ color: 0x22262c }));
  door.position.set(world.garage.x, 2.25, world.garage.z + 5.6);
  scene.add(door);

  const owned = { engine: false, armor: false, tires: false };

  function nextUpgrade() {
    for (const u of GARAGE_UPGRADES) if (!owned[u.id]) return u;
    return null;
  }

  // Returns { ok, upgrade?, reason? }. Caller shows the banner and saves.
  function buy(cash) {
    const u = nextUpgrade();
    if (!u) return { ok: false, reason: 'complete' };
    if (cash.value < u.cost) return { ok: false, reason: 'poor', upgrade: u };
    cash.value -= u.cost;
    owned[u.id] = true;
    return { ok: true, upgrade: u };
  }

  return {
    owned,
    nextUpgrade,
    buy,
    // Handling multipliers read by the driving and police code.
    get topSpeedMult() { return owned.engine ? 1.28 : 1; },
    get steerMult() { return owned.tires ? 1.45 : 1; },
    get armorMult() { return owned.armor ? 0.5 : 1; },
    get count() { return GARAGE_UPGRADES.filter((u) => owned[u.id]).length; },
    toSave() { return { ...owned }; },
    fromSave(saved) {
      if (!saved) return;
      for (const u of GARAGE_UPGRADES) owned[u.id] = !!saved[u.id];
    },
  };
}
