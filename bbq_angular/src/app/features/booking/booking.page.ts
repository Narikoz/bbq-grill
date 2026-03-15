// src/app/features/booking/booking.page.ts
import {
  Component, inject, signal, computed, ChangeDetectionStrategy,
  ElementRef, afterNextRender,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { injectMutation } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { calcBreakdown, PRICE_PER_PERSON, BookingFormSchema, Queue } from '../../core/models'
import { z } from 'zod'

@Component({
  selector: 'app-booking-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  template: `
    <!-- ═══ LAYOUT ═══ -->
    <div class="min-h-dvh grid lg:grid-cols-[1fr_500px] relative overflow-hidden score-lines">

      <!-- ═══ LEFT: Hero ═══ -->
      <div class="relative flex flex-col justify-end p-12 overflow-hidden lg:p-16 min-h-[44vh] lg:min-h-0"
           style="background:linear-gradient(145deg, var(--color-forge) 0%, var(--color-cinder) 100%)">

        <!-- Heat gradient bg -->
        <div class="absolute inset-0 pointer-events-none"
             style="background:radial-gradient(ellipse 80% 70% at 20% 40%, rgba(255,87,34,.16), transparent 60%),
                    radial-gradient(ellipse 50% 40% at 85% 80%, rgba(16,185,129,.07), transparent 55%)"></div>

        <!-- Floating ember particles -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          @for (e of embers; track e.id) {
            <div class="absolute rounded-full"
                 [style.left.%]="e.x"
                 [style.width.px]="e.size"
                 [style.height.px]="e.size"
                 [style.background]="e.color"
                 [style.bottom.px]="-8"
                 [style.animation]="'ember-rise ' + e.dur + 's linear ' + e.delay + 's infinite'"
                 style="filter:blur(.5px)"></div>
          }
        </div>

        <!-- Content -->
        <div class="relative z-10 animate-thermal-in">
          <p class="font-mono text-xs tracking-[.2em] uppercase mb-6"
             style="color:rgba(255,87,34,.7)">PREMIUM CHARCOAL DINING</p>

          <h1 class="num-display leading-none mb-4"
              style="font-size:clamp(4rem,9vw,8rem);color:var(--color-ash);letter-spacing:.02em">
            BBQ
            <span class="block" style="color:var(--color-lava)">GRILL</span>
          </h1>

          <p class="mb-10 max-w-xs" style="color:var(--color-smoke);font-size:.95rem;line-height:1.7">
            จองโต๊ะออนไลน์ · รับประทานอาหารได้ทันที<br>ไม่ต้องรอคิวที่ร้าน
          </p>

          <div class="flex flex-wrap gap-5">
            @for (feat of features; track feat.label) {
              <div class="flex items-center gap-2" style="color:rgba(180,190,210,.65);font-size:.82rem">
                <div class="w-1.5 h-1.5 rounded-full" [style.background]="feat.color"></div>
                {{ feat.label }}
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ═══ RIGHT: Booking form ═══ -->
      <div class="relative z-10 flex flex-col p-8 overflow-y-auto"
           style="background:var(--color-cinder);border-left:1px solid rgba(255,255,255,.06)">

        <div class="mb-8">
          <h2 class="text-2xl font-semibold tracking-tight mb-1" style="color:var(--color-ash)">จองโต๊ะ</h2>
          <p class="text-sm" style="color:var(--color-smoke)">กรอกข้อมูลเพื่อจองที่นั่งล่วงหน้า</p>
        </div>

        <!-- Error -->
        @if (mutateError()) {
          <div class="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm mb-5 animate-thermal-in"
               style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ mutateError() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">

          <!-- Name + Tel -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                     style="color:var(--color-smoke)">ชื่อ-นามสกุล</label>
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                     width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(74,84,104,.8)" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" formControlName="customer_name"
                       placeholder="ชื่อของคุณ"
                       class="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none transition-all"
                       style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);font-family:var(--font-sans)"
                       (focus)="onFocus($event)" (blur)="onBlur($event)">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                     style="color:var(--color-smoke)">เบอร์โทร</label>
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                     width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(74,84,104,.8)" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
                </svg>
                <input type="tel" formControlName="customer_tel"
                       placeholder="0812345678" maxlength="10" inputmode="tel"
                       class="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none transition-all font-mono"
                       style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash)"
                       (focus)="onFocus($event)" (blur)="onBlur($event)">
              </div>
            </div>
          </div>

          <!-- Pax stepper -->
          <div>
            <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                   style="color:var(--color-smoke)">จำนวนคน</label>
            <div class="flex items-stretch rounded-xl overflow-hidden"
                 style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);height:50px">
              <button type="button" (click)="decPax()" [disabled]="pax() <= 1"
                      class="w-12 flex items-center justify-center transition-colors text-xl shrink-0"
                      style="color:var(--color-lava);background:transparent;border:none;cursor:pointer"
                      [style.opacity]="pax() <= 1 ? '.3' : '1'">−</button>
              <div class="flex-1 flex items-center justify-center gap-1.5">
                <span class="num-display text-2xl" style="color:var(--color-ash)">{{ pax() }}</span>
                <span class="text-xs" style="color:var(--color-smoke)">คน</span>
              </div>
              <button type="button" (click)="incPax()" [disabled]="pax() >= 20"
                      class="w-12 flex items-center justify-center transition-colors text-xl shrink-0"
                      style="color:var(--color-lava);background:transparent;border:none;cursor:pointer"
                      [style.opacity]="pax() >= 20 ? '.3' : '1'">+</button>
            </div>
          </div>

          <!-- Datetime -->
          <div>
            <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                   style="color:var(--color-smoke)">วันเวลาที่ต้องการ</label>
            <input type="datetime-local" formControlName="booking_time"
                   class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all font-mono"
                   style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);color-scheme:dark"
                   (focus)="onFocus($event)" (blur)="onBlur($event)">
          </div>

          <!-- Pay method -->
          <div>
            <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                   style="color:var(--color-smoke)">วิธีชำระเงิน</label>
            <div class="grid grid-cols-2 gap-2.5">
              @for (m of payMethods; track m.value) {
                <div (click)="payMethod.set(m.value)"
                     class="flex flex-col items-center gap-1.5 py-3.5 rounded-xl cursor-pointer transition-all"
                     [style.background]="payMethod() === m.value ? 'rgba(255,87,34,.10)' : 'rgba(255,255,255,.03)'"
                     [style.border]="'1px solid ' + (payMethod() === m.value ? 'rgba(255,87,34,.35)' : 'rgba(255,255,255,.08)')">
                  <span class="text-xl">{{ m.icon }}</span>
                  <span class="text-xs font-bold"
                        [style.color]="payMethod() === m.value ? 'var(--color-lava-light)' : 'var(--color-smoke)'">
                    {{ m.label }}
                  </span>
                  <span class="text-[10px]" style="color:var(--color-haze)">{{ m.sub }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Price preview -->
          <div class="rounded-xl p-4 space-y-2"
               style="background:linear-gradient(135deg,rgba(255,87,34,.07),rgba(255,87,34,.03));border:1px solid rgba(255,87,34,.15)">
            @let b = breakdown();
            <div class="flex justify-between text-sm" style="color:var(--color-smoke)">
              <span>ค่าอาหาร ({{ pax() }} × ฿{{ pricePerPerson }})</span>
              <span class="font-mono font-medium" style="color:var(--color-ash)">฿{{ b.subtotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm" style="color:var(--color-smoke)">
              <span>Service 10%</span>
              <span class="font-mono font-medium" style="color:var(--color-ash)">฿{{ b.service.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm" style="color:var(--color-smoke)">
              <span>VAT 7%</span>
              <span class="font-mono font-medium" style="color:var(--color-ash)">฿{{ b.vat.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center pt-2"
                 style="border-top:1px solid rgba(255,87,34,.18)">
              <span class="font-semibold text-sm" style="color:var(--color-lava-light)">ยอดรวม</span>
              <span class="num-display text-2xl" style="color:var(--color-ash)">฿{{ b.grand.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Submit -->
          <button type="submit" [disabled]="mutation.isPending()"
                  class="w-full py-4 rounded-xl font-bold text-base transition-all relative overflow-hidden"
                  style="background:linear-gradient(135deg,var(--color-lava-light),var(--color-lava));color:#fff;border:none;cursor:pointer;box-shadow:0 16px 50px rgba(255,87,34,.25)"
                  [style.opacity]="mutation.isPending() ? '.7' : '1'">
            @if (mutation.isPending()) {
              <span class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full" style="width:16px;height:16px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff"></div>
                กำลังจอง...
              </span>
            } @else {
              <span class="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ยืนยันการจอง
              </span>
            }
          </button>
        </form>

        <a routerLink="/login" class="flex items-center justify-center gap-2 mt-6 text-xs transition-colors"
           style="color:var(--color-haze);text-decoration:none">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          เข้าสู่ระบบพนักงาน
        </a>
      </div>
    </div>

    <!-- ═══ SUCCESS MODAL ═══ -->
    @if (successData()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.88);backdrop-filter:blur(14px)"
           (click)="closeModal()">
        <div class="w-full max-w-[420px] rounded-3xl p-10 text-center animate-thermal-in"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(255,255,255,.10);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">

          <!-- Check ring -->
          <div class="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl text-white"
               style="background:linear-gradient(135deg,#34D399,#10B981);box-shadow:0 0 0 10px rgba(16,185,129,.1),0 0 0 20px rgba(16,185,129,.05),0 20px 50px rgba(16,185,129,.22)">
            ✓
          </div>

          <h2 class="text-4xl font-semibold mb-1" style="font-family:var(--font-display);color:var(--color-ash)">จองสำเร็จ!</h2>
          <p class="text-sm mb-6" style="color:rgba(16,185,129,.8)">ขอบคุณที่ใช้บริการ BBQ GRILL</p>

          <!-- Queue ID — big scoreboard style -->
          <div class="rounded-xl py-4 px-6 mb-6"
               style="background:rgba(255,87,34,.10);border:1px solid rgba(255,87,34,.25)">
            <div class="num-display text-5xl tracking-widest" style="color:var(--color-ash);text-shadow:0 0 30px rgba(255,87,34,.3)">
              {{ successData()!.queue_id_str }}
            </div>
          </div>

          @if (successData()!['pay_link']) {
            <a [href]="successData()!['pay_link']"
               class="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold mb-3 transition-all"
               style="background:linear-gradient(135deg,#34D399,var(--color-jade));color:#002A12;text-decoration:none;box-shadow:0 12px 40px rgba(16,185,129,.22)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><rect x="8" y="8" width="3" height="3"/><rect x="13" y="8" width="3" height="3"/><rect x="8" y="13" width="3" height="3"/></svg>
              ชำระผ่าน QR PromptPay
            </a>
          }

          <button (click)="closeModal()"
                  class="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                  style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);cursor:pointer">
            จองใหม่
          </button>
        </div>
      </div>
    }
  `,
})
export class BookingPage {
  private api = inject(ApiService)
  private fb  = inject(FormBuilder)

  pricePerPerson = PRICE_PER_PERSON
  pax       = signal(2)
  payMethod = signal<'CASH'|'QR'>('CASH')
  successData = signal<(Queue & { pay_link?: string }) | null>(null)
  mutateError = signal('')

  breakdown = computed(() => calcBreakdown(this.pax()))

  form = this.fb.group({
    customer_name: ['', [Validators.required, Validators.minLength(2)]],
    customer_tel:  ['', [Validators.required, Validators.pattern(/^\d{9,10}$/)]],
    booking_time:  [this.defaultTime()],
  })

  // TanStack Query mutation
  mutation = injectMutation(() => ({
    mutationFn: (data: z.infer<typeof BookingFormSchema>) =>
      new Promise<Queue & { pay_link?: string }>((resolve, reject) => {
        this.api.createQueue(data).subscribe({ next: resolve, error: reject })
      }),
    onSuccess: (data: Queue & { pay_link?: string }) => {
      this.successData.set(data)
      this.mutateError.set('')
    },
    onError: (err: unknown) => {
      this.mutateError.set((err as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  embers = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 3 + Math.random() * 4,
    color: ['#FF5722','#FF8A65','#F59E0B','#10B981'][Math.floor(Math.random() * 4)],
    dur:   10 + Math.random() * 12,
    delay: -Math.random() * 18,
  }))

  features = [
    { label: 'Premium Wagyu',   color: 'var(--color-lava)' },
    { label: 'Charcoal Grill',  color: 'var(--color-amber)' },
    { label: 'Private Dining',  color: 'var(--color-jade)' },
  ]

  payMethods = [
    { value: 'CASH' as const, icon: '💵', label: 'เงินสด',      sub: 'ชำระหน้าร้าน' },
    { value: 'QR'   as const, icon: '📱', label: 'QR PromptPay', sub: 'สแกนจ่ายทันที' },
  ]

  incPax() { if (this.pax() < 20) this.pax.update(p => p + 1) }
  decPax() { if (this.pax() > 1)  this.pax.update(p => p - 1) }

  submit() {
    this.form.markAllAsTouched()
    if (this.form.invalid) {
      this.mutateError.set('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    const v = this.form.value
    this.mutation.mutate({
      customer_name: v.customer_name!,
      customer_tel:  v.customer_tel!.replace(/\D/g, ''),
      pax_amount:    this.pax(),
      booking_time:  v.booking_time ? new Date(v.booking_time).toISOString().replace('T',' ').slice(0,19) : '',
      pay_method:    this.payMethod(),
    })
  }

  closeModal() {
    this.successData.set(null)
    this.form.reset({ booking_time: this.defaultTime() })
    this.pax.set(2)
    this.mutateError.set('')
  }

  onFocus(e: FocusEvent) {
    const el = e.target as HTMLElement
    el.style.borderColor = 'rgba(255,87,34,.5)'
    el.style.boxShadow   = '0 0 0 3px rgba(255,87,34,.10)'
    el.style.background  = 'rgba(255,255,255,.06)'
  }
  onBlur(e: FocusEvent) {
    const el = e.target as HTMLElement
    el.style.borderColor = 'rgba(255,255,255,.09)'
    el.style.boxShadow   = 'none'
    el.style.background  = 'rgba(255,255,255,.04)'
  }

  private defaultTime() {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 15 - (d.getMinutes() % 15))
    d.setSeconds(0)
    return d.toISOString().slice(0, 16)
  }
}
