import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
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
  const location = useLocation()
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error, message } = useSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const onSubmit = (data) => {
    dispatch(loginUser(data))
  }

  const getErrorMessageStr = (err) => {
    if (!err) return ""
    if (typeof err === "string") return err
    if (typeof err === "object") return err.error || err.message || JSON.stringify(err)
    return String(err)
  }

  const errStr = getErrorMessageStr(error).toLowerCase()
  const isPasswordIncorrect = (errStr.includes('incorrect') || errStr.includes('password') || errStr.includes('invalid credential')) && !errStr.includes('does not exist')

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
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
            {typeof error === 'string' ? error : error?.error || JSON.stringify(error)}
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
              {showPassword ? "🙈" : "👁️"}
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

        {/* Bottom Footer: Sign Up (Left) & Forgot Password (Bottom Right ONLY if password is incorrect) */}
        <div className="flex justify-between items-center text-sm mt-4 text-gray-500">
          <div>
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-green-400 hover:text-green-300 hover:underline transition font-medium"
            >
              Sign up
            </Link>
          </div>

          {isPasswordIncorrect && (
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline transition flex items-center gap-1 bg-red-950/40 border border-red-800/60 py-1 px-2.5 rounded-lg shadow-sm"
            >
              🔑 Forgot password?
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}

export default Login