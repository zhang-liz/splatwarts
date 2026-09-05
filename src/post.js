import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Film look over the whole frame, splats included: soft bloom on the bright candles and
// sky, a warm lift in the shadows, gentle contrast, and a vignette. `?flat=1` turns it off.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, warmth: { value: 0.015 }, contrast: { value: 1.05 }, vignette: { value: 0.3 }, saturation: { value: 1.05 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float warmth, contrast, vignette, saturation; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = (c - 0.5) * contrast + 0.5;                       // contrast around mid grey
      c += vec3(warmth, warmth * 0.5, -warmth) * (1.0 - c);  // warm the shadows, keep highlights clean
      float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, saturation);
      vec2 d = vUv - 0.5; c *= 1.0 - vignette * smoothstep(0.35, 0.9, dot(d, d) * 2.0);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.enabled = !new URLSearchParams(location.search).has("flat");
    // Spark writes sRGB-encoded splat colours no matter the target, while three encodes
    // meshes only when it thinks it is drawing to the screen (or an XR target). Flag the
    // composer buffers as sRGB XR targets so meshes match the splats, and skip OutputPass
    // so nothing is encoded twice.
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, depthBuffer: true, stencilBuffer: false });
    this.composer = new EffectComposer(renderer, rt);
    for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) { t.isXRRenderTarget = true; t.texture.colorSpace = THREE.SRGBColorSpace; }
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 0.82);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.resize();
  }
  resize() { this.composer.setSize(innerWidth, innerHeight); this.composer.setPixelRatio(this.renderer.getPixelRatio()); }
  // Indoors the candles bloom more; outdoors keep the sky from blowing out.
  look(mode) { this.bloom.strength = mode === "walk" ? 0.3 : 0.2; this.bloom.threshold = mode === "walk" ? 0.9 : 0.97; }
  render(scene, camera) { if (this.enabled) this.composer.render(); else this.renderer.render(scene, camera); }
}
