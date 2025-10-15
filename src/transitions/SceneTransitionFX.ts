import * as THREE from 'three';
import { Easing, EasingFunction } from '../constants/Easing';

export interface SceneTransitionFXOptions {
  duration?: number;
  easing?: EasingFunction | keyof typeof Easing;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export interface BloomTransitionOptions extends SceneTransitionFXOptions {
  maxBloom?: number;
}

export interface BlurTransitionOptions extends SceneTransitionFXOptions {
  maxBlur?: number;
  kernelSize?: number;
}

export interface GlitchTransitionOptions extends SceneTransitionFXOptions {
  maxIntensity?: number;
}

export interface FadeTransitionOptions extends SceneTransitionFXOptions {
  color?: THREE.ColorRepresentation;
}

/**
 * SceneTransitionFX provides advanced post-processing transitions between Three.js scenes.
 *
 * Uses EffectComposer for sophisticated visual effects:
 * - Bloom: Bright bloom effect that peaks at transition midpoint, washing out to white
 * - Blur: Progressive blur effect that peaks at midpoint, blurring scenes to oblivion
 * - Fade: Classic fade through a color (black, white, or custom)
 * - Glitch: Digital distortion/glitch effect with heavy artifacts
 *
 * Note: Requires post-processing imports from three/addons
 *
 * @example
 * ```typescript
 * import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
 * import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
 * import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
 * import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
 *
 * const composer = new EffectComposer(renderer);
 * const sceneTransitionFX = new SceneTransitionFX(renderer, composer);
 *
 * sceneTransitionFX.bloom(sceneA, sceneB, camera, {
 *   duration: 2000,
 *   maxBloom: 15.0
 * });
 * ```
 */
export class SceneTransitionFX {
  private renderer: THREE.WebGLRenderer;
  private composer: any; // EffectComposer type

  private currentScene: THREE.Scene | null = null;
  private targetScene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  private transitionProgress = 0;
  private transitionDuration = 1000;
  private transitionStartTime = 0;
  private isTransitioning = false;
  private transitionType: 'blur' | 'bloom' | 'fade' | 'glitch' | null = null;
  private easingFunction: EasingFunction;

  private renderPass: any; // RenderPass
  private bloomPass: any; // UnrealBloomPass
  private glitchPass: any; // GlitchPass
  private blurPass: any; // KawaseBlurPass or similar
  private fadePass: any; // ShaderPass for fade effect

  private maxBloomStrength = 3.0;
  private maxBlurAmount = 10.0;
  private maxGlitchIntensity = 1.0;
  private fadeColor = new THREE.Color(0x000000);

  private onUpdateCallback?: (progress: number) => void;
  private onCompleteCallback?: () => void;

  constructor(renderer: THREE.WebGLRenderer, composer: any) {
    this.renderer = renderer;
    this.composer = composer;
    this.easingFunction = Easing.CUBIC_EASE_IN_OUT;

    // Get existing passes (assumes user has set up RenderPass)
    this.renderPass = composer.passes.find((pass: any) => pass.constructor.name === 'RenderPass');
  }

  /**
   * Set the bloom pass for bloom transitions
   */
  setBloomPass(bloomPass: any): void {
    this.bloomPass = bloomPass;
  }

  /**
   * Set the glitch pass for glitch transitions
   */
  setGlitchPass(glitchPass: any): void {
    this.glitchPass = glitchPass;
  }

  /**
   * Set the blur pass for blur transitions
   */
  setBlurPass(blurPass: any): void {
    this.blurPass = blurPass;
  }

  /**
   * Set the fade pass for fade transitions
   */
  setFadePass(fadePass: any): void {
    this.fadePass = fadePass;
  }

  /**
   * Bloom transition: Bright bloom effect that peaks at transition midpoint
   */
  bloom(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: BloomTransitionOptions = {}
  ): void {
    if (!this.bloomPass) {
      console.warn('SceneTransitionFX: Bloom pass not set. Call setBloomPass() first.');
      return;
    }

    this.maxBloomStrength = options.maxBloom ?? 3.0;
    this.startTransition(fromScene, toScene, camera, 'bloom', options);
    this.bloomPass.enabled = true;
  }

  /**
   * Blur transition: Progressively blur scenes to oblivion and back
   */
  blur(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: BlurTransitionOptions = {}
  ): void {
    if (!this.blurPass) {
      console.warn('SceneTransitionFX: Blur pass not set. Call setBlurPass() first.');
      return;
    }

    this.maxBlurAmount = options.maxBlur ?? 10.0;
    this.startTransition(fromScene, toScene, camera, 'blur', options);
    this.blurPass.enabled = true;
  }

