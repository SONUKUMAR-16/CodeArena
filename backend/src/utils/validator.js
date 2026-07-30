const validator=require('validator')
const validate=(data)=>{
    const mandatory=['firstname','emailid','password'];
    const isallowed=mandatory.every((k)=>Object.keys(data).includes(k));
    if(!isallowed)
        throw new Error("field missing");
    if(!validator.isEmail(data.emailid))
        throw new Error("invalid email");
    if(!validator.isStrongPassword(data.password, { minLength: 8, minLowercase: 0, minUppercase: 1, minNumbers: 1, minSymbols: 0 }))
        throw new Error("Password must be at least 8 characters with 1 capital letter and 1 number");
}
module.exports=validate;