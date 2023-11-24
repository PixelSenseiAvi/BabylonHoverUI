#version 300 es
precision highp float; // Define precision for float types

// Include packing functions or their equivalent here
// WebGL 2.0 does not support #include preprocessor directives
// so you need to manually include or rewrite them

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D sceneColorBuffer;
uniform sampler2D depthBuffer;
uniform sampler2D surfaceBuffer;
uniform float cameraNear;
uniform float cameraFar;
uniform float outlineWidth;
uniform vec4 screenSize;
uniform vec3 outlineColor;
uniform vec2 multiplierParameters;
uniform mat4 viewMatrix;


float perspectiveDepthToViewZ(float depth, float near, float far) {
    return (near * far) / (far + depth * (near - far));
}

float viewZToOrthographicDepth(float viewZ, float near, float far) {
    // Remap from [near, far] to [-1, 1] (NDC space)
    return (2.0 * viewZ - near - far) / (far - near);
}

float readDepth (sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture(depthSampler, coord).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

float getLinearDepth(vec3 pos) {
	return -(viewMatrix * vec4(pos, 1.0)).z;
}

float getLinearScreenDepth(sampler2D map) {
		vec2 uv = gl_FragCoord.xy * screenSize.zw;
		return readDepth(map,uv);
}

// Helper functions for reading normals and depth of neighboring pixels.
float getPixelDepth(int x, int y) {
	// screenSize.zw is pixel size 
	// vUv is current position
	return readDepth(depthBuffer, vUV + screenSize.zw * vec2(x, y));
}

// "surface value" is either the normal or the "surfaceID"
vec3 getSurfaceValue(int x, int y) {
	vec3 val = texture(surfaceBuffer, vUV + screenSize.zw * vec2(x, y)).rgb;
	return val;
}

float saturateValue(float num) {
	return clamp(num, 0.0, 1.0);
}

float getSufaceIdDiff(vec3 surfaceValue) {
	float surfaceIdDiff = 0.0;
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 0));
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, -1));

	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 1));
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, -1));
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, 1));
	surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, -1));
	return surfaceIdDiff;
}

void main() {
	vec4 sceneColor = texture(sceneColorBuffer, vUV);
	float depth = getPixelDepth(0, 0);
	vec3 surfaceValue = getSurfaceValue(0, 0);

    float outlineThreshold = 0.1 * outlineWidth; 

	// Get the difference between depth of neighboring pixels and current.
	float depthDiff = 0.0;
	depthDiff += abs(depth - getPixelDepth(1, 0));
	depthDiff += abs(depth - getPixelDepth(-1, 0));
	depthDiff += abs(depth - getPixelDepth(0, 1));
	depthDiff += abs(depth - getPixelDepth(0, -1));

	// Get the difference between surface values of neighboring pixels
	// and current
	float surfaceValueDiff = getSufaceIdDiff(surfaceValue);
				
	// Apply multiplier & bias to each 
	float depthBias = multiplierParameters.x;
	float depthMultiplier = multiplierParameters.y;

	depthDiff = depthDiff * depthMultiplier;
	depthDiff = saturateValue(depthDiff);
	depthDiff = pow(depthDiff, depthBias);

	if (surfaceValueDiff != 0.0) surfaceValueDiff = 1.0;

	float outline = saturateValue(surfaceValueDiff + depthDiff);
    outline = outline > outlineThreshold ? 1.0 : 0.0;
			
    //TODO: experiment here
	// Combine outline with scene color.
	vec4 finalOutlineColor = vec4(outlineColor, 1.0);
	fragColor = vec4(mix(sceneColor, finalOutlineColor, outline));
}