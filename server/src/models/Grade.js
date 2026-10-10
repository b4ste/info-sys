import mongoose from 'mongoose'

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  weight: { type: Number, required: true, min: 0, max: 100 },
  earnedScore: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 0 },
}, { _id: false })

const revisionSchema = new mongoose.Schema({
  previousFinalGrade: Number,
  newFinalGrade: Number,
  changedAt: { type: Date, required: true },
  correctionRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeCorrectionRequest' },
}, { _id: false })

const schema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
  components: { type: [componentSchema], default: [] },
  calculatedGrade: Number,
  finalGrade: Number,
  status: { type: String, enum: ['draft', 'submitted', 'finalized', 'published'], default: 'draft' },
  publishedAt: Date,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revisions: { type: [revisionSchema], default: [] },
}, { timestamps: true })

export default mongoose.model('Grade', schema)
