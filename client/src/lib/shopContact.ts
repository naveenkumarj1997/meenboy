export const SHOP_PHONE_DISPLAY = "+91 9087894319";
export const SHOP_PHONE_TEL = "tel:+919087894319";
export const SHOP_WHATSAPP_NUMBER = "919087894319";

export const shopWhatsAppUrl = (message?: string) => {
  const text =
    message ||
    "Hi Fish Friendly, I would like to modify or cancel my order.";
  return `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
};
