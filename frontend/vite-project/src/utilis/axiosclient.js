import axios from 'axios'

const axiosclient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://codearena-sonukumar240529-7521s-projects.vercel.app'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

export default axiosclient