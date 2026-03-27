// src/app/features/pay/pay.page.ts
import {
  Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, effect,
} from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { injectQuery, injectMutation } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { calcBreakdown } from '../../core/models'

const PROMPTPAY_ID = '1800101371480' // เลขบัตรประชาชน 13 หลัก

@Component({
  selector: 'app-pay-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-dvh flex flex-col"
         style="background:linear-gradient(160deg,var(--color-coal) 0%,#070508 100%)">

      <!-- Ambient glow -->
      <div class="fixed inset-0 pointer-events-none"
           style="background:radial-gradient(ellipse 60% 50% at 50% 80%, rgba(201,168,76,.06), transparent 65%)"></div>

      <!-- Top bar -->
      <div class="flex items-center justify-between px-6 py-4 relative z-10">
        <a routerLink="/" style="text-decoration:none">
          <span class="font-display text-xl tracking-widest" style="color:var(--color-gold)">BBQ GRILL</span>
        </a>
        <div class="font-mono text-xs tracking-widest uppercase" style="color:var(--color-smoke)">PROMPTPAY</div>
      </div>

      <!-- Step pill -->
      <div class="flex items-center justify-center gap-2 pb-6 relative z-10">
        @for (s of stepPills; track s.n) {
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                 [style.background]="s.done ? 'var(--color-jade)' : s.active ? 'linear-gradient(135deg,var(--color-gold-light),var(--color-gold))' : 'rgba(255,255,255,.06)'"
                 [style.color]="s.done ? '#fff' : s.active ? '#050608' : 'var(--color-smoke)'">
              {{ s.done ? '✓' : s.n }}
            </div>
            <span class="text-[10px] font-mono tracking-wider"
                  [style.color]="s.done ? 'var(--color-jade)' : s.active ? 'var(--color-gold)' : 'var(--color-haze)'">
              {{ s.label }}
            </span>
            @if (s.n < 3) {
              <div class="w-6 h-px mx-1" style="background:rgba(255,255,255,.08)"></div>
            }
          </div>
        }
      </div>

      <!-- Content -->
      <div class="flex-1 flex items-start justify-center px-4 pb-10 relative z-10">
        <div class="w-full max-w-[420px]">

          @if (err()) {
            <div class="rounded-2xl p-8 text-center animate-thermal-in"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(239,68,68,.20)">
              <div class="text-5xl mb-4">😕</div>
              <div class="text-sm mb-5 px-4 py-3 rounded-xl"
                   style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5">
                {{ err() }}
              </div>
              <a routerLink="/" class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                 style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);text-decoration:none">
                ← กลับหน้าแรก
              </a>
            </div>
          }

          @if (!err() && payQuery.isPending()) {
            <div class="flex flex-col items-center justify-center gap-4 h-64">
              <div class="animate-spin rounded-full"
                   style="width:32px;height:32px;border:2px solid rgba(201,168,76,.15);border-top-color:var(--color-gold)"></div>
              <div class="text-xs font-mono" style="color:var(--color-smoke)">โหลดข้อมูล...</div>
            </div>
          }

          @if (!err() && payData()) {
            @let p = payData()!;
            <div class="rounded-2xl overflow-hidden animate-thermal-in"
                 style="background:rgba(255,255,255,.04);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(201,168,76,.15);box-shadow:0 30px 80px rgba(0,0,0,.5)">

              <!-- Header -->
              <div class="px-5 py-4"
                   style="background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(201,168,76,.04));border-bottom:1px solid rgba(201,168,76,.12)">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-semibold text-base" style="color:var(--color-ash);font-family:var(--font-sans)">{{ p['customer_name'] }}</div>
                    <div class="flex gap-3 text-xs mt-0.5" style="color:var(--color-smoke);font-family:var(--font-sans)">
                      <span>📞 {{ p['customer_tel'] }}</span>
                      <span>👥 {{ p['pax_amount'] }} คน</span>
                    </div>
                  </div>
                  <div class="font-mono text-sm font-bold px-3 py-1 rounded-lg"
                       style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);color:var(--color-gold)">
                    {{ formatQid(p['queue_id']) }}
                  </div>
                </div>
              </div>

              <!-- SVG Ring Timer + QR -->
              <div class="flex flex-col items-center gap-0 pt-8 pb-4 px-6">

                <!-- SVG ring countdown -->
                <div class="relative mb-6" style="width:220px;height:220px">
                  <svg width="220" height="220" style="transform:rotate(-90deg)">
                    <!-- Track -->
                    <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(201,168,76,.10)" stroke-width="3"/>
                    <!-- Progress -->
                    <circle cx="110" cy="110" r="100" fill="none"
                            [attr.stroke]="ringColor()"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-dasharray="628"
                            [attr.stroke-dashoffset]="ringOffset()"
                            style="transition:stroke-dashoffset 1s linear,stroke .5s ease"/>
                  </svg>

                  <!-- QR inside ring -->
                  <div class="absolute inset-0 flex items-center justify-center">
                    <!-- Gold frame -->
                    <div class="relative" style="padding:3px;border-radius:16px;
                         background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold),var(--color-gold-dark),var(--color-gold));box-shadow:0 0 30px rgba(201,168,76,.20),0 0 60px rgba(201,168,76,.08)">
                      <div class="w-[156px] h-[156px] rounded-[13px] bg-white flex items-center justify-center overflow-hidden relative">
                        @if (qrLoading()) {
                          <div class="animate-spin rounded-full"
                               style="width:20px;height:20px;border:2px solid rgba(201,168,76,.2);border-top-color:var(--color-gold)"></div>
                        }
                        @if (qrDataUrl() && !isExpired()) {
                          <img [src]="qrDataUrl()" alt="PromptPay QR" style="width:88%;height:88%;object-fit:contain">
                        }
                        @if (isExpired()) {
                          <div class="absolute inset-0 flex flex-col items-center justify-center gap-1"
                               style="background:rgba(5,6,8,.88);backdrop-filter:blur(4px)">
                            <span style="font-size:1.6rem">❌</span>
                            <span class="text-xs font-bold" style="color:#EF4444;font-family:var(--font-sans)">QR หมดอายุ</span>
                          </div>
                        }
                        <!-- PromptPay logo corner -->
                        <div class="absolute bottom-2 right-2 text-[9px] font-bold" style="color:#003087">PP</div>
                      </div>
                    </div>
                  </div>

                  <!-- Timer label overlay -->
                  <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold"
                       style="background:var(--color-coal);border:1px solid rgba(201,168,76,.20);font-family:'Kanit',sans-serif"
                       [style.color]="isExpired() ? 'var(--color-crimson)' : remaining() < 60 ? 'var(--color-amber)' : 'var(--color-gold)'">
                    {{ isExpired() ? '✕ หมดอายุ' : timerLabel() }}
                  </div>
                </div>

                <div class="text-[11px] font-mono tracking-wider mb-6" style="color:rgba(201,168,76,.6)">🛡 PromptPay · BBQ GRILL</div>
              </div>

              <!-- Amount -->
              <div class="px-5 pb-5">
                <div class="rounded-xl px-5 py-4"
                     style="background:linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.03));border:1px solid rgba(201,168,76,.14)">
                  <div class="text-center mb-3">
                    <div class="text-xs uppercase tracking-widest mb-1" style="color:rgba(201,168,76,.6);font-family:var(--font-sans)">ยอดที่ต้องชำระ</div>
                    <div class="text-5xl font-semibold" style="color:var(--color-ash);font-family:'Kanit',sans-serif">฿{{ grandTotal() }}</div>
                    <div class="text-xs mt-1" style="color:var(--color-smoke);font-family:var(--font-sans)">{{ amountSubtitle() }}</div>
                  </div>
                  <div class="flex gap-2 justify-center flex-wrap">
                    @for (chip of priceChips(); track chip) {
                      <span class="text-[10px] px-2.5 py-1 rounded-lg font-mono"
                            style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:var(--color-smoke)">
                        {{ chip }}
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="px-5 pb-6 flex flex-col gap-3">
                <button (click)="confirmPay()"
                        [disabled]="confirmMutation.isPending() || isExpired()"
                        class="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 ripple-host"
                        style="background:linear-gradient(135deg,#34D399,var(--color-jade));color:#002A12;border:none;cursor:pointer;font-family:var(--font-sans);box-shadow:0 14px 45px rgba(16,185,129,.22)"
                        [style.opacity]="confirmMutation.isPending() || isExpired() ? '.5' : '1'"
                        (mousedown)="onConfirmDown($event)">
                  @if (confirmMutation.isPending()) {
                    <div class="animate-spin rounded-full"
                         style="width:16px;height:16px;border:2px solid rgba(0,42,18,.3);border-top-color:#002A12"></div>
                  } @else { ✓ }
                  ยืนยันว่าโอนเงินแล้ว
                </button>

                @if (!isExpired()) {
                  <div class="text-center text-xs" style="color:var(--color-haze);font-family:var(--font-sans)">
                    สแกน QR ในแอป PromptPay เสร็จแล้วกดปุ่มด้านบน
                  </div>
                } @else {
                  <button (click)="regenQr()"
                          class="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                          style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.25);color:var(--color-gold);cursor:pointer;font-family:var(--font-sans)">
                    📱 ขอ QR ใหม่
                  </button>
                }

                <a routerLink="/" class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                   style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);color:var(--color-smoke);text-decoration:none;font-family:var(--font-sans)">
                  ← กลับหน้าแรก
                </a>
              </div>

            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PayPage implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute)
  private router = inject(Router)
  private api    = inject(ApiService)

  queueId   = signal(0)
  token     = signal('')
  err       = signal('')
  payData   = signal<Record<string, unknown> | null>(null)
  qrDataUrl = signal('')
  qrLoading = signal(false)
  remaining = signal(900)
  totalSecs = signal(900)
  isExpired = signal(false)

  grandTotal = signal('0.00')
  subtotal   = signal('0')
  service    = signal('0.00')
  vat        = signal('0.00')
  amountSubtitle = signal('ยอดรวมทั้งหมด')
  payMethod  = signal('')
  depositAmt = signal(0)
  remainingAmt = signal(0)

  private timerHandle?: number
  private expireAt = 0

  // SVG ring: circumference = 2πr = 628 (r=100)
  ringOffset = signal(0)
  ringColor  = signal('var(--color-gold)')

  priceChips = () => [
    `ค่าอาหาร ฿${this.subtotal()}`,
    `Service ฿${this.service()}`,
    `VAT ฿${this.vat()}`,
  ]

  stepPills = [
    { n: 1, label: 'นั่งโต๊ะ',   done: true,  active: false },
    { n: 2, label: 'สแกนจ่าย', done: false, active: true  },
    { n: 3, label: 'ใบเสร็จ',   done: false, active: false },
  ]

  queueQuery = injectQuery(() => ({
    queryKey: ['queues-all'],
    queryFn: () => new Promise<{ queues: Array<Record<string, unknown>> }>((res, rej) => {
      this.api.getQueues('all', '').subscribe({ next: res, error: rej })
    }),
    enabled: this.queueId() > 0,
    retry: false,
  }))

  payQuery = injectQuery(() => ({
    queryKey: ['pay', this.queueId()],
    queryFn: () => new Promise<Record<string, unknown>>((res, rej) => {
      this.api.getPayment(this.queueId(), this.token())
        .subscribe({ next: (r: unknown) => res(r as Record<string, unknown>), error: rej })
    }),
    enabled: this.queueId() > 0,
    retry: false,
  }))

  confirmMutation = injectMutation(() => ({
    mutationFn: () => new Promise<{ ok: boolean }>((res, rej) => {
      this.api.confirmPayment(this.queueId(), this.token()).subscribe({ next: res, error: rej })
    }),
    onSuccess: () => {
      this.router.navigate(['/queue-status', this.queueId()])
    },
    onError: (e: unknown) => {
      this.err.set((e as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  constructor() {
    effect(() => {
      const data = this.payQuery.data()
      const qData = this.queueQuery.data()
      if (data && qData && !this.payData()) {
        this.payData.set(data)
        const pax = data['pax_amount'] as number
        
        // Find queue in queues list to get pay_method, deposit_amount, remaining_amount, tier
        const queue = (qData.queues as Array<Record<string, unknown>>).find(q => q['queue_id'] === this.queueId())
        const tier = (queue?.['tier'] as string) ?? 'SILVER'
        const b   = calcBreakdown(pax, tier)
        const payMethod = (queue?.['pay_method'] as string) ?? 'QR_FULL'
        const depositAmount = (queue?.['deposit_amount'] as number) ?? 0
        const remainingAmount = (queue?.['remaining_amount'] as number) ?? 0
        
        this.payMethod.set(payMethod)
        this.depositAmt.set(depositAmount)
        this.remainingAmt.set(remainingAmount)
        
        // Calculate amount to show based on pay_method
        let amountToShow: number
        let subtitle: string
        
        if (payMethod === 'QR_DEPOSIT' || payMethod === 'CASH_DEPOSIT') {
          amountToShow = depositAmount
          subtitle = `ยอดมัดจำ (คงเหลือ ฿${remainingAmount.toFixed(0)} ชำระหน้าร้าน)`
        } else {
          amountToShow = b.grand
          subtitle = 'ยอดรวมทั้งหมด'
        }
        
        this.grandTotal.set(amountToShow.toFixed(2))
        this.subtotal.set(b.subtotal.toFixed(0))
        this.service.set(b.service.toFixed(2))
        this.vat.set(b.vat.toFixed(2))
        this.amountSubtitle.set(subtitle)
        
        // BUG-04 fix: use pay_token_expires from API (now included in SQL)
        const expStr = data['pay_token_expires'] as string | undefined
        this.expireAt = expStr ? new Date(expStr).getTime() : Date.now() + 900_000
        const totalMs = this.expireAt - Date.now()
        this.totalSecs.set(Math.max(1, Math.floor(totalMs / 1000)))
        this.generateQR(amountToShow)
        this.startTimer()
      }
      if (this.payQuery.isError()) {
        const e = this.payQuery.error() as { error?: { error?: string } }
        this.err.set(e?.error?.error ?? 'ไม่พบข้อมูลคิว')
      }
    })
  }

  ngOnInit() {
    const id    = parseInt(this.route.snapshot.paramMap.get('id') ?? '0')
    const token = this.route.snapshot.queryParamMap.get('token') ?? ''
    if (!id || !token) { this.err.set('ลิงก์ไม่ถูกต้อง'); return }
    this.queueId.set(id)
    this.token.set(token)
  }

  ngOnDestroy() { clearInterval(this.timerHandle) }

  generatePromptPayPayload(promptPayId: string, amount: number): string {
    const id = promptPayId.replace(/[-]/g, '')
    const isPhone = id.length === 10
    const formatted = isPhone ? '0066' + id.substring(1) : id
    const accountType = isPhone ? '01' : '02'
    
    const merchantAccount = '0016A000000677010111' + accountType + 
      String(formatted.length).padStart(2,'0') + formatted
    const merchantAccountField = '29' + 
      String(merchantAccount.length).padStart(2,'0') + merchantAccount
    
    const amountStr = amount.toFixed(2)
    const amountField = '54' + 
      String(amountStr.length).padStart(2,'0') + amountStr
    
    let payload = '000201' + merchantAccountField + 
      '5303764' + amountField + '5802TH6304'
    
    let crc = 0xFFFF
    for (const char of payload) {
      crc ^= char.charCodeAt(0) << 8
      for (let i = 0; i < 8; i++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      }
    }
    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4,'0')
  }

  async generateQR(amount: number) {
    this.qrLoading.set(true)
    try {
      const QRCode = (await import('qrcode')) as { toDataURL: (data: string, opts: unknown) => Promise<string> }
      const payload = this.generatePromptPayPayload(PROMPTPAY_ID, amount)
      const url = await QRCode.toDataURL(payload, { width: 320, margin: 1, color: { dark: '#000', light: '#fff' } })
      this.qrDataUrl.set(url)
    } catch {
      this.err.set('ไม่สามารถสร้าง QR ได้')
    }
    this.qrLoading.set(false)
  }

  startTimer() {
    const C = 628 // SVG circumference
    const tick = () => {
      const sec = Math.max(0, Math.floor((this.expireAt - Date.now()) / 1000))
      this.remaining.set(sec)
      // SVG ring offset: full=0 (start), empty=628 (end)
      const frac = sec / Math.max(1, this.totalSecs())
      this.ringOffset.set(Math.round(C * (1 - frac)))
      // Color shift: gold → amber → crimson
      if (sec <= 0)      { this.ringColor.set('#EF4444'); this.isExpired.set(true); clearInterval(this.timerHandle); return }
      else if (sec < 60) { this.ringColor.set('var(--color-amber)') }
      else if (sec < 180){ this.ringColor.set('var(--color-lava)') }
      else               { this.ringColor.set('var(--color-gold)') }
    }
    tick()
    this.timerHandle = window.setInterval(tick, 1000)
  }

  timerLabel(): string {
    const s = this.remaining()
    return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0')
  }

  formatQid(id: unknown): string { return '#' + String(id).padStart(4, '0') }
  confirmPay() { this.confirmMutation.mutate() }
  regenQr() {
    // Staff navigates to regen; customers can't regen — just show contact message
    this.err.set('คิว QR หมดอายุ กรุณาติดต่อพนักงานเพื่อขอ QR ใหม่')
  }
  onConfirmDown(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    const r  = el.getBoundingClientRect()
    const span = document.createElement('span')
    span.className = 'ripple'
    span.style.left = `${e.clientX - r.left}px`
    span.style.top  = `${e.clientY - r.top}px`
    el.appendChild(span)
    setTimeout(() => span.remove(), 700)
  }
}
