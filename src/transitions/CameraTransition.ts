import * as THREE from 'three';

export type EasingFunction = (t: number) => number;

export interface CameraTransitionOptions {
  duration?: number;
  easing?: EasingFunction | keyof typeof CameraTransition.Easings;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

/**
 * CameraTransition provides smooth animated transitions between perspective and orthographic cameras.
 *
 * The transition works by rendering both camera views to separate render targets and blending between them.
 * This provides a true, accurate transition between the two camera types.
 *
 * @example
 * ```typescript
 * const transition = new CameraTransition(
 *   perspectiveCamera,
 *   orthographicCamera,
 *   renderer
 * );
 *
 * transition.transitionTo(orthographicCamera, {
 *   duration: 1000,
 *   easing: 'easeInOutCubic'
 * });
 * ```
 */
export class CameraTransition {
  private perspectiveCamera: THREE.PerspectiveCamera;
  private orthographicCamera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;

  private scene: THREE.Scene | null = null;
  private currentCamera: THREE.Camera;
  private targetCamera: THREE.Camera | null = null;

  private transitionProgress = 0;
  private transitionDuration = 1000;
  private transitionStartTime = 0;
  private isTransitioning = false;
  private easingFunction: EasingFunction;

  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private blendScene: THREE.Scene;
  private blendCamera: THREE.OrthographicCamera;
  private blendMaterial: THREE.ShaderMaterial;

  private onUpdateCallback?: (progress: number) => void;
  private onCompleteCallback?: () => void;

  /**
   * Common easing functions for camera transitions
   */
  static Easings = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  };

  constructor(
    perspectiveCamera: THREE.PerspectiveCamera,
    orthographicCamera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.perspectiveCamera = perspectiveCamera;
    this.orthographicCamera = orthographicCamera;
    this.renderer = renderer;
    this.currentCamera = perspectiveCamera;
    this.easingFunction = CameraTransition.Easings.easeInOutCubic;

    // Create render targets for dual-camera rendering
    const size = renderer.getSize(new THREE.Vector2());
    this.renderTargetA = new THREE.WebGLRenderTarget(size.x, size.y);
    this.renderTargetB = new THREE.WebGLRenderTarget(size.x, size.y);

    // Create blend scene and shader material for crossfading
    this.blendScene = new THREE.Scene();
    this.blendCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.blendMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuseA: { value: this.renderTargetA.texture },
        tDiffuseB: { value: this.renderTargetB.texture },
        mixRatio: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuseA;
        uniform sampler2D tDiffuseB;
        uniform float mixRatio;
        varying vec2 vUv;

        void main() {
          vec4 texelA = texture2D(tDiffuseA, vUv);
          vec4 texelB = texture2D(tDiffuseB, vUv);
          // Use smoother blending that preserves brightness
          float blend = mixRatio;
          gl_FragColor = texelA * (1.0 - blend) + texelB * blend;
          // Maintain proper alpha
          gl_FragColor.a = max(texelA.a, texelB.a);
        }
      `,
    });

    const blendPlane = new THREE.PlaneGeometry(2, 2);
    const blendMesh = new THREE.Mesh(blendPlane, this.blendMaterial);
    this.blendScene.add(blendMesh);
  }

  /**
   * Start a transition to the target camera
   */
  transitionTo(
    targetCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    options: CameraTransitionOptions = {}
  ): void {
    if (this.currentCamera === targetCamera) {
      return; // Already at target camera
    }

    this.targetCamera = targetCamera;
    this.transitionDuration = options.duration ?? 1000;
    this.transitionStartTime = performance.now();
    this.transitionProgress = 0;
    this.isTransitioning = true;
    this.onUpdateCallback = options.onUpdate;
    this.onCompleteCallback = options.onComplete;

    // Set easing function
    if (options.easing) {
      if (typeof options.easing === 'string') {
        this.easingFunction = CameraTransition.Easings[options.easing];
      } else {
        this.easingFunction = options.easing;
      }
    }
  }

  /**
   * Update the transition. Call this in your render loop.
   */
  update(scene: THREE.Scene): THREE.Camera {
    this.scene = scene;

    if (!this.isTransitioning) {
      return this.currentCamera;
    }

    const now = performance.now();
    const elapsed = now - this.transitionStartTime;
    const linearProgress = Math.min(elapsed / this.transitionDuration, 1);
    this.transitionProgress = this.easingFunction(linearProgress);

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.transitionProgress);
    }

    if (linearProgress >= 1) {
      // Transition complete
      this.isTransitioning = false;
      this.currentCamera = this.targetCamera!;
      this.targetCamera = null;

      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }

      return this.currentCamera;
    }

    // Return the current camera during transition (render method handles blending)
    return this.currentCamera;
  }

  /**
   * Render the scene with camera transition blending
   */
  render(scene: THREE.Scene): void {
    if (!this.isTransitioning || !this.targetCamera) {
      // No transition, render normally
      this.renderer.render(scene, this.currentCamera);
      return;
    }

    // Render both cameras to separate render targets
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(scene, this.currentCamera);

    this.renderer.setRenderTarget(this.renderTargetB);
    this.renderer.render(scene, this.targetCamera);

    // Blend the two renders
    this.blendMaterial.uniforms.mixRatio.value = this.transitionProgress;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.blendScene, this.blendCamera);
  }

  /**
   * Get the current active camera
   */
  getCurrentCamera(): THREE.Camera {
    return this.currentCamera;
  }

  /**
   * Check if a transition is currently in progress
   */
  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Get the current transition progress (0-1)
   */
  getProgress(): number {
    return this.transitionProgress;
  }

  /**
   * Resize the render targets when the renderer size changes
   */
  setSize(width: number, height: number): void {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    this.blendMaterial.dispose();
  }
}
