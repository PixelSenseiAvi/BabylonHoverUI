window.addEventListener('DOMContentLoaded', async function () {
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    var canvasWidth = engine.getRenderWidth();
    var canvasHeight = engine.getRenderHeight();

    // Object to hold the outline width property
    var settings = {
        outlineWidth: 1,
        hoveringOver: '',
        intensity: 0.1,
        outlineColor: "#ffae23",
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

    var meshesToLoad = ['sphere.glb'];

    var standardMaterial;

    var renderTarget;
    var outlinePostProcessUniforms;
    var findSurfacesUniforms;

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

    function updatePostProcessTexturesForMesh(mesh) {
        if (mesh) {

            findSurfacesUniforms['modelViewMatrix'] = mesh.getWorldMatrix().multiply(camera.getProjectionMatrix());
            var fixedColor = new BABYLON.Color4(1.0, 0.0, 0.0, 1.0);
            findSurfacesUniforms['vColor'] = fixedColor;

            outlinePostProcessUniforms['sceneColorBuffer'] = mesh.sceneColorTexture;
            outlinePostProcessUniforms['depthBuffer'] = mesh.depthTexture;
            outlinePostProcessUniforms['surfaceBuffer'] = mesh.surfaceBuffer;
        }
    }

    var createScene = async function () {
        var scene = new BABYLON.Scene(engine);

        // Create Ground
        CreateGround();

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


        light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);

        gui.add(light, 'intensity', 0, 1, 0.01); // Arguments: object, property, min, max, step

        // Load Mesh
        var meshes = await loadMeshes(meshesToLoad, scene);
        // URL to your texture file

        meshes.forEach(mesh => {
            // Set the random position of the mesh
            mesh.position = getRandomVector3(minRange.x, maxRange.x, minRange.y, maxRange.y, minRange.z, maxRange.z);
            mesh.useVertexColors = true;
            mesh.useVertexAlpha = true;
        });

        async function loadShader(shaderUrl) {
            const response = await fetch(shaderUrl);
            const shaderCode = await response.text();
            return shaderCode;
        }

        // Load shaders and create post-process
        async function createPostProcess(vertexShaderPath, fragmentShaderPath, _prefix, uniformDict) {
            const vertexShaderCode = await loadShader(vertexShaderPath);
            const fragmentShaderCode = await loadShader(fragmentShaderPath);

            BABYLON.Effect.ShadersStore[_prefix + 'VertexShader'] = vertexShaderCode;
            BABYLON.Effect.ShadersStore[_prefix + 'FragmentShader'] = fragmentShaderCode;

            var postProcess = new BABYLON.PostProcess(_prefix, './' + _prefix, Object.keys(uniformDict), null, 1.0, camera);
            postProcess.onApply = function (effect) {

                //effect.ShadersStore[_prefix + 'VertexShader'] = vertexShaderCode;
                //effect.ShadersStore[_prefix + 'FragmentShader'] = fragmentShaderCode;

                for (const [key, value] of Object.entries(uniformDict)) {
                    if (typeof value === 'number') {
                        effect.setFloat(key, value);
                    } else if (value instanceof BABYLON.Vector3) {
                        effect.setVector3(key, value);
                    } else if (value instanceof BABYLON.Vector2) {
                        effect.setVector2(key, value);
                    } else if (value instanceof BABYLON.Vector4) {
                        effect.setVector4(key, value);
                    } else if (value instanceof BABYLON.Texture) {
                        effect.setTexture(key, value);
                    } else if (value instanceof BABYLON.Matrix) {
                        effect.setMatrix(key, value);
                    } else if (value instanceof BABYLON.Color3) {
                        effect.setColor3(key, value);
                    } else {
                        console.log('Define a set for this type: ' + typeof value + ' for ' + key);
                    }
                    // Add other types as needed
                }
            };

            return postProcess;
        }

        var vFindSurfacesShader = 'findSurfaces.vertex.fx';
        var fFindSurfacesShader = 'findSurfaces.fragment.fx';

        // Uniforms
        findSurfacesUniforms = {
            'maxSurfaceId': 1,
            'modelViewMatrix': camera.getProjectionMatrix(),
        };
        var postProcess1 = await createPostProcess(vFindSurfacesShader, fFindSurfacesShader, 'findSurfaces', findSurfacesUniforms);

        var vOutlineShader = 'outline.vertex.fx';
        var fOutlineShader = 'outline.fragment.fx';

        outlinePostProcessUniforms = {
            'outlineWidth': settings.outlineWidth,

            'cameraNear': camera.minZ,
            'cameraFar': camera.maxZ,
            'outlineColor': new BABYLON.Color3.FromHexString(settings.outlineColor), //TODO: check for this. It should be vec3
            'screenSize': new BABYLON.Vector4(canvasWidth, canvasHeight, 1.0 / canvasWidth, 1.0 / canvasHeight),
            'multiplierParameters': new BABYLON.Vector2(0.9, 20),
            'viewMatrix': camera.getViewMatrix(),

        };

        var postProcess2 = await createPostProcess(vOutlineShader, fOutlineShader, 'outline', outlinePostProcessUniforms);

        renderTarget = new BABYLON.RenderTargetTexture("renderTarget", { width: 1024, height: 1024 }, scene);
        scene.customRenderTargets.push(renderTarget);
        renderTarget.addPostProcess(postProcess1);
        renderTarget.addPostProcess(postProcess2);

        standardMaterial = new BABYLON.StandardMaterial("outputMaterial", scene);
        standardMaterial.emissiveTexture = renderTarget; 

        // meshes.forEach((mesh) => {
        //     //mesh.material = standardMaterial;
        // });

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
    
            if (previouslyHighlightedMesh !== pickedMesh) {
                if (previouslyHighlightedMesh) {
                    // Reset the material of the previously highlighted mesh
                    previouslyHighlightedMesh.material = new BABYLON.StandardMaterial("originalMaterial", scene);
                    renderTarget.renderList.splice(renderTarget.renderList.indexOf(previouslyHighlightedMesh), 1);
                }
    
                // Apply highlight material to the currently picked mesh
                pickedMesh.material = standardMaterial;
                renderTarget.renderList.push(pickedMesh);
                previouslyHighlightedMesh = pickedMesh;
            }
    
            updateUIHoverOver(pickedMesh.name);
        } else {
            // Reset when no mesh is hovered
            if (previouslyHighlightedMesh) {
                previouslyHighlightedMesh.material = new BABYLON.StandardMaterial("originalMaterial", scene);
                renderTarget.renderList.splice(renderTarget.renderList.indexOf(previouslyHighlightedMesh), 1);
                previouslyHighlightedMesh = null;
            }
    
            updateUIHoverOver('null');
            //renderTarget.clearPostProcesses();
        }
    });    

    canvas.addEventListener('resize', function () {
        engine.resize();
        var newWidth = engine.getRenderWidth();
        var newHeight = engine.getRenderHeight();
        outlinePostProcessUniforms["screenSize"] = new BABYLON.Vector4(newWidth, newHeight, 1.0 / newWidth, 1.0 / newHeight);
    });

    // Add an event listener for the 'contextmenu' event
    canvas.addEventListener('contextmenu', function (event) {
        event.preventDefault(); // Prevents the default right-click menu
    });

    engine.runRenderLoop(() => {
        if (scene) {
            scene.render();
        }
    });

    window.addEventListener('resize', function () {
        engine.resize();
    });
});