// src/app/core/services/api.service.ts
import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import {
  Queue, Table, Employee, Payment,
  TodayReport, User, BookingForm, TimeSlot,
  Voucher, VoucherValidation,
} from '../models'

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient)
  private base = '/api'

  // ── Auth ──────────────────────────────────────────────────
  login(username: string, password: string) {
    return this.http.post<{ user: User }>(
      `${this.base}/auth/login`, { username, password },
      { withCredentials: true }
    )
  }
  logout() {
    return this.http.post(`${this.base}/auth/logout`, {}, { withCredentials: true })
  }
  me() {
    return this.http.get<{ user: User | null }>(
      `${this.base}/auth/me`, { withCredentials: true }
    )
  }

  // ── Queues ─────────────────────────────────────────────────
  getQueues(status = 'active', date = ''): Observable<{ queues: Queue[] }> {
    let params = new HttpParams().set('status', status)
    if (date) params = params.set('date', date)
    return this.http.get<{ queues: Queue[] }>(
      `${this.base}/queues`, { params, withCredentials: true }
    )
  }

  createQueue(data: BookingForm): Observable<Queue & { pay_link?: string }> {
    return this.http.post<Queue & { pay_link?: string }>(
      `${this.base}/queues`, data, { withCredentials: true }
    )
  }

  updateQueue(id: number, action: string, extra: Record<string, unknown> = {}) {
    return this.http.patch<{ ok: boolean } & Record<string, unknown>>(
      `${this.base}/queues/${id}`,
      { action, ...extra },
      { withCredentials: true }
    )
  }

  // ── Tables ─────────────────────────────────────────────────
  getTables(available = false): Observable<{ tables: Table[] }> {
    const params = available ? new HttpParams().set('available', '1') : undefined
    return this.http.get<{ tables: Table[] }>(
      `${this.base}/tables`, { params, withCredentials: true }
    )
  }

  // ── Payments ───────────────────────────────────────────────
  confirmPayment(queue_id: number, token: string) {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/payments/confirm`,
      { queue_id, token },
      { withCredentials: true }
    )
  }

  getQueuePublic(queue_id: number, token: string): Observable<Queue> {
    return this.http.get<Queue>(
      `${this.base}/queue-public/${queue_id}`,
      { params: new HttpParams().set('token', token) }
    )
  }

  getPayment(queue_id: number, token = ''): Observable<Payment> {
    let params = new HttpParams()
    if (token) params = params.set('token', token)
    return this.http.get<Payment>(
      `${this.base}/payments/${queue_id}`,
      { params, withCredentials: true }
    )
  }

  getAllPayments(queueId: number): Observable<any> {
    return this.http.get(`${this.base}/payments/all/${queueId}`)
  }

  // ── Employees ──────────────────────────────────────────────
  getEmployees(): Observable<{ employees: Employee[] }> {
    return this.http.get<{ employees: Employee[] }>(
      `${this.base}/employees`, { withCredentials: true }
    )
  }
  createEmployee(data: { emp_name: string; username: string; password: string; role: string }) {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/employees`, data, { withCredentials: true }
    )
  }
  updateEmployee(id: number, action: string, extra: Record<string, unknown> = {}) {
    return this.http.patch<{ ok: boolean }>(
      `${this.base}/employees/${id}`,
      { action, ...extra },
      { withCredentials: true }
    )
  }
  updateEmployeeFull(id: number, data: { emp_name: string; role: string }) {
    return this.http.put<{ ok: boolean }>(
      `${this.base}/employees/${id}`, data, { withCredentials: true }
    )
  }
  deleteEmployee(id: number) {
    return this.http.delete<{ ok: boolean }>(
      `${this.base}/employees/${id}`, { withCredentials: true }
    )
  }

  // ── Time Slots ────────────────────────────────────────────
  getSlots(date = ''): Observable<{ slots: TimeSlot[] }> {
    let params = new HttpParams()
    if (date) params = params.set('date', date)
    return this.http.get<{ slots: TimeSlot[] }>(
      `${this.base}/slots`, { params, withCredentials: true }
    )
  }

  createSlot(data: { slot_time: string; max_capacity: number }): Observable<{ ok: boolean; slot_id: number }> {
    return this.http.post<{ ok: boolean; slot_id: number }>(
      `${this.base}/slots`, data, { withCredentials: true }
    )
  }

  updateSlot(id: number, data: { max_capacity?: number; is_active?: number; slot_time?: string }) {
    return this.http.patch<{ ok: boolean }>(
      `${this.base}/slots/${id}`, data, { withCredentials: true }
    )
  }

  // ── Reports ────────────────────────────────────────────────
  getTodayReport(): Observable<TodayReport> {
    return this.http.get<TodayReport>(
      `${this.base}/reports/today`, { withCredentials: true }
    )
  }

  // ── Customers ─────────────────────────────────────────────
  getCustomers(): Observable<any> {
    return this.http.get(`${this.base}/customers`, { withCredentials: true })
  }

  getCustomerHistory(id: number): Observable<any> {
    return this.http.get(`${this.base}/customers/${id}/history`, { withCredentials: true })
  }

  // ── Vouchers ────────────────────────────────────────────────
  validateVoucher(code: string): Observable<VoucherValidation> {
    return this.http.post<VoucherValidation>(
      `${this.base}/vouchers/validate`,
      { code },
      { withCredentials: true }
    )
  }

  getVouchers(): Observable<{ vouchers: Voucher[] }> {
    return this.http.get<{ vouchers: Voucher[] }>(
      `${this.base}/vouchers`, { withCredentials: true }
    )
  }

  createVoucher(data: {
    code: string; discount_pct: number; max_uses: number;
    expires_at: string; description: string; is_active: number
  }): Observable<{ ok: boolean; voucher_id: number }> {
    return this.http.post<{ ok: boolean; voucher_id: number }>(
      `${this.base}/vouchers`, data, { withCredentials: true }
    )
  }

  updateVoucher(id: number, data: Record<string, unknown>): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(
      `${this.base}/vouchers/${id}`, data, { withCredentials: true }
    )
  }

  deleteVoucher(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(
      `${this.base}/vouchers/${id}`, { withCredentials: true }
    )
  }
}
