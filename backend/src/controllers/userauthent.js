const User = require('../models/user')
const OTP = require('../models/otp')
const mailSender = require('../utils/mailSender')
const validate = require('../utils/validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
// const {client}=require('../config/redis')
const Submission = require('../models/submission')

const register = async (req, res) => {
    try {
        validate(req.body);
        const { firstname, emailid, password, otp } = req.body;

        if (!otp) {
            throw new Error("OTP is required");
        }

        const recentOtp = await OTP.findOne({ email: emailid }).sort({ createdAt: -1 });
        if (!recentOtp) {
            throw new Error("OTP expired or not found");
        }
        if (recentOtp.otp !== otp) {
            throw new Error("Invalid OTP");
        }

        req.body.password = await bcrypt.hash(password, 10);
        const user1 = await User.findOne({ emailid });
        if (user1)
            throw new Error("emaild exists");
        req.body.role = "user";
        const user = await User.create(req.body);
        const token = jwt.sign({ _id: user._id, emailid: emailid, role: 'user' }, process.env.JWT_KEY, { expiresIn: 7 * 24 * 60 * 60 });
        res.cookie('token', token, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });

        // ADD ROLE HERE ↓
        const reply = {
            firstname: user.firstname,
            emailid: user.emailid,
            _id: user._id,
            role: user.role  // ← ADD THIS
        }
        res.status(201).json({
            user: reply,
            message: 'user registered succesfully'
        })
    }
    catch (err) {
        res.status(400).json({ error: err.message || err.toString() });
    }
}

