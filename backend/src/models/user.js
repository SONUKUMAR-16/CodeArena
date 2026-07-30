const mongoose=require('mongoose');
const {Schema}=mongoose;
const userschema=new Schema({
    firstname:{
        type:String,
        required:true,
        minLength:3,
        maxLength:20
    },
    lastName:{
        type:String,
        minLength:3,
        maxLength:20,
    },
    emailid:{
        type:String,
        required:true,
        unique:true,
        trim: true,
        lowercase:true,
        immutable: true,
    },
    age:{
        type:Number,
        min:6,
        max:80,
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    },
    problemsolved: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: 'problem'
        }],
        default: []
    },
    password:{
        type:String,
        required:true
    }
},{timestamps:true})

const User=mongoose.model("user",userschema);
module.exports=User;