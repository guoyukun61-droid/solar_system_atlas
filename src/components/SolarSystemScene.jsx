import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { bodies, bodyById } from "../data/bodies.js";

const orbitTilt = -0.08;
const sunPosition = new THREE.Vector3(0, 0, 0);
const tempPosition = new THREE.Vector3();

function seededRandom(seed) {
  let value = seed;

  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function smoothstep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function getOrbitPoint(body, angle, target = new THREE.Vector3()) {
  if (!body.orbitRadius) {
    return target.set(0, 0, 0);
  }

  const eccentricity = body.visualEccentricity ?? body.eccentricity ?? 0;
  const semiMajor = body.orbitRadius;
  const semiMinor = semiMajor * Math.sqrt(Math.max(1 - eccentricity * eccentricity, 0.2));
  const focusOffset = semiMajor * eccentricity;
  const perihelion = body.perihelionAngle ?? 0;
  const localX = Math.cos(angle) * semiMajor - focusOffset;
  const localZ = Math.sin(angle) * semiMinor;
  const cosP = Math.cos(perihelion);
  const sinP = Math.sin(perihelion);
  const x = localX * cosP - localZ * sinP;
  const z = localX * sinP + localZ * cosP;
  const y = Math.sin(angle + perihelion * 0.7) * (body.visualInclination ?? 0);

  return target.set(x, y, z);
}

function getOrbitInnerRadius(body) {
  if (!body?.orbitRadius) return 0;
  const eccentricity = body.visualEccentricity ?? body.eccentricity ?? 0;
  return body.orbitRadius * (1 - eccentricity);
}

function getOrbitOuterRadius(body) {
  if (!body?.orbitRadius) return 0;
  const eccentricity = body.visualEccentricity ?? body.eccentricity ?? 0;
  return body.orbitRadius * (1 + eccentricity);
}

const cinematicVertex = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const planetFragment = `
  uniform sampler2D uMap;
  uniform vec3 uSunPosition;
  uniform vec3 uAccent;
  uniform float uSelected;
  uniform float uLightResponse;
  uniform float uBandStrength;
  uniform vec3 uDarkFill;
  uniform float uDarkFillStrength;
  uniform float uRimStrength;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 lightDir = normalize(uSunPosition - vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float ndl = dot(normal, lightDir);
    float light = smoothstep(-0.24, 0.82, ndl);
    float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.45);
    float sunRim = rim * smoothstep(-0.25, 0.65, ndl);
    vec3 rawTex = texture2D(uMap, vUv).rgb;
    float missingTexture = 1.0 - smoothstep(0.018, 0.095, dot(rawTex, vec3(0.333)));
    vec3 tex = pow(mix(rawTex, uDarkFill, missingTexture * uDarkFillStrength), vec3(1.12));
    tex = clamp((tex - 0.5) * (1.0 + uBandStrength * 0.55) + 0.5, 0.0, 1.2);
    float bandPattern = sin(vUv.y * 86.0) * 0.5 + sin(vUv.y * 173.0 + vUv.x * 2.0) * 0.28;
    float broadBands = 0.5 + 0.5 * sin(vUv.y * 38.0 + sin(vUv.y * 9.0) * 0.75);
    float narrowBands = 0.5 + 0.5 * sin(vUv.y * 128.0 + vUv.x * 2.0);
    tex *= 1.0 - (1.0 - broadBands) * 0.16 * uBandStrength;
    tex *= 1.0 + (narrowBands - 0.5) * 0.05 * uBandStrength;
    tex *= 1.0 + bandPattern * 0.055 * uBandStrength;
    vec3 color = tex * (0.052 + light * 1.18 * uLightResponse);
    color *= 1.0 - light * uBandStrength * 0.08;
    vec3 compressedHighlight = color / (1.0 + color * 0.52);
    color = mix(color, compressedHighlight * 1.12, clamp(uBandStrength, 0.0, 1.0));
    color += uAccent * sunRim * uRimStrength * (1.0 + uSelected * 0.45);
    color += tex * max(-ndl, 0.0) * 0.024;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const earthFragment = `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform vec3 uSunPosition;
  uniform vec3 uAccent;
  uniform float uSelected;
  uniform float uRimStrength;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 lightDir = normalize(uSunPosition - vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float ndl = dot(normal, lightDir);
    float light = smoothstep(-0.18, 0.72, ndl);
    float dark = 1.0 - smoothstep(-0.28, 0.2, ndl);
    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightColor = texture2D(uNightMap, vUv).rgb * vec3(1.45, 1.2, 0.82);
    vec3 halfVector = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVector), 0.0), 46.0) * smoothstep(0.18, 1.0, light);
    float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.15) * smoothstep(-0.3, 0.72, ndl);
    vec3 color = dayColor * (0.1 + light * 1.26) + nightColor * dark * 1.08;
    color += vec3(0.62, 0.86, 1.0) * spec * 0.42;
    color += uAccent * rim * uRimStrength * (1.0 + uSelected * 0.45);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const cloudFragment = `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunPosition;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 cloud = texture2D(uCloudMap, vUv).rgb;
    float coverage = smoothstep(0.18, 0.72, dot(cloud, vec3(0.333)));
    vec3 normal = normalize(vWorldNormal);
    vec3 lightDir = normalize(uSunPosition - vWorldPosition);
    float light = smoothstep(-0.18, 0.72, dot(normal, lightDir));
    vec3 color = mix(vec3(0.52, 0.64, 0.72), vec3(1.0), light);
    gl_FragColor = vec4(color, coverage * uOpacity * (0.28 + light * 0.82));
  }
`;

