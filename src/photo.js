// Photo mode: press C anywhere, a 3-2-1 countdown, then your webcam frame and the
// current game frame go to Seedream edit, which puts you into the scene as one
// photoreal film still. The dev server proxies /api/edit to FAL with the key.
import * as THREE from "three";

export class Photo {
  constructor() {
    this.camera = null; this.panoUrl = null; this.plateSize = [1920, 1080];
    this.box = document.getElementById("photo");
    this.video = this.box.querySelector(".cam");
    this.result = this.box.querySelector(".result");
    this.count = this.box.querySelector(".count");
    this.status = this.box.querySelector(".status");
    this.snapBtn = this.box.querySelector(".snap");
    this.saveBtn = this.box.querySelector(".save");
    this.againBtn = this.box.querySelector(".again");
    this.closeBtn = this.box.querySelector(".close");
    this.still = this.box.querySelector(".still");
    this.who = this.box.querySelector(".who");
    this.uploadBtn = this.box.querySelector(".upload");
    this.file = this.box.querySelector(".file");
    this.uploaded = null; // data URL of a photo the player chose instead of the webcam
    this.uploadBtn.addEventListener("click", () => this.file.click());
    this.file.addEventListener("change", () => this.pickFile());
    this.stream = null; this.wantFrame = false; this.frame = null; this.busy = false;
    this.snapBtn.addEventListener("click", () => this.snap());
    this.againBtn.addEventListener("click", () => this.reset());
    this.closeBtn.addEventListener("click", () => this.close());
    this.onClose = null;
    this.robes = !new URLSearchParams(location.search).has("plain"); // ?plain=1 keeps your own clothes
    this.fast = new URLSearchParams(location.search).has("fast"); // skip the upscale
  }
  get open() { return !this.box.hidden; }
  async start(sceneName) {
    this.sceneName = sceneName;
    this.box.hidden = false; this.reset();
    document.exitPointerLock?.();
    try {
      this.stream = this.stream || await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
      this.video.srcObject = this.stream;
      if (!this.uploaded) this.status.textContent = "Stand where you want to be in the scene, or upload a photo. Press the button or Space.";
    } catch (e) { this.status.textContent = "No camera. Upload a photo instead."; console.warn(e); }
  }
  reset() {
    this.result.hidden = true; this.result.removeAttribute("src"); this.video.hidden = false;
    this.saveBtn.hidden = true; this.againBtn.hidden = true; this.snapBtn.hidden = false;
    this.still.hidden = !this.uploaded; if (this.uploaded) { this.still.src = this.uploaded; this.video.hidden = true; }
    this.count.textContent = ""; this.status.textContent = "";
  }
  close() {
    this.box.hidden = true;
    if (this.stream) { for (const t of this.stream.getTracks()) t.stop(); this.stream = null; }
    this.onClose?.();
  }
  // Called by the render loop right after a frame is drawn, while the canvas still holds it.
  grab(canvas) {
    if (!this.wantFrame) return;
    this.wantFrame = false;
    this.frame = canvas.toDataURL("image/jpeg", 0.92);
  }
  pickFile() {
    const f = this.file.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { this.uploaded = r.result; this.reset(); this.status.textContent = "Photo loaded. Press the button or Space."; };
    r.readAsDataURL(f);
  }
  // Companion reference: a photoreal live-action portrait (public/characters/photo), so the
  // composite does not inherit the CG look of the Tripo concept sheets.
  async companion(name) {
    if (!name) return null;
    const b = await (await fetch(`/characters/photo/${name.toLowerCase()}.jpg`)).blob();
    return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
  }
  // Photoreal backdrop: the enhanced panorama the set was generated from, cropped at the
  // camera's current view. The live splat frame is the fallback when there is no panorama.
  async plate() {
    if (!this.panoUrl || !this.camera) return null;
    try {
      if (this.panoUrl !== this.panoLoaded) {
        const tex = await new THREE.TextureLoader().loadAsync(this.panoUrl);
        tex.colorSpace = THREE.SRGBColorSpace;
        if (!this.plateRenderer) {
          const c = document.createElement("canvas"); c.width = this.plateSize[0]; c.height = this.plateSize[1];
          this.plateRenderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
          this.plateScene = new THREE.Scene();
          const geo = new THREE.SphereGeometry(10, 96, 48); geo.scale(-1, 1, 1);
          this.plateMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial()); this.plateMesh.rotation.y = Math.PI / 2;
          this.plateScene.add(this.plateMesh);
          this.plateCam = new THREE.PerspectiveCamera(60, this.plateSize[0] / this.plateSize[1], 0.1, 100);
        }
        this.plateMesh.material.map?.dispose(); this.plateMesh.material.map = tex; this.plateMesh.material.needsUpdate = true;
        this.panoLoaded = this.panoUrl;
      }
      this.plateCam.fov = this.camera.fov; this.plateCam.updateProjectionMatrix();
      this.camera.getWorldQuaternion(this.plateCam.quaternion);
      this.plateRenderer.render(this.plateScene, this.plateCam);
      return this.plateRenderer.domElement.toDataURL("image/jpeg", 0.92);
    } catch (e) { console.warn("plate", e); return null; }
  }
  async snap() {
    if (this.busy || (!this.stream && !this.uploaded)) return;
    this.busy = true; this.snapBtn.hidden = true;
    // ask the loop for the next drawn game frame now (the overlay is DOM, not on the canvas)
    this.frame = null; this.wantFrame = true;
    for (const n of [3, 2, 1]) { this.count.textContent = n; await new Promise((r) => setTimeout(r, 700)); }
    this.count.textContent = "";
    // the player: an uploaded photo, or the webcam frame
    let you = this.uploaded;
    if (!you) {
      const c = document.createElement("canvas"); c.width = this.video.videoWidth || 1280; c.height = this.video.videoHeight || 720;
      c.getContext("2d").drawImage(this.video, 0, 0, c.width, c.height);
      you = c.toDataURL("image/jpeg", 0.92);
    }
    // freeze the shot on screen while it develops, like a camera preview
    this.still.src = you; this.still.hidden = false; this.video.hidden = true;
    this.box.classList.add("flash"); setTimeout(() => this.box.classList.remove("flash"), 400);
    this.status.textContent = "Developing the photo…";
    const whoName = this.who.value;
    const friend = await this.companion(whoName).catch(() => null);
    const plate = await this.plate();
    if (plate) this.frame = plate;
    for (let i = 0; i < 160 && !this.frame; i++) await new Promise((r) => setTimeout(r, 50));
    if (!this.frame) { this.status.textContent = "Could not grab the scene."; this.busy = false; this.snapBtn.hidden = false; return; }
    this.status.textContent = "Developing the photo…";
    // Robes by default: the re-render is far more convincing when the model redraws the
    // clothes with the scene's light. ?plain=1 keeps the person's own clothes.
    const outfit = this.robes ? "Keep the person's face and hair recognisable, and dress them in black Hogwarts school robes with a house tie over their own top." : "Keep the person's face, hair and clothes recognisable.";
    const withFriend = friend ? ` Image 3 is ${whoName}, a real actor in costume: keep their face, age, hair, glasses, scar, robes and colours exactly as in image 3. Put the person from image 2 and ${whoName} standing together, body turned slightly toward each other, both looking at the camera with natural smiles.` : " The person stands alone, three-quarter view, looking at the camera with a natural smile.";
    const prompt = `Image 1 is the set: ${this.sceneName}. Image 2 is a photo of a real person.${withFriend} Photograph them inside the set from image 1, seen from the same viewpoint as image 1, as one photorealistic live-action film still shot on a cinema camera. Do not cut and paste anyone: re-render the person from scratch in a new standing pose, feet planted on the floor. ${outfit} Light everyone with the scene: its lamplight and candle glow on skin and clothes, soft contact shadows under their feet, the same colour temperature, depth of field, softness and film grain as the set, so they belong to the photograph. Real skin, real fabric, not CGI, not a render. Remove any simple low-detail 3D figures already in the set. Do not change the set's layout or add text.`;
    const image_urls = friend ? [this.frame, you, friend] : [this.frame, you];
    try {
      let url = null;
      // Nano Banana keeps the face best; then a 4x upscale for a print-size still.
      // Seedream is the fallback when either step fails. ?fast=1 skips the upscale.
      try {
        const r = await fetch("/api/nb", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, image_urls, num_images: 1, output_format: "jpeg" }) });
        const j = await r.json();
        url = j.images?.[0]?.url || null;
        if (!url) throw new Error(JSON.stringify(j).slice(0, 200));
        if (!this.fast) {
          this.status.textContent = "Sharpening…";
          const u = await fetch("/api/upscale", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: url, upscaling_factor: 4, overlapping_tiles: true }) });
          const uj = await u.json();
          url = uj.image?.url || uj.images?.[0]?.url || url;
        }
      } catch (e) {
        console.warn("nano banana failed, falling back to seedream", e);
        const r = await fetch("/api/edit", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, image_urls, image_size: { width: 1920, height: 1080 }, num_images: 1, enable_safety_checker: false }) });
        const j = await r.json();
        url = j.images?.[0]?.url;
        if (!url) throw new Error(JSON.stringify(j).slice(0, 200));
      }
      this.result.src = url; this.result.hidden = false; this.video.hidden = true; this.still.hidden = true;
      this.saveBtn.href = url; this.saveBtn.hidden = false; this.againBtn.hidden = false;
      this.status.textContent = "";
    } catch (e) { this.status.textContent = "The photo did not develop. Try again."; console.warn(e); this.snapBtn.hidden = false; }
    this.busy = false;
  }
}
