import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string; // Unique identifier for the cart item (usually productId + cutName)
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  cutName?: string;
  notes?: string;
  unit?: "kg" | "piece";
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem("fishfriendly_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem("fishfriendly_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    setCartItems((prevItems) => {
      // Create a unique ID for the cart item based on productId, cutName, and notes
      let cartItemId = newItem.productId;
      if (newItem.cutName) cartItemId += `-${newItem.cutName}`;
      if (newItem.notes) cartItemId += `-${newItem.notes}`;

      const existingItemIndex = prevItems.findIndex((item) => item.id === cartItemId);

      if (existingItemIndex >= 0) {
        // Item exists, update quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        return updatedItems;
      }

      // Add new item
      return [...prevItems, { ...newItem, id: cartItemId }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    // Use 2 decimal places so 0.25 kg (250g) is not rounded to 0.3
    const nextQty = Math.round(quantity * 100) / 100;

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: nextQty } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemCount = cartItems.length;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
