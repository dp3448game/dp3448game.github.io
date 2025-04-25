import * as THREE from 'https://cdn.skypack.dev/three@0.150.1';

let camera, scene, renderer, cube, clock;
let move = { forward: false, backward: false, left: false, right: false };
let strangeEntity, glitchTimer = 0, entityDirection = 1;
let audioCtx, distortion, source;
let sanity = 100;

init();
animate();

function init() {
  const canvas = document.getElementById('gameCanvas');

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.03);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 5);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: 0x555577 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const entityGeo = new THREE.IcosahedronGeometry(1, 1);
  const entityMat = new THREE.MeshStandardMaterial({ color: 0x990000, emissive: 0x440000 });
  strangeEntity = new THREE.Mesh(entityGeo, entityMat);
  strangeEntity.position.set(0, 0, -20);
  scene.add(strangeEntity);

  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  clock = new THREE.Clock();
  setupAudio();
  window.addEventListener('resize', onWindowResize);
  setupControls();
}

function setupControls() {
  const joystick = document.getElementById('joystick');
  let touchStartX = 0;

  joystick.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    move.forward = true;
  });

  joystick.addEventListener('touchmove', e => {
    const deltaX = e.touches[0].clientX - touchStartX;
    move.left = deltaX < -20;
    move.right = deltaX > 20;
  });

  joystick.addEventListener('touchend', e => {
    move.forward = false;
    move.left = false;
    move.right = false;
  });
}

function setupAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  distortion = audioCtx.createWaveShaper();
  distortion.curve = makeDistortionCurve(400);
  distortion.oversample = '4x';

  fetch('audio/distorted_noise.mp3')
    .then(res => res.arrayBuffer())
    .then(buffer => audioCtx.decodeAudioData(buffer))
    .then(decoded => {
      source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.loop = true;
      source.connect(distortion).connect(audioCtx.destination);
    });
}

function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * Math.PI) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (move.forward) cube.position.z -= delta * 2;
  if (move.left) cube.position.x -= delta * 2;
  if (move.right) cube.position.x += delta * 2;

  updateEntity();
  checkEntityProximity();
  glitchEffect();
  updateSanity();

  renderer.render(scene, camera);
}

function updateEntity() {
  strangeEntity.position.z += entityDirection * 0.1;
  if (strangeEntity.position.z < -30 || strangeEntity.position.z > -10) {
    entityDirection *= -1;
  }
}

function checkEntityProximity() {
  const distance = cube.position.distanceTo(strangeEntity.position);
  if (distance < 5) {
    if (source && !source.startPlayed) {
      try {
        source.start(0);
        source.startPlayed = true;
      } catch (e) {}
    }
    strangeEntity.material.color.set(0x00ff00);
    sanity -= 0.5;
  } else {
    strangeEntity.material.color.set(0x990000);
  }
}

function updateSanity() {
  if (sanity <= 0) {
    alert('End Game');
    window.open('', '_self').close();
  }
}

function glitchEffect() {
  glitchTimer += 1;
  if (glitchTimer > 200 && Math.random() < 0.03) {
    renderer.domElement.style.filter = 'contrast(180%) hue-rotate(45deg)';
    setTimeout(() => {
      renderer.domElement.style.filter = 'none';
    }, 100);
    glitchTimer = 0;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
