//#version 300 es
precision highp float;

uniform mat4 projectionMatrix;  
uniform mat4 modelViewMatrix;

//in vec4 position;              
in vec2 uv;        
in vec4 color;     

out vec2 v_uv;
out vec4 vColor;

void main(void) {
   v_uv = uv;
   vColor = color;

   gl_Position = projectionMatrix * modelViewMatrix * position;
}
