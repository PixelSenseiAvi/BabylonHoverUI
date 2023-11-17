#version 300 es
precision highp float;

// Inputs from the vertex shader
in vec3 vPosition;
in vec3 vNormal;
in vec2 vUV;

// Uniforms
uniform vec3 cameraPosition; // Camera position for Fresnel effect
uniform bool useFresnelEffect; // Toggle for Fresnel effect
uniform float outlineWidth; //Frenel intensity

// Output color
out vec4 fragColor;


void main(void) {
    vec3 normalizedNormal = normalize(vNormal);

    if (useFresnelEffect) {
        // Calculate Fresnel effect
        float exponent = 10.0 - outlineWidth; // Adjust for desired Fresnel strength
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnelFactor = pow(clamp(1.0 - dot(normalizedNormal, viewDirection), 0.0, 1.0), exponent);
        
        // Combine Fresnel effect with base color
        vec3 baseColor = abs(normalizedNormal);
        vec3 fresnelColor = vec3(1, 0, 1); // Pinkish color for the Fresnel effect
        vec3 finalColor = mix(baseColor, fresnelColor, fresnelFactor);

        fragColor = vec4(finalColor, 1.0);
    } else {
        // Simple color based on normalized normal
        fragColor = vec4(abs(normalizedNormal), 1.0);
    }
}