const atmosphereFragment = `
  uniform vec3 uColor;
  uniform vec3 uSunPosition;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 lightDir = normalize(uSunPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.25);
    float sunEdge = smoothstep(-0.15, 0.7, dot(normal, lightDir));
    float alpha = (fresnel * 0.72 + sunEdge * 0.07) * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const sunVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragment = `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uFlickerStrength;
  uniform float uSurfaceNoiseScale;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec2 flowUv = vUv + vec2(sin(uTime * 0.08 + vUv.y * 5.2) * 0.004, cos(uTime * 0.06 + vUv.x * 4.6) * 0.003);
    vec3 tex = pow(texture2D(uMap, flowUv).rgb, vec3(1.28));
    float luma = dot(tex, vec3(0.299, 0.587, 0.114));
    float filaments =
      sin((vUv.x + uTime * 0.018) * uSurfaceNoiseScale) *
      sin((vUv.y - uTime * 0.026) * (uSurfaceNoiseScale * 0.72));
    float pulse = 0.72 + 0.28 * sin(uTime * 2.7 + filaments * 1.8);
    float cells = 0.5 + 0.5 * filaments;
    float granulation = smoothstep(0.18, 0.88, luma + cells * 0.24);
    float hot = smoothstep(0.58, 0.96, luma + cells * 0.12);
    float darkVeins = 1.0 - smoothstep(0.18, 0.58, luma - cells * 0.08);
    float limb = pow(1.0 - abs(vNormal.z), 1.55);
    vec3 ember = vec3(0.38, 0.055, 0.015);
    vec3 copper = vec3(0.95, 0.27, 0.045);
    vec3 gold = vec3(1.0, 0.68, 0.16);
    vec3 whiteHot = vec3(1.0, 0.82, 0.34);
    vec3 color = mix(ember, copper, smoothstep(0.18, 0.74, luma));
    color = mix(color, gold, granulation * 0.46);
    color = mix(color, whiteHot, hot * 0.22);
    color *= 0.64 + pulse * uFlickerStrength * 0.27 + granulation * 0.36;
    color *= 1.0 - darkVeins * 0.34;
    color += vec3(1.0, 0.34, 0.06) * cells * 0.07;
    color += vec3(1.0, 0.52, 0.14) * limb * 0.08;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function configureTexture(texture, anisotropy = 8) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
}

function makeFlareTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,218,120,0.82)");
  gradient.addColorStop(0.42, "rgba(255,126,34,0.28)");
  gradient.addColorStop(1, "rgba(255,126,34,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function SpaceBackdrop() {
  const texture = useTexture("/textures/planets/hires/stars-milky-way-8k.jpg");

  useEffect(() => {
    configureTexture(texture, 12);
  }, [texture]);

  return (
    <>
      <color attach="background" args={["#010207"]} />
      <mesh position={[3.4, 4, -58]} rotation={[0, 0, -0.2]}>
        <planeGeometry args={[98, 47]} />
        <meshBasicMaterial depthWrite={false} map={texture} opacity={0.42} transparent />
      </mesh>
      <mesh position={[-18, -7, -72]} rotation={[0.08, 0.32, 0.12]}>
        <planeGeometry args={[118, 54]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#6eb8ff"
          depthWrite={false}
          map={texture}
          opacity={0.11}
          transparent
        />
      </mesh>
      <Stars count={9200} depth={96} factor={3.6} fade radius={100} saturation={0.7} speed={0.14} />
      <Stars count={5200} depth={150} factor={5.8} fade radius={154} saturation={0.9} speed={0.04} />
    </>
  );
}

function getBodyPosition(body, elapsed) {
  if (body.id === "sun") {
    return tempPosition.set(0, 0, 0);
  }

  const angle = body.initialAngle + elapsed * body.orbitSpeed;
  return getOrbitPoint(body, angle, tempPosition);
}

function CameraRig({ focusLevel, selectedBodyId, bodyPositions }) {
  const { camera, size } = useThree();
  const lookAtRef = useRef(new THREE.Vector3(1.8, 0.1, -0.2));
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(), []);
  const radialDir = useMemo(() => new THREE.Vector3(), []);
  const sunSideDir = useMemo(() => new THREE.Vector3(), []);
  const tangentDir = useMemo(() => new THREE.Vector3(), []);
  const upDir = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((state, delta) => {
    const selectedBody = selectedBodyId ? bodyById.get(selectedBodyId) : null;
    const selectedPosition = selectedBodyId ? bodyPositions.current.get(selectedBodyId) : null;
    const isMobile = size.width < 720;
    const isFullFocus = focusLevel >= 2;
    const nearTarget = selectedBody && isFullFocus
      ? THREE.MathUtils.clamp(selectedBody.displayRadius * 0.22, 0.08, 0.38)
      : selectedBody
        ? 0.18
        : 0.42;
    const farTarget = selectedBody && isFullFocus ? 150 : 260;

    if (selectedBody && selectedPosition) {
      const radius = selectedBody.displayRadius;
      const isSun = selectedBody.id === "sun";
      radialDir.copy(selectedPosition).sub(sunPosition);

      if (radialDir.lengthSq() < 0.0001) {
        radialDir.set(0, 0, 1);
      } else {
        radialDir.normalize();
      }

      sunSideDir.copy(radialDir).multiplyScalar(-1);
      tangentDir.set(-radialDir.z, 0, radialDir.x);

      if (tangentDir.lengthSq() < 0.0001) {
        tangentDir.set(1, 0, 0);
      } else {
        tangentDir.normalize();
      }

      if (isFullFocus) {
        const lookX = isMobile ? 0 : radius * 0.16;
        const lookY = isMobile ? -radius * 0.34 : 0;
        const cameraDistance = isSun
          ? radius * 2.72 + 2.1
          : selectedBody.ringTexture
            ? Math.max(radius * 4.95, 3.2)
            : Math.max(radius * (isMobile ? 4.55 : 3.65), isMobile ? 2.25 : 1.46);
        const height = isMobile ? radius * 0.18 : radius * 0.08;
        const cameraX = isMobile ? radius * 0.04 : radius * 0.16;

        if (isSun) {
          targetLookAt.copy(selectedPosition).add(new THREE.Vector3(lookX, lookY, 0));
          targetPosition.copy(selectedPosition).add(new THREE.Vector3(cameraX, height, cameraDistance));
        } else {
          targetLookAt
            .copy(selectedPosition)
            .addScaledVector(tangentDir, lookX)
            .addScaledVector(upDir, lookY);
          targetPosition
            .copy(selectedPosition)
            .addScaledVector(sunSideDir, cameraDistance)
            .addScaledVector(tangentDir, cameraX)
            .addScaledVector(upDir, height);
        }
        camera.fov = THREE.MathUtils.lerp(camera.fov, isMobile ? 38 : 31, 1 - Math.exp(-delta * 2.55));
      } else {
        const panelBias = isMobile ? 0 : isSun ? 1.15 : 1.85 + radius * 0.7;
        const mobileLookOffset = isSun ? -1.15 : -1.75 - radius * 0.25;
        const lookOffsetY = isMobile ? mobileLookOffset : 0.04;
        const cameraDistance = isSun ? (isMobile ? 16.4 : 15.6) : 7.8 + radius * (isMobile ? 5.2 : 5.0);
        const height = isSun ? (isMobile ? 5.5 : 4.8) : (isMobile ? 2.7 + radius * 1.15 : 2.25 + radius * 1.05);

        targetLookAt.copy(selectedPosition).add(new THREE.Vector3(panelBias, lookOffsetY, 0));
        targetPosition.copy(selectedPosition).add(new THREE.Vector3(2.75 + radius * 0.86, height, cameraDistance));
        camera.fov = THREE.MathUtils.lerp(camera.fov, isMobile ? 50 : 42, 1 - Math.exp(-delta * 2.25));
      }
    } else {
      targetLookAt.set(0.35, 0, -0.35);
      targetPosition.set(isMobile ? 0 : 1.2, isMobile ? 25.5 : 31.5, isMobile ? 47.5 : 58.5);
      camera.fov = THREE.MathUtils.lerp(camera.fov, isMobile ? 59 : 52, 1 - Math.exp(-delta * 2.2));
    }

    const damp = 1 - Math.exp(-delta * 1.85);
    camera.position.lerp(targetPosition, damp);
    lookAtRef.current.lerp(targetLookAt, damp);
    camera.near = THREE.MathUtils.lerp(camera.near, nearTarget, 1 - Math.exp(-delta * 4.2));
    camera.far = THREE.MathUtils.lerp(camera.far, farTarget, 1 - Math.exp(-delta * 3.6));
    camera.lookAt(lookAtRef.current);
    camera.updateProjectionMatrix();
  });

  return null;
}

