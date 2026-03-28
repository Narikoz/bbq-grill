// src/app/core/models/index.ts
import { z } from 'zod'

// ─── Zod Schemas ────────────────────────────────────────────
export const QueueStatusSchema = z.enum(['WAITING','CONFIRMED','SEATED','FINISHED','CANCELLED'])
export type QueueStatus = z.infer<typeof QueueStatusSchema>

export const QueueSchema = z.object({
  queue_id:          z.number(),
  queue_id_str:      z.string(),
  customer_name:     z.string(),
  customer_tel:      z.string(),
  pax_amount:        z.number(),
  booking_time:      z.string(),
  queue_status:      QueueStatusSchema,
  created_at:        z.string(),
  confirmed_at:      z.string().nullable(),
  seated_at:         z.string().nullable(),
  finished_at:       z.string().nullable(),
  cancelled_at:      z.string().nullable(),
  table_id:          z.number().nullable(),
  table_number:      z.number().nullable(),
  pay_token:         z.string().nullable(),
  pay_token_expires: z.string().nullable(),
  is_paid:           z.boolean(),
  is_qr:             z.boolean(),
  pay_link:          z.string().nullable(),
  pay_method:        z.enum(['CASH_DEPOSIT','QR_FULL','QR_DEPOSIT']).optional(),
  is_deposit:        z.number().optional(),
  deposit_amount:    z.number().optional(),
  remaining_amount:  z.number().optional(),
  payment_id:        z.number().optional().nullable(),
  total_amount:      z.number().optional().nullable(),
  subtotal_amount:   z.number().optional().nullable(),
  service_amount:    z.number().optional().nullable(),
  vat_amount:        z.number().optional().nullable(),
  payment_method:    z.string().optional().nullable(),
  payment_time:      z.string().optional().nullable(),
  buffet_ends_at:    z.string().nullable().optional(),
  time_remaining_sec: z.number().nullable().optional(),
  tier:              z.string().optional(),
  price_per_person:  z.number().optional(),
})
export type Queue = z.infer<typeof QueueSchema>

export const TableSchema = z.object({
  table_id:     z.number(),
  table_number: z.number(),
  capacity:     z.number(),
  status:       z.enum(['AVAILABLE','OCCUPIED','RESERVED']),
})
export type Table = z.infer<typeof TableSchema>

export const PaymentSchema = z.object({
  queue_id:         z.number(),
  queue_id_str:     z.string(),
  customer_name:    z.string(),
  customer_tel:     z.string(),
  pax_amount:       z.number(),
  booking_time:     z.string(),
  table_number:     z.number().nullable(),
  subtotal_amount:  z.number(),
  service_amount:   z.number(),
  vat_amount:       z.number(),
  total_amount:     z.number(),
  payment_method:   z.string(),
  pay_method_label: z.string(),
  payment_time:     z.string(),
  ref:              z.string(),
})
export type Payment = z.infer<typeof PaymentSchema>

export const UserSchema = z.object({
  emp_id:   z.number(),
  emp_name: z.string(),
  username: z.string().optional(),
  role:     z.enum(['ADMIN','STAFF']),
})
export type User = z.infer<typeof UserSchema>

export const EmployeeSchema = z.object({
  emp_id:     z.number(),
  emp_name:   z.string(),
  username:   z.string(),
  role:       z.enum(['ADMIN','STAFF']),
  is_active:  z.number(),
  created_at: z.string(),
})
export type Employee = z.infer<typeof EmployeeSchema>

export const TodayReportSchema = z.object({
  revenue:      z.object({ rev: z.number(), avg_bill: z.number(), cnt: z.number() }),
  by_status:    z.record(z.number()),
  total_today:  z.number(),
  avg_wait_min: z.number().nullable(),
  avg_dine_min: z.number().nullable(),
  peak_hour:    z.string(),
  by_method:    z.array(z.object({ payment_method: z.string(), rev: z.number(), cnt: z.number() })),
})
export type TodayReport = z.infer<typeof TodayReportSchema>

export const TimeSlotSchema = z.object({
  slot_id:        z.number(),
  slot_time:      z.string(),
  max_capacity:   z.number(),
  is_active:      z.boolean(),
  booked_pax:     z.number().optional(),
  remaining:      z.number().optional(),
  is_full:        z.boolean().optional(),
  is_nearly_full: z.boolean().optional(),
})
export type TimeSlot = z.infer<typeof TimeSlotSchema>

