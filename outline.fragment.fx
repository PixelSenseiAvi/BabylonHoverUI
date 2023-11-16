#version 300 es
precision highp float;

// Input
in vec3 vNormal;

// Output color
out vec4 fragColor;

void main(void) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Outline color (black)
}