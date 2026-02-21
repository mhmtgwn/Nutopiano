import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  variant?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartState {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
}

const initialState: CartState = {
  items: [],
  totalQuantity: 0,
  totalPrice: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<CartState>) {
      state.items = action.payload.items;
      state.totalQuantity = action.payload.totalQuantity;
      state.totalPrice = action.payload.totalPrice;
    },
    addItem(
      state,
      action: PayloadAction<{
        item: Omit<CartItem, 'quantity'>;
        quantity?: number;
      }>,
    ) {
      const { item, quantity = 1 } = action.payload;
      // Ensure quantity is at least 1
      const safeQuantity = Math.max(1, quantity);
      const existing = state.items.find((i) => i.lineId === item.lineId);

      if (existing) {
        existing.quantity += safeQuantity;
      } else {
        state.items.push({ ...item, quantity: safeQuantity });
      }

      state.totalQuantity += safeQuantity;
      state.totalPrice += item.price * safeQuantity;
    },
    removeItem(state, action: PayloadAction<string>) {
      const index = state.items.findIndex(
        (i) => i.lineId === action.payload,
      );

      if (index !== -1) {
        const item = state.items[index];
        state.totalQuantity -= item.quantity;
        state.totalPrice -= item.price * item.quantity;
        state.items.splice(index, 1);
      }
    },
    updateQuantity(
      state,
      action: PayloadAction<{ lineId: string; quantity: number }>,
    ) {
      const { lineId, quantity } = action.payload;
      const item = state.items.find((i) => i.lineId === lineId);

      if (!item) return;

      // If quantity is 0 or invalid, remove the item
      if (quantity <= 0 || Number.isNaN(quantity)) {
        state.totalQuantity -= item.quantity;
        state.totalPrice -= item.price * item.quantity;
        state.items = state.items.filter((i) => i.lineId !== lineId);
        return;
      }

      // Ensure quantity is a positive integer
      const safeQuantity = Math.max(1, Math.floor(quantity));
      state.totalQuantity += safeQuantity - item.quantity;
      state.totalPrice += item.price * (safeQuantity - item.quantity);
      item.quantity = safeQuantity;
    },
    clearCart(state) {
      state.items = [];
      state.totalQuantity = 0;
      state.totalPrice = 0;
    },
  },
});

export const { hydrateCart, addItem, removeItem, updateQuantity, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
