// Talk to a character. Hold E to speak (Chrome speech recognition), or type.
// The dev server proxies /api/llm to FAL any-llm with the key added server-side.
const MODEL = "anthropic/claude-sonnet-4.5";

export class Dialogue {
  constructor() {
    this.box = document.getElementById("talk");
    this.who = this.box.querySelector(".who");
    this.line = this.box.querySelector(".line");
    this.you = this.box.querySelector(".you");
    this.input = this.box.querySelector("input");
    this.history = new Map(); // name -> messages
    this.character = null; this.busy = false; this.listening = false;
    this.rec = null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this.rec = new SR(); this.rec.lang = "en-US"; this.rec.interimResults = true; this.rec.continuous = false;
      this.rec.onresult = (e) => {
        const t = Array.from(e.results).map((r) => r[0].transcript).join(" ");
        this.you.textContent = `“${t}”`;
        if (e.results[e.results.length - 1].isFinal) this.send(t);
      };
      this.rec.onend = () => { this.listening = false; this.who.classList.remove("listening"); };
    }
    // Inside the box: Enter sends. E on an empty box = hold to speak. Esc = walk away.
    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && this.input.value.trim()) { const t = this.input.value.trim(); this.input.value = ""; this.you.textContent = `“${t}”`; this.send(t); }
      if (e.key === "Escape") { this.close(); this.onClose?.(); }
      if ((e.key === "e" || e.key === "E") && this.input.value === "") { e.preventDefault(); if (!e.repeat) this.listen(true); }
    });
    this.input.addEventListener("keyup", (e) => { e.stopPropagation(); if (e.key === "e" || e.key === "E") this.listen(false); });
  }
  get open() { return !!this.character; }
  start(character) {
    this.character = character; this.box.hidden = false;
    this.who.textContent = character.name; this.you.textContent = "";
    this.line.textContent = this.history.has(character.name) ? "…" : "";
    if (!this.history.has(character.name)) this.send("(The visitor walks up to you. Greet them in one short line.)", true);
  }
  close() { this.character = null; this.box.hidden = true; window.speechSynthesis?.cancel(); this.input.value = ""; this.input.blur(); }
  listen(on) {
    if (!this.rec || !this.character || this.busy) return;
    if (on && !this.listening) { try { this.rec.start(); this.listening = true; this.who.classList.add("listening"); this.you.textContent = "listening…"; } catch {} }
    if (!on && this.listening) { try { this.rec.stop(); } catch {} }
  }
  async send(text, hidden = false) {
    if (!this.character || this.busy) return;
    this.busy = true;
    const name = this.character.name;
    const msgs = this.history.get(name) || [];
    msgs.push({ role: "user", content: text });
    this.line.textContent = "…";
    try {
      const transcript = msgs.map((m) => `${m.role === "user" ? "Visitor" : name}: ${m.content}`).join("\n");
      const r = await fetch("/api/llm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          system_prompt: `${this.character.persona} Speak aloud, in character, 1 to 2 short sentences. Never break character. No stage directions, no asterisks, no name prefix.`,
          prompt: `${transcript}\n${name}:`,
        }),
      });
      const j = await r.json();
      const reply = (j.output || "").trim().replace(/^\**\w+:\**\s*/, "") || "(silence)";
      msgs.push({ role: "assistant", content: reply });
      this.history.set(name, msgs.slice(-12));
      this.line.textContent = reply;
      this.speak(reply, name);
    } catch (e) { this.line.textContent = "…the words are lost in the noise of the hall."; console.warn(e); }
    this.busy = false;
  }
  speak(text, name) {
    const synth = window.speechSynthesis; if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices().filter((v) => v.lang.startsWith("en"));
    const pick = (re) => voices.find((v) => re.test(v.name)) || voices[0];
    if (name === "Dumbledore") { u.voice = pick(/Daniel|Arthur|Oliver|Male|Google UK English Male/i); u.pitch = 0.7; u.rate = 0.88; }
    else if (name === "Hermione") { u.voice = pick(/Kate|Serena|Martha|Female|Google UK English Female/i); u.pitch = 1.15; u.rate = 1.08; }
    else { u.voice = pick(/Daniel|Arthur|Oliver|Male|Google UK English Male/i); u.pitch = 1.05; u.rate = 1.0; }
    synth.speak(u);
  }
}
