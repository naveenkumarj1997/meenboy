/**
 * Keep the phone screen on while a delivery trip is active (Screen Wake Lock API).
 * Re-acquires when the tab becomes visible again (browsers release lock on hide).
 */
export type WakeLockState = "off" | "active" | "unsupported" | "denied";

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
};

const hasWakeLockApi = () =>
  typeof navigator !== "undefined" && "wakeLock" in navigator;

export async function requestScreenWakeLock(): Promise<{
  sentinel: WakeLockSentinelLike | null;
  state: WakeLockState;
}> {
  if (!hasWakeLockApi()) {
    return { sentinel: null, state: "unsupported" };
  }
  try {
    const nav = navigator as Navigator & {
      wakeLock: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    const sentinel = await nav.wakeLock.request("screen");
    return { sentinel, state: "active" };
  } catch {
    return { sentinel: null, state: "denied" };
  }
}

export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinelLike | null
): Promise<void> {
  if (!sentinel || sentinel.released) return;
  try {
    await sentinel.release();
  } catch {
    /* already released */
  }
}
