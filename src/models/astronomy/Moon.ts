import { Mesh, ShaderMaterial, SphereGeometry } from "three";

export class Moon extends Mesh {
  public geometry: SphereGeometry;
  public material: ShaderMaterial;

  constructor() {
    super();

    // Create moon geometry
    this.geometry = new SphereGeometry(5, 32, 32);

    // Custom ShaderMaterial
    this.material = new ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        // Simple 3D noise function
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 p) {
          vec3 ip = floor(p);
          vec3 fp = fract(p);
          fp = fp * fp * (3.0 - 2.0 * fp); // Smoothstep
          return mix(
            mix(mix(hash(ip), hash(ip + vec3(1.0, 0.0, 0.0)), fp.x),
                mix(hash(ip + vec3(0.0, 1.0, 0.0)), hash(ip + vec3(1.0, 1.0, 0.0)), fp.x), fp.y),
            mix(mix(hash(ip + vec3(0.0, 0.0, 1.0)), hash(ip + vec3(1.0, 0.0, 1.0)), fp.x),
                mix(hash(ip + vec3(0.0, 1.0, 1.0)), hash(ip + vec3(1.0, 1.0, 1.0)), fp.x), fp.y),
            fp.z);
        }

        void main() {
          vec3 color = vec3(0.8, 0.8, 0.7); // Base moon color
          float n = noise(vPosition * 0.5); // Apply noise with frequency
          color *= 0.8 + 0.2 * n; // Modulate color by noise
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }
}
