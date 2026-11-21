// Deterministic ?shot= scenes: chase | drive | mission | heist. Each stages a late-game
// unlocked state with a fixed seed, freezes traffic, peds and police, and runs a fixed number
// of physics steps so the same seed always gives the same frame.
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
    stageCar(game, 0, 120, 0, 26);
    game.missions.start(1, game.traffic);
    game.police.setWanted(0);
    game.player.health = 100;
    stageStreetLife(game, [[-4.5, 160, Math.PI], [-4.5, 185, Math.PI]], [[8, 165, 0], [-8, 178, Math.PI], [8, 190, 0]]);
  } else if (name === 'mission') {
    // On foot near the Job 1 beacon, downtown, peds strolling past.
    game.player.pos.set(0, 0, 74);
    game.player.heading = Math.PI;
    game.renderer.camState.yaw = Math.PI; // camera behind Rook, beacon ahead in frame
    game.missions.start(0, game.traffic);
    game.police.setWanted(0);
    game.cash.value = 400;
    stageStreetLife(game, [[-4.5, 40, Math.PI], [-4.5, 20, Math.PI]], [[8, 62, 0], [-8, 50, Math.PI], [8, 40, 0]]);
  } else if (name === 'heist') {
    stageCar(game, 300, 58, Math.PI / 2, 34);
    game.missions.start(4, game.traffic);
    game.cash.value = 6400;
    game.player.health = 74;
    stageCops(game, 4, [[-6, 8, 40], [6, 10, 38], [-5, -12, 36]]);
    stageStreetLife(game, [[345, 53.5, -Math.PI / 2], [360, 62.5, -Math.PI / 2]], [[340, 50, 0], [350, 66, Math.PI]]);
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
