import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { loginUser } from "../authslice"
import { useDispatch, useSelector } from "react-redux"

const loginSchema = z.object({
  emailid: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password should contain at least 8 characters")
    .regex(/[A-Z]/, "Password should contain at least 1 capital letter")
    .regex(/[0-9]/, "Password should contain at least 1 number")
})

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  })

  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error, message } = useSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const onSubmit = (data) => {
    dispatch(loginUser(data))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Login
        </h2>

        {/* Error and Message Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-300 rounded-lg">
            {message}
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">Email Address</label>
          <input
            {...register("emailid")}
            placeholder="example@email.com"
            className={`w-full px-4 py-2 bg-gray-800 text-white border rounded-lg outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 ${
              errors.emailid ? "border-red-500" : "border-gray-700"
            }`}
          />
          {errors.emailid && (
            <p className="text-red-400 text-sm mt-1">
              {errors.emailid.message}
            </p>
          )}
        </div>

        {/* Password with Eye Toggle */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-1">Password</label>

          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full px-4 py-2 pr-12 bg-gray-800 text-white border rounded-lg outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 ${
                errors.password ? "border-red-500" : "border-gray-700"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-green-400"
            >
              {showPassword ? (
                /* Eye Off */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.956 9.956 0 012.93-7.07M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.07 7.07L3.93 3.93"
                  />
                </svg>
              ) : (
                /* Eye */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>

          {errors.password && (
            <p className="text-red-400 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-black py-2 rounded-lg font-semibold text-lg hover:bg-green-400 transition shadow-md hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <p className="text-center text-gray-500 text-sm mt-4">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-green-400 hover:text-green-300 hover:underline transition"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Login