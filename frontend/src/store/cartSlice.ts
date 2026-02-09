import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  name: string;
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
    addItem(
      state,
      action: PayloadAction<{
        item: Omit<CartItem, 'quantity'>;
        quantity?: number;
      }>,
    ) {
      const { item, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.productId === item.productId);

      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ ...item, quantity });
      }

      state.totalQuantity += quantity;
      state.totalPrice += item.price * quantity;
    },
    removeItem(state, action: PayloadAction<string>) {
      const index = state.items.findIndex(
        (i) => i.productId === action.payload,
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
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.productId === productId);

      if (!item) return;

      if (quantity <= 0 || Number.isNaN(quantity)) {
        state.totalQuantity -= item.quantity;
        state.totalPrice -= item.price * item.quantity;
        state.items = state.items.filter((i) => i.productId !== productId);
        return;
      }

      state.totalQuantity += quantity - item.quantity;
      state.totalPrice += item.price * (quantity - item.quantity);
      item.quantity = quantity;
    },
    clearCart(state) {
      state.items = [];
      state.totalQuantity = 0;
      state.totalPrice = 0;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