const sendOtp = async (req, res) => {
    try {
        const { emailid } = req.body;
        if (!emailid) throw new Error("Email is required");
        const cleanEmail = emailid.trim().toLowerCase();

        const user = await User.findOne({
            $or: [
                { emailid: cleanEmail },
                { email: cleanEmail }
            ]
        });
        if (user) {
            return res.status(409).json({ error: "User already exists" });
        }

        // 2-Second Cooldown Check
        const lastOtp = await OTP.findOne({ email: cleanEmail }).sort({ createdAt: -1 });
        if (lastOtp) {
            const diffSeconds = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
            if (diffSeconds < 2) {
                return res.status(429).json({ error: "Please wait at least 2 seconds before requesting another OTP" });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTP.create({
            email: cleanEmail,
            otp: otp
        });

        const title = "Verification OTP - Leetcode Clone";
        const body = `<h1>OTP Verification</h1><p>Your OTP for registration is: <strong>${otp}</strong>. It is valid for 5 minutes.</p>`;

        await mailSender(cleanEmail, title, body);

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        res.status(400).json({ error: error.message || error });
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { emailid, otp } = req.body;
        if (!emailid || !otp) {
            return res.status(400).json({ error: "Email and OTP are required" });
        }

        const recentOtp = await OTP.findOne({ email: emailid }).sort({ createdAt: -1 });
        if (!recentOtp) {
            return res.status(400).json({ error: "OTP expired or not found" });
        }
        if (recentOtp.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // We don't delete the OTP here so that the final register step can verify it again.
        // Alternatively, the register step could just not require OTP if we implement session state, 
        // but checking it again is simpler and secure.
        
        res.status(200).json({ success: true, message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message || error });
    }
}
const login = async (req, res) => {
    try {
        let { emailid, password } = req.body;
        if (!emailid || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const cleanEmail = emailid.trim().toLowerCase();
        const escapedEmail = cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        const user = await User.findOne({
            $or: [
                { emailid: cleanEmail },
                { emailid: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
                { email: cleanEmail },
                { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
            ]
        });

        if (!user) {
            console.log(`❌ Login failed: User with email '${cleanEmail}' not found in database`);
            return res.status(400).json({ error: 'User does not exist with this email' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            console.log(`❌ Login failed: Password mismatch for '${emailid}'`);
            return res.status(400).json({ error: 'Incorrect password' });
        }

        const token = jwt.sign({ _id: user._id, emailid: emailid, role: user.role }, process.env.JWT_KEY, { expiresIn: 7 * 24 * 60 * 60 });
        res.cookie('token', token, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });

        const reply = {
            firstname: user.firstname,
            emailid: user.emailid,
            _id: user._id,
            role: user.role
        }
        return res.status(200).json({
            user: reply,
            message: 'User logged in successfully'
        })

    }
    catch (err) {
        console.error('Login error:', err);
        res.status(400).json({ error: err.message || 'Invalid credentials' });
    }
}
const client = require('../config/redis');

const logout = async (req, res) => {
    try {
        const { token } = req.cookies;
        if (token) {
            try {
                const payload = jwt.decode(token);
                if (payload && payload.exp) {
                    const ttlSeconds = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
                    if (ttlSeconds > 0) {
                        await client.set(`token:${token}`, 'blocked', { EX: ttlSeconds });
                    }
                }
            } catch (redisErr) {
                console.log('⚠️ Redis blacklist warning:', redisErr.message);
            }
        }
        res.cookie('token', '', {
            expires: new Date(Date.now()),
            httpOnly: true,
            sameSite: 'lax'
        });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: err.message || 'Logout error' });
    }
}
const adminregister = async (req, res) => {
    try {
        validate(req.body);
        const { firstname, emailid, password } = req.body;
        req.body.password = await bcrypt.hash(password, 10);
        const user1 = await User.findOne({ emailid });
        if (user1)
            throw new Error("emaild exists");
        const user = await User.create(req.body);
        const token = jwt.sign({ _id: user._id, emailid: emailid, role: 'admin' }, process.env.JWT_KEY, { expiresIn: 7 * 24 * 60 * 60 });
        res.cookie('token', token, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
        res.status(201).send('user registered succesfully')
    }
    catch (err) {
        res.status(400).send('error: ' + err);
    }
}

const deleteprofile = async (req, res) => {
    try {
        const userid = req.user._id;
        await User.findByIdAndDelete(req.user._id);
        await Submission.deleteMany({ userid });
        res.status(200).send("Deleted Succesfully")
    }
    catch (err) {
        res.status(500).send('error: ' + err);
    }
}

const sendForgotPasswordOtp = async (req, res) => {
    try {
        let { emailid } = req.body;
        if (!emailid) return res.status(400).json({ error: "Email is required" });
        const cleanEmail = emailid.trim().toLowerCase();
        const escapedEmail = cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        const user = await User.findOne({
            $or: [
                { emailid: cleanEmail },
                { emailid: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
                { email: cleanEmail },
                { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: "User does not exist with this email" });
        }

        // 2-Second Cooldown Check
        const lastOtp = await OTP.findOne({ email: cleanEmail }).sort({ createdAt: -1 });
        if (lastOtp) {
            const diffSeconds = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
            if (diffSeconds < 2) {
                return res.status(429).json({ error: "Please wait at least 2 seconds before requesting another OTP" });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTP.create({
            email: cleanEmail,
            otp: otp
        });

        const title = "Password Reset OTP - Code Arena";
        const body = `<h1>Reset Password</h1><p>Your OTP for resetting your password is: <strong>${otp}</strong>. It is valid for 5 minutes.</p>`;

        await mailSender(cleanEmail, title, body);

        res.status(200).json({
            success: true,
            message: "OTP sent to your email for password reset"
        });
    } catch (error) {
        console.error("Send forgot password OTP error:", error);
        res.status(400).json({ error: error.message || "Failed to send OTP" });
    }
}

const resetPassword = async (req, res) => {
    try {
        let { emailid, otp, newPassword } = req.body;
        if (!emailid || !otp || !newPassword) {
            return res.status(400).json({ error: "Email, OTP, and new password are required" });
        }

        const cleanEmail = emailid.trim().toLowerCase();
        const escapedEmail = cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        const user = await User.findOne({
            $or: [
                { emailid: cleanEmail },
                { emailid: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
                { email: cleanEmail },
                { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: "User does not exist with this email" });
        }

        const recentOtp = await OTP.findOne({ email: emailid }).sort({ createdAt: -1 });
        if (!recentOtp) {
            return res.status(400).json({ error: "OTP expired or not found" });
        }
        if (recentOtp.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ error: "Password must be at least 8 characters with 1 capital letter and 1 number" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        const token = jwt.sign({ _id: user._id, emailid: emailid, role: user.role }, process.env.JWT_KEY, { expiresIn: 7 * 24 * 60 * 60 });
        res.cookie('token', token, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });

        const reply = {
            firstname: user.firstname,
            emailid: user.emailid,
            _id: user._id,
            role: user.role
        }

        res.status(200).json({
            success: true,
            user: reply,
            message: "Password reset successfully"
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(400).json({ error: error.message || "Failed to reset password" });
    }
}

module.exports = {
    login,
    register,
    logout,
    adminregister,
    deleteprofile,
    sendOtp,
    verifyOtp,
    sendForgotPasswordOtp,
    resetPassword
};