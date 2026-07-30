const mongoose = require('mongoose');

const dbString = 'mongodb://127.0.0.1:27017/Leetcode'; // ✅ Direct local string

async function test() {
  console.log('🔍 Connecting to:', dbString);
  await mongoose.connect(dbString);
  console.log('✅ Connected!');
  await mongoose.disconnect();
  console.log('👋 Disconnected');
}
test().catch(console.error);