function OrbitPath({ body }) {
  const points = useMemo(() => {
    const segments = 288;
    const result = [];

    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      result.push(getOrbitPoint(body, angle, new THREE.Vector3()));
    }

    return result;
  }, [body]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#9fdfff" opacity={body.id === "earth" ? 0.18 : 0.082} transparent />
    </line>
  );
}

function FocusTrail({ focusLevel, selectedBodyId, bodyPositions }) {
  const lineRef = useRef();
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);

  useFrame(() => {
    if (!selectedBodyId || focusLevel >= 2 || !lineRef.current) {
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }

    const body = bodyPositions.current.get(selectedBodyId);
    if (!body) return;

    const points = [
      body.clone().add(new THREE.Vector3(-8.6, -0.85, 5.8)),
      body.clone().add(new THREE.Vector3(-4.8, -0.22, 3.2)),
      body.clone().add(new THREE.Vector3(-2.1, 0.16, 1.3)),
      body.clone().add(new THREE.Vector3(-0.35, 0.02, 0.18)),
    ];

    geometry.setFromPoints(new THREE.CatmullRomCurve3(points).getPoints(64));
    lineRef.current.visible = true;
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#5ce8ff" opacity={0.52} transparent />
    </line>
  );
}

function AsteroidBelt() {
  const beltRef = useRef();
  const geometry = useMemo(() => {
    const random = seededRandom(1759);
    const count = 3200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const mars = bodyById.get("mars");
    const jupiter = bodyById.get("jupiter");
    const marsClearance = getOrbitOuterRadius(mars) + (mars?.displayRadius ?? 0.42) + 0.72;
    const jupiterClearance = getOrbitInnerRadius(jupiter) - (jupiter?.displayRadius ?? 1.05) - 0.82;
    const inner = marsClearance;
    const outer = Math.max(jupiterClearance, inner + 0.92);
    const warm = new THREE.Color("#d8c5a1");
    const cold = new THREE.Color("#8fb1c3");

    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(inner, outer, Math.pow(random(), 1.08));
      const strand = Math.sin(angle * 5.0 + random() * 1.4) * 0.09;
      const scatter = (random() - 0.5) * 0.18;
      const bandRadius = radius + strand + scatter;
      const flatten = 0.93 + random() * 0.045;
      const x = Math.cos(angle) * bandRadius;
      const z = Math.sin(angle) * bandRadius * flatten;
      const y = (random() - 0.5) * 0.22 + Math.sin(angle * 2.0) * 0.035;
      const color = warm.clone().lerp(cold, random() * 0.65);

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    bufferGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return bufferGeometry;
  }, []);

  useFrame((_, delta) => {
    if (!beltRef.current) return;
    beltRef.current.rotation.y += delta * 0.004;
  });

  return (
    <points ref={beltRef} geometry={geometry}>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.72}
        size={0.032}
        sizeAttenuation
        transparent
        vertexColors
      />
    </points>
  );
}

