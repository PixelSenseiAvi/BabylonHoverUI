#version 300 es
precision highp float;

// Inputs from the vertex shader
in vec3 vPosition;
in vec3 vNormal;
in vec2 vUV;

// Output color
out vec4 fragColor;

void main(void) {
    // Simple color based on normalized normal for demonstration
    vec3 normalizedNormal = normalize(vNormal);
    fragColor = vec4(abs(normalizedNormal), 1.0);
}

// precision highp float;

// // Input
// in vec3 vNormal;

// // Output color
// out vec4 fragColor;

// void main(void) {
//     fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Outline color (black)
// }