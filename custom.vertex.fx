#version 300 es
precision highp float;
    
in vec3 position;
in vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;

out vec2 vUV;

void main(void) {
    vec3 p = position;
    // Modify p here if needed to create outline effect
    gl_Position = worldViewProjection * vec4(p, 1.0);
    vUV = uv;
}
