import mongoose from "mongoose";

/**
 * Gerencia a conexão com o MongoDB usando Mongoose com cache global.
 * Essencial no ambiente Next.js para evitar múltiplas conexões em hot-reload
 * e no ciclo de vida das rotas de API do App Router.
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Por favor, defina a variável de ambiente MONGODB_URI no arquivo .env.local");
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
