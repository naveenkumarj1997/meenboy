import { formatQuantityLabel } from "../lib/weightOptions";

export type PriceChangeItem = {
  productName?: string;
  cutName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  estimatedUnitPrice?: number;
  estimatedTotalPrice?: number;
};

export const getItemPriceChanges = (items: PriceChangeItem[] = []) =>
  items
    .map((item) => {
      const oldRate = Number(item.estimatedUnitPrice);
      const newRate = Number(item.unitPrice);
      if (!Number.isFinite(oldRate) || !Number.isFinite(newRate)) return null;
      const diffPerUnit = newRate - oldRate;
      if (Math.abs(diffPerUnit) < 0.01) return null;
      const qty = Number(item.quantity) || 0;
      const lineDiff =
        item.estimatedTotalPrice != null
          ? Number(item.totalPrice) - Number(item.estimatedTotalPrice)
          : diffPerUnit * qty;
      const unit = item.unit || "kg";
      return {
        name: item.productName || "Item",
        cutName: item.cutName || "",
        qtyLabel: formatQuantityLabel(qty, unit),
        oldRate,
        newRate,
        unit,
        lineDiff,
        increased: lineDiff > 0
      };
    })
    .filter(Boolean) as Array<{
      name: string;
      cutName: string;
      qtyLabel: string;
      oldRate: number;
      newRate: number;
      unit: string;
      lineDiff: number;
      increased: boolean;
    }>;
