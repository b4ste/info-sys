import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  academicYear: { type: String, required: true, trim: true },
  termNumber: { type: Number, enum: [1, 2, 3], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  enrollmentStart: { type: Date, required: true },
  enrollmentEnd: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
}, { timestamps: true })

schema.index({ academicYear: 1, termNumber: 1 }, { unique: true })
schema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } })
schema.pre('validate', function validateDates() {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) this.invalidate('endDate', 'End date must be after start date.')
  if (this.enrollmentStart && this.enrollmentEnd && this.enrollmentStart >= this.enrollmentEnd) this.invalidate('enrollmentEnd', 'Enrollment end must be after enrollment start.')
  if (this.enrollmentStart && this.startDate && this.enrollmentStart > this.startDate) this.invalidate('enrollmentStart', 'Enrollment must start by the term start date.')
  if (this.enrollmentEnd && this.endDate && this.enrollmentEnd > this.endDate) this.invalidate('enrollmentEnd', 'Enrollment must end by the term end date.')
})

export default mongoose.model('AcademicTerm', schema)
