// src/app/features/staff/staff.page.ts
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, OnDestroy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import {
  injectQuery, injectMutation, injectQueryClient,
} from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { AuthService } from '../../core/services/auth.service'
import { Queue, Table, QueueStatus, statusLabel, heatLevel, heatClass } from '../../core/models'

@Component({
  selector: 'app-staff-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="flex h-dvh overflow-hidden">

      <!-- ═══ SIDEBAR ═══ -->
      <aside class="w-[200px] shrink-0 flex flex-col border-r"
             style="background:var(--color-forge);border-color:rgba(255,255,255,.06)">
        <div class="p-5 border-b" style="border-color:rgba(255,255,255,.06)">
          <div class="num-display text-xl" style="color:var(--color-ash)">BBQ GRILL</div>
          <div class="text-[10px] tracking-widest uppercase mt-0.5" style="color:rgba(255,87,34,.7)">QUEUE SYSTEM</div>
        </div>

        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
          @for (tab of statusTabs; track tab.value) {
            <button (click)="activeFilter.set(tab.value)"
                    class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm font-medium"
                    [style.background]="activeFilter() === tab.value ? 'rgba(255,87,34,.12)' : 'transparent'"
                    [style.color]="activeFilter() === tab.value ? 'var(--color-lava-light)' : 'var(--color-smoke)'"
                    [style.border]="'1px solid ' + (activeFilter() === tab.value ? 'rgba(255,87,34,.22)' : 'transparent')">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" [style.background]="tab.color"></span>
              {{ tab.label }}
              @if (getKpi(tab.value) > 0) {
                <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style="background:rgba(255,87,34,.2);color:var(--color-lava-light)">
                  {{ getKpi(tab.value) }}
                </span>
              }
            </button>
          }
          @if (auth.isAdmin()) {
            <div class="pt-3 mt-3 border-t" style="border-color:rgba(255,255,255,.06)">
              <a routerLink="/admin" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
                 style="color:var(--color-smoke);text-decoration:none">
                📊 Admin
              </a>
              <a routerLink="/" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
                 style="color:var(--color-smoke);text-decoration:none">
                🏠 หน้าลูกค้า
              </a>
            </div>
          }
        </nav>

        <div class="p-4 border-t" style="border-color:rgba(255,255,255,.06)">
          <div class="flex items-center gap-2.5 mb-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                 style="background:rgba(255,87,34,.2);border:1px solid rgba(255,87,34,.25);color:var(--color-lava-light)">
              {{ auth.userInitial() }}
            </div>
            <div>
              <div class="text-sm font-semibold" style="color:var(--color-ash)">{{ auth.userName() }}</div>
              <div class="text-[10px] uppercase" style="color:var(--color-haze)">{{ auth.user()?.role }}</div>
            </div>
          </div>
          <button (click)="auth.logout()" class="w-full py-2 rounded-lg text-xs font-semibold"
                  style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:var(--color-smoke);cursor:pointer">
            ↩ ออกจากระบบ
          </button>
        </div>
      </aside>

      <!-- ═══ MAIN ═══ -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header class="flex items-center gap-4 px-6 py-3.5 border-b shrink-0"
                style="background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.06)">
          <div class="w-2 h-2 rounded-full shrink-0"
               style="background:var(--color-jade);box-shadow:0 0 0 4px rgba(16,185,129,.15)"></div>
          <div class="font-semibold text-lg" style="color:var(--color-ash)">คิววันที่ <span class="font-mono">{{ today }}</span></div>
          <div class="ml-auto font-mono text-xs" style="color:var(--color-smoke)" id="clockDisplay"></div>
          <button (click)="queuesQuery.refetch()" class="w-8 h-8 rounded-lg flex items-center justify-center"
                  style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);cursor:pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-smoke)" stroke-width="2"
                 [class.animate-spin]="queuesQuery.isFetching()">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </header>

        <!-- KPI -->
        <div class="grid grid-cols-5 gap-3 px-6 py-4 shrink-0">
          @for (kpi of kpiTiles; track kpi.label) {
            <div class="rounded-xl px-4 py-3 text-center"
                 style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="num-display text-2xl leading-none mb-1" [style.color]="kpi.color">
                {{ getKpi(kpi.key) }}
              </div>
              <div class="text-[10px] uppercase tracking-wider" style="color:var(--color-haze)">{{ kpi.label }}</div>
            </div>
          }
        </div>

        @if (actionError()) {
          <div class="mx-6 mb-3 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
               style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5">
            {{ actionError() }}
            <button class="ml-auto" style="background:none;border:none;cursor:pointer;color:#fca5a5"
                    (click)="actionError.set('')">✕</button>
          </div>
        }

        <!-- Queue grid -->
        <div class="flex-1 overflow-y-auto px-6 pb-6">
          @if (queuesQuery.isPending()) {
            <div class="flex items-center justify-center h-40">
              <div class="animate-spin rounded-full"
                   style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-lava)"></div>
            </div>
          } @else if (filtered().length === 0) {
            <div class="flex flex-col items-center justify-center h-40 gap-3" style="color:var(--color-haze)">
              <span style="font-size:2rem;opacity:.3">📥</span>
              <span class="text-sm">ไม่มีคิวในขณะนี้</span>
            </div>
          } @else {
            <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
              @for (q of filtered(); track q.queue_id) {
                <div class="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                     [class]="getHeatClass(q)"
                     style="background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.07)">

                  <div class="flex items-start justify-between px-4 pt-4 pb-2">
                    <div>
                      <div class="font-mono text-sm font-semibold" style="color:rgba(196,154,60,.9)">{{ formatQid(q.queue_id) }}</div>
                      <div class="text-[10px] font-mono mt-0.5" style="color:var(--color-haze)">{{ q.created_at | date:'HH:mm' }}</div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap justify-end">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                            [class]="statusBadgeClass(q.queue_status)">{{ getStatusLabel(q.queue_status) }}</span>
                      @if (q.is_paid) {
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                              style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.22);color:var(--color-jade)">PAID</span>
                      }
                      @if (q.is_qr && !q.is_paid) {
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                              style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.22);color:var(--color-azure)">QR</span>
                      }
                    </div>
                  </div>

                  <div class="px-4 pb-3">
                    <div class="font-semibold text-base mb-1" style="color:var(--color-ash)">{{ q.customer_name }}</div>
                    <div class="flex flex-wrap gap-3 text-xs" style="color:var(--color-smoke)">
                      <span>📞 {{ q.customer_tel }}</span>
                      <span>👥 {{ q.pax_amount }} คน</span>
                      @if (q.table_number) { <span>🪑 โต๊ะ #{{ q.table_number }}</span> }
                    </div>
                  </div>

                  <div class="mx-4 mb-3 h-0.5 rounded-full overflow-hidden" style="background:rgba(255,255,255,.06)">
                    <div class="h-full rounded-full"
                         [style.width.%]="Math.min(100, getWaitMinutes(q.created_at) * 2)"
                         [style.background]="getHeatBarColor(q.created_at)"></div>
                  </div>

                  <div class="px-3 pb-3 flex flex-wrap gap-2 border-t pt-2.5"
                       style="border-color:rgba(255,255,255,.05)">

                    @if (q.queue_status === 'WAITING') {
                      @if (q.is_qr && !q.is_paid) {
                        <button (click)="doAction(q.queue_id, 'regen_qr')" class="action-btn ghost">📱 QR ใหม่</button>
                      } @else {
                        <button (click)="doAction(q.queue_id, 'confirm')" class="action-btn jade">✓ ยืนยัน</button>
                      }
                      <button (click)="promptCancel(q)" class="action-btn danger">✕</button>
                    }

                    @if (q.queue_status === 'CONFIRMED') {
                      @if (q.is_qr && !q.is_paid) {
                        <span class="text-xs px-3 py-1.5 rounded-lg"
                              style="background:rgba(255,255,255,.04);color:var(--color-smoke)">⏳ รอชำระ QR</span>
                      } @else {
                        <div class="flex gap-2 w-full items-center">
                          <select [(ngModel)]="selectedTable[q.queue_id]"
                                  class="flex-1 text-xs py-1.5 px-2.5 rounded-lg outline-none"
                                  style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
                            <option value="">— เลือกโต๊ะ —</option>
                            @for (t of tablesQuery.data()?.tables ?? []; track t.table_id) {
                              <option [value]="t.table_id">โต๊ะ #{{ t.table_number }} ({{ t.capacity }} ที่)</option>
                            }
                          </select>
                          <button (click)="seatQueue(q)" [disabled]="!selectedTable[q.queue_id]"
                                  class="action-btn lava">นั่งโต๊ะ</button>
                        </div>
                      }
                      <button (click)="promptCancel(q)" class="action-btn danger">✕</button>
                    }

                    @if (q.queue_status === 'SEATED') {
                      <button (click)="doAction(q.queue_id, 'finish_cash')" class="action-btn lava">💵 เงินสด</button>
                      <button (click)="doAction(q.queue_id, 'finish_card')" class="action-btn ghost">💳 บัตร</button>
                      <button (click)="promptCancel(q)" class="action-btn danger">✕</button>
                    }

                    @if (q.queue_status === 'FINISHED' && q.is_paid) {
                      <a [routerLink]="['/receipt', q.queue_id]" class="action-btn ghost" style="text-decoration:none">🧾 ใบเสร็จ</a>
                    }

                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>
    </div>

    @if (cancelTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="cancelTarget.set(null)">
        <div class="w-full max-w-[380px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(255,255,255,.10);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <div class="text-2xl mb-3">⚠️</div>
          <h3 class="text-lg font-semibold mb-1" style="color:var(--color-ash)">ยืนยันการยกเลิก</h3>
          <p class="text-sm mb-5" style="color:var(--color-smoke)">
            ต้องการยกเลิกคิวของ <strong style="color:var(--color-ash)">{{ cancelTarget()!.customer_name }}</strong> ใช่ไหม?
          </p>
          <div class="px-4 py-3 rounded-xl text-sm mb-5"
               style="background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.22);color:#fcd34d">
            ไม่สามารถย้อนกลับได้
          </div>
          <div class="flex gap-2.5">
            <button (click)="cancelTarget.set(null)" class="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);cursor:pointer">ไม่ใช่</button>
            <button (click)="doCancel()" class="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.30);color:#fca5a5;cursor:pointer">ยืนยันยกเลิก</button>
          </div>
        </div>
      </div>
    }

    <style>
      .action-btn { padding:5px 12px; border-radius:8px; font-size:.78rem; font-weight:700; cursor:pointer; border:1px solid; transition:all .18s; white-space:nowrap; font-family:var(--font-sans); }
      .action-btn.lava   { background:rgba(255,87,34,.12);  border-color:rgba(255,87,34,.28);  color:var(--color-lava-light); }
      .action-btn.jade   { background:rgba(16,185,129,.12); border-color:rgba(16,185,129,.28); color:var(--color-jade); }
      .action-btn.ghost  { background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.10);color:var(--color-smoke); }
      .action-btn.danger { background:rgba(239,68,68,.10);  border-color:rgba(239,68,68,.22);  color:var(--color-crimson); }
      .action-btn:hover  { opacity:.85; }
      .action-btn:disabled { opacity:.4; cursor:not-allowed; }
    </style>
  `,
})
export class StaffPage implements OnDestroy {
  api  = inject(ApiService)
  auth = inject(AuthService)
  private qc = injectQueryClient()

  activeFilter = signal<string>('ALL')
  cancelTarget = signal<Queue | null>(null)
  actionError  = signal('')
  selectedTable: Record<number, string> = {}
  today = new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' })

  queuesQuery = injectQuery(() => ({
    queryKey: ['queues', 'active'],
    queryFn: () => new Promise<{ queues: Queue[] }>((res, rej) => {
      this.api.getQueues('active').subscribe({ next: res, error: rej })
    }),
    refetchInterval: 20_000,
  }))

  tablesQuery = injectQuery(() => ({
    queryKey: ['tables', 'available'],
    queryFn: () => new Promise<{ tables: Table[] }>((res, rej) => {
      this.api.getTables(true).subscribe({ next: res, error: rej })
    }),
    refetchInterval: 30_000,
  }))

  actionMutation = injectMutation(() => ({
    mutationFn: ({ id, action, extra }: { id: number; action: string; extra?: Record<string, unknown> }) =>
      new Promise<unknown>((res, rej) => {
        this.api.updateQueue(id, action, extra).subscribe({ next: res, error: rej })
      }),
    onSuccess: () => {
      this.qc.invalidateQueries({ queryKey: ['queues'] })
      this.qc.invalidateQueries({ queryKey: ['tables'] })
      this.actionError.set('')
    },
    onError: (err: unknown) => {
      this.actionError.set((err as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  queues   = computed(() => this.queuesQuery.data()?.queues ?? [])
  filtered = computed(() => {
    const f = this.activeFilter()
    return f === 'ALL' ? this.queues() : this.queues().filter(q => q.queue_status === f)
  })

  private kpiSnapshot = computed<Record<string, number>>(() => {
    const m: Record<string, number> = { WAITING:0, CONFIRMED:0, SEATED:0, FINISHED:0, CANCELLED:0 }
    for (const q of this.queues()) { if (q.queue_status in m) m[q.queue_status]++ }
    return m
  })
  getKpi(key: string): number { return this.kpiSnapshot()[key] ?? 0 }

  statusTabs = [
    { value: 'ALL',       label: 'ทั้งหมด',    color: 'var(--color-smoke)' },
    { value: 'WAITING',   label: 'รอยืนยัน',   color: 'var(--color-amber)' },
    { value: 'CONFIRMED', label: 'ยืนยันแล้ว', color: 'var(--color-azure)' },
    { value: 'SEATED',    label: 'นั่งโต๊ะ',   color: 'var(--color-jade)' },
    { value: 'FINISHED',  label: 'เสร็จสิ้น',  color: 'var(--color-haze)' },
    { value: 'CANCELLED', label: 'ยกเลิก',      color: 'var(--color-crimson)' },
  ]
  kpiTiles = [
    { key: 'WAITING',   label: 'รอยืนยัน', color: 'var(--color-amber)' },
    { key: 'CONFIRMED', label: 'ยืนยัน',   color: 'var(--color-azure)' },
    { key: 'SEATED',    label: 'นั่งโต๊ะ', color: 'var(--color-jade)' },
    { key: 'FINISHED',  label: 'เสร็จสิ้น',color: 'var(--color-smoke)' },
    { key: 'CANCELLED', label: 'ยกเลิก',   color: 'var(--color-crimson)' },
  ]

  private clockInterval = setInterval(() => {
    const el = document.getElementById('clockDisplay')
    if (el) el.textContent = new Date().toLocaleTimeString('th-TH')
  }, 1000)

  ngOnDestroy() { clearInterval(this.clockInterval) }

  Math = Math

  getStatusLabel(s: QueueStatus) { return statusLabel(s) }
  formatQid(id: number)          { return '#' + String(id).padStart(4, '0') }
  getWaitMinutes(c: string)      { return (Date.now() - new Date(c).getTime()) / 60000 }
  getHeatClass(q: Queue)         { return ['WAITING','CONFIRMED'].includes(q.queue_status) ? heatClass(heatLevel(q.created_at)) : '' }
  getHeatBarColor(c: string): string {
    const m = this.getWaitMinutes(c)
    return m < 5 ? 'rgba(74,84,104,.5)' : m < 15 ? 'rgba(245,158,11,.7)' : m < 30 ? 'rgba(255,87,34,.8)' : '#EF4444'
  }
  statusBadgeClass(s: QueueStatus): string {
    const m: Record<QueueStatus, string> = {
      WAITING:   'bg-amber/10 border border-amber/25 text-amber-400',
      CONFIRMED: 'bg-blue-500/10 border border-blue-500/25 text-blue-400',
      SEATED:    'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400',
      FINISHED:  'bg-gray-500/10 border border-gray-500/20 text-gray-400',
      CANCELLED: 'bg-red-500/10 border border-red-500/20 text-red-400',
    }
    return m[s]
  }
  doAction(id: number, action: string, extra: Record<string, unknown> = {}) {
    this.actionMutation.mutate({ id, action, extra })
  }
  seatQueue(q: Queue) {
    const tid = parseInt(this.selectedTable[q.queue_id] ?? '0')
    if (!tid) return
    this.doAction(q.queue_id, 'seat', { table_id: tid })
    delete this.selectedTable[q.queue_id]
  }
  promptCancel(q: Queue) { this.cancelTarget.set(q) }
  doCancel() {
    const q = this.cancelTarget(); if (!q) return
    this.cancelTarget.set(null)
    this.doAction(q.queue_id, 'cancel')
  }
}