function KuiperBelt() {
  const beltRef = useRef();
  const geometry = useMemo(() => {
    const random = seededRandom(4967);
    const count = 4200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const neptune = bodyById.get("neptune");
    const pluto = bodyById.get("pluto");
    const inner = getOrbitOuterRadius(neptune) + (neptune?.displayRadius ?? 0.7) + 1.15;
    const outer = Math.max(inner + 5.4, getOrbitOuterRadius(pluto) + 5.8);
    const blueIce = new THREE.Color("#bceaff");
    const grayIce = new THREE.Color("#8295ac");

    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(inner, outer, Math.pow(random(), 0.86));
      const eccentricity = 0.035 + random() * 0.07;
      const semiMinor = radius * (0.95 - eccentricity * 0.4);
      const tilt = Math.sin(angle * 1.35 + random() * 0.8) * 0.36;
      const x = Math.cos(angle) * radius - radius * eccentricity * 0.28;
      const z = Math.sin(angle) * semiMinor;
      const y = (random() - 0.5) * 0.76 + tilt;
      const color = blueIce.clone().lerp(grayIce, random() * 0.78);

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    bufferGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return bufferGeometry;
  }, []);

  useFrame((_, delta) => {
    if (!beltRef.current) return;
    beltRef.current.rotation.y += delta * 0.0018;
  });

  return (
    <points ref={beltRef} geometry={geometry}>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.46}
        size={0.055}
        sizeAttenuation
        transparent
        vertexColors
      />
    </points>
  );
}

function OortCloud() {
  const cloudRef = useRef();
  const geometry = useMemo(() => {
    const random = seededRandom(7901);
    const count = 5200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const inner = 39;
    const outer = 61;
    const ice = new THREE.Color("#dceeff");
    const dust = new THREE.Color("#9fb7c9");

    for (let index = 0; index < count; index += 1) {
      const radius = THREE.MathUtils.lerp(inner, outer, Math.pow(random(), 0.62));
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const flatten = 0.66 + random() * 0.22;
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = Math.cos(phi) * radius * flatten;
      const z = Math.sin(phi) * Math.sin(theta) * radius;
      const color = ice.clone().lerp(dust, random() * 0.75);

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    bufferGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return bufferGeometry;
  }, []);

  useFrame((_, delta) => {
    if (!cloudRef.current) return;
    cloudRef.current.rotation.y += delta * 0.0016;
    cloudRef.current.rotation.z = Math.sin(Date.now() * 0.00005) * 0.015;
  });

  return (
    <group>
      <points ref={cloudRef} geometry={geometry}>
        <pointsMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0.38}
          size={0.074}
          sizeAttenuation
          transparent
          vertexColors
        />
      </points>
    </group>
  );
}

function CelestialCoordinateGrid() {
  const grid = useMemo(() => {
    const radius = 58;
    const segments = 192;
    const meridians = [];
    const declinations = [];

    for (let degree = -60; degree <= 60; degree += 30) {
      const dec = THREE.MathUtils.degToRad(degree);
      const ringRadius = Math.cos(dec) * radius;
      const y = Math.sin(dec) * radius;
      const points = [];

      for (let index = 0; index <= segments; index += 1) {
        const angle = (index / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * ringRadius, y, Math.sin(angle) * ringRadius));
      }

      declinations.push(new THREE.BufferGeometry().setFromPoints(points));
    }

    for (let degree = 0; degree < 180; degree += 15) {
      const ra = THREE.MathUtils.degToRad(degree);
      const points = [];

      for (let index = 0; index <= segments; index += 1) {
        const dec = THREE.MathUtils.degToRad(-90 + (index / segments) * 180);
        points.push(new THREE.Vector3(
          Math.cos(dec) * Math.cos(ra) * radius,
          Math.sin(dec) * radius,
          Math.cos(dec) * Math.sin(ra) * radius,
        ));
      }

      meridians.push(new THREE.BufferGeometry().setFromPoints(points));
    }

    const ecliptic = [];
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      ecliptic.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    const polarAxis = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -radius, 0),
      new THREE.Vector3(0, radius, 0),
    ]);

    return {
      declinations,
      ecliptic: new THREE.BufferGeometry().setFromPoints(ecliptic),
      meridians,
      polarAxis,
    };
  }, []);

  return (
    <group>
      <group rotation={[0, 0, THREE.MathUtils.degToRad(23.44)]}>
        {grid.declinations.map((geometry, index) => (
          <line geometry={geometry} key={`dec-${index}`}>
            <lineBasicMaterial color="#72d8ff" depthWrite={false} opacity={index === 2 ? 0.22 : 0.1} transparent />
          </line>
        ))}
        {grid.meridians.map((geometry, index) => (
          <line geometry={geometry} key={`ra-${index}`}>
            <lineBasicMaterial color="#72d8ff" depthWrite={false} opacity={index % 2 === 0 ? 0.13 : 0.07} transparent />
          </line>
        ))}
        <line geometry={grid.polarAxis}>
          <lineBasicMaterial color="#a7f3ff" depthWrite={false} opacity={0.24} transparent />
        </line>
      </group>
      <line geometry={grid.ecliptic}>
        <lineBasicMaterial color="#ffcf86" depthWrite={false} opacity={0.3} transparent />
      </line>
    </group>
  );
}

