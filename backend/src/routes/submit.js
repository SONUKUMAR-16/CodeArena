const express=require('express');
const { usermiddleware} = require('../middleware/usermiddleware');
const {adminmiddleware}=require('../middleware/adminmiddleware')
const submitrouter=express.Router();
const {submitcode,runcode}=require('../controllers/usersubmission')






submitrouter.post('/submit/:id',usermiddleware,submitcode);
submitrouter.post('/run/:id',usermiddleware,runcode);
submitrouter.post('/submit/:id',adminmiddleware,submitcode);
submitrouter.post('/run/:id',adminmiddleware,runcode);
module.exports=submitrouter;