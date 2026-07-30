const express=require('express');
const problemrouter=express.Router();
const {adminmiddleware}=require('../middleware/adminmiddleware')
const {usermiddleware}=require('../middleware/usermiddleware')
const {createproblem,updateproblem,deleteproblem,getproblembyid,getallproblem,solvedallproblembyuser, submittedproblem,getfullproblembyid,getUserSubmissions}=require('../controllers/userproblem')

problemrouter.post('/create',adminmiddleware,createproblem);
problemrouter.patch('/update/:id',adminmiddleware,updateproblem);
problemrouter.delete('/delete/:id',adminmiddleware,deleteproblem);
problemrouter.get('/admin/getfullproblem/:id', adminmiddleware, getfullproblembyid);

problemrouter.get('/problembyid/:id',getproblembyid);
problemrouter.get('/getallproblem/',getallproblem);
problemrouter.get('/user',usermiddleware,solvedallproblembyuser);
problemrouter.get('/submittedproblem/:pid',usermiddleware,submittedproblem);
problemrouter.get('/submissions/all', usermiddleware, getUserSubmissions);


module.exports=problemrouter;