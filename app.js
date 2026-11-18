/**
 * AuraQuant // Q-CORE â€” Unified Quantum-Neural Risk & Wave PDE Engine
 * Integrates 2D Finite Difference Wave PDE, Bessel Harmonics, 
 * 3D Neural Loss Landscape, Portfolio Risk Dynamics & Web Audio
 */

// ============================================================================
// 1. SOUND SYNTHESIS ENGINE (Web Audio API)
// ============================================================================
class QuantumAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.init();
    return this.enabled;
  }

  playUIClick(freq = 750, duration = 0.04) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  playMembraneStrike(pitchFactor = 1.0, intensity = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 130 * pitchFactor;
      const partials = [1.0, 1.593, 2.135, 2.295];
      const gains = [0.35, 0.22, 0.15, 0.10];

      partials.forEach((ratio, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * ratio, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * ratio * 0.95, now + 0.18);
        const decay = 0.45 / (1 + i * 0.6);
        gain.gain.setValueAtTime(gains[i] * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + decay);
      });
    } catch (e) {}
  }

  playLiquidityShock() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Deep sub-bass boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }
}

// ============================================================================
// 2. GLOBAL SYSTEM STATE
// ============================================================================
const state = {
  // Wave PDE state
  damping: 0.035,
  waveSpeed: 1.20,
  waveWireframe: false,
  waveMode: 'pde', // 'pde' or 'bessel'

  // Neural loss state
  learningRate: 0.030,
  momentum: 0.85,
  optimizer: 'adam', // 'adam', 'momentum', 'sgd'
  epoch: 0,
  maxEpochs: 100,
  currentLoss: 1.842,

  // Risk & Telemetry
  volatility: 14.12,
  drawdown: -7.42,
  fidelity: 99.942,
  portfolioReturn: 22.84
};

// ============================================================================
// 3. FEATURE 1: 3D DAMPED WAVE PDE & VIBRATING DRUM SKIN
// ============================================================================
class WaveEngine {
  constructor(containerId, audio) {
    this.container = document.getElementById(containerId);
    this.audio = audio;
    this.width = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : 600;
    this.height = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : 380;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(22, 22, 22);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.05;

    // Grid Dimensions
    this.GRID_SIZE = 48;
    this.PLANE_SIZE = 24;

    this.geometry = new THREE.PlaneGeometry(this.PLANE_SIZE, this.PLANE_SIZE, this.GRID_SIZE - 1, this.GRID_SIZE - 1);
    this.geometry.rotateX(-Math.PI / 2);

    // 2D Finite Difference PDE Wave Arrays
    const totalVerts = this.GRID_SIZE * this.GRID_SIZE;
    this.u = new Float32Array(totalVerts);
    this.u_prev = new Float32Array(totalVerts);
    this.u_next = new Float32Array(totalVerts);

    // Vertex colors for thermal cyber glow
    const colors = new Float32Array(totalVerts * 3);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: state.waveWireframe,
      roughness: 0.25,
      metalness: 0.75,
      emissive: 0x032b38,
      emissiveIntensity: 0.4
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Ambient & Directional Lights
    const l1 = new THREE.DirectionalLight(0x00f5d4, 1.8);
    l1.position.set(12, 24, 12);
    this.scene.add(l1);

    const l2 = new THREE.DirectionalLight(0x8b5cf6, 1.5);
    l2.position.set(-12, -10, -12);
    this.scene.add(l2);

    this.scene.add(new THREE.AmbientLight(0x091224, 1.6));

    // Clamping border frame
    const frameGeo = new THREE.BoxGeometry(this.PLANE_SIZE, 0.2, this.PLANE_SIZE);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.25 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = -0.1;
    this.scene.add(frame);

    // Raycaster for surface click
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  }

  onPointerDown(e) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const gx = Math.round(((point.x + this.PLANE_SIZE / 2) / this.PLANE_SIZE) * (this.GRID_SIZE - 1));
      const gz = Math.round(((point.z + this.PLANE_SIZE / 2) / this.PLANE_SIZE) * (this.GRID_SIZE - 1));

      this.injectImpulseAt(gx, gz, 4.0);
    }
  }

  injectImpulseAt(gx, gz, strength = 3.5) {
    const G = this.GRID_SIZE;
    if (gx > 2 && gx < G - 3 && gz > 2 && gz < G - 3) {
      // Inject Gaussian bump around (gx, gz)
      for (let di = -2; di <= 2; di++) {
        for (let dj = -2; dj <= 2; dj++) {
          const r2 = di * di + dj * dj;
          const factor = Math.exp(-r2 / 1.5);
          this.u[(gz + di) * G + (gx + dj)] += strength * factor;
        }
      }
      this.audio.playMembraneStrike(1.0 + (gx / G) * 0.5, 0.9);
    }
  }

  injectRandomShock(count = 3, strength = 4.5) {
    const G = this.GRID_SIZE;
    for (let k = 0; k < count; k++) {
      const rx = Math.floor(Math.random() * (G - 10)) + 5;
      const rz = Math.floor(Math.random() * (G - 10)) + 5;
      this.injectImpulseAt(rx, rz, strength);
    }
  }

  reset() {
    this.u.fill(0);
    this.u_prev.fill(0);
    this.u_next.fill(0);
    this.step();
  }

  toggleWireframe() {
    state.waveWireframe = !state.waveWireframe;
    this.material.wireframe = state.waveWireframe;
    return state.waveWireframe;
  }

  step() {
    const G = this.GRID_SIZE;
    const c = state.waveSpeed;
    const gamma = state.damping;
    const dt = 0.15;
    const h = 1.0;
    const r2 = (c * dt / h) * (c * dt / h);

    // 2D Finite Difference Wave Equation with Damping:
    // u^{n+1} = [ 2u^n - u^{n-1} + r^2 \nabla^2 u^n ] / (1 + \gamma dt)
    for (let i = 1; i < G - 1; i++) {
      const row = i * G;
      for (let j = 1; j < G - 1; j++) {
        const idx = row + j;
        const laplacian = this.u[idx + G] + this.u[idx - G] + this.u[idx + 1] + this.u[idx - 1] - 4 * this.u[idx];
        this.u_next[idx] = (2 * this.u[idx] - this.u_prev[idx] + r2 * laplacian) / (1 + gamma * dt);
      }
    }

    // Buffer swap
    const temp = this.u_prev;
    this.u_prev = this.u;
    this.u = this.u_next;
    this.u_next = temp;

    // Update geometry coordinates and dynamic vertex colors
    const pos = this.geometry.attributes.position;
    const colors = this.geometry.attributes.color;
    const total = G * G;

    for (let i = 0; i < total; i++) {
      const y = this.u[i];
      pos.setY(i, y);

      // Colormap: Deep midnight navy -> Cyan -> Magenta at crests
      const norm = THREE.MathUtils.clamp(Math.abs(y) / 2.5, 0, 1);
      const cr = norm > 0.5 ? (norm - 0.5) * 2 * 0.9 + 0.1 : 0.02;
      const cg = norm < 0.6 ? norm * 1.5 * 0.9 + 0.1 : 0.4;
      const cb = 0.35 + norm * 0.65;

      colors.setXYZ(i, cr, cg, cb);
    }

    pos.needsUpdate = true;
    colors.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.width = w;
      this.height = h;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    try {
      if (this.controls) this.controls.update();
      this.step();
      this.renderer.render(this.scene, this.camera);
    } catch (e) {
      console.warn('[WaveEngine] Render error:', e);
    }
  }
}

