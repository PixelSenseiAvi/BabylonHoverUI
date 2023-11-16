#version 300 es

// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;

// Outputs to the fragment shader
out vec3 vPosition;
out vec3 vNormal;
out vec2 vUV;

void main(void) {
    vPosition = position;
    vNormal = normal;
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}

// precision highp float;

// // Attributes
// in vec3 position;
// in vec3 normal;
// in vec2 uv;

// // Uniforms
// uniform mat4 worldViewProjection;
// uniform float outlineWidth;

// // Output
// out vec3 vPosition;
// out vec3 vNormal;
// out vec2 vUV;

// void main(void) {
//     vec3 inflatedPosition = position + normal * outlineWidth;
//     gl_Position = worldViewProjection * vec4(inflatedPosition, 1.0);
//     vPosition = position;
//     vNormal = normal;
//     vUV = uv;
// }