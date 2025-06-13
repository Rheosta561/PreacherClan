const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
    username: 'default',
    password: process.env.REDIS_CLIENT_PASS ,
    socket: {
        host: 'redis-13372.c330.asia-south1-1.gce.redns.redis-cloud.com',
        port: 13372
    }
});

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await client.connect();
    console.log('Redis connected');

    await client.set('foo', 'bar');
    const result = await client.get('foo');
    console.log(result); // should print 'bar'
})();

module.exports = client;
