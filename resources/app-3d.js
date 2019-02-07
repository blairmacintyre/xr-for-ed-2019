class PageApp extends XRExampleBase {
    constructor(domElement){
        super(domElement, false)
        this.clock = new THREE.Clock()
		this._tapEventData = null // Will be filled in on touch start and used in updateScene
        this.meshes = []
        this.clonemeshes = []
        this.geometries = []
        this.femaleGeometry = null
        this.maleGeometry = null

        this.doProcessing = true;
        
        this.colors = [
            0xff4422,
            0xff9955,
            0xff77dd,
            0xff7744,
            0xff5522,
            0xff9922,
            0xff99ff
        ]

        const loader = new THREE.BinaryLoader()
        loader.load('./resources/webxr/examples/models/female02/Female02_bin.js', geometry => {
            this.femaleGeometry = geometry
            this.geometries.push(this.femaleGeometry)
            //this.floorGroup.add(this.createSceneGraphNode())
        })
        loader.load('./resources/webxr/examples/models/male02/Male02_bin.js', geometry => {
            this.maleGeometry = geometry
            this.geometries.push(this.maleGeometry)
        })

        var renderModel = new THREE.RenderPass( this.scene, this.camera );
        
        var effectBloom = new THREE.BloomPass( 0.75 );
        var effectFilm = new THREE.FilmPass( 0.5, 0.5, 1448, false );

        var effectFocus = new THREE.ShaderPass( THREE.FocusShader );

        effectFocus.uniforms[ "screenWidth" ].value = window.innerWidth;
        effectFocus.uniforms[ "screenHeight" ].value = window.innerHeight;


        this.composer = new THREE.EffectComposer( this.renderer );

        this.composer.addPass( renderModel );
        //renderModel.renderToScreen = true;
        this.composer.addPass( effectBloom );
        // effectBloom.renderToScreen = true;
        this.composer.addPass( effectFilm );
        effectFilm.renderToScreen = true;
        // this.composer.addPass( effectFocus );
        // effectFocus.renderToScreen = true;
    }

	doRender(){
        if (this.doProcessing) {
            this.renderer.clear();
            this.composer.render( 0.01 );    
        } else {
            this.renderer.render(this.scene, this.camera)
        }
	}

    vrScene(){
        this.scene.background = this.envMap        
    }

    arScene(){ 
        this.scene.background = null;
    }

    // Called once per frame, before render, to give the app a chance to update this.scene
	updateScene(frame){

        let delta = 10 * this.clock.getDelta()
        delta = delta < 2 ? delta : 2
        /*

        for(let j = 0, jl = this.clonemeshes.length; j < jl; j++){
            this.clonemeshes[j].mesh.rotation.y += -0.1 * delta * this.clonemeshes[j].speed
        }
        */

        let data = null
        let vertices = null
        let vertices_tmp = null
        let vl = null
        let d = null
        let vt = null
        let mesh = null
        let p = null
        for(let j = 0, jl = this.meshes.length; j < jl; j ++){
            data = this.meshes[j]
            mesh = data.mesh
            vertices = data.vertices
            vertices_tmp = data.vertices_tmp
            vl = data.vl
            if (! data.dynamic) continue
            if (data.start > 0){
                data.start -= 1
            } else {
                if (!data.started){
                    data.direction = -1
                    data.started = true
                }
            }
            for (let i = 0; i < vl; i ++){
                p = vertices[i]
                vt = vertices_tmp[i]
                // falling down
                if (data.direction < 0){
                    // let d = Math.abs(p.x - vertices_tmp[i][0]) + Math.abs(p.y - vertices_tmp[i][1]) + Math.abs(p.z - vertices_tmp[i][2])
                    // if (d < 200){
                    if (p.y > 0){
                        // p.y += data.direction * data.speed * delta
                        p.x += 1.5 * (0.50 - Math.random()) * data.speed * delta
                        p.y += 3.0 * (0.25 - Math.random()) * data.speed * delta
                        p.z += 1.5 * (0.50 - Math.random()) * data.speed * delta
                    } else {
                        if (! vt[3]){
                            vt[3] = 1
                            data.down += 1
                        }
                    }
                }
                // rising up
                if (data.direction > 0){
                    //if (p.y < vertices_tmp[i][1]){
                    //	p.y += data.direction * data.speed * delta
                    d = Math.abs(p.x - vt[0]) + Math.abs(p.y - vt[1]) + Math.abs(p.z - vt[2])
                    if (d > 1){
                        p.x += - (p.x - vt[0]) / d * data.speed * delta * (0.85 - Math.random())
                        p.y += - (p.y - vt[1]) / d * data.speed * delta * (1 + Math.random())
                        p.z += - (p.z - vt[2]) / d * data.speed * delta * (0.85 - Math.random())
                    } else {
                        if (! vt[4]){
                            vt[4] = 1
                            data.up += 1
                        }
                    }
                }
            }
            // all down
            if (data.down === vl){
                if (data.delay === 0){
                    data.direction = 1
                    data.speed = 10
                    data.down = 0
                    data.delay = 320
                    for(let i = 0; i < vl; i ++){
                        vertices_tmp[i][3] = 0
                    }
                } else {
                    data.delay -= 1
                }
            }
            // all up
            if (data.up === vl){
                if (data.delay === 0){
                    data.direction = -1
                    data.speed = 35
                    data.up = 0
                    data.delay = 120
                    for(let i = 0; i < vl; i ++){
                        vertices_tmp[i][4] = 0
                    }
                } else {
                    data.delay -= 1
                }
            }
            mesh.geometry.verticesNeedUpdate = true
        }

		// If we have tap data, attempt a hit test for a surface
		if(this._tapEventData !== null){
			const x = this._tapEventData[0]
			const y = this._tapEventData[1]
			this._tapEventData = null
			// Attempt a hit test using the normalized screen coordinates
			frame.findAnchor(x, y).then(anchorOffset => {
				if(anchorOffset === null){
					console.log('miss')
					return
				}
				console.log('hit', anchorOffset)
				this.addAnchoredNode(anchorOffset, this.createSceneGraphNode())
			}).catch(err => {
				console.error('Error in hit test', err)
			})
		}
    }

    // Called during construction to allow the app to populate this.scene
    initializeScene(){
        // Add a box at the scene origin
        let box = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.1, 0.1, 0.1),
            new THREE.MeshPhongMaterial({ color: '#DDFFDD' })
        )
        box.position.set(0, 0, 0)
        this.floorGroup.add(box)

        // Add a few lights
        this.scene.add(new THREE.AmbientLight('#FFF', 0.2))
        let directionalLight = new THREE.DirectionalLight('#FFF', 0.6)
        directionalLight.position.set(0, 10, 0)
        this.scene.add(directionalLight)

        this.scene.background = null;
        
        // Create the environment map
        const path = './resources/webxr/examples/textures/Park2/'
        const format = '.jpg'
        this.envMap = new THREE.CubeTextureLoader().load([
            path + 'posx' + format, path + 'negx' + format,
            path + 'posy' + format, path + 'negy' + format,
            path + 'posz' + format, path + 'negz' + format
        ])
        this.envMap.format = THREE.RGBFormat
        //this.scene.background = this.envMap

        // Add the boom box
        loadGLTF('./resources/webxr/examples/models/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf').then(gltf => {
            gltf.scene.scale.set(15, 15, 15)
            gltf.scene.position.set(0, 1, -0.6)
            gltf.scene.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)

            gltf.scene.traverse(node => {
                if (node.material && (node.material.isMeshStandardMaterial || (node.material.isShaderMaterial && node.material.envMap !== undefined))){
                    node.material.envMap = this.envMap
                        node.material.needsUpdate = true
                }
            })

            this.boomBox = gltf.scene;
            this.floorGroup.add(gltf.scene)
        }).catch((...params) =>{
            console.error('could not load gltf', ...params)
        })
    }

    createSceneGraphNode(){
        const group = new THREE.Group()
        group.add(this.createMesh(
            this.geometries[Math.floor(this.geometries.length * Math.random())], 
            0.003,
            0,0,0, 
            0.005, 
            this.colors[Math.floor(this.colors.length * Math.random())],
            true
        ))
        return group
    }

    createMesh(originalGeometry, scale, x, y, z, pointSize, color, dynamic){
        let i, c, mesh, p
        let vertices = originalGeometry.vertices
        let vl = vertices.length
        let geometry = new THREE.Geometry()
        let vertices_tmp = []
        for (i = 0; i < vl; i ++){
            p = vertices[i]
            geometry.vertices[i] = p.clone()
            vertices_tmp[i] = [p.x, p.y, p.z, 0, 0]
        }
        if (dynamic){
            c = color
            mesh = new THREE.Points(geometry, new THREE.PointsMaterial({ size: pointSize, color: c }))
            this.clonemeshes.push({ mesh: mesh, speed: 0.5 + Math.random() })
        } else {
            mesh = new THREE.Points(geometry, new THREE.PointsMaterial({ size: pointSize, color: color }))
        }
        mesh.scale.x = mesh.scale.y = mesh.scale.z = scale
        mesh.position.x = x
        mesh.position.y = y
        mesh.position.z = z
        mesh.quaternion.setFromEuler(new THREE.Euler(0, (Math.PI * 2) * Math.random(), 0))
        this.meshes.push({
            mesh: mesh,
            vertices: geometry.vertices,
            vertices_tmp: vertices_tmp,
            vl: vl,
            down: 0,
            up: 0,
            direction: 0,
            speed: 35,
            delay: Math.floor(10 * Math.random()),
            started: false,
            start: Math.floor(100 * Math.random()),
            dynamic: dynamic
        })
        mesh.name = 'prettyperson: ' + Math.random() 
        return mesh
    }

    // Save screen taps as normalized coordinates for use in this.updateStageGroup
    _onTap(x,y){
        console.log('tap!', x, y)
        //save screen coordinates normalized to -1..1 (0,0 is at center and 1,1 is at top right)
        this._tapEventData = [
            x / window.innerWidth,
            y / window.innerHeight
        ]
    }
}


