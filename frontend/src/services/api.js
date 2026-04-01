import axios from 'axios'

const BASE_URL = 'https://fittrack-backend-owl8.onrender.com/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Response interceptor for consistent error shape ──────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail?.message ||
      err.response?.data?.detail ||
      err.message ||
      'Something went wrong'
    return Promise.reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)))
  }
)

// ── Users ────────────────────────────────────────────────────────────────────
export const createUser = (data) => api.post('/users/', data)
export const getUser = (id) => api.get(`/users/${id}`)
export const updateUser = (id, data) => api.patch(`/users/${id}`, data)

// ── Weight ───────────────────────────────────────────────────────────────────
export const logWeight = (userId, data) => api.post(`/users/${userId}/weight/`, data)
export const getWeightHistory = (userId, params = {}) =>
  api.get(`/users/${userId}/weight/`, { params })

// ── Food ─────────────────────────────────────────────────────────────────────
export const getFoods = () => api.get('/foods')
export const logFood = (userId, data) => api.post(`/users/${userId}/food`, data)
export const getFoodLogs = (userId, date) =>
  api.get(`/users/${userId}/food`, { params: { log_date: date } })
export const getNutritionSummary = (userId, date) =>
  api.get(`/users/${userId}/nutrition/summary`, { params: { summary_date: date } })
export const deleteFoodLog = (userId, logId) =>
  api.delete(`/users/${userId}/food/${logId}`)

// ── Workouts ─────────────────────────────────────────────────────────────────
export const logWorkout = (userId, data) => api.post(`/users/${userId}/workouts/`, data)
export const getWorkoutHistory = (userId, params = {}) =>
  api.get(`/users/${userId}/workouts/`, { params })
export const deleteWorkout = (userId, workoutId) =>
  api.delete(`/users/${userId}/workouts/${workoutId}`)

// ── Analytics ────────────────────────────────────────────────────────────────
export const getWeightTrend = (userId, periodDays = 30) =>
  api.get(`/users/${userId}/analytics/weight-trend`, { params: { period_days: periodDays } })
export const getCalorieWeightCorrelation = (userId, periodDays = 30) =>
  api.get(`/users/${userId}/analytics/calorie-weight-correlation`, {
    params: { period_days: periodDays },
  })
export const getWeeklySummary = (userId, numWeeks = 8) =>
  api.get(`/users/${userId}/analytics/weekly-summary`, { params: { num_weeks: numWeeks } })

export const getWeeklyNutrition = (userId, weekStart) =>
  api.get(`/users/${userId}/nutrition/weekly`, { params: { week_start: weekStart } })
