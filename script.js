/* Particle-wave scene (runs inside the trial.html iframe).
   Renders a plane of points displaced by the Perlin-noise vertex shader
   defined in trial.html; the point color follows the parent page's theme. */
class Scene {
  constructor(options) {
    this.$el = options.el;
    this.time = 0;

    this.render = this.render.bind(this);
    this.resize = this.resize.bind(this);

    this.init();
  }

  init() {
    // Loading manager so we can tell the parent when textures are ready
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
      if (window.parent) {
        window.parent.postMessage({ type: "threejs-ready" }, "*");
      }
    };
    loadingManager.onError = (url) => {
      console.warn("Error loading:", url);
    };
    this.textureLoader = new THREE.TextureLoader(loadingManager);

    this.camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera.position.z = 10;
    this.camera.position.y = 800;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.$el.appendChild(this.renderer.domElement);

    this.createParticles();

    window.addEventListener("resize", this.resize);
    this.resize();
    this.render();
  }

  createParticles() {
    const plane = new THREE.PlaneBufferGeometry(700, 190, 600, 190);

    // Initial color from theme (defaults to "light" if unreadable)
    let theme = "light";
    try {
      theme = localStorage.getItem("theme") || document.body.getAttribute("data-theme") || "light";
    } catch (e) { /* localStorage may be blocked */ }
    const themeColor = (t) => (t === "dark" ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time:    { value: 1.0 },
        texture: { value: this.textureLoader.load("spark1.png") },
        uColor:  { value: themeColor(theme) },
      },
      vertexShader:   document.getElementById("render-vs").textContent,
      fragmentShader: document.getElementById("render-fs").textContent,
      depthTest:   false,
      transparent: true,
    });

    this.particles = new THREE.Points(plane, material);
    this.particles.rotation.x = -Math.PI / 2;
    this.scene.add(this.particles);

    // Recolor when the parent posts a theme change; the storage event is a
    // fallback that catches theme flips made in other same-origin windows.
    const applyTheme = (t) => { material.uniforms.uColor.value = themeColor(t); };
    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "theme") applyTheme(e.data.theme);
    });
    window.addEventListener("storage", (e) => {
      if (e.key === "theme") applyTheme(e.newValue);
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    requestAnimationFrame(this.render);
    this.time += 0.01;
    this.particles.material.uniforms.time.value = this.time;
    this.renderer.render(this.scene, this.camera);
  }
}

new Scene({ el: document.querySelector(".container") });
