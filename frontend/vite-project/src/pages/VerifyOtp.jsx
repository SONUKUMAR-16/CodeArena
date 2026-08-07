import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { verifyOtpAction, registerUser, sendOtpAction, clearError, clearMessage } from "../authslice"

function VerifyOtp() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpVerified, setOtpVerified] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [localError, setLocalError] = useState("")
  const [resendTimer, setResendTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error, message } = useSelector((state) => state.auth)

  // Get email and firstname from navigation state or sessionStorage
  const email = location.state?.email || sessionStorage.getItem('signup_email')
  const firstname = location.state?.firstname || sessionStorage.getItem('signup_firstname')

  // Redirect if no email found
  useEffect(() => {
    if (!email) {
      navigate("/signup")
    }
  }, [email, navigate])

  // Redirect on successful registration
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  // Watch for OTP verified message
  useEffect(() => {
    if (message && message.toLowerCase().includes("otp verified")) {
      setOtpVerified(true)
      setLocalError("")
    }
  }, [message])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0 && !canResend) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (resendTimer === 0) {
      setCanResend(true)
    }
  }, [resendTimer, canResend])

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError())
      dispatch(clearMessage())
    }
  }, [dispatch])

  // Handle OTP input - auto-focus next box
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  // Handle backspace - focus previous box
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newOtp = [...otp]
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)
    // Focus last filled or the next empty
    const focusIndex = Math.min(pasted.length, 5)
    const input = document.getElementById(`otp-${focusIndex}`)
    if (input) input.focus()
  }

  const [verifiedOtp, setVerifiedOtp] = useState(() => sessionStorage.getItem('verified_otp') || "")

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setLocalError("Please enter the complete 6-digit OTP")
      return
    }
    setLocalError("")
    dispatch(clearError())
    try {
      sessionStorage.setItem('verified_otp', otpString)
      setVerifiedOtp(otpString)
      await dispatch(verifyOtpAction({ emailid: email, otp: otpString })).unwrap()
      setOtpVerified(true)
    } catch (err) {
      console.error("OTP verification failed:", err)
      const msg = typeof err === 'string' ? err : err?.error || err?.message || 'Invalid OTP'
      setLocalError(msg)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return
    setOtp(["", "", "", "", "", ""])
    sessionStorage.removeItem('verified_otp')
    setVerifiedOtp("")
    setCanResend(false)
    setResendTimer(30)
    setLocalError("")
    dispatch(clearError())
    try {
      await dispatch(sendOtpAction({ emailid: email })).unwrap()
    } catch (err) {
      console.error("Resend OTP failed:", err)
    }
  }

  // Validate password
  const validatePassword = (pwd) => {
    if (pwd.length < 8) return "Password must be at least 8 characters"
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least 1 uppercase letter"
    if (!/[0-9]/.test(pwd)) return "Password must contain at least 1 number"
    return ""
  }

  // Create account
  const handleCreateAccount = async () => {
    const pwdError = validatePassword(password)
    if (pwdError) {
      setPasswordError(pwdError)
      return
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    setPasswordError("")
    const finalOtp = verifiedOtp || sessionStorage.getItem('verified_otp') || otp.join("")
    if (!finalOtp) {
      setPasswordError("OTP is missing. Please click Back to Sign Up and request a new OTP.")
      return
    }
    try {
      await dispatch(registerUser({
        firstname: firstname || "User",
        emailid: email,
        password,
        otp: finalOtp
      })).unwrap()
      sessionStorage.removeItem('verified_otp')
      sessionStorage.removeItem('signup_email')
      sessionStorage.removeItem('signup_firstname')
      navigate("/")
    } catch (err) {
      console.error("Registration failed:", err)
      const msg = typeof err === 'string' ? err : err?.error || err?.message || 'Registration failed'
      setPasswordError(msg)
    }
  }

  if (!email) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            otpVerified ? "bg-green-500 text-black" : "bg-green-500/20 border-2 border-green-500 text-green-400"
          }`}>
            {otpVerified ? "✓" : "1"}
          </div>
          <div className={`w-12 h-0.5 transition-all duration-300 ${otpVerified ? "bg-green-500" : "bg-gray-700"}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            otpVerified ? "bg-green-500/20 border-2 border-green-500 text-green-400" : "bg-gray-800 border-2 border-gray-700 text-gray-500"
          }`}>
            2
          </div>
        </div>

        {!otpVerified ? (
          /* ─── OTP Verification Step ─── */
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-2">
              Verify Your Email
            </h2>
            <p className="text-gray-400 text-center text-sm mb-6">
              We sent a 6-digit code to <span className="text-green-400 font-medium">{email}</span>
            </p>

            {message && (
              <div className="bg-blue-900/30 border border-blue-600/50 text-blue-300 p-3 rounded-lg text-xs font-mono mb-4 text-center">
                {message}
              </div>
            )}

            {/* Error display */}
            {(error || localError) && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
                {localError || (typeof error === "string" ? error : JSON.stringify(error))}
              </div>
            )}

            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-gray-800 text-white border-2 border-gray-700 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 transition-all"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.join("").length !== 6}
              className="w-full bg-green-500 text-black py-3 rounded-lg font-semibold text-lg hover:bg-green-400 transition-all shadow-md hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </span>
              ) : "Verify OTP"}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              {canResend ? (
                <button
                  onClick={handleResendOtp}
                  className="text-green-400 hover:text-green-300 text-sm font-medium transition hover:underline"
                >
                  Resend OTP
                </button>
              ) : (
                <p className="text-gray-500 text-sm">
                  Resend OTP in <span className="text-green-400 font-medium">{resendTimer}s</span>
                </p>
              )}
            </div>

            {/* Back to signup */}
            <div className="text-center mt-4">
              <Link
                to="/signup"
                className="text-gray-500 hover:text-gray-300 text-sm transition"
              >
                ← Back to Sign Up
              </Link>
            </div>
          </>
        ) : (
          /* ─── Create Password Step ─── */
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-2">
              Create Password
            </h2>
            <p className="text-gray-400 text-center text-sm mb-6">
              Email verified! Now create a secure password.
            </p>

            {/* Success message */}
            {message && (
              <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-300 rounded-lg text-sm">
                ✅ {message}
              </div>
            )}

            {/* Error display */}
            {(error || passwordError) && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
                {passwordError || (typeof error === "string" ? error : JSON.stringify(error))}
              </div>
            )}

            {/* Password */}
            <div className="mb-4">
              <label className="block text-gray-400 mb-1 text-sm">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError("")
                  }}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full px-4 py-3 pr-12 bg-gray-800 text-white border-2 border-gray-700 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-green-400 transition"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.956 9.956 0 012.93-7.07M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.07 7.07L3.93 3.93" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password strength indicators */}
              <div className="mt-2 flex gap-2">
                <div className={`h-1 flex-1 rounded-full transition-all ${password.length >= 8 ? "bg-green-500" : "bg-gray-700"}`} />
                <div className={`h-1 flex-1 rounded-full transition-all ${/[A-Z]/.test(password) ? "bg-green-500" : "bg-gray-700"}`} />
                <div className={`h-1 flex-1 rounded-full transition-all ${/[0-9]/.test(password) ? "bg-green-500" : "bg-gray-700"}`} />
              </div>
              <div className="mt-1 flex gap-3 text-xs">
                <span className={password.length >= 8 ? "text-green-400" : "text-gray-600"}>8+ chars</span>
                <span className={/[A-Z]/.test(password) ? "text-green-400" : "text-gray-600"}>Uppercase</span>
                <span className={/[0-9]/.test(password) ? "text-green-400" : "text-gray-600"}>Number</span>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-1 text-sm">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError("")
                }}
                placeholder="Re-enter your password"
                className={`w-full px-4 py-3 bg-gray-800 text-white border-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 placeholder-gray-500 transition-all ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-500 focus:border-red-500"
                    : confirmPassword && confirmPassword === password
                    ? "border-green-500 focus:border-green-500"
                    : "border-gray-700 focus:border-green-500"
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="text-green-400 text-xs mt-1">✓ Passwords match</p>
              )}
            </div>

            {/* Create Account Button */}
            <button
              onClick={handleCreateAccount}
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-green-500 text-black py-3 rounded-lg font-semibold text-lg hover:bg-green-400 transition-all shadow-md hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </span>
              ) : "Create Account"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyOtp
