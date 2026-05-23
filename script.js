class Scene {
  constructor(options) {
    this.$el = options.el;
    this.time = 0;
    this.mouse = { x: 0, y: 0 };
    this.assetsLoaded = false;

    this.render = this.render.bind(this);
    this.resize = this.resize.bind(this);

    this.init();
  }

  init() {
    // Loading manager so we can tell the parent when textures are ready
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
      this.assetsLoaded = true;
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

    this.createLights();
    this.createParticles();

    window.addEventListener("resize", this.resize);
    this.resize();
    this.render();
  }

  /* ------------------------------------------------------------------------
     Particles plane
     ------------------------------------------------------------------------ */
  createParticles() {
    const plane = new THREE.PlaneBufferGeometry(700, 190, 600, 190);
    this.textureLoader.crossOrigin = "";

    // Initial color from theme (defaults to "light" if unreadable)
    const theme = (function () {
      try {
        return (
          localStorage.getItem("theme") ||
          (document.body && document.body.getAttribute("data-theme")) ||
          "light"
        );
      } catch (e) {
        return "light";
      }
    })();
    const initColor = theme === "dark" ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time:       { value: 1.0 },
        texture:    { value: this.textureLoader.load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/1081752/spark1.png") },
        resolution: { value: new THREE.Vector2() },
        uColor:     { value: initColor },
      },
      vertexShader:   document.getElementById("render-vs").textContent,
      fragmentShader: document.getElementById("render-fs").textContent,
      depthTest:   false,
      transparent: true,
    });

    this.particles = new THREE.Points(plane, material);
    this.particles.rotation.x = -Math.PI / 2;
    this.scene.add(this.particles);

    // Update color when the parent posts a theme change
    const applyTheme = (theme) => {
      const col = theme === "dark" ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0);
      const mat = this.particles && this.particles.material;
      if (mat && mat.uniforms && mat.uniforms.uColor) {
        mat.uniforms.uColor.value = col;
      }
    };

    window.addEventListener("message", (e) => {
      if (e && e.data && e.data.type === "theme") applyTheme(e.data.theme);
    });

    // Cross-window fallback via storage events
    window.addEventListener("storage", (e) => {
      if (e.key === "theme") applyTheme(e.newValue);
    });
  }

  /* ------------------------------------------------------------------------
     Lights — ambient plus two coloured points
     ------------------------------------------------------------------------ */
  createLights() {
    this.aLight = new THREE.AmbientLight(0xffffff, 0.5);

    this.pLightBlue = new THREE.PointLight(0x1111ff, 1, 200);
    this.pLightBlue.position.set(10, 10, 20);

    this.pLightRed = new THREE.PointLight(0xff1111, 1, 200);
    this.pLightRed.position.set(-10, 10, 20);

    this.scene.add(this.aLight);
    this.scene.add(this.pLightBlue);
    this.scene.add(this.pLightRed);
  }

  /* ------------------------------------------------------------------------
     Resize + render loop
     ------------------------------------------------------------------------ */
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
    if (this.particles) {
      this.particles.material.uniforms.time.value = this.time;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new Scene({ el: document.querySelector(".container") });