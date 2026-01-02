class Scene {
    constructor(options) {
        this.$el = options.el;
        this.time = 0;
        this.mouse = {
            x: 0,
            y: 0
        };
        
        this.spheres = [];
        this.lightSystems = [];

        this.bindAll();
        this.init();
    }
    
    bindAll() {
        this.render = this.render.bind(this);
        this.mousemove = this.mousemove.bind(this);
        this.resize = this.resize.bind(this);
    }
    
    init() {
        this.textureLoader = new THREE.TextureLoader();
                                                // 40
        this.camera = new THREE.PerspectiveCamera( 15, window.innerWidth / window.innerHeight, 1, 2000 );
		this.camera.position.z = 10; //450
        this.camera.position.y = 800;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer({ alpha: true });
		this.renderer.setPixelRatio( window.devicePixelRatio );
	    this.renderer.setSize( window.innerWidth, window.innerHeight );
        //this.renderer.setClearColor(0xffffff, 1.0);
        this.$el.appendChild( this.renderer.domElement );
        
        // this.createSpheres();
        this.createLights();
        this.createParticles();
        
        this.bindEvents();
        this.resize();
        this.render();
    }
    
    createParticles() {
        // Geometry that is used to spawn the particles
        // const geometry = new THREE.Geometry();
        // for ( let i = 0; i < 10000; i ++ ) {
        //     let vertex = new THREE.Vector3();
        //     vertex.x = Math.random() * 60 - 30;
        //     vertex.y = Math.random() * 20 - 10;
        //     vertex.z = Math.random() * 0 - 10;
        //     geometry.vertices.push( vertex );
        // }
        
        const plane = new THREE.PlaneBufferGeometry(700, 240, 600, 240);
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = '';
        
        // determine initial color from localStorage/body theme
        var theme = (function(){ try { return localStorage.getItem('theme') || (document.body && document.body.getAttribute('data-theme')) || 'light'; } catch(e){ return 'light'; } })();
        var initColor = theme === 'dark' ? new THREE.Color(1,1,1) : new THREE.Color(0,0,0);

        const material = new THREE.ShaderMaterial( {
            uniforms: {
                time: { value: 1.0 },
                texture:   { value: textureLoader.load( "https://s3-us-west-2.amazonaws.com/s.cdpn.io/1081752/spark1.png" ) },
                resolution: { value: new THREE.Vector2() },
                uColor: { value: initColor }

            },

            vertexShader: document.getElementById( 'render-vs' ).textContent,
            fragmentShader: document.getElementById( 'render-fs' ).textContent,
            // blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true

        } );
        
        console.log(material.uniforms.texture);
		
        //const material = new THREE.PointsMaterial( { size: 1 } );
        this.particles = new THREE.Points( plane, material );
        this.particles.rotation.x = this.degToRad(-90);

        this.scene.add(this.particles);

        // Listen for theme messages from parent and storage changes
        window.addEventListener('message', (e) => {
            try {
                if (!e.data) return;
                if (e.data.type === 'theme') {
                    var col = e.data.theme === 'dark' ? new THREE.Color(1,1,1) : new THREE.Color(0,0,0);
                    if (this.particles && this.particles.material && this.particles.material.uniforms && this.particles.material.uniforms.uColor) this.particles.material.uniforms.uColor.value = col;
                }
            } catch(err){}
        });

        // storage event (other windows) fallback
        window.addEventListener('storage', (e) => {
            try {
                if (e.key === 'theme') {
                    var col = e.newValue === 'dark' ? new THREE.Color(1,1,1) : new THREE.Color(0,0,0);
                    if (this.particles && this.particles.material && this.particles.material.uniforms && this.particles.material.uniforms.uColor) this.particles.material.uniforms.uColor.value = col;
                }
            } catch(err){}
        });
    }
    
    createLights() {
        this.dLight = new THREE.DirectionalLight(0xffffff, .5);
        this.dLight.position.set(0, 10, 0);
        
        this.aLight = new THREE.AmbientLight(0xffffff, .5);
        
//         for (let i = 0; i < this.spheres.length; i++) {
//             const bLight = new THREE.PointLight(0x1111ff, 1, 200);
//             bLight.position.set(10, 10, 20);
//             bLight.target = this.spheres[i];
//             this.scene.add(bLight);
            
//             const rLight = new THREE.PointLight(0xff11111, 1, 200);
//             rLight.position.set(-10, 10, 20);
//             rLight.target = this.spheres[i];
//             this.scene.add(bLight);
            
//             this.lightSystems.push([bLight, rLight]);
//         }
        
        // Point lights
        this.pLightBlue = new THREE.PointLight(0x1111ff, 1, 200);
        this.pLightBlue.position.set(10, 10, 20);
        
        this.pLightRed = new THREE.PointLight(0xff11111, 1, 200);
        this.pLightRed.position.set(-10, 10, 20);

        //this.scene.add(this.dLight);
        this.scene.add(this.aLight);
        this.scene.add(this.pLightBlue);
        this.scene.add(this.pLightRed);

    }
    
    bindEvents() {
        // window.addEventListener('mousemove', this.mousemove);
        window.addEventListener('resize', this.resize);
    }
    
    mousemove(e) {
        this.mouse.x = -window.innerWidth + 2 * e.pageX;
        this.mouse.y = -window.innerHeight + 2 * e.pageY;
    }
    
    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        console.log(w, h);
        this.renderer.setSize(w,h);
        this.camera.aspect = w/h;
        this.camera.updateProjectionMatrix();
    }
    
    moveSpheres() {

        for (let i = 0; i < this.spheres.length; i++) {
            const mesh = this.spheres[i].mesh;
           mesh.material.uniforms.time.value = this.time;
            const speed = .05 / this.spheres[i].mass;
            const y = mesh.position.y + speed;
            
            mesh.position.y = y;
            
            if (y > 15) {
                mesh.position.y = -20;
                mesh.position.x = Math.random() * 20 - 10;
            }
        }
    }
    
    moveParticles() {
        this.particles.material.uniforms.time.value = this.time;
        // this.particles.material.needsUpdate = true;
    }

    // Animations
    
    render() {
        requestAnimationFrame(this.render);
        this.time += .01;
     
        // this.moveCube();
        this.moveSpheres();
        this.moveParticles();
        this.renderer.render(this.scene, this.camera);
    }
    
    // Utils
    degToRad(angle) {
        return angle * Math.PI / 180;
    }
    
}

const scene = new Scene({
    el: document.querySelector('.container')
});