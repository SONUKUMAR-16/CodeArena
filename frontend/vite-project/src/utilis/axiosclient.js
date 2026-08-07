import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://code-arena-7y79.vercel.app');

const axiosclient = axios.create({
  baseURL: baseURL.replace(/\/$/, ''),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

export default axiosclient