const client = require('../config/redis');

// Total Time: 60 min
const windowSize = 3600;
const MaxRequest = 1000;

const rateLimiter = async (req,res,next)=>{
    // Skip rate limiting in local development (localhost / 127.0.0.1)
    if (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || process.env.NODE_ENV !== 'production') {
        return next();
    }

    try{
        const key = `IP:${req.ip}`;
        const current_time = Date.now()/1000;
        const window_Time = current_time - windowSize;
        
        await client.zRemRangeByScore(key, 0, window_Time);

        const numberOfRequest = await client.zCard(key);

        if(numberOfRequest>=MaxRequest){
            return res.status(429).json({ error: "Number of Request Exceeded" });
        }

        await client.zAdd(key,[{score:current_time, value:`${current_time}:${Math.random()}`}]);

        await client.expire(key,windowSize);
        next();
    }
    catch(err){
        console.log('⚠️ Rate limiter warning (bypassing):', err.message || err);
        next();
    }

}


module.exports = rateLimiter;