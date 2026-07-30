const mongoose=require('mongoose');
const {Schema}=mongoose;
const submissionschema=new Schema({
    problemid:{
        type:Schema.Types.ObjectId,
        ref:'problem',
        required:true
    },
    userid:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    code: {
    type: String,
    required: true
    },
    language: {
        type: String,
        required: true,
        enum: ['javascript', 'c++', 'java'] 
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'wrong', 'error'],
        default: 'pending'
    },
    runtime: {
        type: Number,  
        default: 0
    },
    memory: {
        type: Number, 
        default: 0
    },
    errormessage: {
        type: String,
        default: ''
    },
    testcasespassed: {
        type: Number,
        default: 0
    },
    testcasestotal: {  // Recommended addition
        type: Number,
        default: 0
    }
},{timestamps:true});
submissionschema.index({userid:1,problemid:1})
const Submission=mongoose.model('submission',submissionschema);
module.exports=Submission;