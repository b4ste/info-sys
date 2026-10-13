import { CalendarDays, Check, ClipboardList, Info, Moon, Phone, Sun, TriangleAlert, Users } from 'lucide-react'

const icons = {
  alert: TriangleAlert,
  calendar: CalendarDays,
  check: Check,
  grades: ClipboardList,
  info: Info,
  moon: Moon,
  phone: Phone,
  sun: Sun,
  users: Users,
}

export default function Icon({ name, className = 'size-4' }) {
  const LucideIcon = icons[name]
  if (!LucideIcon) return null

  return <LucideIcon aria-hidden="true" className={className} strokeWidth={1.8} />
}
