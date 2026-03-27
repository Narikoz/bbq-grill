// src/app/features/booking/booking.page.ts
import {
  Component, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { injectMutation, injectQuery } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { AnimationService } from '../../core/services/animation.service'
import { calcBreakdown, PRICE_PER_PERSON, BookingFormSchema, Queue, TimeSlot, TIER_LIST, TIER_PRICES, TIER_LABELS, TierType, tierPrice } from '../../core/models'
import { z } from 'zod'

@Component({
  selector: 'app-booking-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  template: `
    <div class="min-h-dvh flex flex-col"
         style="background:linear-gradient(160deg,var(--color-coal) 0%,#0a0810 100%)">

      <!-- Top bar -->
      <div class="flex items-center justify-between px-6 py-4 border-b"
           style="border-color:rgba(201,168,76,.10)">

        <a routerLink="/" style="text-decoration:none">
          <span class="font-display text-2xl tracking-widest" style="color:var(--color-gold)">BBQ GRILL</span>
        </a>
        <div class="font-mono text-xs tracking-wider uppercase" style="color:var(--color-smoke)">จองโต๊ะออนไลน์</div>
      </div>

      <!-- Progress bar -->
      <div class="px-6 py-6 max-w-xl mx-auto w-full">
        <div class="flex items-center gap-0 mb-2">
          @for (s of stepDefs; track s.num) {
            <div class="flex items-center" [style.flex]="s.num < 3 ? '1' : 'none'">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300"
                   [style.background]="step() >= s.num ? 'linear-gradient(135deg,var(--color-gold-light),var(--color-gold))' : 'rgba(255,255,255,.06)'"
                   [style.color]="step() >= s.num ? '#050608' : 'var(--color-smoke)'"
                   [style.box-shadow]="step() === s.num ? '0 0 18px rgba(201,168,76,.4)' : 'none'">
                {{ step() > s.num ? '✓' : s.num }}
              </div>
              @if (s.num < 3) {
                <div class="flex-1 h-0.5 mx-1 rounded-full overflow-hidden" style="background:rgba(255,255,255,.07)">
                  <div class="h-full rounded-full transition-all duration-500"
                       [style.width]="step() > s.num ? '100%' : '0%'"
                       style="background:linear-gradient(90deg,var(--color-gold-light),var(--color-gold))"></div>
                </div>
              }
            </div>
          }
        </div>
        <div class="flex justify-between text-[10px] font-mono tracking-wider uppercase mt-1">
          @for (s of stepDefs; track s.num) {
            <span [style.color]="step() >= s.num ? 'var(--color-gold)' : 'var(--color-haze)'">{{ s.label }}</span>
          }
        </div>
      </div>

      <!-- Error -->
      @if (mutateError()) {
        <div class="max-w-xl mx-auto w-full px-6 mb-4">
          <div class="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm animate-thermal-in"
               style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5">
            ⚠ {{ mutateError() }}
            <button (click)="mutateError.set('')" class="ml-auto" style="background:none;border:none;cursor:pointer;color:#fca5a5">✕</button>
          </div>
        </div>
      }

      <!-- STEP 1 -->
      @if (step() === 1) {
        <div class="flex-1 px-6 py-2 max-w-xl mx-auto w-full animate-thermal-in">
          <h2 class="font-display text-4xl mb-1" style="color:var(--color-ash);font-weight:300">เลือกรอบนั่ง</h2>
          <p class="text-sm mb-6" style="color:var(--color-smoke);font-family:var(--font-sans)">เลือกวันและรอบเวลาที่ต้องการ</p>

          <!-- Date picker -->
          <div class="mb-5">
            <label class="block text-xs font-semibold tracking-widest uppercase mb-3" style="color:var(--color-smoke);font-family:var(--font-sans)">วันที่ต้องการ</label>
            <input type="date" [value]="selectedDate()" [min]="minDate"
                   (change)="onDateChange($event)"
                   class="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all font-mono"
                   style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);color-scheme:dark"
                   (focus)="onFocus($event)" (blur)="onBlur($event)">
          </div>

          <!-- Pax -->
          <div class="mb-5">
            <label class="block text-xs font-semibold tracking-widest uppercase mb-3" style="color:var(--color-smoke);font-family:var(--font-sans)">จำนวนคน</label>
            <div class="flex items-stretch rounded-xl overflow-hidden" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);height:56px">
              <button type="button" (click)="decPax()" [disabled]="pax() <= 1"
                      class="w-14 flex items-center justify-center text-2xl shrink-0"
                      style="background:transparent;border:none;cursor:pointer;color:var(--color-gold)"
                      [style.opacity]="pax() <= 1 ? '.25' : '1'">−</button>
              <div class="flex-1 flex items-center justify-center gap-2">
                <span class="font-display text-3xl" style="color:var(--color-ash)">{{ pax() }}</span>
                <span class="text-sm" style="color:var(--color-smoke);font-family:var(--font-sans)">คน</span>
              </div>
              <button type="button" (click)="incPax()" [disabled]="pax() >= 20"
                      class="w-14 flex items-center justify-center text-2xl shrink-0"
                      style="background:transparent;border:none;cursor:pointer;color:var(--color-gold)"
                      [style.opacity]="pax() >= 20 ? '.25' : '1'">+</button>
            </div>
            <div class="mt-2 text-xs text-right font-mono" style="color:var(--color-smoke)">฿{{ currentPrice() }} / คน</div>
          </div>

          <!-- Tier selector -->
          <div class="mb-6">
            <div class="mb-4">
              <label class="block text-xs font-semibold tracking-widest uppercase mb-1" style="color:var(--color-smoke);font-family:var(--font-sans)">เลือกประเภทบุฟเฟ่ต์</label>
              <div class="text-xs" style="color:var(--color-smoke);opacity:.6;font-family:var(--font-sans);font-weight:300">เลือกระดับที่เหมาะกับคุณ</div>
            </div>
            <div class="flex flex-col gap-3">
              @for (t of tierList; track t) {
                @let info = tierLabels[t];
                @let price = tierPrices[t];
                @let isSel = selectedTier() === t;
                <div (click)="selectedTier.set(t)"
                     class="tier-card relative overflow-hidden cursor-pointer"
                     [class.tier-selected]="isSel"
                     [class.tier-gold-shimmer]="isSel && t === 'GOLD'"
                     [class.tier-silver-shimmer]="isSel && t === 'SILVER'"
                     [class.tier-platinum-shimmer]="isSel && t === 'PLATINUM'"
                     [style.background]="tierBg(t, isSel)"
                     [style.border]="tierBorder(t, isSel)"
                     [style.borderLeft]="tierAccent(t, isSel)"
                     [style.boxShadow]="isSel ? tierShadow(t) : 'none'"
                     style="border-radius:16px;min-height:88px;transition:all 250ms cubic-bezier(.4,0,.2,1)">
                  <div class="flex items-center gap-4" style="padding:16px 20px">
                    <div class="shrink-0 flex items-center justify-center"
                         [style.background]="tierIconBg(t, isSel)"
                         [style.border]="'1px solid ' + tierIconBorder(t)"
                         style="width:40px;height:40px;border-radius:12px;transition:all 250ms cubic-bezier(.4,0,.2,1)">
                      <span [innerHTML]="info.icon" style="line-height:0;display:flex;align-items:center;justify-content:center"></span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-display text-lg"
                           [style.color]="isSel ? tierColor(t) : 'var(--color-ash)'"
                           style="font-weight:400;letter-spacing:.02em;transition:color 250ms">{{ info.name }}</div>
                      <div class="text-xs" style="color:var(--color-smoke);opacity:.6;font-weight:300;font-family:var(--font-sans)">{{ info.desc }}</div>
                    </div>
                    <div class="font-mono shrink-0"
                         [style.color]="isSel ? tierColor(t) : 'var(--color-smoke)'"
                         style="font-size:1.25rem;font-weight:500;letter-spacing:-.02em;transition:color 250ms">
                      {{ price === 0 ? 'ฟรี' : '฿' + price }}
                    </div>
                    @if (isSel) {
                      <div class="shrink-0 flex items-center justify-center tier-check-enter"
                           [style.background]="tierColor(t)"
                           style="width:24px;height:24px;border-radius:50%">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#050608" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Time slots -->
          <div class="mb-5">
            <label class="block text-xs font-semibold tracking-widest uppercase mb-3" style="color:var(--color-smoke);font-family:var(--font-sans)">เลือกรอบเวลา</label>
            @if (slotsQuery.isPending()) {
              <div class="text-center py-6 text-sm" style="color:var(--color-smoke)">กำลังโหลดรอบเวลา...</div>
            } @else if (slotsQuery.isError()) {
              <div class="text-center py-4 text-sm" style="color:var(--color-crimson)">โหลดรอบเวลาไม่สำเร็จ</div>
            } @else {
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                @for (slot of slotsQuery.data()?.slots ?? []; track slot.slot_id) {
                  @let isSel = selectedSlotId() === slot.slot_id;
                  @let noRoom = slot.is_full! || (slot.remaining ?? 99) < pax();
                  <button type="button" (click)="selectSlot(slot)" [disabled]="noRoom"
                          class="relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all"
                          [style.background]="isSel ? 'rgba(201,168,76,.14)' : noRoom ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.05)'"
                          [style.border]="'1px solid ' + (isSel ? 'rgba(201,168,76,.5)' : noRoom ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.10)')"
                          [style.opacity]="noRoom ? '.45' : '1'"
                          [style.cursor]="noRoom ? 'not-allowed' : 'pointer'">
                    <span class="font-display text-xl" style="color:var(--color-ash)">{{ slot.slot_time }}</span>
                    @if (slot.is_full) {
                      <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style="background:rgba(239,68,68,.12);color:var(--color-crimson);font-family:var(--font-sans)">เต็มแล้ว</span>
                    } @else if (noRoom) {
                      <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style="background:rgba(239,68,68,.12);color:var(--color-crimson);font-family:var(--font-sans)">ที่นั่งไม่พอ</span>
                    } @else if (slot.is_nearly_full) {
                      <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style="background:rgba(245,158,11,.12);color:var(--color-amber);font-family:var(--font-sans)">ใกล้เต็ม</span>
                    } @else {
                      <span class="text-[9px] font-mono" style="color:var(--color-smoke)">เหลือ {{ slot.remaining }}</span>
                    }
                    @if (isSel) {
                      <div class="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                           style="background:var(--color-gold);color:#050608">✓</div>
                    }
                  </button>
                }
              </div>
            }
          </div>

          <!-- Payment method -->
          <div class="mb-8">
            <label class="block text-xs font-semibold tracking-widest uppercase mb-3" style="color:var(--color-smoke);font-family:var(--font-sans)">วิธีชำระเงิน</label>
            <div class="grid grid-cols-2 gap-3">
              @for (m of payMethods; track m.value) {
                <div (click)="payMethod.set(m.value)"
                     class="flex flex-col items-center gap-2 py-4 rounded-xl cursor-pointer transition-all"
                     [style.background]="payMethod() === m.value ? 'rgba(201,168,76,.10)' : 'rgba(255,255,255,.03)'"
                     [style.border]="'1px solid ' + (payMethod() === m.value ? 'rgba(201,168,76,.35)' : 'rgba(255,255,255,.08)')">
                  <span class="text-2xl">{{ m.icon }}</span>
                  <span class="text-xs font-semibold"
                        [style.color]="payMethod() === m.value ? 'var(--color-gold)' : 'var(--color-smoke)'"
                        style="font-family:var(--font-sans)">{{ m.label }}</span>
                  <span class="text-[10px]" style="color:var(--color-haze);font-family:var(--font-sans)">{{ m.sub }}</span>
                </div>
              }
            </div>
          </div>

          <button (click)="goStep2()" [disabled]="!selectedSlotId()"
                  class="w-full py-4 rounded-xl font-semibold text-base ripple-host"
                  style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;font-family:var(--font-sans);box-shadow:0 14px 40px rgba(201,168,76,.25)"
                  [style.opacity]="!selectedSlotId() ? '.5' : '1'"
                  (mousedown)="addRipple($event)">
            ถัดไป →
          </button>
        </div>
      }

      <!-- STEP 2 -->
      @if (step() === 2) {
        <div class="flex-1 px-6 py-2 max-w-xl mx-auto w-full animate-thermal-in">
          <h2 class="font-display text-4xl mb-1" style="color:var(--color-ash);font-weight:300">ข้อมูลลูกค้า</h2>
          <p class="text-sm mb-8" style="color:var(--color-smoke);font-family:var(--font-sans)">กรอกชื่อและเบอร์โทรเพื่อรับหมายเลขคิว</p>
          <form [formGroup]="form" class="space-y-5">
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke);font-family:var(--font-sans)">ชื่อ-นามสกุล</label>
              <input type="text" formControlName="customer_name" placeholder="ชื่อของคุณ"
                     class="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                     style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);font-family:var(--font-sans)"
                     (focus)="onFocus($event)" (blur)="onBlur($event)">
              @if (form.get('customer_name')?.touched && form.get('customer_name')?.invalid) {
                <p class="text-xs mt-1.5" style="color:var(--color-crimson);font-family:var(--font-sans)">กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร</p>
              }
            </div>
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke);font-family:var(--font-sans)">เบอร์โทร</label>
              <input type="tel" formControlName="customer_tel" placeholder="0812345678"
                     maxlength="10" inputmode="tel"
                     class="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all font-mono"
                     style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash)"
                     (focus)="onFocus($event)" (blur)="onBlur($event)">
              @if (form.get('customer_tel')?.touched && form.get('customer_tel')?.invalid) {
                <p class="text-xs mt-1.5" style="color:var(--color-crimson);font-family:var(--font-sans)">เบอร์โทรต้อง 9-10 หลัก</p>
              }
            </div>

            @if (payMethod() === 'QR') {
              <div class="pt-1">
                <label class="block text-xs font-semibold tracking-widest uppercase mb-3" style="color:var(--color-smoke);font-family:var(--font-sans)">ยอดที่ต้องจ่าย</label>
                <div class="grid grid-cols-2 gap-3">
                  <div (click)="qrType.set('QR_FULL')"
                       class="flex flex-col gap-1.5 p-4 rounded-xl cursor-pointer transition-all"
                       [style.background]="qrType() === 'QR_FULL' ? 'rgba(201,168,76,.10)' : 'rgba(255,255,255,.03)'"
                       [style.border]="'1px solid ' + (qrType() === 'QR_FULL' ? 'rgba(201,168,76,.35)' : 'rgba(255,255,255,.08)')">
                    <div class="flex items-center gap-1.5">
                      <span class="text-lg">📱</span>
                      <span class="text-xs font-bold"
                            [style.color]="qrType() === 'QR_FULL' ? 'var(--color-gold)' : 'var(--color-ash)'"
                            style="font-family:var(--font-sans)">จ่ายเต็มจำนวน</span>
                    </div>
                    <div class="font-mono text-base font-bold" style="color:var(--color-gold)">฿{{ breakdown().grand.toFixed(0) }}</div>
                    <div class="text-[10px] leading-snug" style="color:var(--color-haze);font-family:var(--font-sans)">ชำระครบทันที ไม่ต้องจ่ายเพิ่ม</div>
                  </div>
                  <div (click)="qrType.set('QR_DEPOSIT')"
                       class="flex flex-col gap-1.5 p-4 rounded-xl cursor-pointer transition-all"
                       [style.background]="qrType() === 'QR_DEPOSIT' ? 'rgba(201,168,76,.10)' : 'rgba(255,255,255,.03)'"
                       [style.border]="'1px solid ' + (qrType() === 'QR_DEPOSIT' ? 'rgba(201,168,76,.35)' : 'rgba(255,255,255,.08)')">
                    <div class="flex items-center gap-1.5">
                      <span class="text-lg">🔒</span>
                      <span class="text-xs font-bold"
                            [style.color]="qrType() === 'QR_DEPOSIT' ? 'var(--color-gold)' : 'var(--color-ash)'"
                            style="font-family:var(--font-sans)">จ่ายมัดจำ</span>
                    </div>
                    <div class="font-mono text-base font-bold" style="color:var(--color-gold)">฿{{ depositAmount() }}</div>
                    <div class="text-[10px] leading-snug" style="color:var(--color-haze);font-family:var(--font-sans)">จ่ายมัดจำ {{ pax() }}×฿100 ตอนนี้<br>คงเหลือ ฿{{ (breakdown().grand - depositAmount()).toFixed(0) }} จ่ายหน้าร้าน</div>
                  </div>
                </div>
              </div>
            }

          </form>
          <div class="flex gap-3 mt-8">
            <button (click)="step.set(1)" class="flex-1 py-4 rounded-xl font-semibold text-sm"
                    style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer;font-family:var(--font-sans)">← ย้อนกลับ</button>
            <button (click)="goStep3()" class="flex-1 py-4 rounded-xl font-semibold text-base ripple-host"
                    style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;font-family:var(--font-sans);box-shadow:0 14px 40px rgba(201,168,76,.25)"
                    (mousedown)="addRipple($event)">ถัดไป →</button>
          </div>
        </div>
      }

      <!-- STEP 3 -->
      @if (step() === 3) {
        <div class="flex-1 px-6 py-2 max-w-xl mx-auto w-full animate-thermal-in">
          <h2 class="font-display text-4xl mb-1" style="color:var(--color-ash);font-weight:300">ยืนยันการจอง</h2>
          <p class="text-sm mb-6" style="color:var(--color-smoke);font-family:var(--font-sans)">ตรวจสอบข้อมูลก่อนยืนยัน</p>
          <div class="rounded-2xl overflow-hidden mb-6" style="background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(201,168,76,.15)">
            <div class="px-5 py-4 border-b" style="border-color:rgba(201,168,76,.10)">
              <div class="font-mono text-xs tracking-widest uppercase" style="color:rgba(201,168,76,.6)">สรุปการจอง</div>
            </div>
            @for (row of summaryRows(); track row.label) {
              <div class="flex justify-between items-center px-5 py-3 border-b" style="border-color:rgba(255,255,255,.04)">
                <span class="text-sm" style="color:var(--color-smoke);font-family:var(--font-sans)">{{ row.label }}</span>
                <span class="text-sm font-semibold" style="color:var(--color-ash);font-family:var(--font-sans)">{{ row.value }}</span>
              </div>
            }
            @let b = breakdown();
            <div class="px-5 py-4 space-y-2" style="background:linear-gradient(135deg,rgba(201,168,76,.06),rgba(201,168,76,.02))">
              <div class="flex justify-between text-xs" style="color:var(--color-smoke);font-family:var(--font-sans)">
                <span>ค่าอาหาร ({{ pax() }} × ฿{{ currentPrice() }} {{ tierLabels[selectedTier()].name }})</span>
                <span class="font-mono">฿{{ b.subtotal.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-xs" style="color:var(--color-smoke);font-family:var(--font-sans)">
                <span>Service 10%</span><span class="font-mono">฿{{ b.service.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-xs" style="color:var(--color-smoke);font-family:var(--font-sans)">
                <span>VAT 7%</span><span class="font-mono">฿{{ b.vat.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between items-center pt-2" style="border-top:1px solid rgba(201,168,76,.15)">
                <span class="text-sm font-semibold" style="color:var(--color-gold);font-family:var(--font-sans)">ยอดรวม</span>
                <span class="font-display text-2xl" style="color:var(--color-ash)">฿{{ b.grand.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-3">
            <button (click)="step.set(2)" class="py-4 px-6 rounded-xl font-semibold text-sm"
                    style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer;font-family:var(--font-sans)">← ย้อนกลับ</button>
            <button (click)="submit()" [disabled]="mutation.isPending()"
                    class="flex-1 py-4 rounded-xl font-semibold text-base ripple-host flex items-center justify-center gap-2"
                    style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;font-family:var(--font-sans);box-shadow:0 14px 40px rgba(201,168,76,.25)"
                    [style.opacity]="mutation.isPending() ? '.7' : '1'"
                    (mousedown)="addRipple($event)">
              @if (mutation.isPending()) {
                <div class="animate-spin rounded-full" style="width:16px;height:16px;border:2px solid rgba(5,6,8,.3);border-top-color:#050608"></div>
                กำลังจอง...
              } @else { ✓ ยืนยันการจอง }
            </button>
          </div>
        </div>
      }

      <div class="pb-8 text-center">
        <a routerLink="/login" class="text-xs" style="color:var(--color-haze);text-decoration:none;font-family:var(--font-sans)">🔒 เข้าสู่ระบบพนักงาน</a>
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
          <div class="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl text-white success-ring"
               style="background:linear-gradient(135deg,#34D399,#059669);box-shadow:0 0 0 10px rgba(16,185,129,.12),0 0 0 22px rgba(16,185,129,.06),0 0 0 36px rgba(16,185,129,.03),0 20px 60px rgba(16,185,129,.25)">
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

          @if (successData()!.pay_token) {
            <a [href]="successData()!.pay_link" target="_blank"
               class="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold mb-3 transition-all"
               style="background:linear-gradient(135deg,#34D399,var(--color-jade));color:#002A12;text-decoration:none;box-shadow:0 12px 40px rgba(16,185,129,.22)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><rect x="8" y="8" width="3" height="3"/><rect x="13" y="8" width="3" height="3"/><rect x="8" y="13" width="3" height="3"/></svg>
              ชำระผ่าน QR PromptPay
            </a>
          }

          <a [routerLink]="['/queue-status', successData()!.queue_id]"
             class="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm mb-3 transition-all"
             style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;text-decoration:none;font-family:var(--font-sans)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ติดตามคิวของฉัน
          </a>

          <button (click)="closeModal()"
                  class="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                  style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-smoke);cursor:pointer">
            จองใหม่
          </button>
        </div>
      </div>
    }

    <style>
      /* ═══ ENTRANCE ═══ */
      .animate-thermal-in {
        animation: thermalIn .45s cubic-bezier(.16,1,.3,1) both;
      }
      @keyframes thermalIn {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ═══ TIER CARDS ═══ */
      .tier-card {
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      }
      .tier-card:not(.tier-selected):hover {
        transform: translateY(-2px);
        filter: brightness(1.08);
        box-shadow: 0 8px 28px rgba(0,0,0,.22) !important;
      }
      .tier-check-enter {
        animation: tierCheckPop 200ms cubic-bezier(.34,1.56,.64,1) both;
      }
      @keyframes tierCheckPop {
        from { transform: scale(0); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      .tier-gold-shimmer::after {
        content: ''; position: absolute; inset: 0; border-radius: 16px;
        background: linear-gradient(90deg, transparent 0%, rgba(201,168,76,.15) 50%, transparent 100%);
        animation: shimmerSweep 600ms ease-out both; pointer-events: none;
      }
      .tier-silver-shimmer::after {
        content: ''; position: absolute; inset: 0; border-radius: 16px;
        background: linear-gradient(90deg, transparent 0%, rgba(148,163,184,.20) 50%, transparent 100%);
        animation: shimmerSweep 600ms ease-out both; pointer-events: none;
      }
      .tier-platinum-shimmer::after {
        content: ''; position: absolute; inset: 0; border-radius: 16px;
        background: linear-gradient(90deg, transparent 0%, rgba(139,92,246,.20) 50%, transparent 100%);
        animation: shimmerSweep 600ms ease-out both; pointer-events: none;
      }
      @keyframes shimmerSweep {
        from { transform: translateX(-100%); }
        to   { transform: translateX(100%); }
      }

      /* ═══ RIPPLE ═══ */
      .ripple-host { position: relative; overflow: hidden; }
      .ripple-host .ripple {
        position: absolute; border-radius: 50%; background: rgba(255,255,255,.30);
        transform: scale(0); animation: rippleOut .6s ease forwards; pointer-events: none;
        width: 100px; height: 100px; margin: -50px 0 0 -50px;
      }
      @keyframes rippleOut { to { transform: scale(4); opacity: 0; } }
    </style>
  `,
})
export class BookingPage {
  private api  = inject(ApiService)
  private fb   = inject(FormBuilder)
  private anim = inject(AnimationService)

  pricePerPerson = PRICE_PER_PERSON
  step        = signal<1|2|3>(1)
  pax         = signal(2)
  selectedTier = signal<TierType>('SILVER')
  payMethod   = signal<'CASH'|'QR'>('CASH')
  qrType      = signal<'QR_FULL'|'QR_DEPOSIT'>('QR_FULL')
  successData = signal<Queue | null>(null)
  mutateError = signal('')

  tierList   = TIER_LIST
  tierPrices = TIER_PRICES
  tierLabels: Record<string, { name: string; desc: string; icon: string }> = {
    SILVER: {
      name: 'Silver',
      desc: 'บุฟเฟ่ต์มาตรฐาน',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5L12 2z" fill="rgba(148,163,184,.15)" stroke="#94A3B8" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    GOLD: {
      name: 'Gold',
      desc: 'บุฟเฟ่ต์พรีเมียม',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.94 6.04 6.56.96-4.68 4.63 1.1 6.53L12 17.27 6.08 20.16l1.1-6.53L2.5 9l6.56-.96L12 2z" fill="rgba(201,168,76,.3)" stroke="#C9A84C" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    },
    PLATINUM: {
      name: 'Platinum',
      desc: 'บุฟเฟ่ต์สุดพรีเมียม',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 3h12l4 6-10 13L2 9l4-6z" fill="rgba(139,92,246,.2)" stroke="#A78BFA" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 9h20M9 3l-1.5 6L12 22M15 3l1.5 6L12 22" stroke="#A78BFA" stroke-width=".8" opacity=".5"/></svg>`,
    },
  }

  currentPrice = computed(() => tierPrice(this.selectedTier()))
  depositAmount = computed(() => this.pax() * 100)
  breakdown = computed(() => calcBreakdown(this.pax(), this.selectedTier()))

  stepDefs = [
    { num: 1, label: 'วันเวลา' },
    { num: 2, label: 'ข้อมูล' },
    { num: 3, label: 'ยืนยัน' },
  ]

  form = this.fb.group({
    customer_name: ['', [Validators.required, Validators.minLength(2)]],
    customer_tel:  ['', [Validators.required, Validators.pattern(/^\d{9,10}$/)]],
  })

  readonly minDate    = new Date().toISOString().slice(0, 10)
  selectedDate        = signal<string>(new Date().toISOString().slice(0, 10))
  selectedSlotId      = signal<number>(0)

  slotsQuery = injectQuery(() => ({
    queryKey: ['slots', this.selectedDate()],
    queryFn: () => new Promise<{ slots: TimeSlot[] }>((res, rej) => {
      this.api.getSlots(this.selectedDate()).subscribe({ next: res, error: rej })
    }),
  }))

  mutation = injectMutation(() => ({
    mutationFn: (data: z.infer<typeof BookingFormSchema>) =>
      new Promise<Queue>((resolve, reject) => {
        this.api.createQueue(data).subscribe({
          next: (r: Queue) => resolve(r),
          error: (e: unknown) => reject(e),
        })
      }),
    onSuccess: (data: Queue) => {
      this.successData.set(data)
      this.mutateError.set('')
    },
    onError: (err: unknown) => {
      this.mutateError.set((err as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  payMethods = [
    { value: 'CASH' as const, icon: '💵', label: 'เงินสด',       sub: 'ชำระหน้าร้าน' },
    { value: 'QR'   as const, icon: '📱', label: 'QR PromptPay', sub: 'สแกนจ่ายได้เลย' },
  ]

  goStep2() {
    if (!this.selectedSlotId()) {
      this.mutateError.set('กรุณาเลือกรอบเวลาก่อน')
      return
    }
    this.mutateError.set('')
    this.step.set(2)
  }

  goStep3() {
    this.form.get('customer_name')?.markAsTouched()
    this.form.get('customer_tel')?.markAsTouched()
    if (this.form.get('customer_name')?.invalid || this.form.get('customer_tel')?.invalid) {
      this.mutateError.set('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    this.mutateError.set('')
    this.step.set(3)
  }

  summaryRows = computed(() => {
    const v    = this.form.value
    let pm: string
    if (this.payMethod() === 'CASH') {
      pm = '💵 เงินสด (มัดจำ QR ฿' + this.depositAmount() + ')'
    } else if (this.qrType() === 'QR_FULL') {
      pm = '📱 QR เต็มจำนวน ฿' + this.breakdown().grand.toFixed(0)
    } else {
      pm = '🔒 QR มัดจำ ฿' + this.depositAmount() + ' (คงเหลือ ฿' + (this.breakdown().grand - this.depositAmount()).toFixed(0) + ' หน้าร้าน)'
    }
    const slot = this.slotsQuery.data()?.slots.find((s: TimeSlot) => s.slot_id === this.selectedSlotId())
    const dt   = slot ? `${this.selectedDate()} เวลา ${slot.slot_time}` : '-'
    return [
      { label: 'ชื่อ',          value: v.customer_name || '-' },
      { label: 'เบอร์โทร',      value: v.customer_tel  || '-' },
      { label: 'จำนวนคน',      value: `${this.pax()} คน` },
      { label: 'วันเวลา',       value: dt },
      { label: 'วิธีชำระเงิน', value: pm },
    ]
  })

  submit() {
    const v = this.form.value
    let payMethodFinal: 'CASH_DEPOSIT' | 'QR_FULL' | 'QR_DEPOSIT'
    if (this.payMethod() === 'CASH') {
      payMethodFinal = 'CASH_DEPOSIT'
    } else if (this.qrType() === 'QR_FULL') {
      payMethodFinal = 'QR_FULL'
    } else {
      payMethodFinal = 'QR_DEPOSIT'
    }
    this.mutation.mutate({
      customer_name: v.customer_name!,
      customer_tel:  v.customer_tel!.replace(/\D/g, ''),
      pax_amount:    this.pax(),
      slot_id:       this.selectedSlotId(),
      booking_date:  this.selectedDate(),
      pay_method:    payMethodFinal,
      tier:          this.selectedTier(),
    })
  }

  closeModal() {
    this.successData.set(null)
    this.step.set(1)
    this.form.reset()
    this.pax.set(2)
    this.selectedSlotId.set(0)
    this.mutateError.set('')
  }

  onDateChange(e: Event) {
    this.selectedDate.set((e.target as HTMLInputElement).value)
    this.selectedSlotId.set(0)
  }

  selectSlot(slot: TimeSlot) {
    if (slot.is_full || (slot.remaining ?? 99) < this.pax()) return
    this.selectedSlotId.set(slot.slot_id)
  }

  incPax() { if (this.pax() < 20) this.pax.update((p: number) => p + 1) }
  decPax() { if (this.pax() > 1)  this.pax.update((p: number) => p - 1) }

  addRipple(e: MouseEvent) { this.anim.ripple(e.currentTarget as HTMLElement, e) }

  onFocus(e: FocusEvent) {
    const el = e.target as HTMLElement
    el.style.borderColor = 'rgba(201,168,76,.5)'
    el.style.boxShadow   = '0 0 0 3px rgba(201,168,76,.10)'
    el.style.background  = 'rgba(255,255,255,.06)'
  }
  onBlur(e: FocusEvent) {
    const el = e.target as HTMLElement
    el.style.borderColor = 'rgba(255,255,255,.09)'
    el.style.boxShadow   = 'none'
    el.style.background  = 'rgba(255,255,255,.04)'
  }

  tierBg(t: string, sel: boolean): string {
    const m: Record<string, string> = {
      SILVER:   `linear-gradient(135deg,rgba(148,163,184,${sel?.18:.08}),rgba(100,116,139,${sel?.10:.04}))`,
      GOLD:     `linear-gradient(135deg,rgba(201,168,76,${sel?.22:.10}),rgba(161,131,51,${sel?.12:.04}))`,
      PLATINUM: `linear-gradient(135deg,rgba(139,92,246,${sel?.22:.10}),rgba(109,40,217,${sel?.12:.04}))`,
    }
    return m[t] ?? m['SILVER']
  }

  tierBorder(t: string, sel: boolean): string {
    const def:    Record<string, string> = { SILVER:'rgba(148,163,184,.18)', GOLD:'rgba(201,168,76,.22)', PLATINUM:'rgba(139,92,246,.22)' }
    const active: Record<string, string> = { SILVER:'rgba(148,163,184,.60)', GOLD:'rgba(201,168,76,.70)', PLATINUM:'rgba(139,92,246,.70)' }
    return '1px solid ' + (sel ? (active[t] ?? active['SILVER']) : (def[t] ?? def['SILVER']))
  }

  tierAccent(t: string, sel: boolean): string {
    const def:    Record<string, string> = { SILVER:'3px solid rgba(148,163,184,.40)', GOLD:'3px solid rgba(201,168,76,.50)', PLATINUM:'3px solid rgba(139,92,246,.50)' }
    const active: Record<string, string> = { SILVER:'3px solid #94a3b8', GOLD:'3px solid #C9A84C', PLATINUM:'3px solid #8b5cf6' }
    return sel ? (active[t] ?? active['SILVER']) : (def[t] ?? def['SILVER'])
  }

  tierShadow(t: string): string {
    const m: Record<string, string> = {
      SILVER:   '0 0 0 1px rgba(148,163,184,.20), 0 8px 32px rgba(148,163,184,.12), inset 0 1px 0 rgba(255,255,255,.06)',
      GOLD:     '0 0 0 1px rgba(201,168,76,.25), 0 8px 40px rgba(201,168,76,.20), inset 0 1px 0 rgba(201,168,76,.10)',
      PLATINUM: '0 0 0 1px rgba(139,92,246,.25), 0 8px 40px rgba(139,92,246,.20), inset 0 1px 0 rgba(139,92,246,.10)',
    }
    return m[t] ?? 'none'
  }

  tierIconBg(t: string, sel: boolean): string {
    const m: Record<string, [string, string]> = {
      SILVER:   ['rgba(148,163,184,.15)', 'rgba(148,163,184,.08)'],
      GOLD:     ['rgba(201,168,76,.18)',  'rgba(201,168,76,.08)'],
      PLATINUM: ['rgba(139,92,246,.18)',  'rgba(139,92,246,.08)'],
    }
    const [a, d] = m[t] ?? m['SILVER']
    return sel ? a : d
  }

  tierIconBorder(t: string): string {
    const m: Record<string, string> = { SILVER:'rgba(148,163,184,.20)', GOLD:'rgba(201,168,76,.22)', PLATINUM:'rgba(139,92,246,.22)' }
    return m[t] ?? 'rgba(148,163,184,.20)'
  }

  tierColor(t: string): string {
    const c: Record<string, string> = { SILVER:'#94a3b8', GOLD:'#C9A84C', PLATINUM:'#a78bfa' }
    return c[t] ?? '#94a3b8'
  }

}
