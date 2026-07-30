const { createClient } = require('redis');

let client;

if (process.env.REDISHOST && process.env.REDISPASSWORD) {
    try {
        client = createClient({
            username: 'default',
            password: process.env.REDISPASSWORD,
            socket: {
                host: process.env.REDISHOST,
                port: 10200,
                connectTimeout: 3000,
                reconnectStrategy: false
            }
        });

        client.on('error', (err) => {
            console.log('⚠️ Redis Warning:', err.message || err);
        });
    } catch (err) {
        console.log('⚠️ Redis init warning, using mock:', err.message);
        client = null;
    }
}

if (!client) {
    client = {
        get: async () => null,
        set: async () => null,
        del: async () => null,
        connect: async () => {},
        on: () => {}
    };
}

module.exports = client;
