//#version 300 es

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

in vec4 position; 
in vec2 uv; 

void main() {
    vUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * position;
}
