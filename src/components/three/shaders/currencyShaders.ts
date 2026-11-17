export const currencyNoteVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uCurl;
  uniform float uHover;
  uniform vec2 uPointer;

  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Architectural banknote unfold wave along X + subtle edge lift
    float distFromCenter = uv.x - 0.5;
    float arch = cos(distFromCenter * 3.14159) * uCurl;
    float ripple = sin(uv.x * 5.0 + uTime * 0.9) * 0.035 * (0.4 + uHover * 0.8);
    float pointerPush = exp(-distance(uv, uPointer * 0.5 + 0.5) * 4.0) * 0.14 * uHover;

    pos.z += arch + ripple + pointerPush;
    pos.y += sin(uv.x * 2.2 + uTime * 0.6) * 0.03;

    vWave = arch + ripple;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const currencyNoteFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uFocus;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;

  varying vec2 vUv;
  varying float vWave;

  void main() {
    vec4 tex = texture2D(uMap, vUv);

    // Subtle holographic security thread running vertically through x = 0.64
    float threadDist = abs(vUv.x - 0.64);
    float threadMask = smoothstep(0.018, 0.002, threadDist);
    float shimmer = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 2.4 + vWave * 8.0);
    vec3 holoColor = mix(uAccentA, uAccentB, shimmer);

    // Crisp bright editorial vignette & subtle specular catch on paper fold
    float foldHighlight = clamp(vWave * 0.35, 0.0, 0.16);
    vec3 color = tex.rgb + vec3(foldHighlight);
    color = mix(color, holoColor, threadMask * (0.45 + uFocus * 0.35));

    // Hairline precision border
    float edgeX = min(vUv.x, 1.0 - vUv.x);
    float edgeY = min(vUv.y, 1.0 - vUv.y);
    float border = 1.0 - smoothstep(0.002, 0.006, min(edgeX, edgeY));
    color = mix(color, uAccentA, border * 0.55);

    gl_FragColor = vec4(color, 1.0);
  }
`;
