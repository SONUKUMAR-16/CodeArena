import axios from 'axios'

const axiosclient = axios.create({
  baseURL: 'https://codearena-sonukumar240529-7521s-projects.vercel.app',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

export default axiosclient