// ============================================================================
// 4. FEATURE 2: 3D NEURAL LOSS LANDSCAPE TRAVERSAL
// ============================================================================
class NeuralEngine {
  constructor(containerId, audio) {
    this.container = document.getElementById(containerId);
    this.audio = audio;
    this.width = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : 600;
    this.height = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : 380;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(20, 20, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Loss Topography Grid
    this.NN_GRID = 50;
    this.geo = new THREE.PlaneGeometry(20, 20, this.NN_GRID - 1, this.NN_GRID - 1);
    this.geo.rotateX(-Math.PI / 2);

    // Analytical loss topography
    this.initLandscape();

    // Material with cyber wireframe styling
    this.material = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      wireframe: true,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x2e1065,
      emissiveIntensity: 0.5
    });

    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.scene.add(this.mesh);

    // Lights
    const pointLight = new THREE.PointLight(0xec4899, 2.5, 60);
    pointLight.position.set(0, 16, 0);
    this.scene.add(pointLight);

    const dirLight = new THREE.DirectionalLight(0x8b5cf6, 1.2);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.scene.add(new THREE.AmbientLight(0x1e1b4b, 1.6));

    // Optimizer Ball Marker
    const markerGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    this.markerMesh = new THREE.Mesh(markerGeo, markerMat);
    this.scene.add(this.markerMesh);

    // Trajectory Path Line
    this.pathPoints = [];
    this.pathMax = 120;
    this.lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f5d4, linewidth: 2, transparent: true, opacity: 0.85 });
    this.pathLine = new THREE.Line(this.lineGeo, lineMat);
    this.scene.add(this.pathLine);

    // Optimization State Variables
    this.w1 = 7.5;
    this.w2 = 6.5;
    this.v1 = 0;
    this.v2 = 0;
    this.m1 = 0; this.m2 = 0;
    this.s1 = 0; this.s2 = 0;

    // Raycaster to drop optimizer particle on click
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    this.restart();
  }

  computeLoss(x, z) {
    return 0.25 * (x * x + z * z) + Math.sin(1.6 * x) * Math.cos(1.6 * z) * 1.25 + Math.cos(x * 0.75) * 0.75;
  }

  initLandscape() {
    const pos = this.geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.computeLoss(x * 0.4, z * 0.4) * 1.5);
    }
    this.geo.computeVertexNormals();
  }

  onPointerDown(e) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mesh);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      this.w1 = pt.x;
      this.w2 = pt.z;
      this.v1 = 0; this.v2 = 0;
      this.m1 = 0; this.m2 = 0;
      this.s1 = 0; this.s2 = 0;
      this.pathPoints = [];
      state.epoch = 0;
      this.audio.playUIClick(820);
    }
  }

  restart() {
    state.epoch = 0;
    this.w1 = (Math.random() - 0.5) * 13;
    this.w2 = (Math.random() - 0.5) * 13;
    this.v1 = 0; this.v2 = 0;
    this.m1 = 0; this.m2 = 0;
    this.s1 = 0; this.s2 = 0;
    this.pathPoints = [];
    this.lineGeo.setFromPoints(this.pathPoints);
    this.audio.playUIClick(680);
  }

  stepDescent() {
    if (state.epoch >= state.maxEpochs) return;

    // Numerical gradient of loss surface
    const eps = 0.001;
    const lossCurr = this.computeLoss(this.w1 * 0.4, this.w2 * 0.4);
    const gradX = (this.computeLoss((this.w1 + eps) * 0.4, this.w2 * 0.4) - lossCurr) / eps;
    const gradZ = (this.computeLoss(this.w1 * 0.4, (this.w2 + eps) * 0.4) - lossCurr) / eps;

    // Apply selected optimizer algorithm
    if (state.optimizer === 'sgd') {
      this.w1 -= state.learningRate * gradX;
      this.w2 -= state.learningRate * gradZ;
    } else if (state.optimizer === 'momentum') {
      this.v1 = state.momentum * this.v1 - state.learningRate * gradX;
      this.v2 = state.momentum * this.v2 - state.learningRate * gradZ;
      this.w1 += this.v1;
      this.w2 += this.v2;
    } else {
      // Adam Optimizer
      const beta1 = 0.9, beta2 = 0.999, adamEps = 1e-8;
      const t = state.epoch + 1;
      this.m1 = beta1 * this.m1 + (1 - beta1) * gradX;
      this.m2 = beta1 * this.m2 + (1 - beta1) * gradZ;
      this.s1 = beta2 * this.s1 + (1 - beta2) * (gradX * gradX);
      this.s2 = beta2 * this.s2 + (1 - beta2) * (gradZ * gradZ);

      const mHat1 = this.m1 / (1 - Math.pow(beta1, t));
      const mHat2 = this.m2 / (1 - Math.pow(beta1, t));
      const sHat1 = this.s1 / (1 - Math.pow(beta2, t));
      const sHat2 = this.s2 / (1 - Math.pow(beta2, t));

      this.w1 -= (state.learningRate * mHat1) / (Math.sqrt(sHat1) + adamEps);
      this.w2 -= (state.learningRate * mHat2) / (Math.sqrt(sHat2) + adamEps);
    }

    const currentY = this.computeLoss(this.w1 * 0.4, this.w2 * 0.4) * 1.5 + 0.35;
    this.markerMesh.position.set(this.w1, currentY, this.w2);

    this.pathPoints.push(new THREE.Vector3(this.w1, currentY, this.w2));
    if (this.pathPoints.length > this.pathMax) this.pathPoints.shift();
    this.lineGeo.setFromPoints(this.pathPoints);

    state.epoch++;
    state.currentLoss = Math.abs(lossCurr);

    // Update HUD
    const hudEp = document.getElementById('hudEpoch');
    const hudLs = document.getElementById('hudLoss');
    const statEp = document.getElementById('statEpoch');
    const statLs = document.getElementById('statLoss');
    if (hudEp) hudEp.textContent = `${state.epoch} / ${state.maxEpochs}`;
    if (hudLs) hudLs.textContent = state.currentLoss.toFixed(4);
    if (statEp) statEp.textContent = `${state.epoch} / ${state.maxEpochs}`;
    if (statLs) statLs.textContent = state.currentLoss.toFixed(4);
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.width = w;
      this.height = h;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    try {
      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    } catch (e) {
      console.warn('[NeuralEngine] Render error:', e);
    }
  }
}

