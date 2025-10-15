import * as THREE from 'three';

export type EasingFunction = (t: number) => number;

export interface SceneTransitionOptions {
  duration?: number;
  easing?: EasingFunction | keyof typeof SceneTransition.Easings;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export interface FadeTransitionOptions extends SceneTransitionOptions {
  color?: THREE.ColorRepresentation;
}

/**
 * SceneTransition provides smooth animated transitions between Three.js scenes.
 *
 * Supports multiple transition types:
 * - Fade: Fade to a color (black, white, etc.) and back
 * - Crossfade: Directly blend from one scene to another
 * - Blur: Blur out the first scene and blur in the second
 *
 * @example
 * ```typescript
 * const sceneTransition = new SceneTransition(renderer);
 *
 * // Fade to black transition
 * sceneTransition.fade(sceneA, sceneB, camera, {
 *   duration: 1000,
 *   color: 0x000000,
 *   easing: 'easeInOutCubic'
 * });
 *
 * // Direct crossfade
 * sceneTransition.crossfade(sceneA, sceneB, camera, {
 *   duration: 1500
 * });
 * ```
 */
export class SceneTransition {
  private renderer: THREE.WebGLRenderer;

  private currentScene: THREE.Scene | null = null;
  private targetScene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  private transitionProgress = 0;
  private transitionDuration = 1000;
  private transitionStartTime = 0;
  private isTransitioning = false;
  private transitionType: 'fade' | 'crossfade' | 'blur' | null = null;
  private easingFunction: EasingFunction;

  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private blendScene: THREE.Scene;
  private blendCamera: THREE.OrthographicCamera;
  private fadeMaterial: THREE.ShaderMaterial;
  private crossfadeMaterial: THREE.ShaderMaterial;

  private fadeColor: THREE.Color = new THREE.Color(0x000000);

  private onUpdateCallback?: (progress: number) => void;
  private onCompleteCallback?: () => void;

  /**
   * Common easing functions for scene transitions
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

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.easingFunction = SceneTransition.Easings.easeInOutCubic;

    // Create render targets for dual-scene rendering
    const size = renderer.getSize(new THREE.Vector2());
    this.renderTargetA = new THREE.WebGLRenderTarget(size.x, size.y);
    this.renderTargetB = new THREE.WebGLRenderTarget(size.x, size.y);

    // Create blend scene
    this.blendScene = new THREE.Scene();
    this.blendCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Fade material (fade to color and back)
    this.fadeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuseA: { value: this.renderTargetA.texture },
        tDiffuseB: { value: this.renderTargetB.texture },
        mixRatio: { value: 0.0 },
        fadeColor: { value: new THREE.Color(0x000000) },
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
        uniform vec3 fadeColor;
        varying vec2 vUv;

        void main() {
          vec4 texelA = texture2D(tDiffuseA, vUv);
          vec4 texelB = texture2D(tDiffuseB, vUv);

          // Fade out to color, then fade in from color
          float fadeOut = smoothstep(0.0, 0.5, mixRatio) * 2.0;
          float fadeIn = smoothstep(0.5, 1.0, mixRatio) * 2.0 - 1.0;

          vec3 colorA = mix(texelA.rgb, fadeColor, clamp(fadeOut, 0.0, 1.0));
          vec3 colorB = mix(fadeColor, texelB.rgb, clamp(fadeIn, 0.0, 1.0));

          gl_FragColor = vec4(mix(colorA, colorB, step(0.5, mixRatio)), 1.0);
        }
      `,
    });

    // Crossfade material (direct blend)
    this.crossfadeMaterial = new THREE.ShaderMaterial({
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
          gl_FragColor = mix(texelA, texelB, mixRatio);
        }
      `,
    });

    const blendPlane = new THREE.PlaneGeometry(2, 2);
    const blendMesh = new THREE.Mesh(blendPlane, this.fadeMaterial);
    this.blendScene.add(blendMesh);
  }

  /**
   * Fade transition: Fades to a color and then fades in the new scene
   */
  fade(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: FadeTransitionOptions = {}
  ): void {
    this.startTransition(fromScene, toScene, camera, 'fade', options);

    if (options.color !== undefined) {
      this.fadeColor.set(options.color);
      this.fadeMaterial.uniforms.fadeColor.value.copy(this.fadeColor);
    }

    // Switch to fade material
    const mesh = this.blendScene.children[0] as THREE.Mesh;
    mesh.material = this.fadeMaterial;
  }

  /**
   * Crossfade transition: Directly blends from one scene to another
   */
  crossfade(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: SceneTransitionOptions = {}
  ): void {
    this.startTransition(fromScene, toScene, camera, 'crossfade', options);

    // Switch to crossfade material
    const mesh = this.blendScene.children[0] as THREE.Mesh;
    mesh.material = this.crossfadeMaterial;
  }

  /**
   * Blur transition: Blurs out first scene, then blurs in second scene
   * Note: This uses the fade material with a neutral gray for a blur-like effect
   * For true blur, you'd need post-processing passes
   */
  blur(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: SceneTransitionOptions = {}
  ): void {
    // For now, use fade with gray as a simple approximation
    // A full blur implementation would require post-processing
    this.fade(fromScene, toScene, camera, { ...options, color: 0x808080 });
  }

  /**
   * Internal method to start a transition
   */
  private startTransition(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    type: 'fade' | 'crossfade' | 'blur',
    options: SceneTransitionOptions
  ): void {
    this.currentScene = fromScene;
    this.targetScene = toScene;
    this.camera = camera;
    this.transitionType = type;
    this.transitionDuration = options.duration ?? 1000;
    this.transitionStartTime = performance.now();
    this.transitionProgress = 0;
    this.isTransitioning = true;
    this.onUpdateCallback = options.onUpdate;
    this.onCompleteCallback = options.onComplete;

    // Set easing function
    if (options.easing) {
      if (typeof options.easing === 'string') {
        this.easingFunction = SceneTransition.Easings[options.easing];
      } else {
        this.easingFunction = options.easing;
      }
    }
  }

  /**
   * Update the transition. Call this in your render loop.
   */
  update(): void {
    if (!this.isTransitioning) {
      return;
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
      this.currentScene = this.targetScene;
      this.targetScene = null;

      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }
  }

  /**
   * Render the scene with transition blending
   */
  render(): void {
    if (!this.isTransitioning || !this.currentScene || !this.targetScene || !this.camera) {
      // No transition, render current scene normally
      if (this.currentScene && this.camera) {
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.currentScene, this.camera);
      }
      return;
    }

    // Render both scenes to separate render targets
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.currentScene, this.camera);

    this.renderer.setRenderTarget(this.renderTargetB);
    this.renderer.render(this.targetScene, this.camera);

    // Update blend material uniforms
    if (this.transitionType === 'fade') {
      this.fadeMaterial.uniforms.mixRatio.value = this.transitionProgress;
    } else if (this.transitionType === 'crossfade') {
      this.crossfadeMaterial.uniforms.mixRatio.value = this.transitionProgress;
    }

    // Blend the two renders
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.blendScene, this.blendCamera);
  }

  /**
   * Get the current active scene
   */
  getCurrentScene(): THREE.Scene | null {
    return this.currentScene;
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
   * Set the current scene (useful for initialization)
   */
  setCurrentScene(scene: THREE.Scene): void {
    this.currentScene = scene;
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
    this.fadeMaterial.dispose();
    this.crossfadeMaterial.dispose();
  }
}
