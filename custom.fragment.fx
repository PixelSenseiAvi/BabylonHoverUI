#version 330 es
precision highp float;

in vec2 vUV;

// Uniforms
uniform sampler2D textureSampler;
uniform float isHit;


out vec4 fragColor;

void main(void) {

    // Sample the texture
    vec4 texColor = texture(textureSampler, vUV);
    // Modify texColor here if needed for the outline effect
    fragColor = texColor * isHit;
}