#version 300 es
precision highp float; // Define precision for float types

uniform float maxSurfaceId;

in vec2 v_uv;
in vec4 vColor;
out vec4 oColor;

void main(void) {
    float surfaceId = round(vColor.r) / maxSurfaceId;
    oColor = vec4(surfaceId, 0.0, 0.0, 1.0);
}
