// src/app/features/receipt/receipt.page.ts
import {
  Component, inject, signal, ChangeDetectionStrategy,
} from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { AuthService } from '../../core/services/auth.service'
import { Payment, payLabel } from '../../core/models'

@Component({
  selector: 'app-receipt-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  styles: [`
    @media print {
      :host { display: block !important; }
      .no-print { display: none !important; }
      .receipt-wrap {
        max-width: 100% !important; padding: 0 !important;
      }
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
            <div class="font-semibold text-sm" style="color:var(--color-ash)">
              🔥 BBQ GRILL
              <span class="font-normal text-xs ml-1.5" style="color:var(--color-smoke)">ใบเสร็จ</span>
            </div>
          </div>
          @if (receiptQuery.data()) {
            <div class="font-mono text-xs font-semibold px-3 py-1.5 rounded-lg"
                 style="background:rgba(255,87,34,.10);border:1px solid rgba(255,87,34,.22);color:var(--color-lava-light)">
              {{ receiptQuery.data()!.queue_id_str }}
            </div>
          }
        </div>

        @if (receiptQuery.isPending()) {
          <div class="flex items-center justify-center h-40">
            <div class="animate-spin rounded-full" style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-lava)"></div>
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
              <div class="w-[68px] h-[68px] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl text-white"
                   style="background:linear-gradient(135deg,#34D399,#059669);box-shadow:0 0 0 9px rgba(16,185,129,.10),0 0 0 18px rgba(16,185,129,.05),0 20px 50px rgba(16,185,129,.22);animation:thermal-in .4s ease both">
                ✓
              </div>
              <h2 class="text-2xl font-semibold mb-1" style="font-family:var(--font-display);color:var(--color-ash);font-size:1.8rem">ชำระเงินสำเร็จ</h2>
              <p class="text-sm" style="color:rgba(16,185,129,.8)">ขอบคุณที่ใช้บริการ BBQ GRILL</p>
            </div>

            <!-- Store strip -->
            <div class="flex items-center justify-between px-6 py-4"
                 style="background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.08);border-top:none;border-bottom:none">
              <div>
                <div class="font-semibold tracking-widest text-sm" style="color:rgba(255,87,34,.9);letter-spacing:.06em">BBQ GRILL</div>
                <div class="text-xs" style="color:var(--color-smoke)">Luxury Hotel Dining Experience</div>
              </div>
              <div class="font-mono text-sm font-semibold px-3 py-1.5 rounded-lg"
                   style="background:rgba(255,87,34,.10);border:1px solid rgba(255,87,34,.22);color:var(--color-lava-light)">
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
                  <span>ค่าอาหาร ({{ p.pax_amount }} × ฿{{ (p.subtotal_amount / p.pax_amount) | number:'1.0-0' }})</span>
                  <span class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ p.subtotal_amount | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between py-1.5 text-sm" style="color:var(--color-smoke)">
                  <span>ค่าบริการ (10%)</span>
                  <span class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ p.service_amount | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between py-1.5 text-sm" style="color:var(--color-smoke)">
                  <span>VAT (7%)</span>
                  <span class="font-mono font-semibold" style="color:var(--color-ash)">฿{{ p.vat_amount | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- Grand total -->
              <div class="mx-5 my-4 flex items-center justify-between px-5 py-4 rounded-xl grand-zone"
                   style="background:linear-gradient(135deg,rgba(255,87,34,.12),rgba(255,87,34,.05));border:1px solid rgba(255,87,34,.22)">
                <span class="font-semibold" style="color:var(--color-lava-light)">ยอดรวมสุทธิ</span>
                <span class="num-display text-3xl" style="color:var(--color-ash)">฿{{ p.total_amount | number:'1.2-2' }}</span>
              </div>

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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                พิมพ์ใบเสร็จ
              </button>
              @if (auth.isLoggedIn()) {
                <a routerLink="/staff" class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
                   style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);text-decoration:none">
                  ← กลับ
                </a>
              } @else {
                <a routerLink="/" class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
                   style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);text-decoration:none">
                  🏠 หน้าแรก
                </a>
              }
            </div>

          </div>

          <!-- Footer (no print) -->
          <div class="text-center mt-5 text-xs no-print" style="color:var(--color-haze);opacity:.7;line-height:1.8">
            <strong style="color:rgba(255,87,34,.6)">BBQ GRILL</strong> · Luxury Hotel Dining · โทร: 02-123-4567<br>
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

  private queueId = parseInt(this.route.snapshot.paramMap.get('id') ?? '0')
  private token   = this.route.snapshot.queryParamMap.get('token') ?? ''

  receiptQuery = injectQuery(() => ({
    queryKey: ['receipt', this.queueId],
    queryFn: () => new Promise<Payment>((res, rej) => {
      this.api.getPayment(this.queueId, this.token).subscribe({ next: res, error: rej })
    }),
    retry: false,
  }))

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
