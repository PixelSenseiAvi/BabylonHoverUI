#version 300 es
layout(triangles) in;
layout(triangle_strip, max_vertices = 3) out;

in vec2 TexCoords[];
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform float outlineWidth;

void main() {
    // Emit each vertex in the input triangle
    for(int i = 0; i < 3; ++i) {
        // Emit original vertex
        gl_Position = projection * view * model * gl_in[i].gl_Position;
        EmitVertex();
    }
    EndPrimitive();

    // Emit the enlarged triangle
    for(int i = 0; i < 3; ++i) {
        // Calculate the direction vector for the vertex
        vec3 norm = normalize(cross(gl_in[(i + 1) % 3].gl_Position.xyz - gl_in[i].gl_Position.xyz, 
                                    gl_in[(i + 2) % 3].gl_Position.xyz - gl_in[i].gl_Position.xyz));
        vec4 newPos = gl_in[i].gl_Position + vec4(norm * outlineWidth, 0.0);
        gl_Position = projection * view * model * newPos;
        EmitVertex();
    }
    EndPrimitive();
}
