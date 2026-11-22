// Deterministic ?shot= scenes: chase | drive | mission | heist. Each stages a late-game
// unlocked state with a fixed seed, freezes traffic, peds and police, and runs a fixed number
// of physics steps so the same seed always gives the same frame.
//
// Resubmit reframing (campaign "90%", pre-build review amendments applied):
// - drive moved to the southern beachfront road (z = 348): the car runs east with the
//   beach and water on its right (south) and the downtown towers on its left (north),
//   a composition unlike chase/heist instead of the same street as chase.
// - heist moved onto the marina road itself (x = 348, heading south): the Job 5 beacon,
//   the docks and the boats are ahead of the car, and the eastern marina water strip
//   (world.js) puts real water under the boats — reframing alone could not show water
//   there, because the only water was 300 units south of the dry marina.
// - mission: Rook is now inside a car before Job 1 starts, so the "Drive the package"
//   objective matches the frame (the Job 2 alternative was dropped: its beacon sits
//   at (0, 290) on the beach, a whole second framing, not a swap).
// - chase (the cover) is untouched: same position, heading, cops and street life.
// - Every moved shot carries its stageStreetLife coordinates with it, so traffic and
//   pedestrians stay in frame; the cops are already anchored relative to the player.
// - Step 5 of the plan (facade/shadow variety) was dropped outright as first-to-drop.
import { STEP } from './config.js';
import { placeCarAt } from './driving.js';
import { enterCar } from './player.js';

// A scripted input so staged cars drive forward identically every run.
function scriptedInput(forward) {
  return {
    axis: () => ({ x: 0, y: forward }),
    handbrake: () => false,
    sprint: () => false,
    down: () => false,
    takeActions: () => 0,
    takeLook: () => ({ dx: 0, dy: 0 }),
  };
}

function stageCar(game, x, z, heading, speed) {
  const car = game.playerCar;
  placeCarAt(car, x, z, heading);
  car.speed = speed;
  if (!game.player.inCar) enterCar(game.player, car);
  return car;
}

function stageCops(game, wanted, offsets) {
  game.police.setWanted(wanted);
  const anchor = game.player.inCar ? game.player.inCar.pos : game.player.pos;
  for (const [dx, dz, speed] of offsets) {
    const cop = game.police.spawnCop(anchor);
    cop.pos.set(anchor.x + dx, 0, anchor.z + dz);
    cop.heading = Math.atan2(-dx, -dz);
    cop.speed = speed;
    cop.group.rotation.y = cop.heading;
  }
}

// Put a few traffic cars and pedestrians where the camera can see them.
// Coordinates are per-shot and move with the shot: a staged car or ped left at
// the old position would sit outside the new frame entirely.
function stageStreetLife(game, carSpots, pedSpots) {
  game.traffic.cars.slice(0, carSpots.length).forEach((car, i) => {
    car.pos.set(carSpots[i][0], 0, carSpots[i][1]);
    car.heading = carSpots[i][2];
    car.speed = 15;
    car.group.rotation.y = car.heading;
  });
  game.traffic.peds.slice(0, pedSpots.length).forEach((ped, i) => {
    ped.pos.set(pedSpots[i][0], 0, pedSpots[i][1]);
    ped.heading = pedSpots[i][2];
    ped.group.rotation.y = ped.heading;
  });
}

export function stageShot(name, game) {
  game.frozen = true;
  game.cash.value = 1250;
  game.player.health = 100;
  game.missions.setCompleted(4);
  game.missions.setCurrent(3);
  game.time = 84 * 60; // 18:24, golden hour.

  if (name === 'drive') {
    // Beachfront cruise: east along the southernmost road (z = 348), water and
    // sand on the right, towers on the left. Traffic ahead in both lanes,
    // pedestrians on the north sidewalk and one on the sand.
    stageCar(game, -120, 348, Math.PI / 2, 26);
    game.missions.start(1, game.traffic);
    game.police.setWanted(0);
    game.player.health = 100;
    stageStreetLife(game, [[-70, 343.5, Math.PI / 2], [-35, 352.5, -Math.PI / 2]], [[-90, 340, 0], [-55, 357, Math.PI], [-20, 340, 0]]);
  } else if (name === 'mission') {
    // Job 1 from inside the car: Rook sits in the Comet at (0, 90) facing north,
    // the orange beacon at (0, 58) ahead in frame — the "Drive the package"
    // objective now matches a driver, not a pedestrian standing still.
    stageCar(game, 0, 90, Math.PI, 0);
    game.missions.start(0, game.traffic);
    game.police.setWanted(0);
    game.cash.value = 400;
    stageStreetLife(game, [[-4.5, 40, Math.PI], [-4.5, 20, Math.PI]], [[8, 62, 0], [-8, 50, Math.PI], [8, 40, 0]]);
  } else if (name === 'heist') {
    // Marina getaway, on the marina road itself: car at (348, -20) heading south,
    // Job 5 beacon at (340, 58) ahead, docks at z = 20 and 100 and boats at
    // z = 44..146 ahead on the left (east), all over the marina water strip.
    stageCar(game, 348, -20, 0, 34);
    game.missions.start(4, game.traffic);
    game.cash.value = 6400;
    game.player.health = 74;
    stageCops(game, 4, [[-6, 8, 40], [6, 10, 38], [-5, -12, 36]]);
    stageStreetLife(game, [[343.5, 30, 0], [352.5, 60, Math.PI]], [[340, 15, 0], [340, 50, Math.PI]]);
  } else {
    // chase (cover, and the default): downtown police chase, wanted 3, cop ramming.
    stageCar(game, 0, 60, 0, 38);
    game.missions.start(3, game.traffic);
    game.cash.value = 4820;
    game.player.health = 82;
    stageCops(game, 3, [[-5, 2, 42], [5, -6, 40]]);
    stageStreetLife(game, [[-4.5, 120, Math.PI], [-4.5, 140, Math.PI]], [[8, 115, 0], [-8, 128, Math.PI]]);
  }

  // Settle the scene with fixed scripted steps (driving shots roll forward a little).
  const driving = name === 'chase' || name === 'heist' || name === 'drive';
  const steps = driving ? 45 : 20;
  for (let i = 0; i < steps; i += 1) {
    game.step(STEP, driving ? scriptedInput(1) : scriptedInput(0), true);
  }
  // The player car rolled forward while the frozen cops stayed put: re-pose the cops
  // tight beside the car so the chase reads in the frame (cops behind the car sit
  // behind the chase camera and would be invisible).
  const copOffsets = name === 'heist' ? [[-6, 8, 40], [6, 10, 38], [-5, -12, 36]] : [[-5, 2, 42], [5, -6, 40]];
  if (game.police.cops.length > 0) {
    const anchor = game.player.inCar ? game.player.inCar.pos : game.player.pos;
    game.police.cops.forEach((cop, i) => {
      const [dx, dz] = copOffsets[i % copOffsets.length];
      cop.pos.set(anchor.x + dx, 0, anchor.z + dz);
      cop.heading = game.player.inCar ? game.player.inCar.heading : 0;
      cop.group.rotation.y = cop.heading;
    });
  }
  // Snap the chase camera onto its target: the lerp lags a moving car by metres.
  const target = game.player.inCar ? game.player.inCar.pos : game.player.pos;
  const heading = game.player.inCar ? game.player.inCar.heading : game.player.heading;
  const speed = game.player.inCar ? Math.abs(game.player.inCar.speed) : 0;
  game.renderer.updateCamera(target, heading, !!game.player.inCar, speed, { dx: 0, dy: 0 }, 1);
  game.hud.update(game, 0);
  return { screen: 'play' };
}
