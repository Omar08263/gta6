// Sunset Streets — boot, fixed-step loop, screen state machine and ?shot= plumbing.
// The game is Solmar Bay: drive, steal, run jobs, outrun the patrol, pull the marina heist.
import { CAR_TOP_SPEED, MISSION_COUNT, SPRAY_CLEAR_COST, STANDING_GETAWAY_AT, STANDING_JOB_GAIN, STANDING_RESPRAY_AT, STANDING_STEAL_LOSS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { CAR_COLORS, CAR_NAMES, createCar, driveCar } from './driving.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createTraffic } from './traffic.js';
import { createPlayer, enterCar, exitCar, nearestCar, stepPlayer } from './player.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createStanding, districtKey } from './standing.js';
import { createGarage } from './garage.js';
import { createCrew } from './crew.js';
import { loadSave, saveGame } from './save.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_GARAGE, ACTION_MELEE, ACTION_MISSION, ACTION_PAUSE, ACTION_RADIO, ACTION_RESTART, createInput } from './input.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas);
renderer.scene.add(world.group);
const input = createInput(canvas);
const player = createPlayer(renderer.scene, world);
const traffic = createTraffic(renderer.scene, world, random);
const police = createPolice(renderer.scene, world, random);
const missions = createMissions(renderer.scene, world, random);
const hud = createHud();
const audio = createAudio();
const standing = createStanding();
const garage = createGarage(renderer.scene, world);
const crew = createCrew(renderer.scene);
const playerCar = createCar(renderer.scene, {
  x: world.playerSpawn.x, z: world.playerSpawn.z + 8, heading: 0,
  color: 0xd83a2e, name: 'Comet', topSpeed: CAR_TOP_SPEED,
});

const game = {
  world, player, playerCar, traffic, police, missions, hud, audio, renderer, input,
  standing, garage, crew,
  cash: { value: 250 }, time: 84 * 60, screen: SCREEN_TITLE, frozen: false,
};
window.__game = game;

function announce(message) { status.textContent = message; }

function allCars() {
  return [playerCar, ...traffic.cars, ...traffic.parked, ...police.cops, ...police.roadblock];
}

function tryEnterCar() {
  if (player.inCar) { exitCar(player); crew.alight(player.pos); audio.beep(); return; }
  // The starter Comet counts too, not just the parked traffic cars.
  const car = nearestCar(player, [...traffic.parked, playerCar], 4.5);
  if (!car) return;
  if (car.occupied) {
    car.occupied = false;
    police.addWanted(2);
    standing.add(standing.currentDistrict, -STANDING_STEAL_LOSS);
    hud.showBanner('CAR STOLEN', 'The driver fled — the patrol saw it. 2 stars.', 2600);
    audio.steal();
  } else {
    audio.beep();
  }
  enterCar(player, car);
  crew.board(car);
}

function tryMelee() {
  if (player.inCar) return;
  player.punchTimer = 0.35;
  for (const ped of traffic.peds) {
    const d = Math.hypot(ped.pos.x - player.pos.x, ped.pos.z - player.pos.z);
    if (d < 2.6) {
      ped.fleeing = true;
      ped.heading = Math.atan2(ped.pos.x - player.pos.x, ped.pos.z - player.pos.z);
      police.addWanted(1);
      hud.showBanner('ASSAULT', 'A pedestrian went down — the patrol is coming.', 2200);
      return;
    }
  }
}

function checkPedHits() {
  const car = player.inCar;
  if (!car || Math.abs(car.speed) < 8) return;
  for (const ped of traffic.peds) {
    const d = Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z);
    if (d < 2.8 && (!ped.hitAt || game.time - ped.hitAt > 3)) {
      ped.hitAt = game.time;
      ped.fleeing = true;
      ped.pos.x += (ped.pos.x - car.pos.x) * 0.6;
      ped.pos.z += (ped.pos.z - car.pos.z) * 0.6;
      police.addWanted(1);
      player.health = Math.max(0, player.health - 2);
      audio.crash();
    }
  }
}

function checkSprayShop() {
  if (police.wanted === 0) return;
  const cost = standing.resprayCost(SPRAY_CLEAR_COST);
  if (game.cash.value < cost) return;
  const s = world.sprayShop;
  if (Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < 14) {
    game.cash.value -= cost;
    police.clearWanted();
    const note = cost < SPRAY_CLEAR_COST ? ` — district respect cut the price to $${cost}` : ` -$${cost}`;
    hud.showBanner('REPAINTED', `New paint, new plates — the heat is off.${note}`, 2600);
    audio.jingle();
    saveGame(game);
  }
}

