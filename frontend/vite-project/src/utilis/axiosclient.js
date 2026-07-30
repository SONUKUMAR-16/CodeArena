import axios from 'axios'

const axiosclient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

export default axiosclient