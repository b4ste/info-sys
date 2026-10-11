import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  units: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

export default mongoose.model('Subject', schema)
