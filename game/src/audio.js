// Synthesized sound only: engine hum, siren, beeps, crash and mission jingle
// via WebAudio — plus the radio: three stations of live-generated WebAudio
// music, no audio files and no network. Key C cycles stations; the choice is
// saved. Sunset FM is the default station (the music the game had before).
export const RADIO_STATIONS = [
  { name: 'Sunset FM', notes: [220, 261.63, 329.63, 392, 329.63, 261.63], stepMs: 210, type: 'square', vol: 0.045 },
  { name: 'Bay Talk 88', notes: [55, 55, 65.41, 49, 58.27, 49], stepMs: 720, type: 'sine', vol: 0.07 },
  { name: 'Marina Classics', notes: [329.63, 392, 440, 493.88, 440, 392], stepMs: 520, type: 'triangle', vol: 0.06 },
];

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let station = 0;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineGain); engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination);
      sirenOsc.start();
      return true;
    } catch { return false; }
  }

  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* audio is decoration, never fatal */ }
  }

  function startStationTimer() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!ctx) return;
    const st = RADIO_STATIONS[station];
    musicStep = 0;
    musicTimer = setInterval(() => {
      if (!ctx) return;
      blip(st.notes[musicStep % st.notes.length], st.stepMs / 1000 * 0.9, st.type, st.vol);
      musicStep += 1;
    }, st.stepMs);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEngine(speed01, on) {
      if (!ensure() || !engineOsc) return;
      engineOsc.frequency.value = 55 + speed01 * 140;
      engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0;
    },
    setSiren(on, t) {
      if (!ensure() || !sirenOsc) return;
      sirenOsc.frequency.value = on ? 620 + Math.sin(t * 6) * 220 : 0;
      sirenGain.gain.value = on ? 0.035 : 0;
    },
    beep() { blip(880, 0.09, 'square', 0.08); },
    crash() { blip(70, 0.25, 'sawtooth', 0.25); },
    steal() { blip(330, 0.12, 'square', 0.1); setTimeout(() => blip(440, 0.12, 'square', 0.1), 120); },
    jingle() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.16), i * 130));
    },
    fail() { [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'triangle', 0.14), i * 160)); },
    // Radio: station 0 (Sunset FM) is the music the game already played.
    startMusic() {
      if (!ensure()) return;
      startStationTimer();
    },
    switchStation() {
      station = (station + 1) % RADIO_STATIONS.length;
      if (ctx) startStationTimer();
      return RADIO_STATIONS[station].name;
    },
    setStation(i) {
      station = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
      if (ctx) startStationTimer();
      return RADIO_STATIONS[station].name;
    },
    get stationName() { return RADIO_STATIONS[station].name; },
    get stationIndex() { return station; },
  };
}
