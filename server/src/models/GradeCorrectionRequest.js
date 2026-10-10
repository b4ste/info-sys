import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousFinalGrade: { type: Number, required: true },
  proposedFinalGrade: { type: Number, required: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'reviewing', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { timestamps: true })

schema.index({ gradeId: 1, status: 1 })
schema.index({ gradeId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'reviewing'] } } })
export default mongoose.model('GradeCorrectionRequest', schema)
