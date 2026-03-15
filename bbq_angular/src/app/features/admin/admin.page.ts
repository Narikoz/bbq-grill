// src/app/features/admin/admin.page.ts
import {
  Component, inject, signal, ChangeDetectionStrategy,
  afterNextRender, viewChild, ElementRef,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms'
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { AuthService } from '../../core/services/auth.service'
import { Employee, TodayReport } from '../../core/models'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

@Component({
  selector: 'app-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="flex h-dvh overflow-hidden">

      <!-- ═══ SIDEBAR ═══ -->
      <aside class="w-[200px] shrink-0 flex flex-col border-r"
             style="background:var(--color-forge);border-color:rgba(255,255,255,.06)">
        <div class="p-5 border-b" style="border-color:rgba(255,255,255,.06)">
          <div class="num-display text-xl" style="color:var(--color-ash)">BBQ GRILL</div>
          <div class="text-[10px] tracking-widest uppercase mt-0.5" style="color:rgba(255,87,34,.7)">ADMIN PANEL</div>
        </div>
        <nav class="flex-1 p-3 space-y-0.5">
          <a routerLink="/admin" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
             style="background:rgba(255,87,34,.12);border:1px solid rgba(255,87,34,.22);color:var(--color-lava-light);text-decoration:none">
            📊 Dashboard
          </a>
          <a routerLink="/staff" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
             style="color:var(--color-smoke);text-decoration:none">
            📋 คิว
          </a>
          <a routerLink="/" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
             style="color:var(--color-smoke);text-decoration:none">
            🏠 หน้าลูกค้า
          </a>
        </nav>
        <div class="p-4 border-t" style="border-color:rgba(255,255,255,.06)">
          <button (click)="auth.logout()" class="w-full py-2 rounded-lg text-xs font-semibold"
                  style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:var(--color-smoke);cursor:pointer">
            ↩ ออกจากระบบ
          </button>
        </div>
      </aside>

      <!-- ═══ MAIN ═══ -->
      <main class="flex-1 overflow-y-auto p-8 min-w-0">

        <div class="mb-8">
          <h1 class="num-display text-4xl mb-1" style="color:var(--color-ash)">DASHBOARD</h1>
          <p class="text-sm font-mono" style="color:var(--color-smoke)">{{ todayStr }}</p>
        </div>

        @if (reportQuery.isPending()) {
          <div class="flex items-center justify-center h-32">
            <div class="animate-spin rounded-full"
                 style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-lava)"></div>
          </div>
        }

        @if (reportQuery.data(); as r) {

          <!-- KPI -->
          <div class="grid grid-cols-4 gap-4 mb-8">
            <div class="rounded-2xl p-5 text-center"
                 style="background:linear-gradient(135deg,rgba(255,87,34,.10),rgba(255,87,34,.04));border:1px solid rgba(255,87,34,.18)">
              <div class="num-display text-3xl mb-1" style="color:var(--color-lava-light)">
                ฿{{ r.revenue.rev | number:'1.0-0' }}
              </div>
              <div class="text-[10px] uppercase tracking-widest" style="color:rgba(255,87,34,.6)">รายได้วันนี้</div>
            </div>
            <div class="rounded-2xl p-5 text-center"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
              <div class="num-display text-3xl mb-1" style="color:var(--color-jade)">{{ r.by_status['FINISHED'] ?? 0 }}</div>
              <div class="text-[10px] uppercase tracking-widest" style="color:var(--color-haze)">คิวเสร็จสิ้น</div>
            </div>
            <div class="rounded-2xl p-5 text-center"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
              <div class="num-display text-3xl mb-1" style="color:var(--color-azure)">{{ r.total_today }}</div>
              <div class="text-[10px] uppercase tracking-widest" style="color:var(--color-haze)">คิวทั้งหมด</div>
            </div>
            <div class="rounded-2xl p-5 text-center"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
              <div class="num-display text-3xl mb-1" style="color:var(--color-amber)">{{ r.avg_dine_min ?? '—' }}</div>
              <div class="text-[10px] uppercase tracking-widest" style="color:var(--color-haze)">เฉลี่ยนั่ง (นาที)</div>
            </div>
          </div>

          <!-- Charts row -->
          <div class="grid grid-cols-[1fr_280px] gap-6 mb-8">
            <div class="rounded-2xl p-6"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-1 h-4 rounded-full" style="background:var(--color-lava)"></div>
                <span class="text-sm font-semibold" style="color:var(--color-ash)">รายได้ 7 วันย้อนหลัง</span>
              </div>
              <div style="height:180px;position:relative;">
                <canvas #chartRef></canvas>
              </div>
            </div>

            <div class="rounded-2xl p-6"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-1 h-4 rounded-full" style="background:var(--color-azure)"></div>
                <span class="text-sm font-semibold" style="color:var(--color-ash)">สถานะวันนี้</span>
              </div>
              <div class="space-y-2.5">
                @for (st of statusRows; track st.key) {
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full shrink-0" [style.background]="st.color"></div>
                    <span class="text-sm flex-1" style="color:var(--color-smoke)">{{ st.label }}</span>
                    <span class="num-display text-xl" [style.color]="st.color">{{ r.by_status[st.key] ?? 0 }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Payment methods -->
          @if (r.by_method.length > 0) {
            <div class="flex gap-4 mb-8 flex-wrap">
              @for (m of r.by_method; track m.payment_method) {
                <div class="rounded-xl px-5 py-4 flex items-center gap-4"
                     style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                  <span class="text-2xl">{{ methodIcon(m.payment_method) }}</span>
                  <div>
                    <div class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ m.rev | number:'1.0-0' }}</div>
                    <div class="text-xs" style="color:var(--color-smoke)">{{ methodLabel(m.payment_method) }} · {{ m.cnt }} รายการ</div>
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- Employees -->
        <div class="mb-6 flex items-center gap-4">
          <div class="w-1 h-5 rounded-full" style="background:var(--color-lava)"></div>
          <h2 class="text-lg font-semibold" style="color:var(--color-ash)">จัดการพนักงาน</h2>
          <div class="flex-1 h-px" style="background:rgba(255,255,255,.07)"></div>
          <button (click)="showCreate.set(true)"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style="background:rgba(255,87,34,.12);border:1px solid rgba(255,87,34,.25);color:var(--color-lava-light);cursor:pointer">
            + เพิ่มพนักงาน
          </button>
        </div>

        @if (flashMsg()) {
          <div class="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm mb-4"
               [style.background]="flashMsg()!.ok ? 'rgba(16,185,129,.09)' : 'rgba(239,68,68,.09)'"
               [style.border]="'1px solid ' + (flashMsg()!.ok ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)')"
               [style.color]="flashMsg()!.ok ? '#86efac' : '#fca5a5'">
            {{ flashMsg()!.ok ? '✓' : '✕' }} {{ flashMsg()!.text }}
          </div>
        }

        @if (!empQuery.isPending()) {
          <div class="rounded-2xl overflow-hidden" style="border:1px solid rgba(255,255,255,.07)">
            <table class="w-full">
              <thead>
                <tr style="background:rgba(255,255,255,.03)">
                  @for (h of tableHeaders; track h) {
                    <th class="text-left px-5 py-3 text-[10px] font-bold tracking-widest uppercase"
                        style="color:var(--color-haze);border-bottom:1px solid rgba(255,255,255,.06)">{{ h }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (e of empQuery.data()?.employees ?? []; track e.emp_id) {
                  <tr style="border-bottom:1px solid rgba(255,255,255,.04)">
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                             style="background:rgba(255,87,34,.15);border:1px solid rgba(255,87,34,.20);color:var(--color-lava-light)">
                          {{ e.emp_name.charAt(0) }}
                        </div>
                        <div>
                          <div class="text-sm font-semibold" style="color:var(--color-ash)">{{ e.emp_name }}</div>
                          <div class="text-xs font-mono" style="color:var(--color-haze)">{{ getAtUsername(e.username) }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <span class="text-[10px] font-bold px-2 py-1 rounded-md uppercase"
                            [style.background]="e.role === 'ADMIN' ? 'rgba(255,87,34,.12)' : 'rgba(59,130,246,.10)'"
                            [style.border]="'1px solid ' + (e.role === 'ADMIN' ? 'rgba(255,87,34,.25)' : 'rgba(59,130,246,.22)')"
                            [style.color]="e.role === 'ADMIN' ? 'var(--color-lava-light)' : 'var(--color-azure)'">
                        {{ e.role }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <span class="text-[10px] font-bold px-2 py-1 rounded-md uppercase"
                            [style.background]="e.is_active ? 'rgba(16,185,129,.10)' : 'rgba(239,68,68,.08)'"
                            [style.border]="'1px solid ' + (e.is_active ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.18)')"
                            [style.color]="e.is_active ? 'var(--color-jade)' : 'var(--color-crimson)'">
                        {{ e.is_active ? 'ACTIVE' : 'DISABLED' }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="openReset(e)"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">
                          🔑 Reset
                        </button>
                        <button (click)="toggleActive(e)"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                [style.background]="e.is_active ? 'rgba(239,68,68,.10)' : 'rgba(16,185,129,.10)'"
                                [style.border]="'1px solid ' + (e.is_active ? 'rgba(239,68,68,.22)' : 'rgba(16,185,129,.22)')"
                                [style.color]="e.is_active ? 'var(--color-crimson)' : 'var(--color-jade)'"
                                style="cursor:pointer">
                          {{ e.is_active ? 'ปิด' : 'เปิด' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

      </main>
    </div>

    <!-- Create Modal -->
    @if (showCreate()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="showCreate.set(false)">
        <div class="w-full max-w-[420px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(255,255,255,.10);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <h3 class="text-xl font-semibold mb-6" style="color:var(--color-ash)">➕ เพิ่มพนักงาน</h3>
          <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="flex flex-col gap-4">
            @for (field of createFields; track field.key) {
              <div>
                <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                       style="color:var(--color-smoke)">{{ field.label }}</label>
                @if (field.type === 'select') {
                  <select [formControlName]="field.key" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                } @else {
                  <input [type]="field.type" [formControlName]="field.key" [placeholder]="field.placeholder"
                         class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                         style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);font-family:var(--font-sans)">
                }
              </div>
            }
            <div class="flex gap-2.5 mt-2">
              <button type="button" (click)="showCreate.set(false)" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">ยกเลิก</button>
              <button type="submit" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:linear-gradient(135deg,var(--color-lava-light),var(--color-lava));color:#fff;border:none;cursor:pointer">สร้าง</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Reset Password Modal -->
    @if (resetTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="resetTarget.set(null)">
        <div class="w-full max-w-[380px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(255,255,255,.10);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <h3 class="text-xl font-semibold mb-2" style="color:var(--color-ash)">🔑 Reset รหัสผ่าน</h3>
          <p class="text-sm mb-6" style="color:var(--color-smoke)">{{ resetTarget()!.emp_name }}</p>
          <form [formGroup]="resetForm" (ngSubmit)="submitReset()" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke)">รหัสผ่านใหม่ (≥ 6 ตัว)</label>
              <input type="password" formControlName="password" placeholder="รหัสผ่านใหม่"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);font-family:var(--font-sans)">
            </div>
            <div class="flex gap-2.5">
              <button type="button" (click)="resetTarget.set(null)" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">ยกเลิก</button>
              <button type="submit" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:linear-gradient(135deg,#FBBF24,#F59E0B);color:#1a0e00;border:none;cursor:pointer">บันทึก</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class AdminPage {
  auth = inject(AuthService)
  private api = inject(ApiService)
  private fb  = inject(FormBuilder)
  private qc  = injectQueryClient()

  showCreate  = signal(false)
  resetTarget = signal<Employee | null>(null)
  flashMsg    = signal<{ ok: boolean; text: string } | null>(null)
  todayStr    = new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  chartRef = viewChild<ElementRef<HTMLCanvasElement>>('chartRef')

  reportQuery = injectQuery(() => ({
    queryKey: ['report', 'today'],
    queryFn: () => new Promise<TodayReport>((res, rej) => {
      this.api.getTodayReport().subscribe({ next: res, error: rej })
    }),
    refetchInterval: 60_000,
  }))

  empQuery = injectQuery(() => ({
    queryKey: ['employees'],
    queryFn: () => new Promise<{ employees: Employee[] }>((res, rej) => {
      this.api.getEmployees().subscribe({ next: res, error: rej })
    }),
  }))

  empMutation = injectMutation(() => ({
    mutationFn: ({ action, id, extra }: { action: string; id?: number; extra?: Record<string, unknown> }) =>
      new Promise<unknown>((res, rej) => {
        if (action === 'create') {
          this.api.createEmployee(extra as { emp_name: string; username: string; password: string; role: string })
            .subscribe({ next: res, error: rej })
        } else {
          this.api.updateEmployee(id!, action, extra).subscribe({ next: res, error: rej })
        }
      }),
    onSuccess: (_: unknown, vars: { action: string; id?: number; extra?: Record<string, unknown> }) => {
      this.qc.invalidateQueries({ queryKey: ['employees'] })
      const msg = vars.action === 'create' ? 'สร้างบัญชีสำเร็จ' :
                  vars.action === 'reset_password' ? 'Reset รหัสผ่านสำเร็จ' : 'อัปเดตสำเร็จ'
      this.showFlash(true, msg)
      this.showCreate.set(false)
      this.resetTarget.set(null)
    },
    onError: (err: unknown) => {
      this.showFlash(false, (err as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  createForm = this.fb.group({
    emp_name: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role:     ['STAFF'],
  })
  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
  })

  statusRows = [
    { key: 'WAITING',   label: 'รอยืนยัน', color: 'var(--color-amber)' },
    { key: 'CONFIRMED', label: 'ยืนยัน',    color: 'var(--color-azure)' },
    { key: 'SEATED',    label: 'นั่งโต๊ะ', color: 'var(--color-jade)' },
    { key: 'FINISHED',  label: 'เสร็จ',     color: 'var(--color-smoke)' },
    { key: 'CANCELLED', label: 'ยกเลิก',    color: 'var(--color-crimson)' },
  ]
  tableHeaders = ['พนักงาน', 'Role', 'สถานะ', '']
  createFields = [
    { key: 'emp_name', label: 'ชื่อ-นามสกุล', type: 'text',     placeholder: 'ชื่อพนักงาน' },
    { key: 'username', label: 'Username',       type: 'text',     placeholder: 'username' },
    { key: 'password', label: 'Password (≥ 6)', type: 'password', placeholder: 'รหัสผ่าน' },
    { key: 'role',     label: 'Role',           type: 'select',   placeholder: '' },
  ]

  constructor() {
    afterNextRender(() => { this.buildChart() })
  }

  private buildChart() {
    const canvas = this.chartRef()?.nativeElement
    if (!canvas) return

    const labels: string[] = []
    const data: number[]   = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      labels.push(d.toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit' }))
      data.push(0)
    }

    const r = this.reportQuery.data()
    if (r) data[6] = r.revenue.rev

    const ctx = canvas.getContext('2d')!
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((_,i) => i === data.length-1 ? 'rgba(255,87,34,.80)' : 'rgba(255,87,34,.25)'),
          borderColor:     data.map((_,i) => i === data.length-1 ? '#FF5722' : 'rgba(255,87,34,.4)'),
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => '฿' + (c.parsed.y as number).toLocaleString('th-TH') },
            backgroundColor: '#1A1D2E', borderColor: 'rgba(255,255,255,.10)', borderWidth: 1,
            titleColor: '#E8ECF5', bodyColor: '#FF8A65', padding: 10,
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#4A5468', font: { family: 'JetBrains Mono', size: 11 } }, border: { color: 'rgba(255,255,255,.06)' } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#4A5468', font: { family: 'JetBrains Mono', size: 11 }, callback: (v) => '฿' + (Number(v) >= 1000 ? (Number(v)/1000).toFixed(1)+'k' : v) }, border: { color: 'rgba(255,255,255,.06)' } }
        }
      }
    })
  }

  // Fix: use method to prefix username with @ symbol (avoid @ being parsed as Angular block)
  getAtUsername(username: string): string { return '@' + username }

  submitCreate() {
    if (this.createForm.invalid) return
    const v = this.createForm.value
    this.empMutation.mutate({ action: 'create', extra: { emp_name: v.emp_name!, username: v.username!, password: v.password!, role: v.role! } })
    this.createForm.reset({ role: 'STAFF' })
  }

  openReset(e: Employee) { this.resetTarget.set(e); this.resetForm.reset() }
  submitReset() {
    if (this.resetForm.invalid) return
    this.empMutation.mutate({ action: 'reset_password', id: this.resetTarget()!.emp_id, extra: { password: this.resetForm.value.password } })
  }
  toggleActive(e: Employee) {
    this.empMutation.mutate({ action: 'toggle_active', id: e.emp_id, extra: { is_active: e.is_active ? 0 : 1 } })
  }
  showFlash(ok: boolean, text: string) {
    this.flashMsg.set({ ok, text })
    setTimeout(() => this.flashMsg.set(null), 4000)
  }
  methodLabel(m: string) { return { CASH:'เงินสด', QR:'QR PromptPay', PROMPTPAY:'QR PromptPay', CARD:'บัตร' }[m] ?? m }
  methodIcon(m: string)  { return { CASH:'💵', QR:'📱', PROMPTPAY:'📱', CARD:'💳' }[m] ?? '💰' }
}
