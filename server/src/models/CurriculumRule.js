import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  yearLevel: { type: Number, required: true, min: 1 },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  effectiveFromTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

schema.index({ programId: 1, yearLevel: 1, subjectId: 1, effectiveFromTermId: 1 }, { unique: true })
export default mongoose.model('CurriculumRule', schema)
