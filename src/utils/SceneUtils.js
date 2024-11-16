import { EffectComposer } from "three/addons/postprocessing/EffectComposer";
import { RenderPass } from "three/addons/postprocessing/RenderPass";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass";
import { fadeShader } from "../shaders/fadeShader";

class SceneUtils {
  static dispose(scene) {
    scene?.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  static fadeBetween(renderer, camera, scene1, scene2, duration = 1.0) {
    // Create composer and passes
    const composer = new EffectComposer(renderer);

    // Render pass for the initial scene
    const renderPass1 = new RenderPass(scene1, camera);
    composer.addPass(renderPass1);

    // Shader pass for fade effect
    const fadePass = new ShaderPass(fadeShader);
    fadePass.uniforms["opacity"].value = 1.0;
    composer.addPass(fadePass);

    // Start fade out
    let startTime = null;

    function animateFadeOut(time) {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const progress = elapsed / duration;

      fadePass.uniforms["opacity"].value = Math.max(1.0 - progress, 0.0);

      if (progress < 1.0) {
        composer.render();
        requestAnimationFrame(animateFadeOut);
      } else {
        // Switch to the new scene and start fade in
        composer.passes[0] = new RenderPass(scene2, camera);
        startTime = null;
        requestAnimationFrame(animateFadeIn);
      }
    }

    function animateFadeIn(time) {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const progress = elapsed / duration;

      fadePass.uniforms["opacity"].value = Math.min(progress, 1.0);

      if (progress < 1.0) {
        composer.render();
        requestAnimationFrame(animateFadeIn);
      }
    }

    // Start the fade-out animation
    requestAnimationFrame(animateFadeOut);
  }
}

export { SceneUtils };
