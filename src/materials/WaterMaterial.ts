import { ShaderMaterial, Vector2, NormalBlending } from "three";

export class WaterMaterial extends ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      depthWrite: false,
      blending: NormalBlending, // Return to NormalBlending for natural transparency
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
        scale: { value: 8.0 },
        waveFrequency: { value: 0.2 },
        waveAmplitude: { value: 0.5 },
        opacity: { value: 0.8 }
      },
      vertexShader: `
        uniform float time;
        uniform float waveFrequency;
        uniform float waveAmplitude;
        uniform float scale;
        varying vec2 vUv;

        vec3 waterDisplacement(vec3 position, vec3 normal) {
          vec3 displaced = position;
          displaced += normal * (sin(position.x * waveFrequency + time) * waveAmplitude);
          displaced += normal * (cos(position.z * waveFrequency + time) * waveAmplitude);
          return displaced;
        }

        void main() {
          vUv = uv * scale;
          vec3 displacedPosition = waterDisplacement(position, normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        uniform float scale;
        uniform float opacity;
        varying vec2 vUv;

        float hash1(float n) { return fract(sin(n) * 43758.5453); }
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453);
        }

        float voronoi(in vec2 x, float w, float offset) {
          vec2 n = floor(x);
          vec2 f = fract(x);

          float m = 8.0;
          for (int j = -2; j <= 2; j++) {
            for (int i = -2; i <= 2; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = hash2(n + g);

              o = offset + 0.3 * sin(time + 6.2831 * o + x);
              float d = length(g - f + o);

              float h = smoothstep(-1.0, 1.0, (m - d) / w);
              m = mix(m, d, h) - h * (1.0 - h) * w / (1.0 + 3.0 * w);
            }
          }
          return m;
        }

        void main() {
          vec2 uv = vUv;
          uv.x += time * 0.5;
          uv.y += time * 0.25;

          vec4 color1 = vec4(0.114, 0.635, 0.847, 1.0);
          vec4 color2 = vec4(1.0, 1.0, 1.0, 1.0);
          vec4 color3 = color1 * 0.8;

          float vNoise1 = voronoi(uv, 0.001, 0.5);
          float sNoise1 = voronoi(uv, 0.4, 0.5);
          float mainVoronoi = smoothstep(0.0, 0.01, vNoise1 - sNoise1);

          float vNoise2 = voronoi(uv, 0.001, 0.3);
          float sNoise2 = voronoi(uv, 0.4, 0.3);
          float secondaryVoronoi = smoothstep(0.0, 0.01, vNoise2 - sNoise2);

          float pi = 3.14159265359;
          float wave = (sin(pi * (uv.x + uv.y)) + 1.0) / 2.0;

          vec4 backgroundColor = mix(color1, color3, wave);
          vec4 secondaryColor = mix(color1, color3, secondaryVoronoi + wave);
          vec4 finalColor = mix(secondaryColor, color2, mainVoronoi);

          gl_FragColor = vec4(finalColor.rgb, opacity); // Apply uniform opacity
        }
      `
    });
  }

  update(deltaTime:number) {
    this.uniforms.time.value += deltaTime;
  }

  setScale(newScale:number) {
    this.uniforms.scale.value = newScale;
  }

  setOpacity(newOpacity:number) {
    this.uniforms.opacity.value = newOpacity;
  }
}





// import { ShaderMaterial, Vector2 } from "three";
//
// export class WaterMaterial extends ShaderMaterial {
//   constructor() {
//     super({
//       uniforms: {
//         time: { value: 0.0 },
//         resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
//         scale: { value: 8.0 },
//         waveFrequency: { value: 0.2 },
//         waveAmplitude: { value: 0.5 }
//       },
//       vertexShader: `
//         uniform float time;
//         uniform float waveFrequency;
//         uniform float waveAmplitude;
//         uniform float scale; // Uniform for scaling voronoi pattern
//
//         varying vec2 vUv;
//
//         vec3 waterDisplacement(vec3 position, vec3 normal) {
//           vec3 displaced = position;
//           displaced += normal * (sin(position.x * waveFrequency + time) * waveAmplitude);
//           displaced += normal * (cos(position.z * waveFrequency + time) * waveAmplitude);
//           return displaced;
//         }
//
//         void main() {
//           vUv = uv * scale; // Apply scale here
//           vec3 displacedPosition = waterDisplacement(position, normal);
//           gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
//         }
//       `,
//       fragmentShader: `
//         uniform float time;
//         uniform vec2 resolution;
//         uniform float scale;
//         varying vec2 vUv;
//
//         float hash1(float n) { return fract(sin(n) * 43758.5453); }
//         vec2 hash2(vec2 p) {
//           p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
//           return fract(sin(p) * 43758.5453);
//         }
//
//         float voronoi(in vec2 x, float w, float offset) {
//           vec2 n = floor(x);
//           vec2 f = fract(x);
//
//           float m = 8.0;
//           for (int j = -2; j <= 2; j++) {
//             for (int i = -2; i <= 2; i++) {
//               vec2 g = vec2(float(i), float(j));
//               vec2 o = hash2(n + g);
//
//               o = offset + 0.3 * sin(time + 6.2831 * o + x);
//               float d = length(g - f + o);
//
//               float h = smoothstep(-1.0, 1.0, (m - d) / w);
//               m = mix(m, d, h) - h * (1.0 - h) * w / (1.0 + 3.0 * w);
//             }
//           }
//           return m;
//         }
//
//         void main() {
//           vec2 uv = vUv;
//           uv.x += time * 0.5;
//           uv.y += time * 0.25;
//
//           vec4 color1 = vec4(0.114, 0.635, 0.847, 1.0);
//           vec4 color2 = vec4(1.0, 1.0, 1.0, 1.0);
//           vec4 color3 = color1 * 0.8;
//
//           float vNoise1 = voronoi(uv, 0.001, 0.5);
//           float sNoise1 = voronoi(uv, 0.4, 0.5);
//           float mainVoronoi = smoothstep(0.0, 0.01, vNoise1 - sNoise1);
//
//           float vNoise2 = voronoi(uv, 0.001, 0.3);
//           float sNoise2 = voronoi(uv, 0.4, 0.3);
//           float secondaryVoronoi = smoothstep(0.0, 0.01, vNoise2 - sNoise2);
//
//           float pi = 3.14159265359;
//           float wave = (sin(pi * (uv.x + uv.y)) + 1.0) / 2.0;
//
//           vec4 backgroundColor = mix(color1, color3, wave);
//           vec4 secondaryColor = mix(color1, color3, secondaryVoronoi + wave);
//           vec4 finalColor = mix(secondaryColor, color2, mainVoronoi);
//
//           gl_FragColor = vec4(finalColor);
//         }
//       `
//     });
//   }
//
//   update(deltaTime) {
//     this.uniforms.time.value += deltaTime;
//   }
//
//   setScale(newScale) {
//     this.uniforms.scale.value = newScale;
//   }
// }
