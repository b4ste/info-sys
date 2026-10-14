import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { z } from 'zod'
import Faculty from '../models/Faculty.js'
import Student from '../models/Student.js'
import User from '../models/User.js'
import { audit } from '../services/academicService.js'
import { generateTemporaryPassword } from '../services/accountInvitation.js'

function capitalizeName(value) {
  return value.replace(/(^|[\s'-])(\p{L})/gu, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`)
}

const accountNameSchema = z.object({
  firstName: z.string().trim().min(1).max(60).transform(capitalizeName),
  middleName: z.string().trim().max(60).default('').transform(capitalizeName),
  lastName: z.string().trim().min(1).max(60).transform(capitalizeName),
})
const createSchema = accountNameSchema.extend({
  email: z.email(),
  role: z.enum(['student', 'faculty', 'admin']),
})
const statusSchema = z.object({ status: z.enum(['active', 'inactive']) })
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum(['student', 'faculty', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

function validationError(response, details) {
  const message = Object.values(details).flat()[0] ?? 'Invalid input.'
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message, details } })
}

function fullName({ firstName, middleName, lastName }) {
  return [firstName, middleName, lastName].filter(Boolean).join(' ')
}

export async function listUsers(request, response) {
  const parsed = listSchema.safeParse(request.query)
  if (!parsed.success) return validationError(response, parsed.error.flatten().fieldErrors)
  const { page, limit, search, role, status } = parsed.data
  const filter = {}
  if (role) filter.role = role
  if (status) filter.status = status
  if (search) {
    const pattern = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    filter.$or = [{ name: pattern }, { firstName: pattern }, { middleName: pattern }, { lastName: pattern }, { email: pattern }]
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ])
  return response.json({ success: true, data: { items, page, limit, total } })
}

export function createUser() {
  return async function handleCreateUser(request, response) {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response, parsed.error.flatten().fieldErrors)

    const { firstName, middleName, lastName, email, role } = parsed.data
    const password = generateTemporaryPassword()
    const user = await User.create({
      firstName,
      middleName,
      lastName,
      name: fullName(parsed.data),
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role,
      status: 'active',
      mustChangePassword: true,
    })

    await audit(request.user.id, 'account.created', 'User', user.id, { role: user.role })
    return response.status(201).json({ success: true, data: { user, temporaryPassword: password } })
  }
}

export async function changeUserName(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return validationError(response, { id: ['Invalid user ID.'] })
  const parsed = accountNameSchema.safeParse(request.body)
  if (!parsed.success) return validationError(response, parsed.error.flatten().fieldErrors)
  const { firstName, middleName, lastName } = parsed.data
  const user = await User.findByIdAndUpdate(request.params.id, { firstName, middleName, lastName, name: fullName(parsed.data) }, { returnDocument: 'after', runValidators: true })
  if (!user) return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } })
  await audit(request.user.id, 'account.name', 'User', user.id, { name: user.name })
  return response.json({ success: true, data: { user } })
}

export async function changeUserStatus(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return validationError(response, { id: ['Invalid user ID.'] })
  const parsed = statusSchema.safeParse(request.body)
  if (!parsed.success) return validationError(response, parsed.error.flatten().fieldErrors)
  if (request.params.id === request.user.id && parsed.data.status === 'inactive') {
    return validationError(response, { status: ['You cannot deactivate your own account.'] })
  }
  const user = await User.findById(request.params.id)
  if (!user) return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } })
  if (user.role === 'admin' && user.status === 'active' && parsed.data.status === 'inactive') {
    const activeAdmins = await User.countDocuments({ role: 'admin', status: 'active' })
    if (activeAdmins <= 1) return validationError(response, { status: ['At least one active admin is required.'] })
  }
  user.status = parsed.data.status
  await user.save()
  if (user.role === 'student') await Student.updateOne({ userId: user.id }, { status: user.status })
  if (user.role === 'faculty') await Faculty.updateOne({ userId: user.id }, { status: user.status })
  await audit(request.user.id, 'account.status', 'User', user.id, { status: user.status })
  return response.json({ success: true, data: { user } })
}
