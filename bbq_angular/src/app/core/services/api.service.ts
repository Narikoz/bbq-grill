// src/app/core/services/api.service.ts
import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import {
  Queue, Table, Employee, Payment,
  TodayReport, User, BookingForm
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

  getPayment(queue_id: number, token = ''): Observable<Payment> {
    let params = new HttpParams()
    if (token) params = params.set('token', token)
    return this.http.get<Payment>(
      `${this.base}/payments/${queue_id}`,
      { params, withCredentials: true }
    )
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

  // ── Reports ────────────────────────────────────────────────
  getTodayReport(): Observable<TodayReport> {
    return this.http.get<TodayReport>(
      `${this.base}/reports/today`, { withCredentials: true }
    )
  }
}
