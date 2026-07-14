(function() {
  const wrap = document.getElementById('camel3d-wrap');
  const canvas = document.getElementById('camel3d-canvas');
  const hint = document.getElementById('camel3d-hint');
  if (!wrap || !canvas) return;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  // ── Scene & Camera ────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  camera.position.set(0, 0, 2.4);

  // ── Camel Shape — traced from logo_camel.png silhouette ──────────────────
  // Points extracted via OpenCV contour from the actual PNG alpha channel
  const rawPts = [
    [-0.46406,0.38584],[-0.4704,0.37949],[-0.45349,0.31607],[-0.44715,0.30761],
    [-0.35201,0.30338],[-0.34567,0.29704],[-0.33721,0.18922],[-0.29493,0.06237],
    [-0.28224,0.04123],[-0.14059,-0.11311],[-0.00951,-0.49154],[-0.00317,-0.49789],
    [0.02431,-0.49789],[0.03066,-0.49366],[0.0222,-0.16173],[0.10042,-0.09197],
    [0.15539,-0.08985],[0.2167,-0.09197],[0.30127,-0.15962],[0.29915,-0.49366],
    [0.30973,-0.5],[0.33932,-0.49789],[0.34989,-0.47463],[0.4704,0.00106],
    [0.4704,0.01797],[0.44926,0.15116],[0.36047,0.25687],[0.33932,0.31395],
    [0.26321,0.40275],[0.25264,0.40275],[0.2019,0.32875],[0.21247,0.2315],
    [0.1871,0.19345],[0.17865,0.19133],[0.14059,0.28436],[0.21036,0.426],
    [0.21247,0.4408],[0.14059,0.49366],[0.12579,0.49577],[-0.01586,0.43869],
    [-0.03066,0.41543],[-0.08351,0.28013],[-0.08351,0.2611],[-0.06025,0.12368],
    [-0.06448,0.11522],[-0.10254,0.11522],[-0.11311,0.11945],[-0.1871,0.18499],
    [-0.22516,0.34144],[-0.22516,0.48732],[-0.22939,0.49789],[-0.23573,0.5],
    [-0.24419,0.49577],[-0.27167,0.45349],[-0.28858,0.44292]
  ];

  // Scale up to nice size
  const S = 1.6;
  const shape = new THREE.Shape();
  shape.moveTo(rawPts[0][0] * S, rawPts[0][1] * S);
  for (let i = 1; i < rawPts.length; i++) {
    shape.lineTo(rawPts[i][0] * S, rawPts[i][1] * S);
  }
  shape.closePath();

  // ── Extrude geometry ──────────────────────────────────────────────────────
  const extrudeSettings = {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelOffset: 0,
    bevelSegments: 6,
    curveSegments: 24
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();

  // ── Gold PBR Material ─────────────────────────────────────────────────────
  const material = new THREE.MeshStandardMaterial({
    color: 0xD4A359,         // --accent gold
    metalness: 0.72,
    roughness: 0.22,
    envMapIntensity: 1.0,
  });

  // Edge material for rim highlights
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xF0C070,
    metalness: 0.9,
    roughness: 0.1,
  });

  const camel = new THREE.Mesh(geometry, material);
  // shift slightly back so bevel sits centered in depth
  camel.position.z = -0.09;
  scene.add(camel);

  // ── Lights ────────────────────────────────────────────────────────────────
  // Key light – warm gold from upper left
  const keyLight = new THREE.DirectionalLight(0xFFE8B0, 2.8);
  keyLight.position.set(-2, 3, 4);
  keyLight.castShadow = true;
  scene.add(keyLight);

  // Fill – cool blue rim from right
  const fillLight = new THREE.DirectionalLight(0x9BBEFF, 1.2);
  fillLight.position.set(3, -1, 2);
  scene.add(fillLight);

  // Back rim – deep accent
  const rimLight = new THREE.DirectionalLight(0xFFAA44, 0.8);
  rimLight.position.set(0, -3, -3);
  scene.add(rimLight);

  // Ambient
  const ambient = new THREE.AmbientLight(0x1A2040, 1.0);
  scene.add(ambient);

  // ── Resize handler ────────────────────────────────────────────────────────
  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Interaction (drag to rotate) ──────────────────────────────────────────
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let velX = 0, velY = 0;
  // Auto-rotate state
  let autoRotate = true;
  let hintHidden = false;
  let idleTimer = null;

  function hideHint() {
    if (!hintHidden) {
      hint.style.opacity = '0';
      hintHidden = true;
    }
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    autoRotate = false;
    idleTimer = setTimeout(() => { autoRotate = true; }, 4000);
  }

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastX = e.clientX; lastY = e.clientY;
    velX = 0; velY = 0;
    wrap.style.cursor = 'grabbing';
    hideHint();
    resetIdle();
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    velX = dx * 0.012;
    velY = dy * 0.012;
    camel.rotation.y += velX;
    camel.rotation.x += velY;
    lastX = e.clientX; lastY = e.clientY;
    resetIdle();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    wrap.style.cursor = 'grab';
  });

  // Touch support
  canvas.addEventListener('touchstart', e => {
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    velX = 0; velY = 0;
    hideHint();
    resetIdle();
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - lastX;
    const dy = e.touches[0].clientY - lastY;
    velX = dx * 0.012;
    velY = dy * 0.012;
    camel.rotation.y += velX;
    camel.rotation.x += velY;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    resetIdle();
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', () => { isDragging = false; });

  // ── Render loop ───────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  // Start with a nice angled view
  camel.rotation.x = 0.1;
  camel.rotation.y = -0.3;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (autoRotate && !isDragging) {
      camel.rotation.y += 0.008;
      // gentle bob
      camel.rotation.x = Math.sin(clock.elapsedTime * 0.4) * 0.08;
    } else if (!isDragging) {
      // Inertia
      camel.rotation.y += velX;
      camel.rotation.x += velY;
      velX *= 0.92;
      velY *= 0.92;
    }

    renderer.render(scene, camera);
  }
  animate();
})();
