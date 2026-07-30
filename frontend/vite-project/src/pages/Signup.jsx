import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { sendOtpAction, clearError, clearMessage } from "../authslice"
import { useDispatch, useSelector } from "react-redux"

const signupSchema = z.object({
  firstname: z.string().min(3, "Name should contain at least 3 characters"),
  emailid: z.string().email("Please enter a valid email address"),
})

function Signup() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: "onChange"
  })

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error, message } = useSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Watch for OTP sent message and navigate to verify page
  useEffect(() => {
    if (message && message.toLowerCase().includes('otp sent')) {
      const data = getValues()
      navigate('/verify-otp', {
        state: { email: data.emailid, firstname: data.firstname }
      })
    }
  }, [message, navigate, getValues])

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError())
      dispatch(clearMessage())
    }
  }, [dispatch])

  const [localError, setLocalError] = useState("")
  const [isCooldown, setIsCooldown] = useState(false)

  const onSubmit = async (data) => {
    if (isCooldown || loading) return;
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 2000);

    setLocalError("");
    dispatch(clearError());
    try {
      sessionStorage.setItem('signup_email', data.emailid);
      sessionStorage.setItem('signup_firstname', data.firstname);
      await dispatch(sendOtpAction({ emailid: data.emailid })).unwrap();
      navigate('/verify-otp', {
        state: { email: data.emailid, firstname: data.firstname }
      });
    } catch (err) {
      console.error("Send OTP failed:", err);
      const msg = typeof err === 'string' ? err : err?.error || err?.message || 'Failed to send OTP';
      setLocalError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-white mb-2">
          Create Account
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          Enter your details to get started
        </p>

        {/* Error Display */}
        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg flex flex-col gap-2 text-sm">
            <span>{localError || (typeof error === 'string' ? error : error?.error || JSON.stringify(error))}</span>
            {((error && (error === "User already exists" || (typeof error === 'string' && error.includes("already exists")))) ||
              (localError && localError.includes("already exists"))) && (
              <div className="flex flex-wrap gap-2 mt-1">
                <Link to="/login" className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 py-1.5 px-3 rounded transition">
                  Go to Login
                </Link>
                <Link to="/forgot-password" className="text-xs font-semibold text-white bg-green-600 hover:bg-green-500 py-1.5 px-3 rounded transition">
                  🔑 Reset Password via OTP
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Name */}
        <div className="mb-4">
          <label className="block text-gray-400 mb-1 text-sm">Full Name</label>
          <input
            {...register("firstname")}
            placeholder="John Doe"
            className={`w-full px-4 py-3 bg-gray-800 text-white border-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all ${
              errors.firstname ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-green-500"
            }`}
          />
          {errors.firstname && (
            <p className="text-red-400 text-xs mt-1">
              {errors.firstname.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-1 text-sm">Email Address</label>
          <input
            {...register("emailid")}
            placeholder="you@example.com"
            className={`w-full px-4 py-3 bg-gray-800 text-white border-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all ${
              errors.emailid ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-green-500"
            }`}
          />
          {errors.emailid && (
            <p className="text-red-400 text-xs mt-1">
              {errors.emailid.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isCooldown}
          className="w-full bg-green-500 text-black py-3 rounded-lg font-semibold text-lg hover:bg-green-400 transition-all shadow-md hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending OTP...
            </span>
          ) : "Send OTP"}
        </button>
        
        <p className="text-center text-gray-500 text-sm mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-green-400 hover:text-green-300 hover:underline transition"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Signup