// ─── Voucher ─────────────────────────────────────────────────
export interface Voucher {
  voucher_id:   number
  code:         string
  discount_pct: number
  max_uses:     number
  used_count:   number
  expires_at:   string | null
  is_active:    number
  description:  string | null
  created_at:   string
}

export interface VoucherValidation {
  ok:           boolean
  code:         string
  discount_pct: number
  description:  string
  expires_at:   string | null
}

// ─── Booking Form Schema ─────────────────────────────────────
export const BookingFormSchema = z.object({
  customer_name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  customer_tel:  z.string().regex(/^\d{9,10}$/, 'เบอร์โทรไม่ถูกต้อง'),
  pax_amount:    z.number().min(1).max(20),
  slot_id:       z.number().min(1, 'กรุณาเลือกรอบเวลา'),
  booking_date:  z.string(),
  pay_method:    z.enum(['CASH_DEPOSIT','QR_FULL','QR_DEPOSIT']),
  tier:          z.enum(['SILVER','GOLD','PLATINUM']).optional(),
  voucher_code:  z.string().optional(),
})
export type BookingForm = z.infer<typeof BookingFormSchema>

// ─── Constants ───────────────────────────────────────────────
export const PRICE_PER_PERSON = 299
export const SERVICE_RATE     = 0.10
export const VAT_RATE         = 0.07

export type TierType = 'SILVER' | 'GOLD' | 'PLATINUM'

export const TIER_PRICES: Record<TierType, number> = {
  SILVER: 299, GOLD: 399, PLATINUM: 599,
}

export const TIER_LABELS: Record<TierType, { name: string; desc: string; icon: string }> = {
  SILVER:   { name: 'Silver',   desc: 'บุฟเฟ่ต์มาตรฐาน',    icon: '🥩' },
  GOLD:     { name: 'Gold',     desc: 'บุฟเฟ่ต์พรีเมียม',    icon: '⭐' },
  PLATINUM: { name: 'Platinum', desc: 'บุฟเฟ่ต์สุดพรีเมียม', icon: '�' },
}

export const TIER_LIST: TierType[] = ['SILVER', 'GOLD', 'PLATINUM']

export const DEPOSIT_PER_PAX = 100

export function tierPrice(tier: string): number {
  return TIER_PRICES[tier as TierType] ?? 299
}

export function calcBreakdown(pax: number, tier: string = 'SILVER') {
  const pricePerPerson = tierPrice(tier)
  const subtotal = pax * pricePerPerson
  const service  = Math.round(subtotal * SERVICE_RATE * 100) / 100
  const vat      = Math.round((subtotal + service) * VAT_RATE * 100) / 100
  return { subtotal, service, vat, grand: subtotal + service + vat, pricePerPerson }
}

export function qid(id: number): string {
  return '#' + String(id).padStart(4, '0')
}

export function statusLabel(s: QueueStatus): string {
  const map: Record<QueueStatus, string> = {
    WAITING:   'รอยืนยัน',
    CONFIRMED: 'ยืนยันแล้ว',
    SEATED:    'นั่งโต๊ะแล้ว',
    FINISHED:  'เสร็จสิ้น',
    CANCELLED: 'ยกเลิก',
  }
  return map[s]
}

/** Minutes since queue was created → heat level 0-3 */
export function heatLevel(createdAt: string): 0|1|2|3 {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000
  if (minutes < 5)  return 0
  if (minutes < 15) return 1
  if (minutes < 30) return 2
  return 3
}

export function heatClass(level: 0|1|2|3): string {
  return ['heat-cold','heat-warm','heat-hot','heat-critical'][level]
}

export function payLabel(m: string): string {
  const map: Record<string, string> = {
    CASH: 'เงินสด', CASH_DEPOSIT: 'เงินสด (มัดจำ QR)',
    QR: 'QR PromptPay', QR_FULL: 'QR เต็มจำนวน', QR_DEPOSIT: 'QR มัดจำ',
    PROMPTPAY: 'QR PromptPay', CARD: 'บัตรเครดิต/เดบิต',
  }
  return map[m] ?? m
}