function SunBody({ body, focusLevel, isSelected, onSelectBody, onPosition }) {
  const groupRef = useRef();
  const lightRef = useRef();
  const texture = useTexture(body.texture);
  const flareTexture = useMemo(() => makeFlareTexture(), []);
  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uTime: { value: 0 },
      uFlickerStrength: { value: body.flickerStrength ?? 0.28 },
      uSurfaceNoiseScale: { value: body.surfaceNoiseScale ?? 40 },
    }),
    [body.flickerStrength, body.surfaceNoiseScale, texture],
  );

  useEffect(() => {
    configureTexture(texture, 12);
  }, [texture]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    groupRef.current.position.set(0, 0, 0);
    groupRef.current.rotation.y += body.rotationSpeed * delta;
    const scaleTarget = isSelected ? (focusLevel >= 2 ? 1.02 : 1.04) : 1;
    const scale = THREE.MathUtils.lerp(groupRef.current.scale.x, scaleTarget, 1 - Math.exp(-delta * 3.4));
    groupRef.current.scale.setScalar(scale);
    uniforms.uTime.value = state.clock.elapsedTime;

    if (lightRef.current) {
      const flicker = 1 + Math.sin(state.clock.elapsedTime * 3.1) * 0.09 + Math.sin(state.clock.elapsedTime * 8.3) * 0.025;
      lightRef.current.intensity = 16.2 * flicker;
    }

    onPosition(body.id, groupRef.current.position);
  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelectBody(body.id);
      }}
    >
      <pointLight ref={lightRef} color="#ffb052" decay={1.55} distance={86} intensity={16.2} />
      <mesh>
        <sphereGeometry args={[body.displayRadius, 160, 96]} />
        <shaderMaterial fragmentShader={sunFragment} uniforms={uniforms} vertexShader={sunVertex} />
      </mesh>
      <sprite position={[0.15, 0.02, 0]} scale={[5.8, 5.8, 1]}>
        <spriteMaterial
          blending={THREE.AdditiveBlending}
          color="#ff8c32"
          depthWrite={false}
          map={flareTexture}
          opacity={0.046 * (body.flareStrength ?? 1)}
          transparent
        />
      </sprite>
      <sprite position={[0.55, -0.05, 0.2]} scale={[13, 1.8, 1]}>
        <spriteMaterial
          blending={THREE.AdditiveBlending}
          color="#ffd18c"
          depthWrite={false}
          map={flareTexture}
          opacity={0.058}
          transparent
        />
      </sprite>
    </group>
  );
}

function Atmosphere({ body, radius, opacity = 0.48 }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(body.atmosphereColor ?? body.accentColor) },
      uSunPosition: { value: sunPosition },
      uOpacity: { value: opacity },
    }),
    [body.accentColor, body.atmosphereColor, opacity],
  );

  return (
    <mesh scale={1.08}>
      <sphereGeometry args={[radius, 96, 48]} />
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={atmosphereFragment}
        side={THREE.BackSide}
        transparent
        uniforms={uniforms}
        vertexShader={cinematicVertex}
      />
    </mesh>
  );
}

