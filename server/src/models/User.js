import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 200 },
  firstName: { type: String, trim: true, maxlength: 60 },
  middleName: { type: String, trim: true, maxlength: 60 },
  lastName: { type: String, trim: true, maxlength: 60 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  mustChangePassword: { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0, select: false },
  failedLoginAttempts: { type: Number, default: 0, select: false },
  loginLockedUntil: { type: Date, default: null, select: false },
}, { timestamps: true })

userSchema.set('toJSON', {
  transform(_document, result) {
    delete result.passwordHash
    delete result.sessionVersion
    delete result.failedLoginAttempts
    delete result.loginLockedUntil
    delete result.__v
    return result
  },
})

export default mongoose.model('User', userSchema)
