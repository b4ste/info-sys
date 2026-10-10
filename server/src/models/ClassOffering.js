import mongoose from 'mongoose'

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  weight: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false })

const scheduleSchema = new mongoose.Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, trim: true },
}, { _id: false })

const schema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  yearLevel: { type: Number, required: true, min: 1 },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  capacity: { type: Number, required: true, min: 1 },
  enrollmentCount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['open', 'closed', 'completed'], default: 'open' },
  gradeComponents: { type: [componentSchema], default: [] },
  schedule: { type: [scheduleSchema], default: [] },
}, { timestamps: true })

schema.index({ academicTermId: 1, programId: 1, yearLevel: 1, status: 1 })
export default mongoose.model('ClassOffering', schema)
