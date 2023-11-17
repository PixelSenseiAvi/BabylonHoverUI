window.addEventListener('DOMContentLoaded', async function () {
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Object to hold the outline width property
    var settings = {
        outlineWidth: 1.5, // Default value
        hoveringOver: '',
        intensity: 0.1
    };

    function getRandomVector3(minX, maxX, minY, maxY, minZ, maxZ) {
        var randomX = Math.random() * (maxX - minX) + minX;
        var randomY = Math.random() * (maxY - minY) + minY;
        var randomZ = Math.random() * (maxZ - minZ) + minZ;

        return new BABYLON.Vector3(randomX, randomY, randomZ);
    }

    const minRange = new BABYLON.Vector3(-5, 0, -5);
    const maxRange = new BABYLON.Vector3(5, 10, 5);

    // Create dat.GUI instance
    var gui = new dat.GUI();

    var highlightMaterial;
    var shaderMaterial;
    var camera;

    var meshesToLoad = ['human_skull.glb', 'earth.glb'];

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

        gui.add(settings, 'hoveringOver').domElement.style.pointerEvents = 'none'; // Make it non-interactive

        // Parameters: alpha, beta, radius, target position, scene
        camera = new BABYLON.ArcRotateCamera('camera1', 0, Math.PI / 2, 10, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);

        var light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);


        gui.add(light, 'intensity', 0, 1, 0.01); // Arguments: object, property, min, max, step

        // Load Mesh
        var meshes = await loadMeshes(meshesToLoad, scene);
        meshes.forEach(mesh => {

            // Set the random position of the mesh
            mesh.position = getRandomVector3(minRange.x, maxRange.x, minRange.y, maxRange.y, minRange.z, maxRange.z);
        });


        // Normal Shaders
        const [vertexCode, fragmentCode] = await Promise.all([
            fetch('fresnel.vertex.fx').then(response => response.text()),
            fetch('fresnel.fragment.fx').then(response => response.text())
        ]);

        shaderMaterial = new BABYLON.ShaderMaterial('shader', scene, {
            vertex: './fresnel',
            fragment: './fresnel',
        }, {
            attributes: ['position', 'normal', 'uv'],
            uniforms: ['world', 'worldView', 'worldViewProjection', 'view', 'projection', 'cameraPosition', 'useFresnelEffect', 'outlineWidth']
        });

        shaderMaterial.vertexCode = vertexCode;
        shaderMaterial.fragmentCode = fragmentCode;

        shaderMaterial.setVector3('cameraPosition', camera.position);

        //Outline
        // Add a controller in the GUI for outlineWidth
        var controller = gui.add(settings, 'outlineWidth', 0.1, 8.5, 0.1);

        // Listen to changes in the GUI and update the shader material
        controller.onChange(function (value) {
            // Assuming outlineMaterial is your outline shader material
            shaderMaterial.setFloat('outlineWidth', value);
        });

        // Apply shader material to the mesh
        shaderMaterial.setFloat('useFresnelEffect', false);

        meshes.forEach(mesh => {
            mesh.material = shaderMaterial;
        });

        return scene;
    };

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

        if (pickResult.hit) {
            var pickedMesh = pickResult.pickedMesh;

            // Highlight the picked mesh
            highlightMaterial = shaderMaterial.clone('highlightMaterial'); // Clone to avoid shared material issues
            highlightMaterial.setFloat('useFresnelEffect', true);
            pickedMesh.material = highlightMaterial;

            // Reset the previously highlighted mesh, if it's different
            if (previouslyHighlightedMesh && previouslyHighlightedMesh !== pickedMesh) {
                // Reset the material of the previously highlighted mesh
                // This assumes you have a defaultMaterial or original material to set it back to
                previouslyHighlightedMesh.material = shaderMaterial;
            }

            previouslyHighlightedMesh = pickedMesh; // Update the reference

            updateUIHoverOver(pickedMesh.name);
        } else {
            // Reset when no mesh is hovered
            if (previouslyHighlightedMesh) {
                previouslyHighlightedMesh.material = shaderMaterial; // Reset the material
                previouslyHighlightedMesh = null;
            }

            updateUIHoverOver('null');
        }
    });


    engine.runRenderLoop(() => {
        if (scene) {
            shaderMaterial.setVector3('cameraPosition', camera.position);
            scene.render();
        }
    });

    window.addEventListener('resize', function () {
        engine.resize();
    });
});