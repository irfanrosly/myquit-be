export function computeDaysSinceQuit(quitDate: Date | null): number {
  if (!quitDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(quitDate).getTime()) / 86400000));
}

export function computeCurrentStreak(quitDate: Date | null, lastSlipAt: Date | null): number {
  const ref = lastSlipAt ?? quitDate;
  if (!ref) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(ref).getTime()) / 86400000));
}
