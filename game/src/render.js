// Three.js scene, sunset lighting, sky and the follow camera.
import * as THREE from 'three';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffb36b);
  scene.fog = new THREE.Fog(0xffc98a, 180, 620);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1400);

  // Warm low sun + soft sky fill, sunset gradient sky dome.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.4);
  sun.position.set(180, 140, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x4a3a50, 0.9));
  const skyGeo = new THREE.SphereGeometry(1200, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x7a4a8a) }, mid: { value: new THREE.Color(0xff8a4a) }, low: { value: new THREE.Color(0xffd9a0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h=normalize(vP).y; vec3 c=h>0.25?mix(mid,top,(h-0.25)/0.75):mix(low,mid,h/0.25+0.5); gl_FragColor=vec4(c,1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const camState = { yaw: 0, pitch: 0.32, dist: 11, height: 4.5 };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function updateCamera(target, heading, inCar, speed, look, dt) {
    camState.yaw -= look.dx * 0.004;
    camState.pitch = Math.max(0.08, Math.min(0.9, camState.pitch + look.dy * 0.003));
    // In a car the camera sits behind the car (yaw = heading, so the camera offset
    // -sin/-cos puts it on the car's tail side); on foot it follows the orbit yaw.
    const wantYaw = inCar ? heading : camState.yaw;
    if (inCar) camState.yaw = wantYaw;
    const dist = inCar ? 13 + speed * 0.06 : 10;
    const cx = target.x - Math.sin(camState.yaw) * Math.cos(camState.pitch) * dist;
    const cz = target.z - Math.cos(camState.yaw) * Math.cos(camState.pitch) * dist;
    const cy = target.y + 2 + Math.sin(camState.pitch) * dist;
    const k = 1 - Math.exp(-dt * 7);
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (cy - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    camera.lookAt(target.x, target.y + 1.6, target.z);
    return camState.yaw;
  }

  return {
    renderer, scene, camera, camState,
    draw() { renderer.render(scene, camera); },
    updateCamera,
    setTitleCamera(t) {
      const a = t * 0.05;
      camera.position.set(Math.sin(a) * 260, 90, Math.cos(a) * 260);
      camera.lookAt(0, 20, 0);
    },
  };
}
