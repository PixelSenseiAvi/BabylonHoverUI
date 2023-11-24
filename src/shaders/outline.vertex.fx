#version 300 es

uniform mat4 projectionMatrix; // Assuming these matrices are provided as uniforms
uniform mat4 modelViewMatrix;

in vec2 uv;  // Assuming 'uv' is provided as a vertex attribute
in vec4 position; // Assuming 'position' is provided as a vertex attribute

out vec2 vUV;

void main() {
    vUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * position;
}
