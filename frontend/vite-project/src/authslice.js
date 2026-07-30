import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from './utilis/axiosclient'

// Async Thunks
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/register', userData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || 'Registration failed')
    }
  }
)

export const sendOtpAction = createAsyncThunk(
  'auth/sendOtp',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/send-otp', emailData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to send OTP')
    }
  }
)

export const verifyOtpAction = createAsyncThunk(
  'auth/verifyOtp',
  async (otpData, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/verify-otp', otpData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to verify OTP')
    }
  }
)

export const sendForgotPasswordOtpAction = createAsyncThunk(
  'auth/sendForgotPasswordOtp',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/forgot-password/send-otp', emailData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to send OTP')
    }
  }
)

export const resetPasswordAction = createAsyncThunk(
  'auth/resetPassword',
  async (resetData, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/forgot-password/reset', resetData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to reset password')
    }
  }
)

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/login', credentials)
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data || error.message || 'Login failed'
      return rejectWithValue(errorMessage)
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/user/logout')
      return null
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/user/check')
      return response.data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteProfile = createAsyncThunk(
  'auth/deleteProfile',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/user/deleteprofile')
      return null
    } catch (error) {
      return rejectWithValue(error.message || 'Delete profile failed')
    }
  }
)

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  message: null
}

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearMessage: (state) => {
      state.message = null
    },
    resetAuth: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.loading = false
      state.error = null
      state.message = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Register User
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.message = action.payload.message || 'Registration successful'
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Reset Password
      .addCase(resetPasswordAction.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(resetPasswordAction.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.message = action.payload.message || 'Password reset successfully'
      })
      .addCase(resetPasswordAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Send OTP
      .addCase(sendOtpAction.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(sendOtpAction.fulfilled, (state, action) => {
        state.loading = false
        state.message = action.payload.message || 'OTP sent successfully'
      })
      .addCase(sendOtpAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error || action.payload
      })

      // Verify OTP
      .addCase(verifyOtpAction.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(verifyOtpAction.fulfilled, (state, action) => {
        state.loading = false
        state.message = action.payload.message || 'OTP verified successfully'
      })
      .addCase(verifyOtpAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error || action.payload
      })
      
      // Login User
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.message = action.payload.message || 'Login successful'
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Logout User
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
        state.message = 'Logged out successfully'
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.user = null
        state.isAuthenticated = false
      })
      
      // Check Authentication
      .addCase(checkAuth.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.message = action.payload.message || 'User authenticated'
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
      })
      
      // Delete Profile
      .addCase(deleteProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteProfile.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
        state.message = 'Profile deleted successfully'
      })
      .addCase(deleteProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { clearError, clearMessage, resetAuth } = authSlice.actions
export default authSlice.reducer