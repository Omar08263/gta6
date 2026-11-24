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
//
// v3: the cover chase runs at 4 stars with Air One overhead and a roadblock ahead;
// drive shows the Sunset FM radio line; mission stages Job 6 (Bay Taxi) with Diz
// riding along and a garage upgrade fitted; heist stages Job 8 (Smuggler's Run) in
// the Marina with the crew bonus banner.
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
    // pedestrians on the north sidewalk and one on the sand. Radio: Sunset FM.
    stageCar(game, -120, 348, Math.PI / 2, 26);
    game.missions.start(1, game.traffic);
    game.police.setWanted(0);
    game.player.health = 100;
    game.audio.setStation(0);
    game.standing.set('Beachfront', 45);
    stageStreetLife(game, [[-70, 343.5, Math.PI / 2], [-35, 352.5, -Math.PI / 2]], [[-90, 340, 0], [-55, 357, Math.PI], [-20, 340, 0]]);
  } else if (name === 'mission') {
    // Job 6 — Bay Taxi: Rook and Diz in the Comet at (-174, 320) facing north,
    // the fare pickup beacon at (-174, 290) ahead in frame. A tuned engine is
    // already fitted, so the ENG icon reads lit under the speed.
    game.missions.setCompleted(5);
    game.missions.setCurrent(5);
    stageCar(game, -174, 320, Math.PI, 0);
    game.crew.board(game.player.inCar);
    game.garage.owned.engine = true;
    game.missions.start(5, game.traffic);
    game.police.setWanted(0);
    game.cash.value = 1250;
    game.standing.set('Beachfront', 45);
    stageStreetLife(game, [[-178.5, 300, Math.PI], [-169.5, 275, 0]], [[-166, 310, 0], [-182, 295, Math.PI], [-166, 285, 0]]);
  } else if (name === 'heist') {
    // Job 8 — Smuggler's Run, on the marina road itself: car at (348, -20)
    // heading south, the Job 8 beacon at (348, 116) ahead, docks and boats on
    // the eastern water strip. Diz rides along, the crew bonus is bannered,
    // and Air One circles overhead at 4 stars.
    game.missions.setCompleted(7);
    game.missions.setCurrent(7);
    stageCar(game, 348, -20, 0, 34);
    game.crew.board(game.player.inCar);
    game.garage.owned.engine = true;
    game.garage.owned.armor = true;
    game.missions.start(7, game.traffic);
    game.cash.value = 6400;
    game.player.health = 74;
    game.standing.set('Marina', 65);
    stageCops(game, 4, [[-6, 8, 40], [6, 10, 38], [-5, -12, 36]]);
    stageStreetLife(game, [[343.5, 30, 0], [352.5, 60, Math.PI]], [[340, 15, 0], [340, 50, Math.PI]]);
  } else {
    // chase (cover, and the default): downtown police chase, wanted 4, cop ramming,
    // Air One overhead and a roadblock across the road ahead.
    stageCar(game, 0, 60, 0, 38);
    game.missions.start(3, game.traffic);
    game.cash.value = 4820;
    game.player.health = 82;
    game.standing.set('Downtown', 35);
    stageCops(game, 4, [[-5, 2, 42], [5, -6, 40], [-6, -10, 38]]);
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
  const copOffsets = name === 'heist' ? [[-6, 8, 40], [6, 10, 38], [-5, -12, 36]] : [[-5, 2, 42], [5, -6, 40], [-6, -10, 38]];
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
  // v3 set dressing, placed after the settle steps so nothing drifts them.
  if (name === 'chase') {
    const fx = Math.sin(heading), fz = Math.cos(heading);
    // Helicopter low and far ahead (40 units, y 14) so its body sits inside the
    // chase camera's frame; the roadblock closer (22 ahead) so it reads below
    // the ROADBLOCK AHEAD banner instead of hiding behind it.
    game.police.showHeliAt(target.x + fx * 40, target.z + fz * 40, 14);
    game.police.placeRoadblockAt(target.x + fx * 22, target.z + fz * 22, heading);
    game.hud.showBanner('ROADBLOCK AHEAD', 'Air One is overhead — 4 stars', 60000);
  } else if (name === 'heist') {
    const fx = Math.sin(heading), fz = Math.cos(heading);
    game.police.showHeliAt(target.x + fx * 40, target.z + fz * 40, 14);
    game.hud.showBanner('CREW BONUS', 'Diz rides along — +15% on the $3,500 payout', 60000);
  }
  game.hud.update(game, 0);
  return { screen: 'play' };
}
