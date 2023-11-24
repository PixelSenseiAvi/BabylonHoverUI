#version 300 es
precision highp float;

uniform mat4 projectionMatrix;  // Assuming these matrices are provided as uniforms
uniform mat4 modelViewMatrix;

in vec4 position;              // Assuming 'position' is provided as a vertex attribute
in vec2 uv;        // Assuming 'uv' is provided as a vertex attribute
in vec4 color;     // Assuming 'color' is provided as a vertex attribute

out vec2 v_uv;
out vec4 vColor;

void main(void) {
   v_uv = uv;
   vColor = color;

   gl_Position = projectionMatrix * modelViewMatrix * position;
}
