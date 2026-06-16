import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sathishedu:sathish@170384@cluster.mongodb.net/id-card-creator?retryWrites=true&w=majority';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache;
}

if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

const cache = global.mongooseCache;

export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
