#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec3 u_seeds;

float random (vec2 st) {
    return (fract(sin(dot(st.xy, vec2(u_seeds[0],u_seeds[1]))) * u_seeds[2]));
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float rand = random(st);
    // gl_FragColor = vec4(vec3(rand), 1.0);
    if (rand < 0.3 || rand > 0.7) {
        gl_FragColor=vec4(vec3(rand),0.1);
    }
    // }
    // else {
    //     gl_FragColor = vec4(0, 0, 0, 0);
    // }
}