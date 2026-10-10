import mongoose from 'mongoose'

export async function connectDatabase(uri, dbName) {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 })
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
