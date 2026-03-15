// src/app/features/pay/pay.page.ts
import {
  Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, effect,
} from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { injectQuery, injectMutation } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { calcBreakdown } from '../../core/models'

const PROMPTPAY_PHONE = '0812345678' // ← เปลี่ยนเป็นเบอร์ร้าน

function crc16(data: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
    crc &= 0xFFFF
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function buildPromptPay(phone: string, amount: number): string {
  const d    = phone.replace(/\D/g, '')
  const norm = '0066' + (d.startsWith('0') ? d.slice(1) : d)
  const acc  = '0116' + String(norm.length).padStart(2,'0') + norm
  const merch = '0002TH.PROMPTPAY' + acc
  const mLen  = String(merch.length).padStart(2,'0')
  const amt   = amount.toFixed(2)
  const body  = '000201' + '26' + mLen + merch + '5802TH' + '5303764' + '54' + String(amt.length).padStart(2,'0') + amt + '6304'
  return body + crc16(body)
}

@Component({
  selector: 'app-pay-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-dvh flex items-start justify-center px-4 py-10">
      <div class="w-full max-w-[400px] relative z-10">

        <!-- Steps -->
        <div class="flex items-center justify-center mb-8">
          <div class="flex flex-col items-center gap-1">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                 style="background:var(--color-jade);color:#002A12">✓</div>
            <div class="text-[10px]" style="color:var(--color-jade)">นั่งโต๊ะ</div>
          </div>
          <div class="w-12 h-0.5 mb-5" style="background:var(--color-jade)"></div>
          <div class="flex flex-col items-center gap-1">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                 style="border:2px solid var(--color-lava);color:var(--color-lava-light);background:rgba(255,87,34,.10)">2</div>
            <div class="text-[10px]" style="color:var(--color-lava-light)">สแกนจ่าย</div>
          </div>
          <div class="w-12 h-0.5 mb-5" style="background:rgba(255,255,255,.08)"></div>
          <div class="flex flex-col items-center gap-1">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                 style="border:2px solid rgba(255,255,255,.12);color:var(--color-smoke);background:rgba(255,255,255,.04)">3</div>
            <div class="text-[10px]" style="color:var(--color-haze)">ใบเสร็จ</div>
          </div>
        </div>

        @if (err()) {
          <div class="glass-card p-8 text-center">
            <div class="text-4xl mb-4">😕</div>
            <div class="px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2"
                 style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5">
              {{ err() }}
            </div>
            <a routerLink="/" class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
               style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);text-decoration:none">
              ← กลับหน้าแรก
            </a>
          </div>
        }

        @if (!err() && payData()) {
          @let p = payData()!;
          <div class="glass-card overflow-hidden">

            <div class="px-5 py-4"
                 style="background:linear-gradient(135deg,rgba(255,87,34,.10),rgba(255,87,34,.04));border-bottom:1px solid rgba(255,87,34,.14)">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="font-semibold text-base" style="color:var(--color-ash)">{{ p['customer_name'] }}</div>
                  <div class="flex gap-3 text-xs mt-0.5" style="color:var(--color-smoke)">
                    <span>📞 {{ p['customer_tel'] }}</span>
                    <span>👥 {{ p['pax_amount'] }} คน</span>
                  </div>
                </div>
                <div class="font-mono text-sm font-bold px-3 py-1 rounded-lg"
                     style="background:rgba(255,87,34,.12);border:1px solid rgba(255,87,34,.25);color:var(--color-lava-light)">
                  {{ formatQid(p['queue_id']) }}
                </div>
              </div>
            </div>

            <!-- QR -->
            <div class="flex flex-col items-center gap-4 py-8 px-6">
              <div class="relative p-1.5 rounded-2xl"
                   style="background:linear-gradient(135deg,var(--color-lava-light),var(--color-lava),var(--color-lava-dark));box-shadow:0 20px 60px rgba(255,87,34,.25)">
                <div class="w-48 h-48 rounded-[14px] bg-white flex items-center justify-center overflow-hidden relative">
                  @if (qrLoading()) {
                    <div class="flex flex-col items-center gap-2">
                      <div class="animate-spin rounded-full"
                           style="width:24px;height:24px;border:2px solid rgba(255,87,34,.2);border-top-color:var(--color-lava)"></div>
                    </div>
                  }
                  @if (qrDataUrl()) {
                    <img [src]="qrDataUrl()" alt="PromptPay QR" class="w-[88%] h-[88%] object-contain">
                  }
                  @if (isExpired()) {
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[14px]"
                         style="background:rgba(5,6,8,.85);backdrop-filter:blur(4px)">
                      <span style="font-size:1.5rem">✕</span>
                      <span class="text-xs font-bold" style="color:#EF4444">QR หมดอายุ</span>
                    </div>
                  }
                </div>
              </div>
              <div class="flex items-center gap-2 text-xs" style="color:var(--color-smoke)">
                🛡 PromptPay · BBQ GRILL
              </div>
            </div>

            <!-- Amount -->
            <div class="px-6 pb-4 text-center">
              <div class="text-xs uppercase tracking-widest mb-1" style="color:var(--color-smoke)">ยอดที่ต้องชำระ</div>
              <div class="num-display text-4xl mb-3" style="color:var(--color-ash)">฿{{ grandTotal() }}</div>
              <div class="flex flex-wrap gap-2 justify-center text-[11px]" style="color:var(--color-smoke)">
                <span class="px-2.5 py-1 rounded-lg" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
                  ค่าอาหาร ฿{{ subtotal() }}
                </span>
                <span class="px-2.5 py-1 rounded-lg" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
                  Service ฿{{ service() }}
                </span>
                <span class="px-2.5 py-1 rounded-lg" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
                  VAT ฿{{ vat() }}
                </span>
              </div>
            </div>

            <!-- Timer -->
            <div class="mx-5 mb-5 flex items-center justify-between px-4 py-3 rounded-xl"
                 style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)">
              <span class="text-sm" style="color:var(--color-smoke)">⏳ หมดอายุใน</span>
              <span class="font-mono font-semibold text-lg"
                    [style.color]="isExpired() ? 'var(--color-crimson)' : remaining() < 60 ? 'var(--color-amber)' : 'var(--color-jade)'">
                {{ isExpired() ? 'หมดอายุ' : timerLabel() }}
              </span>
            </div>

            <!-- Actions -->
            <div class="px-5 pb-6 flex flex-col gap-3">
              <button (click)="confirmPay()"
                      [disabled]="confirmMutation.isPending() || isExpired()"
                      class="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
                      style="background:linear-gradient(135deg,#34D399,var(--color-jade));color:#002A12;border:none;cursor:pointer;box-shadow:0 14px 45px rgba(16,185,129,.22)"
                      [style.opacity]="confirmMutation.isPending() || isExpired() ? '.5' : '1'">
                @if (confirmMutation.isPending()) {
                  <div class="animate-spin rounded-full"
                       style="width:16px;height:16px;border:2px solid rgba(0,42,18,.3);border-top-color:#002A12"></div>
                } @else {
                  ✓
                }
                ยืนยันว่าโอนเงินแล้ว
              </button>
              <a routerLink="/" class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:var(--color-smoke);text-decoration:none">
                ← กลับหน้าแรก
              </a>
            </div>

          </div>
        }

        @if (!err() && payQuery.isPending()) {
          <div class="flex items-center justify-center h-60">
            <div class="animate-spin rounded-full"
                 style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-lava)"></div>
          </div>
        }

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
  isExpired = signal(false)

  // Computed price displays
  grandTotal = signal('0.00')
  subtotal   = signal('0')
  service    = signal('0.00')
  vat        = signal('0.00')

  private timerHandle?: number
  private expireAt = 0

  payQuery = injectQuery(() => ({
    queryKey: ['pay', this.queueId()],
    queryFn: () => new Promise<Record<string, unknown>>((res, rej) => {
      this.api.getPayment(this.queueId(), this.token())
        .subscribe({ next: r => res(r as unknown as Record<string, unknown>), error: rej })
    }),
    enabled: this.queueId() > 0,
    retry: false,
  }))

  confirmMutation = injectMutation(() => ({
    mutationFn: () => new Promise<{ ok: boolean }>((res, rej) => {
      this.api.confirmPayment(this.queueId(), this.token()).subscribe({ next: res, error: rej })
    }),
    onSuccess: () => {
      this.router.navigate(['/receipt', this.queueId()], { queryParams: { token: this.token() } })
    },
    onError: (e: unknown) => {
      this.err.set((e as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  constructor() {
    // Watch query result via effect (correct TanStack v5 API)
    effect(() => {
      const data = this.payQuery.data()
      if (data && !this.payData()) {
        this.payData.set(data)
        const pax = data['pax_amount'] as number
        const b   = calcBreakdown(pax)
        this.grandTotal.set(b.grand.toFixed(2))
        this.subtotal.set(b.subtotal.toFixed(0))
        this.service.set(b.service.toFixed(2))
        this.vat.set(b.vat.toFixed(2))

        const expStr = data['pay_token_expires'] as string
        this.expireAt = expStr ? new Date(expStr).getTime() : Date.now() + 900_000
        this.generateQR(b.grand)
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

  async generateQR(amount: number) {
    this.qrLoading.set(true)
    try {
      const QRCode = (await import('qrcode')) as { toDataURL: (data: string, opts: unknown) => Promise<string> }
      const payload = buildPromptPay(PROMPTPAY_PHONE, amount)
      const url = await QRCode.toDataURL(payload, { width: 320, margin: 1, color: { dark: '#000', light: '#fff' } })
      this.qrDataUrl.set(url)
    } catch {
      this.err.set('ไม่สามารถสร้าง QR ได้')
    }
    this.qrLoading.set(false)
  }

  startTimer() {
    const tick = () => {
      const sec = Math.max(0, Math.floor((this.expireAt - Date.now()) / 1000))
      this.remaining.set(sec)
      if (sec <= 0) { this.isExpired.set(true); clearInterval(this.timerHandle) }
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
}