window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            window.pageApp = new PageApp(document.getElementById('target'))
            window.touchTapHandler = window.pageApp._onTap.bind(window.pageApp);
        } catch(e) {
            console.error('page error', e)
        }
    }, 1000)
})


///
/// presentation

// Reveal is loaded and ready
Reveal.addEventListener( 'ready', function( event ) {
	// event.currentSlide, event.indexh, event.indexv
    var slideState = event.currentSlide.getAttribute( 'data-state' );
    var states = [];
    if( slideState ) {
        states = slideState.split( ' ' );
    }

    if (states.indexOf("xrslide") >= 0) {
        document.body.style.backgroundColor = "transparent";
    } else {
        document.body.style.backgroundColor = "black";        
    }

    var xrSession = document.querySelector('.webxr-sessions');
    if (xrSession) {
        xrSession.style.visibility = "hidden";        
    }
    var xrReality = document.querySelector('.webxr-realities');
    if (xrReality) {
        xrReality.style.visibility = "hidden";        
    }
} );


// new slide
Reveal.addEventListener( 'slidechanged', function( event ) {
    // event.previousSlide, event.currentSlide, event.indexh, event.indexv
    var slideState = event.currentSlide.getAttribute( 'data-state' );
    var states = [];
    if( slideState ) {
        states = slideState.split( ' ' );
    }

    var xrSession = document.querySelector('.webxr-sessions');
    var xrReality = document.querySelector('.webxr-realities');

    if (states.indexOf("xrslide") >= 0) {
        document.body.style.backgroundColor = "transparent";
        if (xrSession) {
            xrSession.style.visibility = "visible";
        }
        if (xrReality) {
            xrReality.style.visibility = "visible";
        }

        if (window.pageApp) {
            window.pageApp.doProcessing = (states.indexOf("3deffects") >= 0)
            if (window.pageApp.boomBox) {
                window.pageApp.boomBox.visible = (states.indexOf("boombox") >= 0)
            }        
            if (states.indexOf("arslide") >= 0) {
                window.pageApp.arScene();
                // delete window.pageApp
                // window.pageApp = new PageApp(document.getElementById('target'))
                // window.touchTapHandler = window.pageApp._onTap.bind(window.pageApp)
            }
            else if (states.indexOf("vrslide") >= 0) {
                window.pageApp.vrScene();
                // delete window.pageApp
                // window.pageApp = new ARSimplestExample(document.getElementById('target'))
                // window.touchTapHandler = window.pageApp._onTap.bind(window.pageApp)
            }
        }
    } else {
        document.body.style.backgroundColor = "black";
        if (xrSession) {
            xrSession.style.visibility = "hidden";
        }
        if (xrReality) {
            xrReality.style.visibility = "hidden";
        }
    }  
} );

