#version 300 es
precision highp float;

// Attributes
in vec3 position;
in vec3 normal;

// Uniforms
uniform mat4 worldViewProjection;
uniform float outlineWidth;

// Output
out vec3 vNormal;

void main(void) {
    vec3 inflatedPosition = position + normal * outlineWidth;
    gl_Position = worldViewProjection * vec4(inflatedPosition, 1.0);
    vNormal = normal;
}
