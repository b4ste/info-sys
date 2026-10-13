import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

schema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 }, name: 'department_name_unique_ci' })

export default mongoose.model('Department', schema)
