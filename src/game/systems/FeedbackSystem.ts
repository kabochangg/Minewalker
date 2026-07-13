export type FeedbackCue =
  "mine" | "cool" | "disable" | "item" | "hit" | "heal" | "success";

const CUE_FREQUENCIES: Readonly<
  Record<FeedbackCue, readonly [number, number]>
> = {
  mine: [150, 95],
  cool: [520, 760],
  disable: [320, 640],
  item: [660, 990],
  hit: [120, 70],
  heal: [440, 660],
  success: [523, 1046],
};

export function playFeedback(
  cue: FeedbackCue,
  soundEnabled: boolean,
  vibrationEnabled: boolean,
): void {
  if (vibrationEnabled && "vibrate" in navigator) {
    navigator.vibrate(cue === "hit" ? [45, 30, 70] : 28);
  }
  if (!soundEnabled) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const [start, end] = CUE_FREQUENCIES[cue];
  const now = context.currentTime;
  oscillator.type = cue === "hit" || cue === "mine" ? "square" : "triangle";
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(end, now + 0.11);
  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.14);
  oscillator.addEventListener("ended", () => void context.close(), {
    once: true,
  });
}
