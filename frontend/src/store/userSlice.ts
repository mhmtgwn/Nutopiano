import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

interface UserState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  error: string | null;
}

const initialState: UserState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    startAuth(state) {
      state.status = 'authenticating';
      state.error = null;
    },
    setCredentials(
      state,
      action: PayloadAction<{
        user: User;
        token: string;
      }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = 'authenticated';
    },
    setAuthError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
  },
});

export const { startAuth, setCredentials, setAuthError, logout } =
  userSlice.actions;

export default userSlice.reducer;
