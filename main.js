window.addEventListener('DOMContentLoaded', async function () {
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Object to hold the outline width property
    var settings = {
        outlineWidth: 1,
        hoveringOver: '',
        intensity: 0.1
    };

    function getRandomVector3(minX, maxX, minY, maxY, minZ, maxZ) {
        var randomX = Math.random() * (maxX - minX) + minX;
        var randomY = Math.random() * (maxY - minY) + minY;
        var randomZ = Math.random() * (maxZ - minZ) + minZ;

        return new BABYLON.Vector3(randomX, randomY, randomZ);
    }

    const minRange = new BABYLON.Vector3(-2, 0, -2);
    const maxRange = new BABYLON.Vector3(2, 0, 2);

    // Create dat.GUI instance
    var gui = new dat.GUI();

    var camera;
    var light;

    var meshesToLoad = ['earth.glb'];

    var shaderMaterial;
    var highlightMaterial;

    var loadMeshes = async function (meshesToLoad, scene) {
        let loadMeshPromises = [];

        for (let meshUrl of meshesToLoad) {
            let loadMeshPromise = BABYLON.SceneLoader.ImportMeshAsync('', '', meshUrl, scene).then(result => {
                // Handle all meshes loaded from the file
                result.meshes.forEach(mesh => {
                    mesh.name = meshUrl; // Optionally, set names based on the URL
                });
                return result.meshes; // Return the array of loaded meshes
            }).catch(error => {
                console.error('Error loading mesh:', meshUrl, error);
            });
            loadMeshPromises.push(loadMeshPromise);
        }

        let loadedMeshArrays = await Promise.all(loadMeshPromises);
        // Flatten the array of arrays
        return loadedMeshArrays.flat();
    }


    var createScene = async function () {
        var scene = new BABYLON.Scene(engine);

        // Create Ground
        CreateGround();

        //Create Environment
        // const envTex = new BABYLON.CubeTexture.CreateFromPrefilteredData(
        //     "./sky.env",
        //     scene
        // );

        // scene.environmentTexture = envTex;

        // scene.createDefaultSkybox(envTex, true);

        // scene.environmentIntensity = 0.5;

        // Modify settings using the same approach as in the playground
        var envHelperOpts = {
            skyboxColor: new BABYLON.Color3(0, 0, 0)
        };

        // Create default environment with custom options
        scene.createDefaultEnvironment(envHelperOpts);


        gui.add(settings, 'hoveringOver').domElement.style.pointerEvents = 'none'; // Make it non-interactive

        // Parameters: alpha, beta, radius, target position, scene
        camera = new BABYLON.ArcRotateCamera('camera1', Math.PI / 2, Math.PI / 4, 10, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);

        // Lock camera position
        camera.lowerRadiusLimit = 3;
        camera.upperRadiusLimit = 10;
        camera.lowerBetaLimit = 0;
        camera.upperBetaLimit = Math.PI / 3;
        camera.lowerAlphaLimit = 0;
        camera.upperAlphaLimit = Math.PI * 3;
        camera.angularSensibilityX = 1000;
        camera.angularSensibilityY = 1000;


        //camera.inputs.clear(); // Clear all default controls

        light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);

        gui.add(light, 'intensity', 0, 1, 0.01); // Arguments: object, property, min, max, step

        // Load Mesh
        var meshes = await loadMeshes(meshesToLoad, scene);
        // URL to your texture file
        //var textureUrl = "./earth/textures/Material.jpeg"; // Replace with your texture file path

        meshes.forEach(mesh => {
            // Set the random position of the mesh
            mesh.position = getRandomVector3(minRange.x, maxRange.x, minRange.y, maxRange.y, minRange.z, maxRange.z);
        });


        const [vertexCode, fragmentCode] = await Promise.all([
            fetch('fresnel.vertex.fx').then(response => response.text()),
            fetch('fresnel.fragment.fx').then(response => response.text())
        ]);

        shaderMaterial = new BABYLON.ShaderMaterial('shader', scene, {
            vertex: './fresnel',
            fragment: './fresnel',
        }, {
            attributes: ['position', 'normal', 'uv'],
            uniforms: ['worldViewProjection', 'useFresnelEffect', 'outlineWidth', 'uTexture']
        });

        shaderMaterial.vertexCode = vertexCode;
        shaderMaterial.fragmentCode = fragmentCode;

        var texture = new BABYLON.Texture("./earth/textures/Material.jpeg", scene);

        shaderMaterial.setTexture('uTexture', texture)
        shaderMaterial.setInt('useFresnelEffect', 0);

        // Add a controller in the GUI for outlineWidth
        var controller = gui.add(settings, 'outlineWidth', 0.1, 8.5, 0.1);

        // Listen to changes in the GUI and update the shader material
        controller.onChange(function (value) {
            shaderMaterial.setFloat('outlineWidth', value);
        });

        meshes.forEach((mesh) => {
            mesh.material = shaderMaterial;
        });

        highlightMaterial = shaderMaterial.clone('highlightMaterial');
        highlightMaterial.setInt('useFresnelEffect', 1);

        return scene;
    };

    var CreateAsphalt = async function () {

        const pbr = new BABYLON.PBRMaterial("pbr", scene);
        pbr.albedoTexture = new BABYLON.Texture(
            "./textures/asphalt/asphalt_diffuse.jpg",
            scene
        );

        pbr.bumpTexture = new BABYLON.Texture(
            "./textures/asphalt/asphalt_normal.jpg",
            scene
        );

        pbr.invertNormalMapX = true;
        pbr.invertNormalMapY = true;

        pbr.useAmbientOcclusionFromMetallicTextureRed = true;
        pbr.useRoughnessFromMetallicTextureGreen = true;
        pbr.useMetallnessFromMetallicTextureBlue = true;

        pbr.metallicTexture = new BABYLON.Texture(
            "./textures/asphalt/asphalt_ao_rough_metal.jpg",
            scene
        );

        return pbr;

    }


    var CreateGround = async function () {
        const ground = new BABYLON.MeshBuilder.CreateGround(
            "ground",
            { width: 10, height: 10 },
            scene
        );

        ground.isPickable = false;
        var groundMaterial = await CreateAsphalt();
        groundMaterial.backFaceCulling = false;
        ground.material = groundMaterial;
    }


    var scene = await createScene();

    function updateUIHoverOver(newText) {
        settings.hoveringOver = newText;
        for (var i in gui.__controllers) {
            gui.__controllers[i].updateDisplay();
        }
    }

    var previouslyHighlightedMesh = null;
    canvas.addEventListener('pointermove', function (evt) {
        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit && meshesToLoad.includes(pickResult.pickedMesh.name)) {
            var pickedMesh = pickResult.pickedMesh;

            // Apply highlight material to the currently picked mesh
            if (previouslyHighlightedMesh !== pickedMesh) {
                if (previouslyHighlightedMesh) {
                    previouslyHighlightedMesh.material = shaderMaterial;
                }
                pickedMesh.material = highlightMaterial;
                previouslyHighlightedMesh = pickedMesh;
            }

            updateUIHoverOver(pickedMesh.name);
        } else {
            // Reset when no mesh is hovered
            if (previouslyHighlightedMesh) {
                previouslyHighlightedMesh.material = shaderMaterial;
                previouslyHighlightedMesh = null;
            }
            updateUIHoverOver('null');
        }
    });


    // Add an event listener for the 'contextmenu' event
    canvas.addEventListener('contextmenu', function (event) {
        event.preventDefault(); // Prevents the default right-click menu
    });

    engine.runRenderLoop(() => {
        if (scene) {
            if (shaderMaterial) {
                shaderMaterial.setVector3("cameraPosition", camera.position);
            }
            scene.render();
        }
    });

    window.addEventListener('resize', function () {
        engine.resize();
    });
});