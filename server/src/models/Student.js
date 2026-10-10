import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  studentNumber: { type: String, required: true, trim: true, unique: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  birthDate: Date,
  contactEmail: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  yearLevel: { type: Number, required: true, min: 1 },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

export default mongoose.model('Student', schema)