function tryGarageShop() {
  const g = world.garage;
  if (Math.hypot(player.pos.x - g.x, player.pos.z - g.z) > 16) return;
  const result = garage.buy(game.cash);
  if (result.ok) {
    hud.showBanner('UPGRADE FITTED', `${result.upgrade.label} — ${result.upgrade.text}`, 3000);
    audio.jingle();
    saveGame(game);
  } else if (result.reason === 'poor') {
    hud.showBanner('NOT ENOUGH CASH', `${result.upgrade.label} costs $${result.upgrade.cost} — come back richer.`, 2600);
    audio.fail();
  } else {
    hud.showBanner("ROOK'S GARAGE", 'Every upgrade is already fitted. The Comet is maxed out.', 2600);
    audio.beep();
  }
}

function startJob(i) {
  missions.start(i, traffic);
  const def = missions.objectiveText();
  announce(`${def.title} started.`);
  audio.beep();
  // Smuggler's Run starts hot: the patrol is already on you.
  if (i === MISSION_COUNT - 1) police.addWanted(2);
  // High standing in the job's district parks a getaway car nearby.
  const district = missions.defs[i].district;
  if (standing.get(district) >= STANDING_GETAWAY_AT) {
    const car = traffic.addParked();
    car.pos.set(player.pos.x + 8, 0, player.pos.z + 8);
    car.heading = player.heading;
    car.group.rotation.y = car.heading;
    car.occupied = false;
    hud.showBanner('GETAWAY CAR READY', `${district} respects you — a clean car is parked nearby.`, 3000);
  }
}

function missionResult(result) {
  if (result === 'complete') {
    const done = missions.complete(game.cash);
    const bonus = crew.bonusFor(done.reward);
    game.cash.value += bonus;
    const district = missions.defs ? missions.defs[missions.current].district : null;
    standing.add(district || standing.currentDistrict, STANDING_JOB_GAIN);
    hud.showBanner('JOB DONE', `${done.title} — +$${done.reward} · crew bonus +$${bonus} (Diz)`, 3000);
    audio.jingle();
    announce(`Job complete. Earned $${done.reward} plus $${bonus} crew bonus.`);
    saveGame(game);
    if (missions.completed >= MISSION_COUNT) {
      hud.showBanner('ALL EIGHT JOBS DONE', 'Rook owns Solmar Bay now. Free roam — the city is yours.', 5000);
    }
  } else if (result === 'fail') {
    const def = missions.fail();
    hud.showBanner('JOB FAILED', `${def.title} — talk to the crew and try again.`, 3000);
    audio.fail();
  }
}

