// src/app/features/queue-status/queue-status.page.ts
import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { Queue, statusLabel, tierPrice } from '../../core/models'
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service'

@Component({
  selector: 'app-queue-status-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  styles: [`
    /* ═══ GLASS CARD ═══ */
    .glass-card {
      background: rgba(255,255,255,.04);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 22px;
    }

    /* ═══ BRAND GLOW ═══ */
    .animate-glow-gold {
      animation: glowPulse 3s ease-in-out infinite;
    }
    @keyframes glowPulse {
      0%, 100% { filter: drop-shadow(0 0 12px rgba(201,168,76,.3)); }
      50% { filter: drop-shadow(0 0 24px rgba(201,168,76,.5)); }
    }

    /* ═══ SCORE LINES BG ═══ */
    .score-lines {
      background: linear-gradient(160deg, #050608 0%, #0a0810 100%);
    }

    /* ═══ ENTRANCE ═══ */
    .animate-thermal-in {
      animation: thermalIn .45s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes thermalIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ═══ SAVE BUTTON ═══ */
    .btn-save-img {
      background: linear-gradient(135deg, rgba(201,168,76,.90), rgba(201,168,76,.65));
      color: #050608;
      transition: all .25s cubic-bezier(.4,0,.2,1);
      cursor: pointer;
      backdrop-filter: blur(8px);
    }
    .btn-save-img:hover {
      background: linear-gradient(135deg, rgba(201,168,76,1), rgba(201,168,76,.85));
      transform: scale(1.02);
      box-shadow: 0 8px 30px rgba(201,168,76,.4);
    }
    .btn-save-img:active {
      transform: scale(0.97);
    }
  `],
  template: `
    <div class="min-h-dvh flex items-center justify-center p-6 score-lines relative">

      <div class="absolute inset-0 pointer-events-none"
           style="background:radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,168,76,.07), transparent 60%)"></div>

      <div class="w-full max-w-[480px] relative z-10">

        <!-- Brand -->
        <div class="text-center mb-8">
          <div class="mb-3 animate-glow-gold" style="font-size:3.5rem;line-height:1"><span class="css-flame"></span></div>
          <div class="font-display text-3xl tracking-widest mb-1" style="background:linear-gradient(135deg,#D4B962,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent">BBQ GRILL</div>
          <div class="text-xs tracking-[.2em] uppercase" style="color:var(--color-haze)">ติดตามสถานะคิว</div>
        </div>

        @if (queueQuery.isPending()) {
          <div class="glass-card p-12 text-center">
            <div class="animate-spin rounded-full mx-auto"
                 style="width:32px;height:32px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
            <p class="text-sm mt-4" style="color:var(--color-smoke)">กำลังโหลด...</p>
          </div>
        }

        @if (queueQuery.isError()) {
          <div class="glass-card p-8 text-center">
            <div class="text-5xl mb-4">🔍</div>
            <p class="text-lg font-semibold mb-2" style="color:var(--color-ash)">ไม่พบคิว</p>
            <p class="text-sm mb-6" style="color:var(--color-smoke)">กรุณาตรวจสอบหมายเลขคิวของคุณ</p>
            <a routerLink="/booking" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
               style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;text-decoration:none;font-family:var(--font-sans)">
              จองใหม่
            </a>
          </div>
        }

        @if (queueQuery.data(); as q) {
          <div class="glass-card p-8 animate-thermal-in">

            <!-- Queue ID -->
            <div class="text-center mb-6">
              <div class="font-mono text-5xl font-bold mb-2" style="color:var(--color-gold)">{{ q.queue_id_str }}</div>
              <div class="text-xs uppercase tracking-widest" style="color:var(--color-haze)">หมายเลขคิวของคุณ</div>
            </div>

            <!-- Status Badge -->
            <div class="flex justify-center mb-8">
              <div class="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider"
                   [style.background]="getStatusBg(q.queue_status)"
                   [style.border]="'1px solid ' + getStatusBorder(q.queue_status)"
                   [style.color]="getStatusColor(q.queue_status)">
                {{ getStatusLabel(q.queue_status) }}
              </div>
            </div>

            <!-- Info Grid -->
            <div class="space-y-3 mb-6">
              <div class="py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                <div class="text-xs mb-1" style="color:var(--color-smoke)">วันที่จอง</div>
                <div class="text-sm font-semibold" style="color:var(--color-gold);font-family:'Kanit',sans-serif">{{ thaiDateTime(q.created_at) }}</div>
              </div>
              <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                <span class="text-sm" style="color:var(--color-smoke)">ชื่อผู้จอง</span>
                <span class="text-sm font-semibold" style="color:var(--color-ash)">{{ q.customer_name }}</span>
              </div>
              <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                <span class="text-sm" style="color:var(--color-smoke)">เบอร์โทรศัพท์</span>
                <span class="text-sm font-mono" style="color:var(--color-ash)">{{ q.customer_tel }}</span>
              </div>
              <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                <span class="text-sm" style="color:var(--color-smoke)">วันที่จะใช้บริการ</span>
                <span class="text-sm font-semibold" style="color:var(--color-ash)">{{ formatDate(q.booking_time) }}</span>
              </div>
              <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                <span class="text-sm" style="color:var(--color-smoke)">เวลาที่จะใช้บริการ</span>
                <span class="text-sm font-mono" style="color:var(--color-ash)">{{ formatTime(q.booking_time) }}</span>
              </div>
              <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                <span class="text-sm" style="color:var(--color-smoke)">จำนวนคน</span>
                <span class="text-sm font-semibold" style="color:var(--color-ash)">{{ q.pax_amount }} คน</span>
              </div>
              <!-- Price Breakdown -->
              @if (isDepositMethod(q.pay_method ?? '') && q.is_paid) {
                <!-- Deposit method + paid: show 3 rows -->
                <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                  <span class="text-sm" style="color:var(--color-smoke)">ราคารวม</span>
                  <span class="text-sm font-semibold" style="color:var(--color-ash)">฿{{ calcGrand(q.pax_amount, q.price_per_person).toFixed(2) }}</span>
                </div>
                <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                  <span class="text-sm" style="color:var(--color-jade)">หักมัดจำ</span>
                  <span class="text-sm font-semibold" style="color:var(--color-jade)">-฿{{ calcDeposit(q.pax_amount).toFixed(2) }}</span>
                </div>
                <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                  <span class="text-base font-bold" style="color:var(--color-gold)">ยอดคงเหลือ</span>
                  <span class="text-xl font-bold" style="color:var(--color-gold);font-family:'Kanit',sans-serif">฿{{ calcRemaining(q.pax_amount, q.price_per_person).toFixed(2) }}</span>
                </div>
              } @else {
                <!-- Full payment or unpaid: show single row -->
                <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                  <span class="text-sm" style="color:var(--color-smoke)">ราคารวม</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold" style="color:var(--color-gold)">฿{{ calcGrand(q.pax_amount, q.price_per_person).toFixed(2) }}</span>
                    @if (q.is_paid) {
                      <span class="text-xs px-2 py-0.5 rounded" style="background:rgba(16,185,129,.15);color:var(--color-jade)">✅ ชำระครบแล้ว</span>
                    }
                  </div>
                </div>
              }
              @if (q.table_number) {
                <div class="flex items-center justify-between py-3 border-b" style="border-color:rgba(255,255,255,.06)">
                  <span class="text-sm" style="color:var(--color-smoke)">โต๊ะ</span>
                  <span class="text-sm font-semibold" style="color:var(--color-gold)">#{{ q.table_number }}</span>
                </div>
              }
            </div>

            <!-- Wait Time Estimate -->
            @if (q.queue_status === 'WAITING' || q.queue_status === 'CONFIRMED') {
              <div class="rounded-xl p-4 mb-6"
                   style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.18)">
                <div class="flex items-center gap-3">
                  <div class="text-2xl">⏱️</div>
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color:rgba(201,168,76,.7)">เวลารอโดยประมาณ</div>
                    <div class="text-xl font-semibold" style="color:var(--color-gold);font-family:'Kanit',sans-serif">{{ estimatedWait() }}</div>
                  </div>
                </div>
              </div>
            }

            <!-- Payment Info -->
            @if (q.is_qr && !q.is_paid && q.pay_token) {
              <div class="rounded-xl p-4 mb-6"
                   style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.18)">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📱</span>
                    <span class="text-sm font-semibold" style="color:var(--color-azure)">รอชำระเงิน QR</span>
                  </div>
                  <a [routerLink]="['/pay', queueId()]" [queryParams]="{ token: q.pay_token }"
                     class="px-4 py-2 rounded-lg text-xs font-bold"
                     style="background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.25);color:var(--color-azure);text-decoration:none">
                    ชำระเงิน
                  </a>
                </div>
              </div>
            }

            @if (q.is_paid && isDepositMethod(q.pay_method ?? '')) {
              <div class="rounded-xl p-4 mb-6"
                   style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.30)">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">💰</span>
                  <span class="text-sm font-semibold" style="color:var(--color-gold)">กรุณาแคปหน้าจอและชำระยอดคงเหลือหน้าร้าน</span>
                </div>
                <p class="text-xs leading-relaxed" style="color:var(--color-gold);opacity:.85">
                  📸 บันทึกหน้าจอนี้พร้อมสลิปการโอนเงิน<br>
                  แล้วชำระยอดคงเหลือ ฿{{ calcRemaining(q.pax_amount).toFixed(2) }} ต่อพนักงานเมื่อมาถึงร้าน
                </p>
              </div>
            } @else if (q.is_paid) {
              <div class="rounded-xl p-4 mb-6"
                   style="background:rgba(16,185,129,.10);border:1px solid var(--color-jade)">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">✅</span>
                  <span class="text-sm font-semibold" style="color:var(--color-jade)">ชำระเงินแล้ว</span>
                </div>
                <p class="text-xs leading-relaxed" style="color:var(--color-jade);opacity:.85">
                  📸 บันทึกหน้าจอนี้พร้อมสลิปการโอนเงิน<br>
                  แล้วแสดงต่อพนักงานเมื่อมาถึงร้าน
                </p>
              </div>
            }

            <!-- Auto Refresh Notice -->
            <div class="text-center text-xs mb-6" style="color:var(--color-haze)">
              🔄 อัปเดตอัตโนมัติทุก 10 วินาที
            </div>

            <!-- Actions -->
            <div class="space-y-3">
              @if (q.is_paid) {
                <button (click)="captureScreenshot()" class="btn-save-img w-full py-3.5 rounded-xl text-sm font-bold border-none">
                  📷 บันทึกใบยืนยัน
                </button>
              }
              <div class="flex gap-3">
                <a routerLink="/booking" class="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
                   style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);text-decoration:none">
                  จองใหม่
                </a>
                @if (q.queue_status === 'WAITING') {
                  <button (click)="showCancelModal.set(true)" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                          style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:var(--color-crimson);cursor:pointer">
                    ยกเลิกการจอง
                  </button>
                }
              </div>
            </div>

          </div>
        }

      </div>
    </div>

    @if (showCancelModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5 animate-thermal-in"
           style="background:rgba(5,6,8,.85);backdrop-filter:blur(12px)"
           (click)="showCancelModal.set(false)">
        <div class="w-full max-w-[380px] rounded-2xl p-8 animate-thermal-in"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(239,68,68,.30);box-shadow:0 0 40px rgba(239,68,68,.08),0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <div class="text-4xl mb-3">⚠️</div>
          <h3 class="text-lg font-semibold mb-1" style="color:var(--color-ash)">ยืนยันการยกเลิก</h3>
          <p class="text-sm mb-5" style="color:var(--color-smoke)">
            การยกเลิกไม่สามารถย้อนกลับได้
          </p>
          <div class="px-4 py-3 rounded-xl text-sm mb-5"
               style="background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.22);color:#fcd34d">
            ⚠️ คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจอง?
          </div>
          <div class="flex gap-2.5">
            <button (click)="showCancelModal.set(false)" class="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);cursor:pointer">ไม่ใช่</button>
            <button (click)="confirmCancel()" class="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.30);color:#fca5a5;cursor:pointer">ยืนยันยกเลิก</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class QueueStatusPage {
  private route = inject(ActivatedRoute)
  private api = inject(ApiService)
  private confirmDialog = inject(ConfirmDialogService)

  queueId = computed(() => parseInt(this.route.snapshot.paramMap.get('id') ?? '0'))
  showCancelModal = signal(false)

  private pushRequested = false
  private _pushEffect = effect(() => {
    const q = this.queueQuery.data()
    if (q && (q.queue_status === 'WAITING' || q.queue_status === 'CONFIRMED')) {
      this.requestPushPermission(q.queue_id)
    }
  })

  queueQuery = injectQuery(() => ({
    queryKey: ['queue-status', this.queueId()],
    queryFn: () => new Promise<Queue>((res, rej) => {
      this.api.getQueues('all').subscribe({
        next: (data: { queues: Queue[] }) => {
          const q = data.queues.find((q: Queue) => q.queue_id === this.queueId())
          if (q) res(q)
          else rej(new Error('Queue not found'))
        },
        error: rej
      })
    }),
    refetchInterval: 10_000, // Auto-refresh every 10s
  }))

  estimatedWait = computed(() => {
    const q = this.queueQuery.data()
    if (!q) return '—'
    if (q.queue_status === 'SEATED') return 'ถึงคิวของคุณแล้ว!'
    const minutes = (Date.now() - new Date(q.created_at).getTime()) / 60000
    if (minutes <= 0) return 'ถึงคิวของคุณแล้ว!'
    if (minutes < 5)  return 'เกือบถึงคิวของคุณแล้ว!'
    if (minutes < 15) return '~15 นาที'
    if (minutes < 30) return '~30 นาที'
    if (minutes < 45) return '~45 นาที'
    return '~45 นาที'
  })

  thaiDateTime(dateStr: string): string {
    const d = new Date(dateStr)
    const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    const dayName = days[d.getDay()]
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear() + 543
    const hh = String(d.getHours()).padStart(2,'0')
    const mm = String(d.getMinutes()).padStart(2,'0')
    return `วัน${dayName}ที่ ${day} ${month} ${year} เวลา ${hh}:${mm}`
  }

  getStatusLabel(s: string) { return statusLabel(s as any) }
  getStatusBg(s: string): string {
    const m: Record<string, string> = {
      WAITING: 'rgba(245,158,11,.10)',
      CONFIRMED: 'rgba(59,130,246,.10)',
      SEATED: 'rgba(16,185,129,.10)',
      FINISHED: 'rgba(107,114,128,.10)',
      CANCELLED: 'rgba(239,68,68,.10)',
    }
    return m[s] ?? 'rgba(255,255,255,.05)'
  }
  getStatusBorder(s: string): string {
    const m: Record<string, string> = {
      WAITING: 'rgba(245,158,11,.25)',
      CONFIRMED: 'rgba(59,130,246,.25)',
      SEATED: 'rgba(16,185,129,.25)',
      FINISHED: 'rgba(107,114,128,.20)',
      CANCELLED: 'rgba(239,68,68,.22)',
    }
    return m[s] ?? 'rgba(255,255,255,.10)'
  }
  getStatusColor(s: string): string {
    const m: Record<string, string> = {
      WAITING: 'var(--color-amber)',
      CONFIRMED: 'var(--color-azure)',
      SEATED: 'var(--color-jade)',
      FINISHED: 'var(--color-smoke)',
      CANCELLED: 'var(--color-crimson)',
    }
    return m[s] ?? 'var(--color-ash)'
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear() + 543
    return `${day}/${month}/${year}`
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm} น.`
  }

  formatPrice(amount: number): string {
    return '฿' + amount.toLocaleString('th-TH')
  }

  confirmCancel() {
    this.showCancelModal.set(false)
    this.api.updateQueue(this.queueId(), 'cancel').subscribe({
      next: () => {
        this.queueQuery.refetch()
      },
      error: (err: any) => {
        this.confirmDialog.alert('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกการจองได้: ' + (err.error?.error || err.message), { type: 'danger' })
      }
    })
  }

  calcGrand(pax: number, pricePerPerson?: number): number {
    const pp = pricePerPerson ?? 299
    return Math.round(pax * pp * 1.10 * 1.07 * 100) / 100
  }

  calcDeposit(pax: number): number {
    return pax * 100
  }

  calcRemaining(pax: number, pricePerPerson?: number): number {
    return Math.round((this.calcGrand(pax, pricePerPerson) - this.calcDeposit(pax)) * 100) / 100
  }

  isDepositMethod(pm: string): boolean {
    return pm === 'QR_DEPOSIT' || pm === 'CASH_DEPOSIT'
  }

  private urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4)
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    return arr
  }

  async requestPushPermission(queueId: number): Promise<void> {
    if (this.pushRequested) return
    this.pushRequested = true
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BHXRLotk_zLnzPtx__Vv6GE-6dBnoas-KO3r7GAyoUigAfOqgtwKVp3QpkINLlOP7_tK071XpABPO7EquVfqWbA'
        ),
      })
      const json = sub.toJSON()
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: queueId,
          endpoint: json.endpoint,
          p256dh: json.keys?.['p256dh'],
          auth: json.keys?.['auth'],
        }),
      })
    } catch (_) {}
  }

  async captureScreenshot() {
    try {
      const html2canvas = (await import('html2canvas')).default
      const element = document.querySelector('.glass-card') as HTMLElement
      if (!element) return

      const canvas = await html2canvas(element, {
        backgroundColor: '#050608',
        scale: 2,
      })

      const queueIdStr = String(this.queueId()).padStart(4, '0')
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bbq-${queueIdStr}.png`
        a.click()
        URL.revokeObjectURL(url)
      })
    } catch (err) {
      console.error('Screenshot failed:', err)
      this.confirmDialog.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกรูปได้ กรุณาลองใหม่อีกครั้ง', { type: 'danger' })
    }
  }
}
