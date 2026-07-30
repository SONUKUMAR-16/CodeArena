const express=require('express');
const { usermiddleware } = require('../middleware/usermiddleware');
const {solvedoubt}=require('../controllers/chatting');


const chatting=express.Router();
chatting.post('/chat',usermiddleware,solvedoubt);

module.exports=chatting;