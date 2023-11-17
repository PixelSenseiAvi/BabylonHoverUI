#version 300 es

// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Outputs to the fragment shader
out vec3 vPosition;
out vec3 vNormal;
out vec2 vUV;

void main(void) {
    vPosition = position;
    vUV = uv;
    mat3 normalMatrix = transpose(inverse(mat3(world)));
    vNormal = normalMatrix * normal;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
