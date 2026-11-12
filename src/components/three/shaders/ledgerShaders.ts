export const terrainVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uStress;
  uniform sampler2D uHeightMap;

  varying float vElevation;
  varying vec2 vUv;
  varying float vDist;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float texHeight = texture2D(uHeightMap, uv * 1.4 + vec2(uProgress * 0.12, 0.0)).r;
    float waveA = sin(pos.x * 0.38 + uTime * 0.25 + uProgress * 4.0) *
                  cos(pos.z * 0.34 - uTime * 0.18);
    float waveB = sin((pos.x + pos.z) * 0.22 - uTime * 0.14) * 0.5;
    float centerBowl = smoothstep(0.0, 9.0, length(pos.xz));

    float elevation = (texHeight * 1.35 + waveA * 0.65 + waveB * 0.45) * centerBowl;
    elevation *= (1.0 + uStress * 0.22 + min(abs(uVelocity) * 0.04, 0.35));

    pos.y += elevation;
    vElevation = elevation;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const terrainFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uReconciledPulse;

  varying float vElevation;
  varying vec2 vUv;
  varying float vDist;

  void main() {
    // Topographic elevation contour lines
    float contourFreq = 9.0;
    float contourPhase = abs(fract(vElevation * contourFreq - 0.5) - 0.5) /
                         max(fwidth(vElevation * contourFreq), 0.0001);
    float contourLine = 1.0 - smoothstep(0.0, 1.35, contourPhase);

    // Architectural coordinate grid
    vec2 gridUv = vUv * 48.0;
    vec2 gridDeriv = max(fwidth(gridUv), vec2(0.0001));
    vec2 gridDist = abs(fract(gridUv - 0.5) - 0.5) / gridDeriv;
    float gridLine = 1.0 - min(min(gridDist.x, gridDist.y), 1.0);

    vec3 abyss = vec3(0.0118, 0.0314, 0.0863);        // #030816
    vec3 cobalt = vec3(0.1176, 0.4196, 1.0);          // #1E6BFF
    vec3 glacial = vec3(0.749, 0.8588, 0.996);        // #BFDBFE
    vec3 emerald = vec3(0.0627, 0.7255, 0.5059);      // #10B981

    vec3 lineCol = mix(cobalt * 0.55, glacial, clamp(vElevation * 0.55, 0.0, 1.0));
    lineCol = mix(lineCol, emerald, uReconciledPulse * 0.45);

    float ridgeGlow = smoothstep(0.4, 1.6, vElevation) * 0.22;
    vec3 color = abyss + lineCol * (contourLine * 0.62 + gridLine * 0.16 + ridgeGlow);

    // Distance fog fading cleanly into #030816
    float fogFactor = smoothstep(10.0, 32.0, vDist);
    color = mix(color, abyss, fogFactor);

    float edgeFade = smoothstep(0.5, 0.08, length(vUv - 0.5));
    gl_FragColor = vec4(color, edgeFade * 0.92);
  }
`;

export const conduitVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const conduitFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uHighlighted;
  uniform float uReconciledPulse;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    float flow = fract(vUv.x * 2.5 - uTime * (0.45 * uSpeed));
    float pulse = smoothstep(0.0, 0.18, flow) * (1.0 - smoothstep(0.18, 0.55, flow));

    vec3 cobalt = vec3(0.1176, 0.4196, 1.0);
    vec3 ice = vec3(0.9569, 0.9686, 0.9843);
    vec3 emerald = vec3(0.0627, 0.7255, 0.5059);

    vec3 baseCol = mix(cobalt, ice, pulse * 0.75 + uHighlighted * 0.35);
    baseCol = mix(baseCol, emerald, uReconciledPulse * 0.65);

    float alpha = (0.22 + pulse * 0.72 + uHighlighted * 0.25) * uOpacity;
    gl_FragColor = vec4(baseCol * (1.0 + pulse * 0.8), clamp(alpha, 0.0, 1.0));
  }
`;
