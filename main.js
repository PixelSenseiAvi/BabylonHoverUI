window.addEventListener('DOMContentLoaded', async function () {
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Object to hold the outline width property
    var settings = {
        outlineWidth: 0.1, // Default value
        hoveringOver: ''
    };

    // Create dat.GUI instance
    var gui = new dat.GUI();

    var createScene = async function () {
        var scene = new BABYLON.Scene(engine);

        gui.add(settings, 'hoveringOver').domElement.style.pointerEvents = "none"; // Make it non-interactive

        // Parameters: alpha, beta, radius, target position, scene
        var camera = new BABYLON.ArcRotateCamera("camera1", 0, Math.PI / 2, 10, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);

        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);

        gui.add(light, 'intensity', 0, 1, 0.01); // Arguments: object, property, min, max, step

        // Load Mesh
        var mesh = await BABYLON.SceneLoader.ImportMeshAsync("", "", "human_skull.glb", scene);
        var originalMesh = mesh.meshes[0];
        originalMesh.name = "Skull";
        var mesh1 = await BABYLON.SceneLoader.ImportMeshAsync("", "", "earth.glb", scene);
        var originalMesh1 = mesh1.meshes[0];
        originalMesh1.name = "Earth";

        // Normal Shaders
        const [vertexCode, fragmentCode] = await Promise.all([
            fetch('shader.vertex.fx').then(response => response.text()),
            fetch('shader.fragment.fx').then(response => response.text())
        ]);

        var shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
            vertex: "custom",
            fragment: "custom",
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
        });


        // Outline Shaders
        const [outlineVertexCode, outlineFragmentCode] = await Promise.all([
            fetch('outline.vertex.fx').then(response => response.text()),
            fetch('outline.fragment.fx').then(response => response.text())
        ]);

        let outlineMaterial = new BABYLON.ShaderMaterial("outlineShader", scene, {
            vertex: "outline",
            fragment: "outline",
        }, {
            attributes: ["position", "normal"],
            uniforms: ["worldViewProjection", "outlineWidth"]
        });

        shaderMaterial.vertexCode = vertexCode;
        shaderMaterial.fragmentCode = fragmentCode;

        // Apply shader material to the mesh
        originalMesh.material = shaderMaterial;
        originalMesh.position = new BABYLON.Vector3(5, 3, 2);

        originalMesh1.material = shaderMaterial;
        originalMesh1.position = new BABYLON.Vector3(0, 1, 3);
        originalMesh1.renderingGroupId = 1;

        //Outline
        // Add a controller in the GUI for outlineWidth
        var controller = gui.add(settings, 'outlineWidth', 0, 1, 0.01);

        // Listen to changes in the GUI and update the shader material
        controller.onChange(function (value) {
            // Assuming outlineMaterial is your outline shader material
            outlineMaterial.setFloat('outlineWidth', value);
        });

        outlineMaterial.vertexCode = outlineVertexCode;
        outlineMaterial.fragmentCode = outlineFragmentCode;
        outlineMaterial.depthWrite = false;
        outlineMaterial.depthFunction = BABYLON.Engine.ALWAYS;

        if (originalMesh1) {
            var outlineMesh1 = originalMesh1.clone("outlineMesh1");
            outlineMesh1.material = outlineMaterial;
            outlineMesh1.position = new BABYLON.Vector3(originalMesh1.position.x, originalMesh1.position.y, originalMesh1.position.z);
            outlineMesh1.renderingGroupId = 0;
            outlineMesh1.material.depthWrite = false;
        }
        return scene;
    };

    var scene = await createScene();

    function updateUIHoverOver(newText) {
        settings.hoveringOver = newText;
        for (var i in gui.__controllers) {
            gui.__controllers[i].updateDisplay();
        }
    }

    canvas.addEventListener('pointermove', function(evt) {
        var pickResult = scene.pick(scene.pointerX, scene.pointerY);
        if (pickResult.hit) {
            var pickedMesh = pickResult.pickedMesh;
            // Now you have the mesh that was hovered over
            updateUIHoverOver(pickedMesh.name);
        } else {
            updateUIHoverOver("null");
        }
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