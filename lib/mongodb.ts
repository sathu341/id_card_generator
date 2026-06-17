import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sathishchandran321:sathish170384@cluster0.0k4nwbh.mongodb.net/id-card-creator?appName=Cluster0';

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
