let audioContext: AudioContext | null = null;

export function armReminderSound() {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  audioContext ??= new AudioContext();
  void audioContext.resume().catch(() => undefined);
}

export function playReminderFeedback() {
  if ('vibrate' in navigator) navigator.vibrate([140, 70, 180]);
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
  gain.connect(audioContext.destination);
  for (const [offset, frequency] of [[0, 660], [0.14, 880]] as const) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now + offset);
    oscillator.connect(gain); oscillator.start(now + offset); oscillator.stop(now + offset + 0.22);
  }
}
