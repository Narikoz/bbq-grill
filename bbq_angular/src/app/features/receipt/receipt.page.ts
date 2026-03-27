// src/app/features/receipt/receipt.page.ts
import {
  Component, inject, computed, ChangeDetectionStrategy,
} from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { AuthService } from '../../core/services/auth.service'
import { Payment, payLabel, tierPrice, TIER_LABELS, TierType } from '../../core/models'

@Component({
  selector: 'app-receipt-page',
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

    /* ═══ ENTRANCE ═══ */
    .animate-thermal-in {
      animation: thermalIn .45s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes thermalIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ═══ SUCCESS RING GLOW ═══ */
    .success-head .success-ring {
      animation: jadeRingPulse 2.5s ease-in-out infinite;
    }
    @keyframes jadeRingPulse {
      0%, 100% { box-shadow: 0 0 0 9px rgba(16,185,129,.12), 0 0 0 18px rgba(16,185,129,.06), 0 0 0 30px rgba(16,185,129,.03), 0 20px 50px rgba(16,185,129,.22); }
      50% { box-shadow: 0 0 0 12px rgba(16,185,129,.16), 0 0 0 24px rgba(16,185,129,.08), 0 0 0 38px rgba(16,185,129,.04), 0 20px 60px rgba(16,185,129,.28); }
    }

    /* ═══ ROW HOVER ═══ */
    .row-item {
      transition: all .2s ease;
    }
    .row-item:hover {
      background: rgba(255,255,255,.02);
      border-left: 2px solid rgba(201,168,76,.4);
      padding-left: 22px;
    }

    /* ═══ PRINT ═══ */
    @media print {
      :host { display: block !important; }
      .no-print { display: none !important; }
      .receipt-wrap { max-width: 100% !important; padding: 0 !important; }
      .glass-card {
        background: #fff !important; border: none !important;
        box-shadow: none !important; border-radius: 0 !important;
      }
      .success-head {
        background: #f0fdf4 !important; border-color: #bbf7d0 !important;
        border-radius: 0 !important;
      }
      .print-body { background: #fff !important; border-color: #e5e7eb !important; }
      .row-item   { border-color: #f3f4f6 !important; }
      .dashed-div { border-color: #e2e8f0 !important; }
      .grand-zone { background: #fefce8 !important; border-color: #fcd34d !important; }
      * { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `],
  template: `
    <div class="min-h-dvh flex items-start justify-center px-4 py-8">
      <div class="w-full max-w-[460px] relative z-10 receipt-wrap">

        <!-- Top nav (no print) -->
        <div class="flex items-center justify-between mb-6 no-print">
          <div class="flex items-center gap-2">
            @if (auth.isLoggedIn()) {
              <a routerLink="/staff" class="flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all no-print"
                 style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--color-smoke);text-decoration:none">←</a>
            }
            <div class="font-semibold text-sm flex items-center gap-1.5" style="color:var(--color-ash)">
              <span class="css-flame" style="font-size:1.1rem"></span> BBQ GRILL
              <span class="font-normal text-xs ml-1" style="color:var(--color-smoke)">ใบเสร็จ</span>
            </div>
          </div>
          @if (receiptQuery.data()) {
            <div class="font-mono text-sm font-semibold px-3 py-1.5 rounded-lg"
                 style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.25);color:var(--color-gold)">
              {{ receiptQuery.data()!.queue_id_str }}
            </div>
          }
        </div>

        @if (receiptQuery.isPending()) {
          <div class="flex items-center justify-center h-40">
            <div class="animate-spin rounded-full" style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
          </div>
        }

        @if (receiptQuery.isError()) {
          <div class="glass-card p-8 text-center">
            <div class="text-4xl mb-4">🔍</div>
            <p class="text-sm mb-5" style="color:var(--color-smoke)">ไม่พบข้อมูลใบเสร็จ</p>
            <a routerLink="/" class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold no-print"
               style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);text-decoration:none">
              ← กลับหน้าแรก
            </a>
          </div>
        }

        @if (receiptQuery.data(); as p) {
          <div class="rounded-2xl overflow-hidden animate-thermal-in"
               style="box-shadow:0 32px 100px rgba(0,0,0,.55)">

            <!-- Success head -->
            <div class="text-center py-9 px-6 success-head"
                 style="background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,.05));border:1px solid rgba(16,185,129,.18);border-bottom:none;border-radius:22px 22px 0 0">
              <div class="w-[68px] h-[68px] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl text-white success-ring"
                   style="background:linear-gradient(135deg,#34D399,#059669);box-shadow:0 0 0 9px rgba(16,185,129,.12),0 0 0 18px rgba(16,185,129,.06),0 0 0 30px rgba(16,185,129,.03),0 20px 50px rgba(16,185,129,.22)">
                ✓
              </div>
              <h2 class="text-2xl font-semibold mb-1" style="font-family:var(--font-display);color:var(--color-ash);font-size:1.8rem">ชำระเงินสำเร็จ</h2>
              <p class="text-sm" style="color:rgba(16,185,129,.8)">ขอบคุณที่ใช้บริการ BBQ GRILL</p>
            </div>

            <!-- Store strip -->
            <div class="flex items-center justify-between px-6 py-4"
                 style="background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.08);border-top:none;border-bottom:none">
              <div>
                <div class="font-display text-xl tracking-widest" style="background:linear-gradient(135deg,#D4B962,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent">BBQ GRILL</div>
                <div class="text-xs" style="color:var(--color-smoke)">Luxury Hotel Dining Experience</div>
              </div>
              <div class="font-mono text-sm font-semibold px-3 py-1.5 rounded-lg"
                   style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);color:var(--color-gold)">
                {{ p.queue_id_str }}
              </div>
            </div>

            <!-- Body -->
            <div class="print-body"
                 style="background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.07);border-top:none">

              <div class="px-6 pt-3 pb-1 text-[10px] font-bold tracking-widest uppercase" style="color:var(--color-haze)">ข้อมูลลูกค้า</div>
              @for (row of customerRows(p); track row.label) {
                <div class="flex justify-between items-center px-6 py-2.5 row-item"
                     style="border-bottom:1px solid rgba(255,255,255,.04)">
                  <span class="text-sm" style="color:var(--color-smoke)">{{ row.label }}</span>
                  <span class="text-sm font-semibold" style="color:var(--color-ash)"
                        [class.font-mono]="row.mono">{{ row.value }}</span>
                </div>
              }

              <div class="mx-6 my-2 dashed-div" style="border-top:2px dashed rgba(255,255,255,.08)"></div>
              <div class="px-6 pt-1 pb-1 text-[10px] font-bold tracking-widest uppercase" style="color:var(--color-haze)">รายการ</div>

              <div class="px-6 py-3" style="border-bottom:1px solid rgba(255,255,255,.05)">
                <div class="flex justify-between py-1.5 text-sm" style="color:var(--color-smoke)">
                  <span>ค่าอาหาร ({{ p.pax_amount }} × ฿{{ getPricePerPerson(p) }} {{ getTierName(p) }})</span>
                  <span class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ calcSubtotal(p.pax_amount) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between py-1.5 text-sm" style="color:var(--color-smoke)">
                  <span>ค่าบริการ (10%)</span>
                  <span class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ calcService(p.pax_amount) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between py-1.5 text-sm" style="color:var(--color-smoke)">
                  <span>VAT (7%)</span>
                  <span class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ calcVat(p.pax_amount) | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- Grand total or deposit breakdown -->
              @if (hasDeposit()) {
                <!-- Deposit breakdown -->
                <div class="mx-5 my-4">
                  <div class="flex justify-between items-center px-4 py-2 text-sm" style="color:var(--color-smoke)">
                    <span>ยอดรวม</span>
                    <span class="font-mono font-semibold">฿{{ calcGrand(p.pax_amount) | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between items-center px-4 py-2 text-sm" style="color:var(--color-jade)">
                    <span>มัดจำที่ชำระแล้ว</span>
                    <span class="font-mono font-semibold">-฿{{ depositAmount() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex items-center justify-between px-5 py-4 rounded-xl"
                       style="background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.20)">
                    <span class="font-semibold" style="color:var(--color-gold)">ยอดที่ชำระหน้าร้าน</span>
                    <span class="num-display text-3xl" style="color:var(--color-ash)">฿{{ remainingAmount(p.pax_amount) | number:'1.2-2' }}</span>
                  </div>
                </div>
              } @else {
                <!-- Full payment -->
                <div class="mx-5 my-4 flex items-center justify-between px-5 py-4 rounded-xl grand-zone"
                     style="background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.20)">
                  <span class="font-semibold" style="color:var(--color-gold)">ยอดรวมสุทธิ</span>
                  <span class="num-display text-3xl" style="color:var(--color-ash)">฿{{ calcGrand(p.pax_amount) | number:'1.2-2' }}</span>
                </div>
              }

              <div class="flex justify-between items-center px-6 py-2.5 row-item"
                   style="border-bottom:1px solid rgba(255,255,255,.04)">
                <span class="text-sm" style="color:var(--color-smoke)">วิธีชำระ</span>
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style="background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.22);color:var(--color-jade)">
                  {{ getPayIcon(p.payment_method) }} {{ p.pay_method_label }}
                </span>
              </div>
              <div class="flex justify-between items-center px-6 py-2.5">
                <span class="text-sm" style="color:var(--color-smoke)">เวลาชำระ</span>
                <span class="text-sm font-mono font-semibold" style="color:var(--color-ash)">
                  {{ p.payment_time | date:'dd/MM/yyyy HH:mm:ss' }}
                </span>
              </div>

              <!-- Ref -->
              <div class="mx-5 mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg"
                   style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                <span class="text-[10px] font-bold tracking-widest uppercase" style="color:var(--color-haze)">เลขอ้างอิง</span>
                <span class="font-mono text-xs" style="color:var(--color-smoke)">{{ p.ref }}</span>
              </div>

            </div>

            <!-- Actions (no print) -->
            <div class="flex gap-2.5 px-5 py-5 border-t no-print"
                 style="background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.07)">
              <button (click)="print()" class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
                      style="background:linear-gradient(135deg,#34D399,var(--color-jade));color:#002A12;border:none;cursor:pointer;box-shadow:0 10px 30px rgba(16,185,129,.18)">
                @if (isStaff()) {
                  🖨️ พิมพ์ใบเสร็จ
                } @else {
                  📷 บันทึกรูป
                }
              </button>
              @if (isStaff()) {
                <a routerLink="/staff" class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
                   style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);text-decoration:none">
                  ← กลับ
                </a>
              } @else {
                <a [routerLink]="['/queue-status', queueId]" class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
                   style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);text-decoration:none">
                  ← ติดตามคิว
                </a>
              }
            </div>

          </div>

          <!-- Footer (no print) -->
          <div class="text-center mt-5 text-xs no-print" style="color:var(--color-haze);opacity:.7;line-height:1.8">
            <strong style="color:rgba(201,168,76,.7)">BBQ GRILL</strong> · Luxury Hotel Dining · โทร: 02-123-4567<br>
            พิมพ์เมื่อ {{ now | date:'dd/MM/yyyy HH:mm' }}
          </div>
        }

      </div>
    </div>
  `,
})
export class ReceiptPage {
  private route = inject(ActivatedRoute)
  private api   = inject(ApiService)
  auth          = inject(AuthService)
  now           = new Date()

  queueId = parseInt(this.route.snapshot.paramMap.get('id') ?? '0')
  private token   = this.route.snapshot.queryParamMap.get('token') ?? ''
  isStaff = computed(() => !!this.auth.user())

  receiptQuery = injectQuery(() => ({
    queryKey: ['receipt', this.queueId],
    queryFn: () => new Promise<Payment>((res, rej) => {
      this.api.getPayment(this.queueId, this.token).subscribe({ next: res, error: rej })
    }),
    retry: false,
  }))

  // Fetch all payments for this queue to check for deposits
  paymentsQuery = injectQuery(() => ({
    queryKey: ['all-payments', this.queueId],
    queryFn: () => new Promise<any[]>((res, rej) => {
      this.api.getAllPayments(this.queueId).subscribe({
        next: (data: any) => res(data.payments || []),
        error: () => res([]) // Fallback to empty if endpoint doesn't exist
      })
    }),
    retry: false,
  }))

  // Calculate prices from pax amount using tier
  private getReceiptTier(): string {
    const p = this.receiptQuery.data()
    return (p as any)?.tier ?? 'SILVER'
  }
  private getReceiptPP(): number {
    const p = this.receiptQuery.data()
    return (p as any)?.price_per_person ?? tierPrice(this.getReceiptTier())
  }

  getPricePerPerson(p: Payment): number {
    return (p as any).price_per_person ?? tierPrice((p as any).tier ?? 'SILVER')
  }
  getTierName(p: Payment): string {
    const tier = ((p as any).tier ?? 'SILVER') as TierType
    return TIER_LABELS[tier]?.name ?? 'Standard'
  }

  calcSubtotal(pax: number): number {
    return pax * this.getReceiptPP()
  }

  calcService(pax: number): number {
    const subtotal = this.calcSubtotal(pax)
    return Math.round(subtotal * 0.10 * 100) / 100
  }

  calcVat(pax: number): number {
    const subtotal = this.calcSubtotal(pax)
    const service = this.calcService(pax)
    return Math.round((subtotal + service) * 0.07 * 100) / 100
  }

  calcGrand(pax: number): number {
    return this.calcSubtotal(pax) + this.calcService(pax) + this.calcVat(pax)
  }

  // Check if there's a deposit payment
  hasDeposit(): boolean {
    const payments = this.paymentsQuery.data() || []
    return payments.some((p: any) => p.is_deposit === 1)
  }

  // Calculate total deposit amount
  depositAmount(): number {
    const payments = this.paymentsQuery.data() || []
    return payments
      .filter((p: any) => p.is_deposit === 1)
      .reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0)
  }

  // Calculate remaining amount after deposit
  remainingAmount(pax: number): number {
    return this.calcGrand(pax) - this.depositAmount()
  }

  customerRows(p: Payment) {
    return [
      { label: 'ชื่อ',        value: p.customer_name,                                       mono: false },
      { label: 'เบอร์โทร',    value: p.customer_tel,                                        mono: true  },
      { label: 'จำนวนคน',     value: `${p.pax_amount} คน`,                                  mono: false },
      ...(p.table_number ? [{ label: 'โต๊ะ', value: `#${p.table_number}`, mono: true }] : []),
      { label: 'เวลาจอง', value: new Date(p.booking_time).toLocaleDateString('th-TH', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' }), mono: true },
    ]
  }

  getPayIcon(m: string): string {
    return { CASH:'💵', QR:'📱', PROMPTPAY:'📱', CARD:'💳' }[m] ?? '💰'
  }

  print() { window.print() }
}
