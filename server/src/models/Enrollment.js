import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classOfferingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassOffering', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String,
}, { timestamps: true })

schema.index({ studentId: 1, classOfferingId: 1 }, { unique: true })
schema.index({ classOfferingId: 1, status: 1 })
export default mongoose.model('Enrollment', schema)
