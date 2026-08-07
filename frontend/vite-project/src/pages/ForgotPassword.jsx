import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { sendForgotPasswordOtpAction, resetPasswordAction, clearError, clearMessage } from "../authslice"

function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [resendTimer, setResendTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error, message } = useSelector((state) => state.auth)

  // Redirect to home if logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  // Countdown timer for resend
  useEffect(() => {
    if (otpSent && resendTimer > 0 && !canResend) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (resendTimer === 0) {
      setCanResend(true)
    }
  }, [otpSent, resendTimer, canResend])

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError())
      dispatch(clearMessage())
    }
  }, [dispatch])

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newOtp = [...otp]
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)
  }

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault()
    if (!email || !email.includes("@")) {
      setLocalError("Please enter a valid email address")
      return
    }
    setLocalError("")
    dispatch(clearError())
    try {
      await dispatch(sendForgotPasswordOtpAction({ emailid: email })).unwrap()
      setOtpSent(true)
      setLocalSuccess("OTP sent to your email! Please enter it below.")
    } catch (err) {
      console.error("Send forgot password OTP failed:", err)
      const msg = typeof err === 'string' ? err : err?.error || err?.message || (typeof err === 'object' && Object.keys(err).length ? JSON.stringify(err) : 'Failed to send OTP')
      setLocalError(msg)
    }
  }

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e?.preventDefault()
    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setLocalError("Please enter the complete 6-digit OTP")
      return
    }
    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters")
      return
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setLocalError("Password must contain at least 1 uppercase letter and 1 number")
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match")
      return
    }

    setLocalError("")
    dispatch(clearError())

    try {
      await dispatch(resetPasswordAction({
        emailid: email,
        otp: otpString,
        newPassword
      })).unwrap()
      navigate("/")
    } catch (err) {
      console.error("Reset password failed:", err)
      const msg = typeof err === 'string' ? err : err?.error || err?.message || 'Failed to reset password'
      setLocalError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        
        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-white mb-2">
          Reset Password
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          {!otpSent 
            ? "Enter your email to receive a password reset OTP" 
            : `Enter the 6-digit OTP sent to ${email}`}
        </p>

        {/* Error Display */}
        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
            {localError || (typeof error === 'string' ? error : error?.error || JSON.stringify(error))}
          </div>
        )}

        {/* Success Display */}
        {(localSuccess || message) && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-300 rounded-lg text-sm">
            ✅ {localSuccess || message}
          </div>
        )}

        {!otpSent ? (
          /* ─── Step 1: Request OTP Form ─── */
          <form onSubmit={handleSendOtp}>
            <div className="mb-6">
              <label className="block text-gray-400 mb-1 text-sm">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-gray-800 text-white border-2 border-gray-700 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-green-500 text-black py-3 rounded-lg font-semibold text-lg hover:bg-green-400 transition-all shadow-md hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? "Sending OTP..." : "Send Reset OTP"}
            </button>
          </form>
        ) : (
          /* ─── Step 2: Enter OTP & New Password ─── */
          <form onSubmit={handleResetPassword}>
            {/* 6-Digit OTP */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2 text-center">6-Digit OTP Code</label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`reset-otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-13 text-center text-xl font-bold bg-gray-800 text-white border-2 border-gray-700 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* New Password */}
            <div className="mb-4">
              <label className="block text-gray-400 mb-1 text-sm">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-800 text-white border-2 border-gray-700 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-green-400 transition"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-1 text-sm">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className={`w-full px-4 py-3 bg-gray-800 text-white border-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-red-500 focus:border-red-500"
                    : confirmPassword && confirmPassword === newPassword
                    ? "border-green-500 focus:border-green-500"
                    : "border-gray-700 focus:border-green-500"
                }`}
              />
            </div>

            {/* Reset Button */}
            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6 || !newPassword || newPassword !== confirmPassword}
              className="w-full bg-green-500 text-black py-3 rounded-lg font-semibold text-lg hover:bg-green-400 transition-all shadow-md hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? "Resetting Password..." : "Reset Password & Login"}
            </button>

            {/* Resend OTP */}
            <div className="text-center mb-2">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-green-400 hover:text-green-300 text-sm font-medium transition hover:underline"
                >
                  Resend Reset OTP
                </button>
              ) : (
                <p className="text-gray-500 text-sm">
                  Resend OTP in <span className="text-green-400 font-medium">{resendTimer}s</span>
                </p>
              )}
            </div>
          </form>
        )}

        {/* Links */}
        <div className="text-center mt-4 flex justify-between text-sm">
          <Link to="/login" className="text-green-400 hover:text-green-300 transition hover:underline">
            Back to Login
          </Link>
          <Link to="/signup" className="text-gray-400 hover:text-gray-200 transition hover:underline">
            Create Account
          </Link>
        </div>

      </div>
    </div>
  )
}

export default ForgotPassword
