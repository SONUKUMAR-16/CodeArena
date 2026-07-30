const express=require('express');
const {login,register,logout, adminregister,deleteprofile, sendOtp, verifyOtp, sendForgotPasswordOtp, resetPassword}=require('../controllers/userauthent')
const authrouter=express.Router();
const {usermiddleware}=require('../middleware/usermiddleware')
const {adminmiddleware}=require('../middleware/adminmiddleware')

authrouter.post('/send-otp', sendOtp);
authrouter.post('/verify-otp', verifyOtp);
authrouter.post('/register',register);
authrouter.post('/login',login);
authrouter.post('/forgot-password/send-otp', sendForgotPasswordOtp);
authrouter.post('/forgot-password/reset', resetPassword);
authrouter.post('/logout',usermiddleware,logout);
authrouter.post('/admin/register',adminmiddleware,adminregister);
authrouter.post('/deleteprofile',usermiddleware,deleteprofile);
authrouter.get('/check',usermiddleware,(req,res)=>{
    const reply={
        firstname:req.user.firstname,
        emailid:req.user.emailid,
        _id:req.user._id, 
        role: req.user.role 
    }
    res.status(200).json({
        user:reply,
        message:"user exists"
    })
})
module.exports=authrouter;