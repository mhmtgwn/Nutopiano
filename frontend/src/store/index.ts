import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import cartReducer, { CartState } from './cartSlice';
import userReducer from './userSlice';

const CART_STORAGE_KEY = 'cart';

const loadCartState = () => {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;

    const isCartItemArray = (value: unknown): value is CartState['items'] => {
      if (!Array.isArray(value)) return false;
      return value.every((item) => {
        if (!item || typeof item !== 'object') return false;
        return (
          'productId' in item &&
          typeof (item as { productId: unknown }).productId === 'string' &&
          'name' in item &&
          typeof (item as { name: unknown }).name === 'string' &&
          'price' in item &&
          typeof (item as { price: unknown }).price === 'number' &&
          'quantity' in item &&
          typeof (item as { quantity: unknown }).quantity === 'number'
        );
      });
    };

    const isCartState = (value: unknown): value is CartState => {
      if (!value || typeof value !== 'object') return false;

      const v = value as Record<string, unknown>;

      return (
        isCartItemArray(v.items) &&
        typeof v.totalQuantity === 'number' &&
        typeof v.totalPrice === 'number'
      );
    };

    if (!isCartState(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};

const saveCartState = (state: unknown) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
};

const preloadedCart = loadCartState();

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    user: userReducer,
  },
  preloadedState: preloadedCart ? { cart: preloadedCart } : undefined,
});

store.subscribe(() => {
  const cartState = store.getState().cart;
  saveCartState(cartState);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
