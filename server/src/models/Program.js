import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  name: { type: String, required: true, trim: true },
  yearLevels: { type: [Number], required: true, validate: { validator: (values) => values.length > 0 && values.every((value) => Number.isInteger(value) && value > 0), message: 'Provide positive year levels.' } },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

export default mongoose.model('Program', schema)