// If you set ``data-state="somestate"`` on a slide ``<section>``, "somestate" will 
// be applied as a class on the document element when that slide is opened.
// Furthermore you can also listen to these changes in state via JavaScript:

Reveal.addEventListener( 'xrslide', function( event ) {
	// // event.active
    // var xrSession = document.querySelector('.webxr-sessions');
    // var xrReality = document.querySelector('.webxr-realities');

    // if (event.active) {
    //     document.body.style.backgroundColor = "transparent";
    //     xrSession.style.visibility = "visible";
    //     xrReality.style.visibility = "visible";
    // } else {
    //     document.body.style.backgroundColor = "black";
    //     xrSession.style.visibility = "hidden";
    //     xrReality.style.visibility = "hidden";
    // }
} );

Reveal.addEventListener( 'arstuff', function( event ) {
} );

//var spinbox = document.querySelector('#spinbox');
Reveal.addEventListener( 'spinbox', function( event ) {
	// event.active
  //  spinbox.setAttribute('visible', event.active);
} );

//var geoAR = document.querySelector('#geo');
Reveal.addEventListener( 'geomarkers', function( event ) {
	// event.active
  //  geoAR.setAttribute('visible', event.active);
} );

//var vuforia = document.querySelector('#frame');
Reveal.addEventListener( 'vuforia', function( event ) {
	// event.active
  //  vuforia.setAttribute('trackvisibility', event.active);
} );

//
// fragments.  Perhaps I can add/remove 3D content when I step through some fragmets in a slide
//

Reveal.addEventListener( 'fragmentshown', function( event ) {
	// event.fragment = the fragment DOM element
} );
Reveal.addEventListener( 'fragmenthidden', function( event ) {
	// event.fragment = the fragment DOM element
} );