function EarthBody({ body, focusLevel, isSelected, onSelectBody, onPosition }) {
  const groupRef = useRef();
  const cloudsRef = useRef();
  const [dayMap, nightMap, cloudMap] = useTexture([body.dayTexture, body.nightTexture, body.cloudTexture]);
  const uniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSunPosition: { value: sunPosition },
      uAccent: { value: new THREE.Color(body.accentColor) },
      uSelected: { value: 0 },
      uRimStrength: { value: body.rimStrength ?? 0.08 },
    }),
    [body.accentColor, body.rimStrength, dayMap, nightMap],
  );
  const cloudUniforms = useMemo(
    () => ({
      uCloudMap: { value: cloudMap },
      uSunPosition: { value: sunPosition },
      uOpacity: { value: 0.56 },
    }),
    [cloudMap],
  );

  useEffect(() => {
    [dayMap, nightMap, cloudMap].forEach((texture) => configureTexture(texture, 12));
  }, [cloudMap, dayMap, nightMap]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const position = getBodyPosition(body, state.clock.elapsedTime);
    groupRef.current.position.copy(position);
    groupRef.current.rotation.y += body.rotationSpeed * delta;
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += body.rotationSpeed * delta * 1.18;
    }
    const targetScale = isSelected ? (focusLevel >= 2 ? 1.04 : 1.08) : 1;
    const scale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 1 - Math.exp(-delta * 4.2));
    groupRef.current.scale.setScalar(scale);
    uniforms.uSelected.value = THREE.MathUtils.lerp(uniforms.uSelected.value, isSelected ? 1 : 0, 1 - Math.exp(-delta * 5));
    onPosition(body.id, groupRef.current.position);
  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelectBody(body.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[body.displayRadius, 128, 96]} />
        <shaderMaterial fragmentShader={earthFragment} uniforms={uniforms} vertexShader={cinematicVertex} />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[body.displayRadius * 1.032, 128, 64]} />
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fragmentShader={cloudFragment}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          transparent
          uniforms={cloudUniforms}
          vertexShader={cinematicVertex}
        />
      </mesh>
      {body.showAtmosphere ? <Atmosphere body={body} opacity={isSelected ? 0.42 : 0.22} radius={body.displayRadius} /> : null}
    </group>
  );
}

function SaturnRings({ body, ringTexture }) {
  const ringBands = useMemo(
    () => [
      { inner: 1.2, outer: 1.34, color: "#d6c099", opacity: 0.36 },
      { inner: 1.38, outer: 1.58, color: "#f3dbad", opacity: 0.58 },
      { inner: 1.64, outer: 1.78, color: "#a99172", opacity: 0.28 },
      { inner: 1.84, outer: 2.08, color: "#f8e5b8", opacity: 0.5 },
      { inner: 2.16, outer: 2.34, color: "#c8b38d", opacity: 0.34 },
    ],
    [],
  );

  return (
    <group rotation={[Math.PI / 2.35, 0.08, 0.12]}>
      {ringBands.map((band) => (
        <mesh key={`${band.inner}-${band.outer}`}>
          <ringGeometry args={[body.displayRadius * band.inner, body.displayRadius * band.outer, 256]} />
          <meshBasicMaterial
            alphaMap={ringTexture}
            blending={THREE.AdditiveBlending}
            color={band.color}
            depthWrite={false}
            opacity={band.opacity}
            side={THREE.DoubleSide}
            transparent
          />
        </mesh>
      ))}
      <mesh>
        <ringGeometry args={[body.displayRadius * 1.59, body.displayRadius * 1.63, 256]} />
        <meshBasicMaterial color="#04070b" opacity={0.72} side={THREE.DoubleSide} transparent />
      </mesh>
      <mesh>
        <ringGeometry args={[body.displayRadius * 2.09, body.displayRadius * 2.15, 256]} />
        <meshBasicMaterial color="#06090d" opacity={0.5} side={THREE.DoubleSide} transparent />
      </mesh>
    </group>
  );
}

