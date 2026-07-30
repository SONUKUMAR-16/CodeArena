// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../authslice';
import contestReducer from '../contestSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contest: contestReducer
  }
});