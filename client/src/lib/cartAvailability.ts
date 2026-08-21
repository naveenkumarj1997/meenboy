import { getAvailabilityByDate, getProductById } from "./api";
import type { CartItem } from "../context/CartContext";

export type ItemAvailability = {
  cartItemId: string;
  productId: string;
  name: string;
  unavailable: boolean;
  reason: string;
};

export type CartAvailabilityResult = {
  isClosed: boolean;
  items: ItemAvailability[];
  unavailableItems: ItemAvailability[];
  warning: string | null;
};

const normalizeId = (id: unknown) => String(id ?? "").trim();

/**
 * Checks cart items against:
 * 1) Live product visibility (hidden / inactive => getProductById 404)
 * 2) Optional delivery-date availability (closed day, category, product)
 */
export const checkCartAvailability = async (
  cartItems: CartItem[],
  deliveryDate?: string
): Promise<CartAvailabilityResult> => {
  if (cartItems.length === 0) {
    return { isClosed: false, items: [], unavailableItems: [], warning: null };
  }

  let isClosed = false;
  let unavailableCategories: string[] = [];
  let unavailableProductIds = new Set<string>();

  if (deliveryDate) {
    try {
      const availRes = await getAvailabilityByDate(deliveryDate);
      const data = availRes?.availability;
      isClosed = !!data?.isClosed;
      unavailableCategories = data?.unavailableCategories || [];
      unavailableProductIds = new Set(
        (data?.unavailableProducts || []).map((id: string) => normalizeId(id))
      );
    } catch {
      // Keep product visibility checks if availability API fails
    }
  }

  // Each cart line: public product detail requires isActive:true
  const perProductActive = await Promise.all(
    cartItems.map(async (item) => {
      const productId = normalizeId(item.productId);
      if (!productId) return false;
      try {
        const res = await getProductById(productId);
        const product = res?.data?.product;
        if (!product) return false;
        if (product.isActive === false) return false;
        return true;
      } catch {
        return false;
      }
    })
  );

  const checked: ItemAvailability[] = cartItems.map((item, index) => {
    const productId = normalizeId(item.productId);
    const base: ItemAvailability = {
      cartItemId: item.id,
      productId,
      name: item.name,
      unavailable: false,
      reason: ""
    };

    if (!perProductActive[index]) {
      return {
        ...base,
        unavailable: true,
        reason: "This product is currently hidden / unavailable."
      };
    }

    if (deliveryDate && isClosed) {
      return {
        ...base,
        unavailable: true,
        reason: "Delivery is closed for the selected date."
      };
    }

    if (deliveryDate && item.category && unavailableCategories.includes(item.category)) {
      return {
        ...base,
        unavailable: true,
        reason: `Category "${item.category}" is unavailable on this date.`
      };
    }

    if (deliveryDate && unavailableProductIds.has(productId)) {
      return {
        ...base,
        unavailable: true,
        reason: "This product is unavailable on the selected date."
      };
    }

    return base;
  });

  const unavailableItems = checked.filter((i) => i.unavailable);
  let warning: string | null = null;

  if (isClosed && deliveryDate) {
    warning = "Delivery is closed for the selected date. Please choose another date.";
  } else if (unavailableItems.length > 0) {
    const names = unavailableItems.map((i) => i.name).join(", ");
    warning = `Remove unavailable item(s) to proceed with your order: ${names}.`;
  }

  return {
    isClosed,
    items: checked,
    unavailableItems,
    warning
  };
};
