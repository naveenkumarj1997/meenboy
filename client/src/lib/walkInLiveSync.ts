/** Cross-tab / same-tab live updates for Walk-in → Walk-in Accounts */

export const WALK_IN_BILL_EVENT = "ff:walk-in-bill-changed";
const STORAGE_KEY = "ff_walk_in_bill_ping";

export type WalkInBillChangeDetail = {
  type: "created" | "cancelled" | "updated" | "collected";
  billNumber?: string;
  saleDate?: string;
  at: number;
};

export const notifyWalkInBillChange = (detail: Omit<WalkInBillChangeDetail, "at">) => {
  const payload: WalkInBillChangeDetail = { ...detail, at: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent(WALK_IN_BILL_EVENT, { detail: payload }));
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
};

export const subscribeWalkInBillChanges = (
  handler: (detail: WalkInBillChangeDetail) => void
) => {
  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<WalkInBillChangeDetail>;
    if (ce.detail) handler(ce.detail);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      handler(JSON.parse(e.newValue) as WalkInBillChangeDetail);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener(WALK_IN_BILL_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WALK_IN_BILL_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
};
