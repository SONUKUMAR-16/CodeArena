// src/contestSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './utilis/axiosclient';

// ==================== ASYNC THUNKS ====================

// Get all contests
export const getContests = createAsyncThunk(
  'contest/getContests',
  async ({ status, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page);
      params.append('limit', limit);
      
      const response = await api.get(`/contest?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get contest by ID
export const getContestById = createAsyncThunk(
  'contest/getContestById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/contest/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Register for contest
export const registerForContest = createAsyncThunk(
  'contest/registerForContest',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contest/${id}/register`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Unregister from contest
export const unregisterFromContest = createAsyncThunk(
  'contest/unregisterFromContest',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contest/${id}/unregister`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Submit contest solution
export const submitContestSolution = createAsyncThunk(
  'contest/submitContestSolution',
  async ({ contestId, problemId, code, language }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contest/${contestId}/submit`, {
        problemId,
        code,
        language
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get contest rankings
export const getContestRankings = createAsyncThunk(
  'contest/getContestRankings',
  async ({ id, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/contest/${id}/rankings?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get live leaderboard
export const getLiveLeaderboard = createAsyncThunk(
  'contest/getLiveLeaderboard',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/contest/${id}/leaderboard`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Admin: Create contest
export const createContest = createAsyncThunk(
  'contest/createContest',
  async (contestData, { rejectWithValue }) => {
    try {
      const response = await api.post('/contest/create', contestData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Admin: Update contest
export const updateContest = createAsyncThunk(
  'contest/updateContest',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/contest/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Admin: Delete contest
export const deleteContest = createAsyncThunk(
  'contest/deleteContest',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/contest/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Admin: Start contest
export const startContest = createAsyncThunk(
  'contest/startContest',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contest/${id}/start`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Admin: End contest
export const endContest = createAsyncThunk(
  'contest/endContest',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contest/${id}/end`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ==================== SLICE ====================

const initialState = {
  contests: [],
  currentContest: null,
  rankings: [],
  leaderboard: [],
  userSubmissions: [],
  loading: false,
  error: null,
  success: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
};

const contestSlice = createSlice({
  name: 'contest',
  initialState,
  reducers: {
    clearContestError: (state) => {
      state.error = null;
    },
    clearContestSuccess: (state) => {
      state.success = null;
    },
    resetContestState: (state) => {
      state.currentContest = null;
      state.rankings = [];
      state.leaderboard = [];
      state.userSubmissions = [];
      state.error = null;
      state.success = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ===== GET CONTESTS =====
      .addCase(getContests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getContests.fulfilled, (state, action) => {
        state.loading = false;
        state.contests = action.payload.contests || [];
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(getContests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch contests';
      })

      // ===== GET CONTEST BY ID =====
      .addCase(getContestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getContestById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContest = action.payload.contest;
        state.userSubmissions = action.payload.contest?.userSubmissions || [];
      })
      .addCase(getContestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch contest details';
      })

      // ===== REGISTER FOR CONTEST =====
      .addCase(registerForContest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerForContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Successfully registered!';
        if (state.currentContest) {
          state.currentContest.isRegistered = true;
          state.currentContest.participantCount = (state.currentContest.participantCount || 0) + 1;
        }
      })
      .addCase(registerForContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to register for contest';
      })

      // ===== UNREGISTER FROM CONTEST =====
      .addCase(unregisterFromContest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unregisterFromContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Successfully unregistered!';
        if (state.currentContest) {
          state.currentContest.isRegistered = false;
          state.currentContest.participantCount = Math.max(0, (state.currentContest.participantCount || 1) - 1);
        }
      })
      .addCase(unregisterFromContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to unregister from contest';
      })

      // ===== SUBMIT CONTEST SOLUTION =====
      .addCase(submitContestSolution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitContestSolution.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Solution submitted!';
        // Update user submissions
        if (state.currentContest) {
          // Refresh contest data
        }
      })
      .addCase(submitContestSolution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to submit solution';
      })

      // ===== GET CONTEST RANKINGS =====
      .addCase(getContestRankings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getContestRankings.fulfilled, (state, action) => {
        state.loading = false;
        state.rankings = action.payload.rankings || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(getContestRankings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch rankings';
      })

      // ===== GET LIVE LEADERBOARD =====
      .addCase(getLiveLeaderboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLiveLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.leaderboard = action.payload.leaderboard || [];
      })
      .addCase(getLiveLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch leaderboard';
      })

      // ===== CREATE CONTEST =====
      .addCase(createContest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Contest created successfully!';
        state.contests = [action.payload.contest, ...state.contests];
      })
      .addCase(createContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create contest';
      })

      // ===== UPDATE CONTEST =====
      .addCase(updateContest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Contest updated successfully!';
        const updated = action.payload.contest;
        state.contests = state.contests.map(c => 
          c._id === updated._id ? updated : c
        );
        if (state.currentContest && state.currentContest._id === updated._id) {
          state.currentContest = updated;
        }
      })
      .addCase(updateContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update contest';
      })

      // ===== DELETE CONTEST =====
      .addCase(deleteContest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(deleteContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Contest deleted successfully!';
        state.contests = state.contests.filter(c => c._id !== action.meta.arg);
        if (state.currentContest && state.currentContest._id === action.meta.arg) {
          state.currentContest = null;
        }
      })
      .addCase(deleteContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete contest';
      })

      // ===== START CONTEST =====
      .addCase(startContest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(startContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Contest started!';
        if (state.currentContest) {
          state.currentContest.status = 'active';
          state.currentContest.startTime = action.payload.contest.startTime;
          state.currentContest.endTime = action.payload.contest.endTime;
        }
        state.contests = state.contests.map(c =>
          c._id === action.payload.contest._id ? action.payload.contest : c
        );
      })
      .addCase(startContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to start contest';
      })

      // ===== END CONTEST =====
      .addCase(endContest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(endContest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Contest ended!';
        if (state.currentContest) {
          state.currentContest.status = 'completed';
          state.currentContest.endTime = action.payload.contest.endTime;
        }
        state.contests = state.contests.map(c =>
          c._id === action.payload.contest._id ? action.payload.contest : c
        );
        state.rankings = action.payload.finalRankings || state.rankings;
      })
      .addCase(endContest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to end contest';
      });
  }
});

export const { clearContestError, clearContestSuccess, resetContestState } = contestSlice.actions;
export default contestSlice.reducer;