// models/problem.js - Update the schema
const mongoose = require('mongoose');
const {Schema} = mongoose;

const problemSchema = new Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    visibletestcases:[
        {
            input:{
                type:String,
                required:true,
            },
            output:{
                type:String,
                required:true,
            },
            explanation:{
                type:String,
                required:false,
                default: ''
            }
        }
    ],

    hiddentestcases:[
        {
            input:{
                type:String,
                required:true,
            },
            output:{
                type:String,
                required:true,
            }
        }
    ],

    startcode: [
        {
            language:{
                type:String,
                required:true,
            },
            initialcode:{
                type:String,
                required:true
            }
        }
    ],

    referencesolution:[
        {
            language:{
                type:String,
                required:true,
            },
            completecode:{
                type:String,
                required:true
            }
        }
    ],

    problemcreator:{
        type: Schema.Types.ObjectId,
        ref:'user',
        required:true
    }
})

const Problem = mongoose.model('problem', problemSchema);
module.exports = Problem;