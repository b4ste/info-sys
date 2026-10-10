import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  yearLevel: { type: Number, required: true, min: 1 },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  name: { type: String, required: true, trim: true },
  capacity: { type: Number, min: 1 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

schema.index({ programId: 1, yearLevel: 1, academicTermId: 1, name: 1 }, { unique: true })
export default mongoose.model('Section', schema)