  /**
   * Fade transition: Classic fade through a color (black, white, or custom)
   */
  fade(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: FadeTransitionOptions = {}
  ): void {
    if (!this.fadePass) {
      console.warn('SceneTransitionFX: Fade pass not set. Call setFadePass() first.');
      return;
    }

    if (options.color !== undefined) {
      this.fadeColor.set(options.color);
      this.fadePass.uniforms.fadeColor.value.copy(this.fadeColor);
    }

    this.startTransition(fromScene, toScene, camera, 'fade', options);
    this.fadePass.enabled = true;
  }

  /**
   * Glitch transition: Digital distortion effect
   */
  glitch(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    options: GlitchTransitionOptions = {}
  ): void {
    if (!this.glitchPass) {
      console.warn('SceneTransitionFX: Glitch pass not set. Call setGlitchPass() first.');
      return;
    }

    this.maxGlitchIntensity = options.maxIntensity ?? 1.0;
    this.startTransition(fromScene, toScene, camera, 'glitch', options);
    this.glitchPass.enabled = true;
  }

  /**
   * Internal method to start a transition
   */
  private startTransition(
    fromScene: THREE.Scene,
    toScene: THREE.Scene,
    camera: THREE.Camera,
    type: 'blur' | 'bloom' | 'fade' | 'glitch',
    options: SceneTransitionFXOptions
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
        this.easingFunction = Easing[options.easing];
      } else {
        this.easingFunction = options.easing;
      }
    }

    // Update render pass to use current scene
    if (this.renderPass) {
      this.renderPass.scene = fromScene;
      this.renderPass.camera = camera;
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

    // Update effect parameters based on transition type
    if (this.transitionType === 'bloom' && this.bloomPass) {
      // Bloom peaks at midpoint (0 -> max -> 0)
      const bloomCurve = 1 - Math.abs(this.transitionProgress * 2 - 1);
      this.bloomPass.strength = bloomCurve * this.maxBloomStrength;
    } else if (this.transitionType === 'blur' && this.blurPass) {
      // Blur peaks at midpoint (0 -> max -> 0)
      const blurCurve = 1 - Math.abs(this.transitionProgress * 2 - 1);
      this.blurPass.uniforms.kernelSize.value = blurCurve * this.maxBlurAmount;
    } else if (this.transitionType === 'fade' && this.fadePass) {
      // Fade: fade out first half (0 -> 1), fade in second half (1 -> 0)
      const fadeAmount = this.transitionProgress < 0.5
        ? this.transitionProgress * 2  // Fade out: 0 -> 1
        : 2 - this.transitionProgress * 2;  // Fade in: 1 -> 0
      this.fadePass.uniforms.fadeAmount.value = fadeAmount;
    } else if (this.transitionType === 'glitch' && this.glitchPass) {
      // Glitch peaks at midpoint
      const glitchCurve = 1 - Math.abs(this.transitionProgress * 2 - 1);
      // GlitchPass doesn't have a strength property, so we enable/disable based on intensity
      this.glitchPass.enabled = glitchCurve > 0.3; // Only show glitch when intensity is high
    }

    // Switch scenes at midpoint
    if (this.transitionProgress >= 0.5 && this.renderPass && this.renderPass.scene === this.currentScene) {
      this.renderPass.scene = this.targetScene;
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.transitionProgress);
    }

    if (linearProgress >= 1) {
      // Transition complete
      this.isTransitioning = false;
      this.currentScene = this.targetScene;
      this.targetScene = null;

      // Update render pass to use the new current scene
      if (this.renderPass && this.currentScene) {
        this.renderPass.scene = this.currentScene;
      }

      // Disable effects
      if (this.bloomPass) {
        this.bloomPass.enabled = false;
        this.bloomPass.strength = 0;
      }
      if (this.blurPass) {
        this.blurPass.enabled = false;
        this.blurPass.uniforms.kernelSize.value = 0;
      }
      if (this.fadePass) {
        this.fadePass.enabled = false;
        this.fadePass.uniforms.fadeAmount.value = 0;
      }
      if (this.glitchPass) {
        this.glitchPass.enabled = false;
      }

      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }
  }

  /**
   * Render using the effect composer
   */
  render(): void {
    this.composer.render();
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
    if (this.renderPass) {
      this.renderPass.scene = scene;
    }
  }

  /**
   * Resize the composer when the renderer size changes
   */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Composer cleanup is handled externally
  }
}
