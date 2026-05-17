/**
 * Web Audio API synthesizer for premium chime audio notifications.
 * Generates custom, lightweight synthesizer tones dynamically on the client-side.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playJoinChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ascending warm synth tone (C5 to E5)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    
    // Play C5 (523.25 Hz)
    osc.frequency.setValueAtTime(523.25, now);
    // Glide to E5 (659.25 Hz)
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

    // Smooth envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn('Audio synthesis blocked by user gesture settings:', err);
  }
}

export function playLeaveChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Descending chime warning tone (E5 to C5)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    
    // Play E5 (659.25 Hz)
    osc.frequency.setValueAtTime(659.25, now);
    // Glide to C5 (523.25 Hz)
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.12);

    // Smooth warning envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn('Audio synthesis blocked by user gesture settings:', err);
  }
}

export function playMessageBeep() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Clean, short high beep sound (A5 / 880 Hz)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880.00, now);

    // Short pop click envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (err) {
    console.warn('Audio synthesis blocked by user gesture settings:', err);
  }
}

export function playHandRaiseChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonious multi-oscillator chime notes (D5 -> F5 -> A5)
    const frequencies = [587.33, 698.46, 880.00];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gainNode.gain.setValueAtTime(0, now + idx * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (err) {
    console.warn('Audio synthesis blocked by user gesture settings:', err);
  }
}