// ============================================================================
// 5. FEATURE 3: QUANTITATIVE STOCK PORTFOLIO & RISK CHART
// ============================================================================
class PortfolioRiskChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.labels = Array.from({ length: 30 }, (_, i) => `T-${30 - i}d`);
    let baseValue = 100000;
    this.portfolioData = [baseValue];
    this.benchmarkData = [baseValue];

    for (let i = 1; i < 30; i++) {
      const pReturn = (Math.random() - 0.46) * 0.024;
      const bReturn = (Math.random() - 0.48) * 0.018;
      this.portfolioData.push(this.portfolioData[i - 1] * (1 + pReturn));
      this.benchmarkData.push(this.benchmarkData[i - 1] * (1 + bReturn));
    }

    let gradCyan;
    try {
      gradCyan = this.ctx.createLinearGradient(0, 0, 0, 220);
      gradCyan.addColorStop(0, 'rgba(0, 245, 212, 0.35)');
      gradCyan.addColorStop(1, 'rgba(0, 245, 212, 0.0)');
    } catch (_) {
      gradCyan = 'rgba(0,245,212,0.2)';
    }

    try {
    this.chart = new Chart(this.ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: 'AuraQuant Strategy ($)',
            data: this.portfolioData,
            borderColor: '#00f5d4',
            backgroundColor: gradCyan,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0
          },
          {
            label: 'Nasdaq 100 Benchmark ($)',
            data: this.benchmarkData,
            borderColor: '#a855f7',
            borderDash: [4, 4],
            fill: false,
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: '"JetBrains Mono", monospace', size: 10 } }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 16, 34, 0.95)',
            borderColor: 'rgba(0, 245, 212, 0.4)',
            borderWidth: 1,
            titleFont: { family: '"JetBrains Mono", monospace' },
            bodyFont: { family: '"JetBrains Mono", monospace' }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', font: { family: '"JetBrains Mono", monospace', size: 9 }, maxTicksLimit: 10 }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#64748b',
              font: { family: '"JetBrains Mono", monospace', size: 9 },
              callback: (v) => `$${(v / 1000).toFixed(0)}k`
            }
          }
        }
      }
    });
    } catch (err) {
      console.warn('[Chart] Portfolio chart init failed:', err.message);
    }

    this.startStreaming();
  }

  applyShock() {
    const lastP = this.portfolioData[this.portfolioData.length - 1];
    const lastB = this.benchmarkData[this.benchmarkData.length - 1];

    // Shock dip
    const shockedP = lastP * (1 - (0.015 + Math.random() * 0.02));
    const shockedB = lastB * (1 - (0.025 + Math.random() * 0.03));

    this.portfolioData.shift();
    this.portfolioData.push(shockedP);
    this.benchmarkData.shift();
    this.benchmarkData.push(shockedB);

    if (this.chart) {
      try { this.chart.update('none'); } catch (_) {}
    }

    // Update cumulative returns
    const pGain = (((shockedP - 100000) / 100000) * 100).toFixed(1);
    const bGain = (((shockedB - 100000) / 100000) * 100).toFixed(1);
    const cumEl = document.getElementById('statCumulativeReturn');
    const bEl = document.getElementById('statBenchmarkReturn');
    if (cumEl && !isNaN(parseFloat(pGain))) cumEl.textContent = `${pGain >= 0 ? '+' : ''}${pGain}%`;
    if (bEl && !isNaN(parseFloat(bGain))) bEl.textContent = `${bGain >= 0 ? '+' : ''}${bGain}%`;
  }

  startStreaming() {
    setInterval(() => {
      if (!this.portfolioData || this.portfolioData.length === 0) return;
      const lastP = this.portfolioData[this.portfolioData.length - 1];
      const lastB = this.benchmarkData[this.benchmarkData.length - 1];

      const pDelta = (Math.random() - 0.47) * 0.008;
      const bDelta = (Math.random() - 0.49) * 0.006;

      this.portfolioData.shift();
      this.portfolioData.push(lastP * (1 + pDelta));
      this.benchmarkData.shift();
      this.benchmarkData.push(lastB * (1 + bDelta));

      if (this.chart) {
        try { this.chart.update('none'); } catch (_) {}
      }
    }, 1500);
  }
}

// ============================================================================
// 6. PYTHON BACKEND BRIDGE  (WebSocket upgrade layer for NumPy payloads)
// ============================================================================
class BackendBridge {
  constructor(baseWsUrl, waveEngine, neuralEngine, portfolioChart) {
    this.baseUrl = baseWsUrl;                       // e.g. ws://127.0.0.1:8765
    this.httpBase = baseWsUrl.replace('ws://', 'http://');
    this.waveEngine = waveEngine;
    this.neuralEngine = neuralEngine;
    this.portfolioChart = portfolioChart;
    this.waveWs = null;
    this.neuralWs = null;
    this.connected = false;
    this.statusEl = this._buildStatusPill();
  }

