// Web Audio API & Web Speech API Synthesis Service

let audioCtx: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export const AudioService = {
  // Gentle reminder chime for dose time
  playReminderChime() {
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.6);
      });
    } catch (e) {
      console.warn('Audio chime failed', e);
    }
  },

  // Pill taken celebratory click
  playTakenSound() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn(e);
    }
  },

  // Kid mode happy pet fanfare
  playKidCheer() {
    try {
      const ctx = getAudioContext();
      const melody = [
        { f: 440, t: 0 },
        { f: 554.37, t: 0.1 },
        { f: 659.25, t: 0.2 },
        { f: 880, t: 0.3 },
        { f: 1108.73, t: 0.42 },
        { f: 1318.51, t: 0.55 },
      ];
      melody.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);

        gain.gain.setValueAtTime(0.22, ctx.currentTime + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.t + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.t);
        osc.stop(ctx.currentTime + note.t + 0.35);
      });
    } catch (e) {
      console.warn(e);
    }
  },

  // Scanner beep
  playScanBeep() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn(e);
    }
  },

  // Emergency oscillating loud siren (for nearby bystander alerting)
  startEmergencySiren() {
    if (sirenInterval !== null) return;
    try {
      const ctx = getAudioContext();
      sirenOscillator = ctx.createOscillator();
      sirenGain = ctx.createGain();

      sirenOscillator.type = 'sawtooth';
      sirenOscillator.frequency.setValueAtTime(750, ctx.currentTime);

      sirenGain.gain.setValueAtTime(0.4, ctx.currentTime);
      sirenOscillator.connect(sirenGain);
      sirenGain.connect(ctx.destination);

      sirenOscillator.start();

      let toggle = false;
      sirenInterval = window.setInterval(() => {
        if (!sirenOscillator) return;
        toggle = !toggle;
        const targetFreq = toggle ? 1050 : 700;
        sirenOscillator.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.35);
      }, 400);
    } catch (e) {
      console.warn('Siren failed to start', e);
    }
  },

  stopEmergencySiren() {
    if (sirenInterval !== null) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (sirenOscillator) {
      try {
        sirenOscillator.stop();
        sirenOscillator.disconnect();
      } catch {
        // ignore
      }
      sirenOscillator = null;
    }
    sirenGain = null;
  },

  isSirenActive(): boolean {
    return sirenInterval !== null;
  },

  // Voice Reminder (Web Speech API)
  speakMedicineReminder(medicineName: string, instructions: string, lang: 'en' | 'hi' = 'en') {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }
    window.speechSynthesis.cancel();

    let text = '';
    let speechLang = 'en-US';

    if (lang === 'hi') {
      text = `दवा लेने का समय हो गया है: ${medicineName}। कृपया समय पर लें और निर्देशों का पालन करें: ${instructions}`;
      speechLang = 'hi-IN';
    } else {
      text = `It is time to take your medication: ${medicineName}. Please take on time. Instructions: ${instructions}`;
      speechLang = 'en-US';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;
    utterance.rate = 0.95; // Slightly slower for elderly clarity
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(lang === 'hi' ? 'hi' : 'en'));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  },

  speakText(text: string, lang: 'en' | 'hi' = 'en') {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  },
};