function PlanetBody({ body, focusLevel, selectedBodyId, onSelectBody, onPosition }) {
  const groupRef = useRef();
  const texture = useTexture(body.texture);
  const ringTexture = body.ringTexture ? useTexture(body.ringTexture) : null;
  const isSelected = selectedBodyId === body.id;
  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uSunPosition: { value: sunPosition },
      uAccent: { value: new THREE.Color(body.accentColor) },
      uSelected: { value: 0 },
      uLightResponse: { value: body.lightResponse ?? 0.86 },
      uBandStrength: { value: body.bandStrength ?? 0 },
      uDarkFill: { value: new THREE.Color(body.darkFillColor ?? "#4b403a") },
      uDarkFillStrength: { value: body.darkFillColor ? 1 : 0 },
      uRimStrength: { value: body.rimStrength ?? 0.08 },
    }),
    [body.accentColor, body.bandStrength, body.darkFillColor, body.lightResponse, body.rimStrength, texture],
  );

  useEffect(() => {
    configureTexture(texture, 12);

    if (ringTexture) {
      configureTexture(ringTexture, 12);
    }
  }, [ringTexture, texture]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const position = getBodyPosition(body, state.clock.elapsedTime);
    groupRef.current.position.copy(position);
    groupRef.current.rotation.y += body.rotationSpeed * delta;
    const targetScale = isSelected ? (focusLevel >= 2 ? 1.04 : 1.08) : 1;
    const scale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 1 - Math.exp(-delta * 4.2));
    groupRef.current.scale.setScalar(scale);
    uniforms.uSelected.value = THREE.MathUtils.lerp(uniforms.uSelected.value, isSelected ? 1 : 0, 1 - Math.exp(-delta * 5));
    onPosition(body.id, groupRef.current.position);
  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelectBody(body.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[body.displayRadius, 128, 80]} />
        <shaderMaterial fragmentShader={planetFragment} uniforms={uniforms} vertexShader={cinematicVertex} />
      </mesh>

      {body.ringTexture && ringTexture ? <SaturnRings body={body} ringTexture={ringTexture} /> : null}

      {body.showAtmosphere ? <Atmosphere body={body} opacity={isSelected ? 0.32 : 0.16} radius={body.displayRadius} /> : null}
    </group>
  );
}

function BodyObject({ body, focusLevel, selectedBodyId, onSelectBody, onPosition }) {
  const isSelected = selectedBodyId === body.id;

  if (body.id === "sun") {
    return <SunBody body={body} focusLevel={focusLevel} isSelected={isSelected} onPosition={onPosition} onSelectBody={onSelectBody} />;
  }

  if (body.id === "earth") {
    return <EarthBody body={body} focusLevel={focusLevel} isSelected={isSelected} onPosition={onPosition} onSelectBody={onSelectBody} />;
  }

  return <PlanetBody body={body} focusLevel={focusLevel} onPosition={onPosition} onSelectBody={onSelectBody} selectedBodyId={selectedBodyId} />;
}

function SolarSystem({ focusLevel, selectedBodyId, onSelectBody, showCelestialGrid }) {
  const bodyPositions = useRef(new Map());
  const handlePosition = (id, position) => {
    bodyPositions.current.set(id, position.clone());
  };
  const showOrbitalContext = focusLevel < 2;

  return (
    <>
      <SpaceBackdrop />
      <hemisphereLight color="#20385a" groundColor="#02040a" intensity={0.08} />
      <directionalLight color="#ffcf91" intensity={0.42} position={[0, 0, 0]} />
      <CameraRig focusLevel={focusLevel} selectedBodyId={selectedBodyId} bodyPositions={bodyPositions} />
      {showCelestialGrid ? <CelestialCoordinateGrid /> : null}

      {showOrbitalContext
        ? bodies
            .filter((body) => body.orbitRadius > 0)
            .map((body) => (
              <OrbitPath body={body} key={body.id} />
            ))
        : null}

      {showOrbitalContext ? (
        <>
          <AsteroidBelt />
          <KuiperBelt />
          <OortCloud />
        </>
      ) : null}

      <FocusTrail focusLevel={focusLevel} selectedBodyId={selectedBodyId} bodyPositions={bodyPositions} />

      {bodies.map((body) => (
        <BodyObject
          body={body}
          focusLevel={focusLevel}
          key={body.id}
          onPosition={handlePosition}
          onSelectBody={onSelectBody}
          selectedBodyId={selectedBodyId}
        />
      ))}

    </>
  );
}

export function SolarSystemScene({ focusLevel, selectedBodyId, onSelectBody, showCelestialGrid }) {
  return (
    <div className="scene-shell">
      <Canvas
        camera={{ fov: 41, near: 0.02, far: 260, position: [9.5, 3.2, 10.8] }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
        shadows
      >
        <Suspense fallback={null}>
          <SolarSystem
            focusLevel={focusLevel}
            onSelectBody={onSelectBody}
            selectedBodyId={selectedBodyId}
            showCelestialGrid={showCelestialGrid}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