  // Create a tiny status pill in the header
  _buildStatusPill() {
    const pill = document.createElement('div');
    pill.id = 'backend-status';
    pill.className = 'hidden lg:flex items-center space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-xs font-mono';
    pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500 animate-pulse" id="backendDot"></span>
                      <span class="text-slate-400">DB &amp; PY:</span>
                      <span id="backendLabel" class="text-slate-500">OFFLINE</span>
                      <span class="text-slate-600">|</span>
                      <span class="text-slate-400">TOKENS:</span>
                      <span id="tokenQuotaVal" class="text-cyan-400">0 / 10k</span>`;
    const hdr = document.querySelector('header .max-w-\\[1720px\\] > div:nth-child(2)');
    if (hdr) hdr.appendChild(pill);
    return pill;
  }

  _trackTokenHeader(res) {
    if (!res || !res.headers) return;
    const consumed = res.headers.get('X-Token-Quota-Consumed');
    if (consumed) {
      this.totalTokensUsed = (this.totalTokensUsed || 0) + parseInt(consumed, 10);
      const tokenPill = document.getElementById('tokenQuotaVal');
      if (tokenPill) tokenPill.textContent = `${this.totalTokensUsed} / 10k`;
    }
  }

  _setStatus(online) {
    this.connected = online;
    const dot = document.getElementById('backendDot');
    const lbl = document.getElementById('backendLabel');
    if (!dot || !lbl) return;
    if (online) {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
      lbl.className = 'text-emerald-400 font-semibold';
      lbl.textContent = 'NUMPY ACTIVE';
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-slate-500 animate-pulse';
      lbl.className = 'text-slate-500';
      lbl.textContent = 'OFFLINE';
    }
  }

  connect() {
    this._connectWave();
    this._connectNeural();
    this._fetchLandscape();
    this._fetchPortfolioMetrics();
  }

  async _fetchPortfolioMetrics() {
    try {
      const res = await fetch(`${this.httpBase}/api/portfolio/metrics`);
      this._trackTokenHeader(res);
      if (!res.ok) return;
      const data = await res.json();
      this.applyPortfolioMetrics(data);
      console.log('[Bridge] Live quantitative portfolio metrics loaded');
    } catch (_) {}
  }

  applyPortfolioMetrics(data) {
    if (!data) return;
    const statRet = document.getElementById('statReturn');
    const statVol = document.getElementById('statVolatility');
    const statVaR = document.getElementById('statVaR');
    const statDD  = document.getElementById('statDrawdown');
    if (statRet && data.total_return_pct !== undefined) statRet.textContent = `${data.total_return_pct >= 0 ? '+' : ''}${data.total_return_pct}%`;
    if (statVol && data.volatility_pct !== undefined) statVol.textContent = `${data.volatility_pct}%`;
    if (statVaR && data.var_95_usd !== undefined) statVaR.textContent = `-$${Math.abs(Math.round(data.var_95_usd)).toLocaleString()}`;
    if (statDD && data.max_drawdown_pct !== undefined) statDD.textContent = `${data.max_drawdown_pct}%`;

    if (data.benchmark_trajectory && this.portfolioChart && this.portfolioChart.chart) {
      const chart = this.portfolioChart.chart;
      chart.data.datasets[0].data = data.benchmark_trajectory;
      chart.update('none');
    }

    // Non-blocking risk alert check
    setTimeout(function() {
      if (window._alertEngine) window._alertEngine.checkMetrics(data);
    }, 0);
  }

  // --- Wave PDE WebSocket ---
  _connectWave() {
    try {
      this.waveWs = new WebSocket(`${this.baseUrl}/ws/wave`);
      this.waveWs.binaryType = 'arraybuffer';

      this.waveWs.onopen = () => {
        this._setStatus(true);
        console.log('[Bridge] Wave WS connected â†’ Python NumPy solver active');
      };

      this.waveWs.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          // Handle WebSocket Heartbeat Challenge
          if (msg.type === "PING") {
            if (this.waveWs && this.waveWs.readyState === WebSocket.OPEN) {
              this.waveWs.send(JSON.stringify({ type: "PONG" }));
            }
            return;
          }
          if (msg.type !== 'wave_frame') return;

          const nx = msg.nx, ny = msg.ny;
          const q = msg.data;             // int16 flat array
          const scale = 5.0 / 32767;

          const pos = this.waveEngine.geometry.attributes.position;
          const colors = this.waveEngine.geometry.attributes.color;
          const total = nx * ny;

          for (let i = 0; i < total; i++) {
            const y = q[i] * scale;
            pos.setY(i, y);
            // Cyber colormap mirroring Python output
            const norm = Math.min(Math.abs(y) / 2.5, 1.0);
            const cr = norm > 0.5 ? (norm - 0.5) * 2 * 0.9 + 0.1 : 0.02;
            const cg = norm < 0.6 ? norm * 1.5 * 0.9 + 0.1 : 0.4;
            const cb = 0.35 + norm * 0.65;
            colors.setXYZ(i, cr, cg, cb);
          }

          pos.needsUpdate = true;
          colors.needsUpdate = true;
          this.waveEngine.geometry.computeVertexNormals();
        } catch (_) {}
      };

      this.waveWs.onclose = () => {
        this._setStatus(false);
        // Reconnect in 3s if server went away
        setTimeout(() => this._connectWave(), 3000);
      };

      this.waveWs.onerror = () => {};
    } catch (_) {}
  }

  // --- Neural Training WebSocket ---
  _connectNeural() {
    try {
      this.neuralWs = new WebSocket(`${this.baseUrl}/ws/neural`);

      this.neuralWs.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type !== 'neural_step') return;

        // Redirect Python-computed loss & coordinates into the Three.js neural engine
        const [w1, w2, lossY] = msg.optimizer_coords;
        const ne = this.neuralEngine;

        // Remap from Python's [-3, 3] weight space to Three.js scene space (Ã—20/3)
        const scaledW1 = w1 * 6.5;
        const scaledW2 = w2 * 6.5;
        const surfaceY  = ne.computeLoss(scaledW1 * 0.4, scaledW2 * 0.4) * 1.5 + 0.35;

        ne.markerMesh.position.set(scaledW1, surfaceY, scaledW2);
        ne.pathPoints.push(new THREE.Vector3(scaledW1, surfaceY, scaledW2));
        if (ne.pathPoints.length > ne.pathMax) ne.pathPoints.shift();
        ne.lineGeo.setFromPoints(ne.pathPoints);

        // Push metrics to UI
        const epoch = msg.epoch;
        const loss  = msg.loss;
        state.epoch = epoch;
        state.currentLoss = loss;

        const hudEp = document.getElementById('hudEpoch');
        const hudLs = document.getElementById('hudLoss');
        const statEp = document.getElementById('statEpoch');
        const statLs = document.getElementById('statLoss');
        if (hudEp)  hudEp.textContent  = `${epoch} / 100`;
        if (hudLs)  hudLs.textContent  = loss.toFixed(4);
        if (statEp) statEp.textContent = `${epoch} / 100`;
        if (statLs) statLs.textContent = loss.toExponential(3);
      };

      this.neuralWs.onclose = () => {
        setTimeout(() => this._connectNeural(), 3000);
      };

      this.neuralWs.onerror = () => {};
    } catch (_) {}
  }

  // Fetch static loss landscape from Python and bake it into the Three.js mesh
  async _fetchLandscape() {
    try {
      const res = await fetch(`${this.httpBase}/api/landscape?resolution=50`);
      this._trackTokenHeader(res);
      if (!res.ok) return;
      const data = await res.json();     // { w1, w2, loss_z } each 50Ã—50
      const ne = this.neuralEngine;
      const pos = ne.geo.attributes.position;
      const rows = data.loss_z.length;
      const cols = data.loss_z[0].length;
      const scale = 20 / (cols - 1);

      for (let i = 0; i < pos.count; i++) {
        const xi = Math.round(((pos.getX(i) + 10) / 20) * (cols - 1));
        const zi = Math.round(((pos.getZ(i) + 10) / 20) * (rows - 1));
        const cxi = Math.min(Math.max(xi, 0), cols - 1);
        const czi = Math.min(Math.max(zi, 0), rows - 1);
        const lossVal = data.loss_z[czi][cxi];
        pos.setY(i, lossVal * 2.5);     // scale to scene units
      }

      pos.needsUpdate = true;
      ne.geo.computeVertexNormals();
      console.log('[Bridge] Python loss landscape applied to Three.js mesh');
    } catch (_) {
      // Server not running â€” JS fallback landscape stays active
    }
  }

  // POST wave params update to Python backend
  async postWaveParams(c, gamma) {
    if (!this.connected) return;
    try {
      await fetch(`${this.httpBase}/api/wave/params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ c, gamma })
      });
    } catch (_) {}
  }

  // POST neural params update to Python backend
  async postNeuralParams(lr, beta) {
    if (!this.connected) return;
    try {
      await fetch(`${this.httpBase}/api/neural/params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lr, beta })
      });
    } catch (_) {}
  }

  // POST wave surface impulse to Python backend
  async postImpulse(x, y, amplitude = 4.0) {
    if (!this.connected) return;
    try {
      await fetch(`${this.httpBase}/api/wave/impulse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, amplitude })
      });
    } catch (_) {}
  }

  // POST global liquidity shock to Python backend (triggers server-side multi-site impulses)
  async postShock() {
    if (!this.connected) return;
    try {
      const res = await fetch(`${this.httpBase}/api/shock`, { method: 'POST', headers: { 'X-Token-Cost': '25' } });
      this._trackTokenHeader(res);
      if (res.ok) {
        const json = await res.json();
        if (json.metrics) this.applyPortfolioMetrics(json.metrics);
      }
    } catch (_) {}
  }

  // POST reset to Python backend
  async postReset() {
    if (!this.connected) return;
    try {
      const res = await fetch(`${this.httpBase}/api/reset`, { method: 'POST', headers: { 'X-Token-Cost': '15' } });
      this._trackTokenHeader(res);
      this._fetchPortfolioMetrics();
    } catch (_) {}
  }

  // POST custom portfolio weights to Python backend
  async postPortfolioWeights(tickers, weights) {
    try {
      const res = await fetch(`${this.httpBase}/api/portfolio/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token-Cost': '30' },
        body: JSON.stringify({ tickers, weights })
      });
      this._trackTokenHeader(res);
      if (res.ok) {
        const metrics = await res.json();
        this.applyPortfolioMetrics(metrics);
      }
    } catch (_) {}
  }
}

// ============================================================================
// 7. ASSET ALLOCATION MANAGER — Dynamic 10+ asset table with CSV/PDF import
// ============================================================================
class AssetAllocationManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.assets = [];
    this.resetDefaults();
  }

  resetDefaults() {
    this.assets = [
      { ticker: 'NVDA',    label: 'Tech AI Core',         weight: 18, color: '#00f5d4' },
      { ticker: 'AAPL',    label: 'Hardware Ecosystem',    weight: 14, color: '#a855f7' },
      { ticker: 'MSFT',    label: 'Enterprise Cloud',      weight: 12, color: '#10b981' },
      { ticker: 'BTC-USD', label: 'Digital Asset',         weight: 10, color: '#ec4899' },
      { ticker: 'GOOGL',   label: 'Search & AI Platform',  weight:  9, color: '#f59e0b' },
      { ticker: 'AMZN',    label: 'E-Commerce & AWS',      weight:  9, color: '#38bdf8' },
      { ticker: 'TSLA',    label: 'EV & Robotics',         weight:  8, color: '#fb923c' },
      { ticker: 'ETH-USD', label: 'Smart-Contract Layer',  weight:  8, color: '#c084fc' },
      { ticker: 'JPM',     label: 'Financials Hedge',      weight:  7, color: '#4ade80' },
      { ticker: 'GLD',     label: 'Commodity Safe-Haven',  weight:  5, color: '#fde68a' },
    ];
    this.render();
  }

  _normalize() {
    const total = this.assets.reduce((s, a) => s + a.weight, 0);
    if (total > 0) this.assets.forEach(a => { a._pct = (a.weight / total * 100).toFixed(1); });
  }

  render() {
    if (!this.container) return;
    this._normalize();
    this.container.innerHTML = this.assets.map(a => `
      <div class="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 transition hover:border-slate-700">
        <div class="flex justify-between items-center mb-1">
          <span class="font-bold text-xs" style="color:${a.color}">${a.ticker}
            <span class="text-slate-400 font-normal text-[10px]">(${a.label})</span>
          </span>
          <span class="text-slate-200 text-xs font-semibold">${a._pct}%</span>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div class="h-1.5 rounded-full transition-all duration-300" style="width:${a._pct}%;background:${a.color}"></div>
        </div>
      </div>`).join('');
  }

  loadCSV(text) {
    const COLORS = ['#00f5d4','#a855f7','#10b981','#ec4899','#f59e0b','#38bdf8','#fb923c','#c084fc','#4ade80','#fde68a','#f87171','#818cf8'];
    const parsed = [];
    text.trim().split(/\r?\n/).forEach((line) => {
      const cols = line.split(/[,\t;]/).map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (!cols[0] || cols[0].toLowerCase() === 'ticker' || cols[0].toLowerCase() === 'asset') return;
      const ticker = cols[0].toUpperCase();
      const label  = cols[1] && isNaN(parseFloat(cols[1])) ? cols[1] : ticker;
      const weightCol = cols[1] && !isNaN(parseFloat(cols[1])) ? cols[1] : (cols[2] || '10');
      const weight = parseFloat(weightCol);
      if (ticker && !isNaN(weight) && weight > 0) {
        parsed.push({ ticker, label, weight, color: COLORS[parsed.length % COLORS.length] });
      }
    });
    if (parsed.length > 0) {
      this.assets = parsed;
      this.render();
    }
    return parsed.length;
  }

  loadPDFText(text) {
    const COLORS = ['#00f5d4','#a855f7','#10b981','#ec4899','#f59e0b','#38bdf8','#fb923c','#c084fc','#4ade80','#fde68a'];
    const rows = [];
    const re = /\b([A-Z]{2,6}(?:-USD)?)\b[^\d\n\r]{0,20}(\d{1,2}(?:\.\d+)?)\s*%/gi;
    let m;
    while ((m = re.exec(text)) !== null && rows.length < 20) {
      const ticker = m[1].toUpperCase();
      const w = parseFloat(m[2]);
      if (w > 0 && w <= 100 && !rows.some(r => r.ticker === ticker)) {
        rows.push({ ticker, label: ticker, weight: w, color: COLORS[rows.length % COLORS.length] });
      }
    }
    if (rows.length === 0) {
      const fallbackRe = /([A-Z]{2,5})\s*[:=,\t ]\s*(\d{1,2}(?:\.\d+)?)/g;
      while ((m = fallbackRe.exec(text)) !== null && rows.length < 20) {
        const ticker = m[1].toUpperCase();
        const w = parseFloat(m[2]);
        if (w > 0 && w <= 100 && !rows.some(r => r.ticker === ticker)) {
          rows.push({ ticker, label: ticker, weight: w, color: COLORS[rows.length % COLORS.length] });
        }
      }
    }
    if (rows.length > 0) {
      this.assets = rows;
      this.render();
    }
    return rows.length;
  }
}

// ============================================================================
// 7b. RISK ALERT ENGINE
// ============================================================================
class RiskAlertEngine {
  constructor(audio) {
    this.audio = audio;
    this.maxDrawdown = 15;   // %
    this.maxVaR = 5000;      // USD absolute
    this.minCoherence = 0.3; // fidelity floor
    this.audioEnabled = false;
    this._lastAlerted = {};
  }

  updateThresholds(maxDD, maxVaR, minCoh, audioOn) {
    this.maxDrawdown  = isNaN(maxDD)  ? this.maxDrawdown  : maxDD;
    this.maxVaR       = isNaN(maxVaR) ? this.maxVaR       : maxVaR;
    this.minCoherence = isNaN(minCoh) ? this.minCoherence : minCoh;
    this.audioEnabled = !!audioOn;
  }

  checkMetrics(data) {
    if (!data) return;
    const dd  = parseFloat(data.max_drawdown_pct);
    const vaR = Math.abs(parseFloat(data.var_95_usd));
    const fid = parseFloat(data.fidelity);

    if (!isNaN(dd) && dd > this.maxDrawdown) {
      this._dispatch('CRITICAL', 'DRAWDOWN BREACH',
        `Max drawdown ${dd.toFixed(1)}% exceeds threshold ${this.maxDrawdown}%`, 'dd');
    }
    if (!isNaN(vaR) && vaR > this.maxVaR) {
      this._dispatch('WARNING', 'VAR THRESHOLD',
        `VaR \$${vaR.toFixed(0)} exceeds limit \$${this.maxVaR}`, 'var');
    }
    if (!isNaN(fid) && fid < this.minCoherence) {
      this._dispatch('WARNING', 'LOW COHERENCE',
        `Fidelity ${(fid*100).toFixed(1)}% below floor ${(this.minCoherence*100).toFixed(1)}%`, 'coh');
    }
  }

  _dispatch(type, title, msg, key) {
    const now = Date.now();
    if (this._lastAlerted[key] && now - this._lastAlerted[key] < 15000) return;
    this._lastAlerted[key] = now;
    this._fireToast(type, title, msg);
    if (this.audioEnabled && this.audio) {
      try {
        if (type === 'CRITICAL') {
          this.audio.playLiquidityShock();
        } else {
          this.audio.playUIClick(300);
        }
      } catch(e) {}
    }
  }

  _fireToast(type, title, msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const color = type === 'CRITICAL' ? '#ff3366' : type === 'WARNING' ? '#ffaa00' : '#00ffcc';
    const toast = document.createElement('div');
    toast.style.cssText = [
      'pointer-events:auto',
      'background:rgba(10,10,20,0.92)',
      'border:1px solid ' + color,
      'border-left:4px solid ' + color,
      'border-radius:6px',
      'padding:10px 14px',
      'margin-bottom:8px',
      'font-family:monospace',
      'font-size:11px',
      'color:#e0e0e0',
      'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
      'animation:fadeInRight 0.3s ease'
    ].join(';');
    toast.innerHTML = '<div style="color:' + color + ';font-weight:bold;font-size:12px;margin-bottom:4px;">'
      + '⚡ [' + type + '] ' + title + '</div><div>' + msg + '</div>';

    container.appendChild(toast);
    setTimeout(() => { try { container.removeChild(toast); } catch(e) {} }, 5000);
  }
}

// ============================================================================
// 7c. EXPORT ENGINE
// ============================================================================
function exportCSV(state, assetMgr, neuralLossHistory) {
  try {
    const lines = [];
    lines.push('# AuraQuant Q-CORE Export — ' + new Date().toISOString());
    lines.push('');
    lines.push('## Risk Metrics');
    lines.push('metric,value');
    lines.push('portfolio_return_pct,' + ((state && state.portfolioReturn) ? state.portfolioReturn.toFixed(4) : ''));
    lines.push('volatility_pct,' + ((state && state.volatility) ? state.volatility.toFixed(4) : ''));
    lines.push('sharpe_ratio,' + ((state && state.sharpe) ? state.sharpe.toFixed(4) : ''));
    lines.push('var_95_usd,' + ((state && state.var95) ? state.var95.toFixed(2) : ''));
    lines.push('max_drawdown_pct,' + ((state && state.drawdown) ? state.drawdown.toFixed(2) : ''));
    lines.push('');
    lines.push('## Asset Weights');
    lines.push('ticker,label,weight_pct');
    if (assetMgr && assetMgr.assets) {
      assetMgr.assets.forEach(function(a) {
        lines.push([a.ticker, a.label, a.weight.toFixed(2)].join(','));
      });
    }
    lines.push('');
    lines.push('## Neural Loss History');
    lines.push('epoch,loss');
    if (Array.isArray(neuralLossHistory)) {
      neuralLossHistory.forEach(function(r) {
        lines.push(r.epoch + ',' + r.loss.toFixed(6));
      });
    }

    const csvString = lines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auraquant_export_' + Date.now() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    console.error('[ExportCSV] Failed:', e);
  }
}

// ============================================================================
// 8. MAIN CONTROLLER & APPLICATION BOOTSTRAP
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  const audio = new QuantumAudio();

  // 1. Initialize Engines
  const waveEngine = new WaveEngine('waveCanvasContainer', audio);
  const neuralEngine = new NeuralEngine('neuralCanvasContainer', audio);
  const portfolioChart = new PortfolioRiskChart('portfolioChart');
  const assetMgr = new AssetAllocationManager('assetWeightsList');

  // 2. Python Backend Bridge initialized early for complete scope coverage
  const bridge = new BackendBridge('ws://127.0.0.1:8765', waveEngine, neuralEngine, portfolioChart);
  bridge.connect();

  // 2b. Risk Alert Engine & Export state
  const alertEngine = new RiskAlertEngine(audio);
  window._alertEngine = alertEngine;  // allow BackendBridge to call it
  const neuralLossHistory = [];
  const state = { portfolioReturn: 0, volatility: 0, sharpe: 0, var95: 0, drawdown: 0, fidelity: 1 };

  // Resize canvas contexts on startup after layout computation
  requestAnimationFrame(() => {
    waveEngine.resize();
    neuralEngine.resize();
  });

  // 3. Asset Allocation CSV/PDF File Uploader
  const fileInput = document.getElementById('assetFileInput');
  const importBtn = document.getElementById('importAssetFileBtn');
  const resetWeightsBtn = document.getElementById('resetAssetWeightsBtn');
  const uploadStatus = document.getElementById('fileUploadStatus');

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const reader = new FileReader();

      reader.onload = (evt) => {
        const content = evt.target.result || '';
        let count = 0;
        if (isPdf) {
          count = assetMgr.loadPDFText(content);
        } else {
          count = assetMgr.loadCSV(content);
        }

        if (uploadStatus) {
          uploadStatus.classList.remove('hidden');
          if (count > 0) {
            uploadStatus.className = 'text-[10px] font-mono text-emerald-400 mb-2 truncate';
            uploadStatus.textContent = `✓ Imported ${count} assets from ${file.name}`;
            const tickers = assetMgr.assets.map(a => a.ticker);
            const weights = assetMgr.assets.map(a => a.weight);
            bridge.postPortfolioWeights(tickers, weights);
          } else {
            uploadStatus.className = 'text-[10px] font-mono text-amber-400 mb-2 truncate';
            uploadStatus.textContent = `⚠ Could not detect allocation tokens in ${file.name}`;
          }
        }
      };

      if (isPdf && reader.readAsBinaryString) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
      fileInput.value = '';
    });
  }

  if (resetWeightsBtn) {
    resetWeightsBtn.addEventListener('click', () => {
      assetMgr.resetDefaults();
      if (uploadStatus) {
        uploadStatus.classList.remove('hidden');
        uploadStatus.className = 'text-[10px] font-mono text-cyan-400 mb-2 truncate';
        uploadStatus.textContent = `✓ Restored default 10-asset matrix`;
      }
      const tickers = assetMgr.assets.map(a => a.ticker);
      const weights = assetMgr.assets.map(a => a.weight);
      bridge.postPortfolioWeights(tickers, weights);
    });
  }

  // 4. Global Shock Button
  const shockBtn = document.getElementById('triggerGlobalShockBtn');
  shockBtn.addEventListener('click', () => {
    audio.playLiquidityShock();

    // 1. Excite 2D Wave PDE
    waveEngine.injectRandomShock(4, 5.0);

    // 2. Perturb Portfolio Risk
    portfolioChart.applyShock();

    // 3. Spikes in stats
    state.volatility = 18.5 + Math.random() * 4;
    state.drawdown = -(8.5 + Math.random() * 2.5);
    state.fidelity = THREE.MathUtils.clamp(state.fidelity - (Math.random() * 0.04), 99.85, 99.98);

    document.getElementById('statVolatility').textContent = `${state.volatility.toFixed(2)}%`;
    document.getElementById('statDrawdown').textContent = `${state.drawdown.toFixed(2)}%`;
    document.getElementById('statFidelity').textContent = `${state.fidelity.toFixed(3)}%`;
    document.getElementById('statVaR').textContent = `-$${Math.round(18500 + Math.random() * 4000).toLocaleString()}`;

    // 4. Retrain Neural Model
    neuralEngine.restart();
  });

  // 3. Reset Simulation Button
  const resetBtn = document.getElementById('resetSimBtn');
  resetBtn.addEventListener('click', () => {
    audio.playUIClick(500);
    waveEngine.reset();
    state.damping = 0.035;
    state.waveSpeed = 1.20;
    document.getElementById('dampingSlider').value = 0.035;
    document.getElementById('waveSpeedSlider').value = 1.20;
    document.getElementById('dampingVal').textContent = '0.035';
    document.getElementById('waveSpeedVal').textContent = '1.20';
    document.getElementById('hudDampingVal').textContent = '0.035';
    document.getElementById('hudSpeedVal').textContent = '1.20';
    document.getElementById('statDispersion').textContent = '0.035';
    neuralEngine.restart();
    bridge.postReset();
  });

  // 4. Audio Toggle Button
  const audioBtn = document.getElementById('audioToggleBtn');
  const audioIcon = document.getElementById('audioIcon');
  const audioLabel = document.getElementById('audioLabel');
  audioBtn.addEventListener('click', () => {
    const on = audio.toggle();
    audioIcon.setAttribute('data-lucide', on ? 'volume-2' : 'volume-x');
    audioLabel.textContent = on ? 'SONIC FX' : 'MUTED';
    lucide.createIcons();
  });

  // 5. Strike Wave Surface Button
  const strikeBtn = document.getElementById('strikeWaveBtn');
  strikeBtn.addEventListener('click', () => {
    const rx = Math.floor(Math.random() * (waveEngine.GRID_SIZE - 12)) + 6;
    const rz = Math.floor(Math.random() * (waveEngine.GRID_SIZE - 12)) + 6;
    waveEngine.injectImpulseAt(rx, rz, 4.2);
    bridge.postImpulse(rx, rz, 4.2);    // mirror impulse to Python NumPy engine
  });

  // 6. Wave Wireframe Toggle
  const waveWireBtn = document.getElementById('toggleWaveWireframe');
  waveWireBtn.addEventListener('click', () => {
    audio.playUIClick(600);
    const isWire = waveEngine.toggleWireframe();
    waveWireBtn.textContent = isWire ? 'WIREFRAME: ON' : 'WIREFRAME: OFF';
    waveWireBtn.classList.toggle('text-cyan-300', isWire);
    waveWireBtn.classList.toggle('border-cyan-500/30', isWire);
  });

  // 7. Wave Sliders â€” sync to Python backend
  const dampSlider = document.getElementById('dampingSlider');
  dampSlider.addEventListener('input', (e) => {
    state.damping = parseFloat(e.target.value);
    document.getElementById('dampingVal').textContent = state.damping.toFixed(3);
    document.getElementById('hudDampingVal').textContent = state.damping.toFixed(3);
    document.getElementById('statDispersion').textContent = state.damping.toFixed(3);
    bridge.postWaveParams(state.waveSpeed, state.damping);
  });

  const speedSlider = document.getElementById('waveSpeedSlider');
  speedSlider.addEventListener('input', (e) => {
    state.waveSpeed = parseFloat(e.target.value);
    document.getElementById('waveSpeedVal').textContent = state.waveSpeed.toFixed(2);
    document.getElementById('hudSpeedVal').textContent = state.waveSpeed.toFixed(2);
    bridge.postWaveParams(state.waveSpeed, state.damping);
  });

  // 8. Neural Optimizer Controls
  const selOpt = document.getElementById('selectOptimizer');
  selOpt.addEventListener('change', (e) => {
    state.optimizer = e.target.value;
    audio.playUIClick(700);
  });

  const lrSlider = document.getElementById('lrSlider');
  lrSlider.addEventListener('input', (e) => {
    state.learningRate = parseFloat(e.target.value);
    document.getElementById('lrVal').textContent = state.learningRate.toFixed(3);
  });

  const momSlider = document.getElementById('momentumSlider');
  momSlider.addEventListener('input', (e) => {
    state.momentum = parseFloat(e.target.value);
    document.getElementById('momentumVal').textContent = state.momentum.toFixed(2);
  });

  document.getElementById('restartNNBtn').addEventListener('click', () => neuralEngine.restart());
  document.getElementById('dropParticleBtn').addEventListener('click', () => neuralEngine.restart());

  // 9. Resize Listener
  window.addEventListener('resize', () => {
    waveEngine.resize();
    neuralEngine.resize();
  });

  // 10. Unified Animation Loop with FPS Tracking
  let lastFrameTime = performance.now();
  let frameCount = 0;

  function animate() {
    requestAnimationFrame(animate);

    // FPS calculation
    const now = performance.now();
    frameCount++;
    if (now - lastFrameTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
      const fpsEl = document.getElementById('fpsCounter');
      if (fpsEl) fpsEl.textContent = fps;
      frameCount = 0;
      lastFrameTime = now;
    }

    // Step Wave PDE
    waveEngine.render();

    // Step Neural Gradient Descent (every 2 frames for smooth optimization trajectory)
    if (frameCount % 2 === 0) {
      neuralEngine.stepDescent();
      // Track loss history for CSV export (cap at 500 entries)
      if (neuralLossHistory.length < 500) {
        neuralLossHistory.push({ epoch: neuralLossHistory.length, loss: neuralEngine.loss || 0 });
      }
    }
    neuralEngine.render();
  }

  // Wire shock button to also POST to Python backend when available
  shockBtn.addEventListener('click', () => {
    bridge.postShock();
    // Non-blocking alert check on shock (simulate worst-case drawdown breach)
    setTimeout(function() {
      state.drawdown = 20 + Math.random() * 10;
      state.var95 = -(18500 + Math.random() * 4000);
      state.fidelity = 0.2 + Math.random() * 0.2;
      alertEngine.checkMetrics({
        max_drawdown_pct: state.drawdown,
        var_95_usd: state.var95,
        fidelity: state.fidelity
      });
    }, 0);
  });

  // 12. Developer Showcase Controls & Database Registry Telemetry
  const backendUrl = "http://127.0.0.1:8765";
  const tokenSlider = document.getElementById('token-cost-slider');
  const tokenDisplay = document.getElementById('token-cost-display');
  const logBox = document.getElementById('middleware-status-log');
  const fireBtn = document.getElementById('fire-request-btn');
  const floodBtn = document.getElementById('trigger-429-btn');

  if (tokenSlider && tokenDisplay) {
    tokenSlider.addEventListener('input', (e) => { tokenDisplay.textContent = e.target.value; });
  }

  async function updateDatabaseRegistryMetrics() {
    try {
      const response = await fetch(`${backendUrl}/api/records/summary`);
      if (!response.ok) throw new Error("HTTP Registry pipeline failure");
      const data = await response.json();
      
      const uEl = document.getElementById('db-count-users');
      const pEl = document.getElementById('db-count-portfolios');
      const nEl = document.getElementById('db-count-neural');
      const wEl = document.getElementById('db-count-waves');
      if (uEl) uEl.textContent = data.users ?? 1;
      if (pEl) pEl.textContent = data.portfolios ?? 0;
      if (nEl) nEl.textContent = data.neural_runs ?? 0;
      if (wEl) wEl.textContent = data.wave_sims ?? 0;
    } catch (error) {
      const uEl = document.getElementById('db-count-users');
      const pEl = document.getElementById('db-count-portfolios');
      const nEl = document.getElementById('db-count-neural');
      const wEl = document.getElementById('db-count-waves');
      if (uEl) uEl.textContent = "1 (MOCK)";
      if (pEl) pEl.textContent = "OFFLINE";
      if (nEl) nEl.textContent = "OFFLINE";
      if (wEl) wEl.textContent = "OFFLINE";
    }
  }

  if (fireBtn) {
    fireBtn.addEventListener('click', async () => {
      const simulatedCost = tokenSlider ? tokenSlider.value : 250;
      if (logBox) {
        logBox.textContent = `Dispatching payload with X-Token-Cost: ${simulatedCost}...`;
        logBox.style.borderLeftColor = "#00e5ff";
      }

      try {
        const res = await fetch(`${backendUrl}/api/portfolio/metrics`, {
          method: 'GET',
          headers: { 'X-Token-Cost': simulatedCost }
        });

        bridge._trackTokenHeader(res);

        if (res.status === 429) {
          if (logBox) {
            logBox.innerHTML = `<span style="color: #ff3366;">[REJECTED] HTTP 429: Request exceeds the allowable single frame threshold (500 tokens).</span>`;
            logBox.style.borderLeftColor = "#ff3366";
          }
        } else if (res.ok) {
          const quotaConsumed = res.headers.get('X-Token-Quota-Consumed') || "Evaluated";
          if (logBox) {
            logBox.innerHTML = `<span style="color: #00ffcc;">[ACCEPTED] Execution valid. Header Telemetry: X-Token-Quota-Consumed: ${quotaConsumed}</span>`;
            logBox.style.borderLeftColor = "#00ffcc";
          }
          updateDatabaseRegistryMetrics();
        }
      } catch (err) {
        if (logBox) {
          logBox.innerHTML = `<span style="color: #ffaa00;">[FALLBACK] Core server offline. Running pure client-side NumPy math virtualization.</span>`;
          logBox.style.borderLeftColor = "#ffaa00";
        }
      }
    });
  }

  if (floodBtn) {
    floodBtn.addEventListener('click', () => {
      if (tokenSlider && tokenDisplay) {
        tokenSlider.value = 750;
        tokenDisplay.textContent = "750";
      }
      if (fireBtn) fireBtn.click();
    });
  }

  updateDatabaseRegistryMetrics();
  setInterval(updateDatabaseRegistryMetrics, 5000);

  // 13. Alert Config Modal Wiring
  const alertConfigBtn    = document.getElementById('alertConfigBtn');
  const closeAlertCfgBtn  = document.getElementById('closeAlertConfigBtn');
  const saveAlertCfgBtn   = document.getElementById('saveAlertConfigBtn');
  const alertConfigModal  = document.getElementById('alertConfigModal');

  if (alertConfigBtn && alertConfigModal) {
    alertConfigBtn.addEventListener('click', () => alertConfigModal.classList.remove('hidden'));
  }
  if (closeAlertCfgBtn && alertConfigModal) {
    closeAlertCfgBtn.addEventListener('click', () => alertConfigModal.classList.add('hidden'));
  }
  if (saveAlertCfgBtn && alertConfigModal) {
    saveAlertCfgBtn.addEventListener('click', () => {
      const dd  = parseFloat((document.getElementById('cfgMaxDrawdown')  || {}).value);
      const var_ = parseFloat((document.getElementById('cfgMaxVaR')       || {}).value);
      const coh = parseFloat((document.getElementById('cfgMinCoherence')  || {}).value);
      const aud = !!(document.getElementById('cfgAlertAudio') || {}).checked;
      alertEngine.updateThresholds(dd, var_, coh, aud);
      alertConfigModal.classList.add('hidden');
      alertEngine._fireToast('ok', 'ALERTS ARMED', 'Risk thresholds are now active');
    });
  }

  // 14. Export Button Wiring
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => exportCSV(state, assetMgr, neuralLossHistory));
  }
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => window.print());
  }

  animate();
  console.log('AuraQuant // Q-CORE Unified Suite Active.');
});

// Secure WebSocket Heartbeat Listener Implementation
function initializeSecureWaveSocket() {
  const socket = new WebSocket("ws://127.0.0.1:8765/ws/wave");

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "PING") {
        socket.send(JSON.stringify({ type: "PONG" }));
        return;
      }
    } catch (err) {
      // Binary PDE frame data passes through smoothly here
    }
  };

  socket.onerror = () => {
    console.warn("[WS] Secure socket connection offline. Operating on local fallback buffers.");
  };
}



