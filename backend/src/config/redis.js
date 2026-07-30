const { createClient } = require('redis');

const client = createClient({
    username: 'default',
    password: process.env.REDISPASSWORD,
    socket: {
        host: process.env.REDISHOST,
        port: 10200,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
});

client.on('error', (err) => {
    console.log('⚠️ Redis Warning:', err.message || err);
});

module.exports = client;