game.step = function step(dt, inputOverride, shotMode) {
  const inp = inputOverride || input;
  const look = inp.takeLook();
  game.time += dt;
  const actions = inp.takeActions();
  if (!shotMode) {
    if (actions & ACTION_ENTER) tryEnterCar();
    if (actions & ACTION_MELEE) tryMelee();
    if (actions & ACTION_RADIO) {
      const name = audio.switchStation();
      hud.showBanner('RADIO', `Now playing: ${name} — press C to change station.`, 1800);
      saveGame(game);
    }
    if (actions & ACTION_GARAGE) tryGarageShop();
    if ((actions & ACTION_MISSION) && missions.state === 'idle' && missions.completed < MISSION_COUNT) {
      startJob(missions.completed);
    }
    // R restarts the active job from its beacon — a blown getaway gets a second run.
    if ((actions & ACTION_RESTART) && missions.state === 'active') {
      missions.start(missions.current, traffic);
      hud.showBanner('JOB RESTARTED', missions.objectiveText().title, 2000);
      audio.beep();
    }
  }
  const camYaw = renderer.camState.yaw;
  standing.setCurrent(districtKey(world.districtAt(player.pos.x, player.pos.z)));
  if (player.inCar) {
    const ram = driveCar(player.inCar, inp, world, dt, allCars(), garage);
    if (ram === 'ram') audio.crash();
    checkPedHits();
    // The HUD, minimap, police and missions all read player.pos: keep it on the car.
    player.pos.set(player.inCar.pos.x, player.inCar.pos.y, player.inCar.pos.z);
  } else {
    stepPlayer(player, inp, world, traffic.parked, dt, camYaw);
    crew.update(dt, player);
  }
  const danger = player.inCar ? Math.abs(player.inCar.speed) > 12 : false;
  traffic.update(dt, player, danger, game.frozen);
  police.update(dt, player, game.frozen, garage.armorMult);
  if (police.roadblockActive && !game.roadblockBannerShown) {
    game.roadblockBannerShown = true;
    hud.showBanner('ROADBLOCK AHEAD', 'Air One is overhead — punch through or turn around.', 3000);
    audio.crash();
  }
  if (!police.roadblockActive) game.roadblockBannerShown = false;
  const result = missions.update(dt, player.pos, police.wanted, traffic);
  if (result) missionResult(result);
  checkSprayShop();
  world.update(dt, game.time);
  const target = player.inCar ? player.inCar.pos : player.pos;
  const heading = player.inCar ? player.inCar.heading : player.heading;
  const speed = player.inCar ? Math.abs(player.inCar.speed) : 0;
  renderer.updateCamera(target, heading, !!player.inCar, speed, look, dt);
  if (!shotMode) {
    audio.setEngine(speed / CAR_TOP_SPEED, !!player.inCar);
    audio.setSiren(police.wanted > 0, game.time);
    // Quiet autosave every 15 seconds of play.
    game.saveTimer = (game.saveTimer || 0) + dt;
    if (game.saveTimer > 15) { game.saveTimer = 0; saveGame(game); }
  }
  hud.update(game, dt);
  if (player.health <= 0 && game.screen === SCREEN_PLAY) {
    game.screen = SCREEN_OVER;
    document.getElementById('over').classList.remove('hidden');
    announce('Rook is down. Woke up at Solmar General.');
  }
};

function runShot(name) {
  document.getElementById('title').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  stageShot(name, game);
  game.screen = SCREEN_PLAY;
  let painted = 0;
  function paint() {
    renderer.draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const saved = loadSave();
  if (saved) {
    game.cash.value = saved.cash || 250;
    missions.setCompleted(saved.completed || 0);
    missions.setCurrent(saved.current || 0);
    player.health = saved.health || 100;
    standing.fromSave(saved.standing);
    garage.fromSave(saved.garage);
    if (typeof saved.station === 'number') audio.setStation(saved.station);
    if (saved.x !== undefined) player.pos.set(saved.x, 0, saved.z || 0);
    document.getElementById('continueLine').classList.remove('hidden');
  }
  let screen = SCREEN_TITLE;
  game.screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function show(id, on) { document.getElementById(id).classList.toggle('hidden', !on); }

  function startGame() {
    show('title', false); show('over', false); show('pause', false);
    screen = SCREEN_PLAY; game.screen = SCREEN_PLAY;
    audio.unlock(); audio.startMusic();
    announce('Playing. Reach the beacon, or press M for the next job.');
  }

  document.getElementById('playBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', () => {
    show('pause', false); screen = SCREEN_PLAY; game.screen = SCREEN_PLAY;
  });
  document.getElementById('retryBtn').addEventListener('click', () => {
    player.health = 100;
    player.pos.set(world.hospital.x, 0, world.hospital.z + 14);
    police.clearWanted();
    if (player.inCar) { exitCar(player); crew.alight(player.pos); }
    saveGame(game);
    startGame();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Take the screen actions here; hand the gameplay bits back so the step can take them.
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED; game.screen = SCREEN_PAUSED; show('pause', true); announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      show('pause', false); screen = SCREEN_PLAY; game.screen = SCREEN_PLAY; announce('Playing.');
    }
    // Hand the gameplay bits back only while playing; otherwise a tap on the title
    // screen would fire the moment the game starts.
    if (screen === SCREEN_PLAY) input.queueActions(actions & (ACTION_ENTER | ACTION_MELEE | ACTION_MISSION | ACTION_RESTART | ACTION_RADIO | ACTION_GARAGE));
    if (screen === SCREEN_TITLE) {
      renderer.setTitleCamera(game.time);
      game.time += 1 / 60;
      traffic.update(1 / 60, player, false, false);
      world.update(1 / 60, game.time);
      hud.update(game, 1 / 60);
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        game.step(STEP);
        accumulator -= STEP;
        if (game.screen !== SCREEN_PLAY) { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED; game.screen = SCREEN_PAUSED; show('pause', true);
    }
  });

  announce('Sunset Streets. Press Enter or click Start driving.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
