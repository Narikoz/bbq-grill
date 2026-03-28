// src/app/features/admin/admin.page.ts
import {
  Component, inject, signal, ChangeDetectionStrategy,
  afterNextRender, viewChild, ElementRef, effect, computed,
} from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms'
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental'
import { ApiService } from '../../core/services/api.service'
import { AuthService } from '../../core/services/auth.service'
import { Employee, TodayReport, TimeSlot, Voucher } from '../../core/models'
import { Chart, registerables, TooltipItem } from 'chart.js'
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service'

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
          <div class="font-display text-2xl tracking-widest" style="color:var(--color-gold)">BBQ GRILL</div>
          <div class="text-[10px] tracking-widest uppercase mt-0.5 font-mono" style="color:rgba(201,168,76,.6)">ADMIN PANEL</div>
        </div>
        <nav class="flex-1 p-3 space-y-0.5">
          <button (click)="activeTab.set('dashboard')"
                  class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  [style.background]="activeTab() === 'dashboard' ? 'rgba(201,168,76,.10)' : 'transparent'"
                  [style.border]="activeTab() === 'dashboard' ? '1px solid rgba(201,168,76,.22)' : '1px solid transparent'"
                  [style.color]="activeTab() === 'dashboard' ? 'var(--color-gold)' : 'var(--color-smoke)'"
                  style="cursor:pointer">
            📊 Dashboard
          </button>
          <button (click)="activeTab.set('customers')"
                  class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  [style.background]="activeTab() === 'customers' ? 'rgba(201,168,76,.10)' : 'transparent'"
                  [style.border]="activeTab() === 'customers' ? '1px solid rgba(201,168,76,.22)' : '1px solid transparent'"
                  [style.color]="activeTab() === 'customers' ? 'var(--color-gold)' : 'var(--color-smoke)'"
                  style="cursor:pointer">
            👥 ลูกค้า
          </button>
          <button (click)="activeTab.set('messages')"
                  class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  [style.background]="activeTab() === 'messages' ? 'rgba(201,168,76,.10)' : 'transparent'"
                  [style.border]="activeTab() === 'messages' ? '1px solid rgba(201,168,76,.22)' : '1px solid transparent'"
                  [style.color]="activeTab() === 'messages' ? 'var(--color-gold)' : 'var(--color-smoke)'"
                  style="cursor:pointer;position:relative">
            📩 ข้อความ
            @if (unreadCount() > 0) {
              <span class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-bold rounded-full"
                    style="min-width:18px;height:18px;padding:0 5px;background:var(--color-crimson);color:white">{{ unreadCount() }}</span>
            }
          </button>
          <button (click)="activeTab.set('vouchers')"
                  class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  [style.background]="activeTab() === 'vouchers' ? 'rgba(201,168,76,.10)' : 'transparent'"
                  [style.border]="activeTab() === 'vouchers' ? '1px solid rgba(201,168,76,.22)' : '1px solid transparent'"
                  [style.color]="activeTab() === 'vouchers' ? 'var(--color-gold)' : 'var(--color-smoke)'"
                  style="cursor:pointer">
            🎫 Voucher
          </button>
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

        @if (activeTab() === 'dashboard') {
        <div class="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 class="num-display text-4xl mb-1" style="color:var(--color-ash)">DASHBOARD</h1>
            <p class="text-sm font-mono" style="color:var(--color-smoke)">{{ todayStr }}</p>
          </div>
          <!-- Export CSV with date range -->
          <div class="flex items-center gap-2 shrink-0">
            <div class="flex flex-col gap-0.5">
              <label class="text-[10px] uppercase tracking-wider" style="color:var(--color-haze)">จากวันที่</label>
              <input type="date" [value]="csvFrom()" (change)="csvFrom.set($any($event.target).value)"
                     class="rounded-lg px-2.5 py-1.5 text-xs font-mono"
                     style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);outline:none">
            </div>
            <div class="flex flex-col gap-0.5">
              <label class="text-[10px] uppercase tracking-wider" style="color:var(--color-haze)">ถึงวันที่</label>
              <input type="date" [value]="csvTo()" (change)="csvTo.set($any($event.target).value)"
                     class="rounded-lg px-2.5 py-1.5 text-xs font-mono"
                     style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);outline:none">
            </div>
            <div class="flex flex-col gap-0.5">
              <label class="text-[10px] uppercase tracking-wider" style="color:transparent">.</label>
              <button (click)="exportCsv()" [disabled]="csvLoading()"
                      class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold"
                      style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.22);color:var(--color-gold);cursor:pointer;font-family:var(--font-sans);transition:opacity .2s"
                      [style.opacity]="csvLoading() ? '0.6' : '1'">
                @if (csvLoading()) {
                  <span class="animate-spin inline-block rounded-full"
                        style="width:12px;height:12px;border:1.5px solid currentColor;border-top-color:transparent"></span>
                } @else {
                  ↓
                }
                Export CSV
              </button>
            </div>
          </div>
        </div>

        @if (reportQuery.isPending()) {
          <div class="flex items-center justify-center h-32">
            <div class="animate-spin rounded-full"
                 style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
          </div>
        }

        @if (reportQuery.data(); as r) {

          <!-- KPI -->
          <div class="grid grid-cols-4 gap-4 mb-8">
            <div class="rounded-2xl p-5 text-center"
                 style="background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.18)">
              <div class="font-display text-3xl mb-1" style="color:var(--color-gold)">
                ฿{{ r.revenue.rev | number:'1.0-0' }}
              </div>
              <div class="text-[10px] uppercase tracking-widest font-mono" style="color:rgba(201,168,76,.6)">รายได้วันนี้</div>
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
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-3">
                  <div class="w-1 h-4 rounded-full" style="background:var(--color-gold)"></div>
                  <span class="text-sm font-semibold" style="color:var(--color-ash)">รายได้รายช่วงเวลา</span>
                </div>
                <!-- Period toggle -->
                <div class="flex gap-1 p-1 rounded-lg" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                  @for (opt of periodOptions; track opt.value) {
                    <button (click)="setPeriod(opt.value)"
                            class="px-3 py-1 rounded-md text-xs font-semibold"
                            [style.background]="chartPeriod() === opt.value ? 'rgba(201,168,76,.20)' : 'transparent'"
                            [style.color]="chartPeriod() === opt.value ? 'var(--color-gold)' : 'var(--color-smoke)'"
                            [style.border]="chartPeriod() === opt.value ? '1px solid rgba(201,168,76,.30)' : '1px solid transparent'"
                            style="cursor:pointer;font-family:var(--font-sans);transition:all .15s ease">
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </div>
              @if (revenueQuery.isPending()) {
                <div class="flex items-center justify-center" style="height:200px">
                  <div class="animate-spin rounded-full"
                       style="width:22px;height:22px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
                </div>
              }
              <div [style.display]="revenueQuery.isPending() ? 'none' : 'block'" style="height:200px;position:relative;">
                <canvas #chartRef></canvas>
              </div>
              <div class="flex items-center gap-5 mt-3">
                <div class="flex items-center gap-1.5">
                  <div class="w-5 rounded" style="height:2px;background:#C9A84C"></div>
                  <span class="text-xs" style="color:var(--color-smoke)">รายได้ (฿)</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-3 h-3 rounded-sm" style="background:rgba(255,140,0,.5)"></div>
                  <span class="text-xs" style="color:var(--color-smoke)">จำนวนคิว</span>
                </div>
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
          <div class="w-1 h-5 rounded-full" style="background:var(--color-gold)"></div>
          <h2 class="text-lg font-semibold" style="color:var(--color-ash)">จัดการพนักงาน</h2>
          <div class="flex-1 h-px" style="background:rgba(255,255,255,.07)"></div>
          <button (click)="showCreate.set(true)"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.25);color:var(--color-gold);cursor:pointer;font-family:var(--font-sans)">
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
                        <button (click)="openEdit(e)"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.20);color:var(--color-gold);cursor:pointer">
                          ✏️ Edit
                        </button>
                        <button (click)="openReset(e)"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">
                          🔑 Reset
                        </button>
                        <button (click)="deleteEmp(e)"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.20);color:var(--color-crimson);cursor:pointer">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Time Slots -->
        <div class="mt-10 mb-6 flex items-center gap-4">
          <div class="w-1 h-5 rounded-full" style="background:var(--color-azure)"></div>
          <h2 class="text-lg font-semibold" style="color:var(--color-ash)">จัดการรอบเวลา</h2>
          <div class="flex-1 h-px" style="background:rgba(255,255,255,.07)"></div>
          <input type="date" [value]="slotsDate()" (change)="slotsDate.set($any($event.target).value)"
                 class="px-3 py-1.5 rounded-lg text-xs font-mono outline-none"
                 style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);color-scheme:dark">
          <button (click)="showAddSlot.set(true)"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style="background:rgba(59,130,246,.10);border:1px solid rgba(59,130,246,.25);color:var(--color-azure);cursor:pointer;font-family:var(--font-sans)">
            + เพิ่มรอบ
          </button>
        </div>

        @if (slotFlash()) {
          <div class="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm mb-4"
               [style.background]="slotFlash()!.ok ? 'rgba(16,185,129,.09)' : 'rgba(239,68,68,.09)'"
               [style.border]="'1px solid ' + (slotFlash()!.ok ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)')"
               [style.color]="slotFlash()!.ok ? '#86efac' : '#fca5a5'">
            {{ slotFlash()!.ok ? '✓' : '✕' }} {{ slotFlash()!.text }}
          </div>
        }

        @if (slotsQuery.isPending()) {
          <div class="flex items-center justify-center h-20">
            <div class="animate-spin rounded-full" style="width:22px;height:22px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-azure)"></div>
          </div>
        } @else {
          <div class="rounded-2xl overflow-hidden" style="border:1px solid rgba(255,255,255,.07)">
            <table class="w-full">
              <thead>
                <tr style="background:rgba(255,255,255,.03)">
                  @for (h of slotHeaders; track h) {
                    <th class="text-left px-5 py-3 text-[10px] font-bold tracking-widest uppercase"
                        style="color:var(--color-haze);border-bottom:1px solid rgba(255,255,255,.06)">{{ h }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (sl of slotsQuery.data()?.slots ?? []; track sl.slot_id) {
                  <tr style="border-bottom:1px solid rgba(255,255,255,.04)">
                    <td class="px-5 py-4">
                      <span class="font-display text-2xl" style="color:var(--color-ash)">{{ sl.slot_time }}</span>
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-2">
                        <input type="number" [value]="sl.max_capacity" min="1" max="500"
                               (change)="updateSlotCapacity(sl.slot_id, $any($event.target).value)"
                               class="w-20 px-3 py-1.5 rounded-lg text-sm font-mono outline-none text-center"
                               style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-ash)">
                        <span class="text-xs" style="color:var(--color-smoke)">คน</span>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-2">
                        <div class="h-1.5 rounded-full overflow-hidden" style="width:80px;background:rgba(255,255,255,.08)">
                          <div class="h-full rounded-full transition-all"
                               [style.width]="(sl.booked_pax! / sl.max_capacity * 100) + '%'"
                               [style.background]="sl.is_full ? 'var(--color-crimson)' : sl.is_nearly_full ? 'var(--color-amber)' : 'var(--color-jade)'"></div>
                        </div>
                        <span class="text-xs font-mono" style="color:var(--color-smoke)">{{ sl.booked_pax }}/{{ sl.max_capacity }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <button (click)="toggleSlot(sl)"
                              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              [style.background]="sl.is_active ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)'"
                              [style.border]="'1px solid ' + (sl.is_active ? 'rgba(239,68,68,.20)' : 'rgba(16,185,129,.22)')"
                              [style.color]="sl.is_active ? 'var(--color-crimson)' : 'var(--color-jade)'"
                              style="cursor:pointer">
                        {{ sl.is_active ? '■ ปิดรอบ' : '▶ เปิดรอบ' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        } <!-- /dashboard -->

        @if (activeTab() === 'customers') {
          <div class="mb-8 flex items-start justify-between gap-6">
            <div>
              <h1 class="num-display text-4xl mb-1" style="color:var(--color-ash)">ลูกค้า</h1>
              <p class="text-sm font-mono" style="color:var(--color-smoke)">CRM · {{ (customersQuery.data()?.customers ?? []).length }} คน</p>
            </div>
            <div class="relative">
              <input type="text" placeholder="ค้นหาชื่อหรือเบอร์..."
                     (input)="crmSearch.set($any($event.target).value)"
                     class="pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                     style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);width:220px">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color:var(--color-haze)">🔍</span>
            </div>
          </div>

          @if (customersQuery.isPending()) {
            <div class="flex items-center justify-center h-40">
              <div class="animate-spin rounded-full" style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
            </div>
          } @else {
            <div class="rounded-2xl overflow-hidden" style="border:1px solid rgba(255,255,255,.07)">
              <table class="w-full">
                <thead>
                  <tr style="background:rgba(255,255,255,.03)">
                    @for (h of crmHeaders; track h) {
                      <th class="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase"
                          style="color:var(--color-haze);border-bottom:1px solid rgba(255,255,255,.06)">{{ h }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (c of filteredCustomers(); track c.customer_id; let i = $index) {
                    <tr style="border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s,border-left .15s"
                        [style.background]="hoveredRow() === c.customer_id ? 'rgba(201,168,76,.04)' : 'transparent'"
                        [style.borderLeft]="hoveredRow() === c.customer_id ? '3px solid var(--color-gold)' : '3px solid transparent'"
                        (mouseenter)="hoveredRow.set(c.customer_id)"
                        (mouseleave)="hoveredRow.set(null)">
                      <td class="px-4 py-3">
                        <span class="text-xs font-mono" style="color:var(--color-haze)">{{ i + 1 }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                               style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.18);color:var(--color-gold)">
                            {{ (c.customer_name ?? '?').charAt(0) }}
                          </div>
                          <div>
                            <div class="text-sm font-semibold" style="color:var(--color-ash)">{{ c.customer_name }}</div>
                            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  [style.background]="segmentStyle(c).bg"
                                  [style.color]="segmentStyle(c).color"
                                  [style.border]="segmentStyle(c).border">
                              {{ segmentStyle(c).emoji }} {{ segmentStyle(c).label }}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <span class="text-sm font-mono" style="color:var(--color-smoke)">{{ c.customer_tel }}</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="num-display text-lg" style="color:var(--color-ash)">{{ c.total_bookings }}</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="text-sm font-mono" style="color:var(--color-jade)">{{ c.completed }}</span>
                        <span class="text-xs mx-1" style="color:var(--color-haze)">/</span>
                        <span class="text-sm font-mono" style="color:var(--color-crimson)">{{ c.cancelled }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="font-mono font-semibold" style="color:var(--color-gold)">฿{{ c.total_spent | number:'1.0-0' }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="text-sm font-mono" style="color:var(--color-smoke)">฿{{ c.avg_spend | number:'1.0-0' }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="text-xs" style="color:var(--color-haze)">{{ c.last_visit ? (c.last_visit | date:'dd/MM/yy') : '—' }}</span>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <button (click)="openHistory(c)" class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.20);color:var(--color-azure);cursor:pointer">ประวัติ</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        } <!-- /customers -->

        @if (activeTab() === 'messages') {
          <div class="mb-8 flex items-start justify-between gap-6">
            <div>
              <h1 class="num-display text-4xl mb-1" style="color:var(--color-ash)">📩 ข้อความจากลูกค้า</h1>
              <p class="text-sm font-mono" style="color:var(--color-smoke)">Support Inbox · {{ filteredMessages().length }} รายการ</p>
            </div>
            <div class="flex items-center gap-3">
              @for (f of msgFilterOptions; track f.value) {
                <button (click)="msgFilter.set(f.value)"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        [style.background]="msgFilter() === f.value ? 'rgba(201,168,76,.12)' : 'rgba(255,255,255,.04)'"
                        [style.border]="'1px solid ' + (msgFilter() === f.value ? 'rgba(201,168,76,.25)' : 'rgba(255,255,255,.07)')"
                        [style.color]="msgFilter() === f.value ? 'var(--color-gold)' : 'var(--color-smoke)'"
                        style="cursor:pointer">
                  {{ f.label }}
                </button>
              }
              @if (filteredMessages().length > 0) {
                <button (click)="deleteAllMsgs()"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.20);color:var(--color-crimson);cursor:pointer">
                  🗑️ ลบทั้งหมด
                </button>
              }
            </div>
          </div>

          @if (contactMessagesQuery.isPending()) {
            <div class="flex items-center justify-center h-40">
              <div class="animate-spin rounded-full" style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
            </div>
          } @else if (filteredMessages().length === 0) {
            <div class="flex flex-col items-center justify-center py-20" style="color:var(--color-haze)">
              <div style="font-size:48px;margin-bottom:12px">📭</div>
              <div class="text-sm">ยังไม่มีข้อความ</div>
            </div>
          } @else {
            <div class="space-y-3">
              @for (msg of filteredMessages(); track msg.id) {
                <div class="rounded-2xl overflow-hidden transition-all"
                     [style.border]="'1px solid ' + (msg.status === 'unread' ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.07)')"
                     [style.background]="msg.status === 'unread' ? 'rgba(239,68,68,.03)' : 'rgba(255,255,255,.02)'">

                  <!-- Row header -->
                  <div class="flex items-center gap-4 px-5 py-4 cursor-pointer"
                       (click)="toggleMsgExpand(msg.id); msg.status === 'unread' && markAs(msg.id, 'read')">
                    <div class="w-2 h-2 rounded-full shrink-0"
                         [style.background]="msg.status === 'unread' ? 'var(--color-crimson)' : msg.status === 'read' ? 'var(--color-azure)' : 'var(--color-jade)'"></div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-sm font-semibold truncate" style="color:var(--color-ash)">{{ msg.customer_name }}</span>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              [style.background]="msgStatusStyle(msg.status).bg"
                              [style.color]="msgStatusStyle(msg.status).color">{{ msgStatusStyle(msg.status).label }}</span>
                      </div>
                      <div class="text-xs truncate" style="color:var(--color-smoke)">
                        [{{ subjectLabel(msg.subject) }}] {{ msg.message }}
                      </div>
                    </div>
                    <div class="shrink-0 text-right">
                      <div class="text-[10px] font-mono" style="color:var(--color-haze)">{{ msg.created_at | date:'dd/MM/yy HH:mm' }}</div>
                    </div>
                    <div class="shrink-0 text-lg transition-transform"
                         [style.transform]="expandedMsgId() === msg.id ? 'rotate(180deg)' : 'rotate(0)'"
                         style="color:var(--color-haze)">▾</div>
                  </div>

                  <!-- Expanded detail -->
                  @if (expandedMsgId() === msg.id) {
                    <div class="px-5 pb-5 pt-1" style="border-top:1px solid rgba(255,255,255,.05)">
                      <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div class="text-[10px] uppercase tracking-widest mb-1" style="color:var(--color-haze)">ชื่อลูกค้า</div>
                          <div class="text-sm font-semibold" style="color:var(--color-ash)">{{ msg.customer_name }}</div>
                        </div>
                        <div>
                          <div class="text-[10px] uppercase tracking-widest mb-1" style="color:var(--color-haze)">เบอร์โทร</div>
                          <div class="text-sm font-mono" style="color:var(--color-ash)">{{ msg.customer_tel }}</div>
                        </div>
                        <div>
                          <div class="text-[10px] uppercase tracking-widest mb-1" style="color:var(--color-haze)">อีเมล</div>
                          <div class="text-sm" style="color:var(--color-ash)">{{ msg.customer_email || '—' }}</div>
                        </div>
                        <div>
                          <div class="text-[10px] uppercase tracking-widest mb-1" style="color:var(--color-haze)">หัวข้อ</div>
                          <div class="text-sm" style="color:var(--color-ash)">{{ subjectLabel(msg.subject) }}</div>
                        </div>
                      </div>
                      <div class="mb-4">
                        <div class="text-[10px] uppercase tracking-widest mb-1" style="color:var(--color-haze)">ข้อความ</div>
                        <div class="text-sm leading-relaxed p-3 rounded-xl"
                             style="color:var(--color-ash);background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);white-space:pre-wrap">{{ msg.message }}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        @if (msg.status !== 'read') {
                          <button (click)="markAs(msg.id, 'read'); $event.stopPropagation()"
                                  class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                  style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.20);color:var(--color-azure);cursor:pointer">
                            📖 อ่านแล้ว
                          </button>
                        }
                        @if (msg.status !== 'replied') {
                          <button (click)="markAs(msg.id, 'replied'); $event.stopPropagation()"
                                  class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                  style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.20);color:var(--color-jade);cursor:pointer">
                            ✓ ตอบแล้ว
                          </button>
                        }
                        @if (msg.customer_email) {
                          <a [href]="'https://mail.google.com/mail/?view=cm&to=' + msg.customer_email" target="_blank"
                             class="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                             style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.20);color:var(--color-gold);cursor:pointer;text-decoration:none">
                            ✉ ส่งอีเมลตอบกลับ
                          </a>
                        }
                        @if (msg.customer_tel) {
                          <a [href]="'tel:' + msg.customer_tel"
                             class="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                             style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.20);color:var(--color-amber);cursor:pointer;text-decoration:none">
                            📞 โทรกลับ
                          </a>
                        }
                        <button (click)="deleteMsg(msg.id); $event.stopPropagation()"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto"
                                style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.20);color:var(--color-crimson);cursor:pointer">
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        } <!-- /messages -->

        @if (activeTab() === 'vouchers') {
          <div class="mb-8 flex items-start justify-between gap-6">
            <div>
              <h1 class="num-display text-4xl mb-1" style="color:var(--color-ash)">🎫 Voucher</h1>
              <p class="text-sm font-mono" style="color:var(--color-smoke)">
                โค้ดส่วนลด · {{ (vouchersQuery.data()?.vouchers ?? []).length }} โค้ด
              </p>
            </div>
            <button (click)="showCreateVoucher.set(true)"
                    class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                    style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.25);color:var(--color-gold);cursor:pointer;font-family:var(--font-sans)">
              + สร้างโค้ด
            </button>
          </div>

          @if (voucherFlash()) {
            <div class="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm mb-4"
                 [style.background]="voucherFlash()!.ok ? 'rgba(16,185,129,.09)' : 'rgba(239,68,68,.09)'"
                 [style.border]="'1px solid ' + (voucherFlash()!.ok ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)')"
                 [style.color]="voucherFlash()!.ok ? '#86efac' : '#fca5a5'">
              {{ voucherFlash()!.ok ? '✓' : '✕' }} {{ voucherFlash()!.text }}
            </div>
          }

          @if (vouchersQuery.isPending()) {
            <div class="flex items-center justify-center h-40">
              <div class="animate-spin rounded-full"
                   style="width:28px;height:28px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
            </div>
          } @else if ((vouchersQuery.data()?.vouchers ?? []).length === 0) {
            <div class="flex flex-col items-center justify-center py-20" style="color:var(--color-haze)">
              <div style="font-size:48px;margin-bottom:12px">🎫</div>
              <div class="text-sm">ยังไม่มีโค้ดส่วนลด</div>
            </div>
          } @else {
            <div class="rounded-2xl overflow-hidden" style="border:1px solid rgba(255,255,255,.07)">
              <table class="w-full">
                <thead>
                  <tr style="background:rgba(255,255,255,.03)">
                    @for (h of ['โค้ด', 'ส่วนลด', 'ใช้แล้ว/ทั้งหมด', 'หมดอายุ', 'สถานะ', '']; track h) {
                      <th class="text-left px-5 py-3 text-[10px] font-bold tracking-widest uppercase"
                          style="color:var(--color-haze);border-bottom:1px solid rgba(255,255,255,.06)">{{ h }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (v of vouchersQuery.data()?.vouchers ?? []; track v.voucher_id) {
                    <tr style="border-bottom:1px solid rgba(255,255,255,.04)">
                      <td class="px-5 py-4">
                        <span class="font-mono font-bold text-sm px-3 py-1 rounded-lg"
                              style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.20);color:var(--color-gold);letter-spacing:.1em">
                          {{ v.code }}
                        </span>
                        @if (v.description) {
                          <div class="text-xs mt-1" style="color:var(--color-haze)">{{ v.description }}</div>
                        }
                      </td>
                      <td class="px-5 py-4">
                        <span class="font-display text-2xl" style="color:var(--color-jade)">{{ v.discount_pct }}%</span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 rounded-full overflow-hidden" style="width:60px;background:rgba(255,255,255,.08)">
                            <div class="h-full rounded-full"
                                 [style.width]="v.max_uses > 0 ? (v.used_count / v.max_uses * 100) + '%' : '0%'"
                                 style="background:var(--color-gold)"></div>
                          </div>
                          <span class="font-mono text-sm" style="color:var(--color-smoke)">
                            {{ v.used_count }}/{{ v.max_uses === 0 ? '∞' : v.max_uses }}
                          </span>
                        </div>
                      </td>
                      <td class="px-5 py-4">
                        @if (v.expires_at) {
                          <span class="text-xs font-mono" style="color:var(--color-smoke)">
                            {{ v.expires_at | date:'dd/MM/yy' }}
                          </span>
                        } @else {
                          <span style="color:var(--color-haze)">—</span>
                        }
                      </td>
                      <td class="px-5 py-4">
                        <span class="text-[10px] font-bold px-2 py-1 rounded-md uppercase"
                              [style.background]="v.is_active ? 'rgba(16,185,129,.10)' : 'rgba(239,68,68,.08)'"
                              [style.border]="'1px solid ' + (v.is_active ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.18)')"
                              [style.color]="v.is_active ? 'var(--color-jade)' : 'var(--color-crimson)'">
                          {{ v.is_active ? 'ACTIVE' : 'DISABLED' }}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button (click)="toggleVoucherActive(v)"
                                  class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                  [style.background]="v.is_active ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)'"
                                  [style.border]="'1px solid ' + (v.is_active ? 'rgba(239,68,68,.20)' : 'rgba(16,185,129,.22)')"
                                  [style.color]="v.is_active ? 'var(--color-crimson)' : 'var(--color-jade)'"
                                  style="cursor:pointer">
                            {{ v.is_active ? '■ ปิด' : '► เปิด' }}
                          </button>
                          <button (click)="deleteVoucher(v)"
                                  class="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                  style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.20);color:var(--color-crimson);cursor:pointer">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        } <!-- /vouchers -->

      </main>
    </div>

    <!-- Customer History Modal -->
    @if (historyCustomer()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.85);backdrop-filter:blur(12px)"
           (click)="historyCustomer.set(null)">
        <div class="w-full max-w-[820px] rounded-2xl overflow-hidden"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(201,168,76,.15);box-shadow:0 40px 120px rgba(0,0,0,.80);max-height:88vh;display:flex;flex-direction:column"
             (click)="$event.stopPropagation()">
          <div class="p-6 shrink-0" style="border-bottom:1px solid rgba(255,255,255,.07)">
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="text-xl font-semibold" style="color:var(--color-ash)">{{ historyCustomer()!.customer_name }}</h3>
                  <span class="text-xs font-bold px-2 py-0.5 rounded"
                        [style.background]="segmentStyle(historyCustomer()).bg"
                        [style.color]="segmentStyle(historyCustomer()).color"
                        [style.border]="segmentStyle(historyCustomer()).border">
                    {{ segmentStyle(historyCustomer()).emoji }} {{ segmentStyle(historyCustomer()).label }}
                  </span>
                </div>
                <div class="text-sm font-mono" style="color:var(--color-smoke)">{{ historyCustomer()!.customer_tel }}</div>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="exportCustomerCsv()"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style="background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.22);color:var(--color-gold);cursor:pointer">
                  ↓ Export CSV
                </button>
                <button (click)="historyCustomer.set(null)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">✕</button>
              </div>
            </div>
            <div class="grid grid-cols-4 gap-3">
              <div class="rounded-xl p-3 text-center" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                <div class="num-display text-2xl mb-0.5" style="color:var(--color-azure)">{{ historyCustomer()!.total_bookings }}</div>
                <div class="text-[9px] uppercase tracking-widest" style="color:var(--color-haze)">จองทั้งหมด</div>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                <div class="num-display text-2xl mb-0.5" style="color:var(--color-jade)">{{ historyCustomer()!.completed }}</div>
                <div class="text-[9px] uppercase tracking-widest" style="color:var(--color-haze)">สำเร็จ</div>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.18)">
                <div class="font-display text-2xl mb-0.5" style="color:var(--color-gold)">฿{{ historyCustomer()!.total_spent | number:'1.0-0' }}</div>
                <div class="text-[9px] uppercase tracking-widest" style="color:rgba(201,168,76,.6)">ยอดรวม</div>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                <div class="num-display text-2xl mb-0.5" style="color:var(--color-amber)">฿{{ historyCustomer()!.avg_spend | number:'1.0-0' }}</div>
                <div class="text-[9px] uppercase tracking-widest" style="color:var(--color-haze)">เฉลี่ย/ครั้ง</div>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            @if (customerHistoryQuery.isPending()) {
              <div class="flex items-center justify-center h-24">
                <div class="animate-spin rounded-full" style="width:22px;height:22px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--color-gold)"></div>
              </div>
            } @else {
              <div class="space-y-2">
                @for (q of customerHistoryQuery.data()?.queues ?? []; track q.queue_id) {
                  <div class="flex items-center gap-3 px-4 py-3 rounded-xl"
                       style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)">
                    <span class="font-mono text-xs shrink-0 w-14" style="color:var(--color-haze)">#{{ q.queue_id }}</span>
                    <span class="text-xs shrink-0" style="color:var(--color-smoke);min-width:90px">{{ q.created_at | date:'dd/MM/yy HH:mm' }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                          [style.background]="q.tier === 'GOLD' ? 'rgba(201,168,76,.15)' : 'rgba(148,163,184,.10)'"
                          [style.color]="q.tier === 'GOLD' ? 'var(--color-gold)' : 'var(--color-smoke)'">{{ q.tier ?? 'SILVER' }}</span>
                    <span class="text-xs shrink-0" style="color:var(--color-smoke)">โต๊ะ {{ q.table_number ?? '-' }}</span>
                    <span class="text-xs shrink-0" style="color:var(--color-haze)">{{ q.pax_amount }} คน</span>
                    <span class="font-mono text-sm flex-1 text-right" style="color:var(--color-gold)">
                      {{ q.total_amount ? '฿' + (q.total_amount | number:'1.0-0') : '—' }}
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                          [style.background]="qStatusStyle(q.queue_status).bg"
                          [style.color]="qStatusStyle(q.queue_status).color">{{ q.queue_status }}</span>
                  </div>
                } @empty {
                  <p class="text-center py-8 text-sm" style="color:var(--color-haze)">ไม่มีประวัติการจอง</p>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Add Slot Modal -->
    @if (showAddSlot()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="showAddSlot.set(false)">
        <div class="w-full max-w-[380px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(59,130,246,.18);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <h3 class="font-display text-2xl mb-6" style="color:var(--color-ash);font-weight:300">➕ เพิ่มรอบเวลา</h3>
          <form [formGroup]="addSlotForm" (ngSubmit)="submitAddSlot()" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke)">เวลา (HH:MM)</label>
              <input type="time" formControlName="slot_time"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);color-scheme:dark">
            </div>
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke)">ความจุ (คน)</label>
              <input type="number" formControlName="max_capacity" min="1"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
            </div>
            <div class="flex gap-2.5 mt-2">
              <button type="button" (click)="showAddSlot.set(false)" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">ยกเลิก</button>
              <button type="submit" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:linear-gradient(135deg,rgba(59,130,246,.8),rgba(59,130,246,.6));color:#fff;border:none;cursor:pointer">เพิ่มรอบ</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (editTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="editTarget.set(null)">
        <div class="w-full max-w-[420px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(201,168,76,.15);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <h3 class="font-display text-2xl mb-6" style="color:var(--color-ash);font-weight:300">✏️ แก้ไขพนักงาน</h3>
          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke);font-family:var(--font-sans)">ชื่อ-นามสกุล</label>
              <input type="text" formControlName="emp_name" placeholder="ชื่อพนักงาน"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);font-family:var(--font-sans)">
            </div>
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke);font-family:var(--font-sans)">Role</label>
              <select formControlName="role" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div class="flex gap-2.5 mt-2">
              <button type="button" (click)="editTarget.set(null)" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer;font-family:var(--font-sans)">ยกเลิก</button>
              <button type="submit" class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;font-family:var(--font-sans)">บันทึก</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Create Modal -->
    @if (showCreate()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="showCreate.set(false)">
        <div class="w-full max-w-[420px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(255,255,255,.10);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <h3 class="font-display text-2xl mb-6" style="color:var(--color-ash);font-weight:300">➕ เพิ่มพนักงาน</h3>
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
                      style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;font-family:var(--font-sans)">สร้าง</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Create Voucher Modal -->
    @if (showCreateVoucher()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
           style="background:rgba(5,6,8,.82);backdrop-filter:blur(10px)"
           (click)="showCreateVoucher.set(false)">
        <div class="w-full max-w-[460px] rounded-2xl p-8"
             style="background:linear-gradient(160deg,var(--color-smolder),var(--color-cinder));border:1px solid rgba(201,168,76,.15);box-shadow:0 40px 120px rgba(0,0,0,.70)"
             (click)="$event.stopPropagation()">
          <h3 class="font-display text-2xl mb-6" style="color:var(--color-ash);font-weight:300">🎫 สร้างโค้ดส่วนลด</h3>
          <form [formGroup]="voucherForm" (ngSubmit)="submitCreateVoucher()" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                     style="color:var(--color-smoke)">โค้ด (A-Z, 0-9, -, _)</label>
              <input type="text" formControlName="code"
                     placeholder="SUMMER20"
                     (input)="voucherForm.get('code')!.setValue($any($event.target).value.toUpperCase())"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono tracking-widest uppercase"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
              @if (voucherForm.get('code')?.touched && voucherForm.get('code')?.invalid) {
                <p class="text-xs mt-1" style="color:var(--color-crimson)">โค้ดต้องเป็น A-Z 0-9 ขีด 3-32 ตัว</p>
              }
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                       style="color:var(--color-smoke)">ส่วนลด (%)</label>
                <input type="number" formControlName="discount_pct" min="1" max="100"
                       class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                       style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
              </div>
              <div>
                <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                       style="color:var(--color-smoke)">ใช้ได้กี่ครั้ง (0 = ไม่จำกัด)</label>
                <input type="number" formControlName="max_uses" min="0"
                       class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                       style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash)">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                     style="color:var(--color-smoke)">วันหมดอายุ (ว่างไว้ = ไม่มีวันหมดอายุ)</label>
              <input type="datetime-local" formControlName="expires_at"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);color-scheme:dark">
            </div>
            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2"
                     style="color:var(--color-smoke)">คำอธิบาย (optional)</label>
              <input type="text" formControlName="description"
                     placeholder="เช่น โปรโมชั่นฤดูร้อน"
                     class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);color:var(--color-ash);font-family:var(--font-sans)">
            </div>
            <div class="flex gap-2.5 mt-2">
              <button type="button" (click)="showCreateVoucher.set(false)"
                      class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--color-smoke);cursor:pointer">ยกเลิก</button>
              <button type="submit"
                      class="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;font-family:var(--font-sans)">สร้างโค้ด</button>
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
  private api  = inject(ApiService)
  private fb   = inject(FormBuilder)
  private qc   = injectQueryClient()
  private http = inject(HttpClient)
  private confirmDialog = inject(ConfirmDialogService)
  private revenueChart?: Chart

  showCreate   = signal(false)
  showAddSlot  = signal(false)
  resetTarget  = signal<Employee | null>(null)
  editTarget   = signal<Employee | null>(null)
  flashMsg     = signal<{ ok: boolean; text: string } | null>(null)
  slotFlash    = signal<{ ok: boolean; text: string } | null>(null)
  slotsDate    = signal<string>(new Date().toISOString().slice(0, 10))
  chartPeriod     = signal<'daily' | 'weekly' | 'monthly'>('daily')
  csvLoading      = signal(false)
  csvFrom         = signal<string>((() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })())
  csvTo           = signal<string>(new Date().toISOString().slice(0, 10))
  activeTab       = signal<'dashboard' | 'customers' | 'messages' | 'vouchers'>('dashboard')
  crmSearch       = signal('')
  hoveredRow      = signal<number | null>(null)
  historyCustomer = signal<any>(null)
  msgFilter       = signal<'all' | 'unread' | 'read' | 'replied'>('all')
  expandedMsgId   = signal<number | null>(null)

  showCreateVoucher = signal(false)
  voucherFlash      = signal<{ ok: boolean; text: string } | null>(null)

  voucherForm = this.fb.group({
    code:         ['', [Validators.required, Validators.pattern(/^[A-Z0-9_\-]{3,32}$/)]],
    discount_pct: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    max_uses:     [1,  [Validators.required, Validators.min(0)]],
    expires_at:   [''],
    description:  [''],
  })
  todayStr    = new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  crmHeaders = ['#', 'ลูกค้า', 'เบอร์โทร', 'จองทั้งหมด', 'สำเร็จ / ยกเลิก', 'ยอดรวม', 'เฉลี่ย/ครั้ง', 'มาล่าสุด', '']
  msgFilterOptions: { label: string; value: 'all' | 'unread' | 'read' | 'replied' }[] = [
    { label: 'ทั้งหมด', value: 'all' },
    { label: 'ยังไม่อ่าน', value: 'unread' },
    { label: 'อ่านแล้ว', value: 'read' },
    { label: 'ตอบแล้ว', value: 'replied' },
  ]

  filteredCustomers = computed(() => {
    const q    = this.crmSearch().toLowerCase().trim()
    const list: any[] = this.customersQuery.data()?.customers ?? []
    if (!q) return list
    return list.filter((c: any) =>
      (c.customer_name ?? '').toLowerCase().includes(q) ||
      (c.customer_tel  ?? '').includes(q)
    )
  })

  periodOptions: { label: string; value: 'daily' | 'weekly' | 'monthly' }[] = [
    { label: '30 วัน',     value: 'daily'   },
    { label: '12 สัปดาห์', value: 'weekly'  },
    { label: '12 เดือน',  value: 'monthly' },
  ]

  chartRef = viewChild<ElementRef<HTMLCanvasElement>>('chartRef')

  customersQuery = injectQuery(() => ({
    queryKey: ['customers'],
    queryFn: () => new Promise<{ customers: any[] }>((res, rej) => {
      this.api.getCustomers().subscribe({ next: res, error: rej })
    }),
  }))

  customerHistoryQuery = injectQuery(() => ({
    queryKey: ['customer-history', this.historyCustomer()?.customer_id ?? null],
    enabled: !!this.historyCustomer(),
    queryFn: () => new Promise<{ queues: any[] }>((res, rej) => {
      this.api.getCustomerHistory(this.historyCustomer()!.customer_id).subscribe({ next: res, error: rej })
    }),
  }))

  revenueQuery = injectQuery(() => ({
    queryKey: ['revenue', this.chartPeriod()],
    queryFn: () => new Promise<{ labels: string[]; revenue: number[]; queues: number[] }>((res, rej) => {
      this.http.get<{ labels: string[]; revenue: number[]; queues: number[] }>(
        `/api/report/revenue?period=${this.chartPeriod()}`, { withCredentials: true }
      ).subscribe({ next: res, error: rej })
    }),
  }))

  reportQuery = injectQuery(() => ({
    queryKey: ['report', 'today'],
    queryFn: () => new Promise<TodayReport>((res, rej) => {
      this.api.getTodayReport().subscribe({ next: res, error: rej })
    }),
    refetchInterval: 60_000,
  }))

  slotsQuery = injectQuery(() => ({
    queryKey: ['slots-admin', this.slotsDate()],
    queryFn: () => new Promise<{ slots: TimeSlot[] }>((res, rej) => {
      this.api.getSlots(this.slotsDate()).subscribe({ next: res, error: rej })
    }),
    refetchInterval: 30_000,
  }))

  slotMutation = injectMutation(() => ({
    mutationFn: ({ id, data }: { id?: number; data: Record<string, unknown> }) =>
      new Promise<unknown>((res, rej) => {
        if (id) {
          this.api.updateSlot(id, data as { max_capacity?: number; is_active?: number }).subscribe({ next: res, error: rej })
        } else {
          this.api.createSlot(data as { slot_time: string; max_capacity: number }).subscribe({ next: res, error: rej })
        }
      }),
    onSuccess: (_: unknown, vars: { id?: number; data: Record<string, unknown> }) => {
      this.qc.invalidateQueries({ queryKey: ['slots-admin'] })
      this.qc.invalidateQueries({ queryKey: ['slots'] })
      const msg = vars.id ? 'อัปเดตรอบสำเร็จ' : 'เพิ่มรอบสำเร็จ'
      this.showSlotFlash(true, msg)
      this.showAddSlot.set(false)
      this.addSlotForm.reset({ max_capacity: 30 })
    },
    onError: (err: unknown) => {
      this.showSlotFlash(false, (err as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด')
    },
  }))

  contactMessagesQuery = injectQuery(() => ({
    queryKey: ['contact-messages', this.msgFilter()],
    queryFn: () => new Promise<{ messages: any[]; unread_count: number }>((res, rej) => {
      const f = this.msgFilter()
      const url = f === 'all' ? '/api/contact-messages' : `/api/contact-messages?status=${f}`
      this.http.get<{ messages: any[]; unread_count: number }>(url, { withCredentials: true })
        .subscribe({ next: res, error: rej })
    }),
    refetchInterval: 30_000,
  }))

  updateMsgMutation = injectMutation(() => ({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      new Promise<unknown>((res, rej) => {
        this.http.patch(`/api/contact-messages/${id}`, { status }, { withCredentials: true })
          .subscribe({ next: res, error: rej })
      }),
    onSuccess: () => {
      this.qc.invalidateQueries({ queryKey: ['contact-messages'] })
    },
  }))

  unreadCount = computed(() => this.contactMessagesQuery.data()?.unread_count ?? 0)

  filteredMessages = computed(() => {
    return this.contactMessagesQuery.data()?.messages ?? []
  })

  subjectLabel(s: string) {
    const m: Record<string, string> = {
      booking: 'การจองโต๊ะ', payment: 'การชำระเงิน', queue: 'การติดตามคิว',
      cancel: 'การยกเลิก', general: 'สอบถามทั่วไป', other: 'อื่นๆ',
    }
    return m[s] ?? s
  }

  msgStatusStyle(s: string) {
    const m: Record<string, { bg: string; color: string; label: string }> = {
      unread:  { bg: 'rgba(239,68,68,.12)',   color: 'var(--color-crimson)', label: 'ยังไม่อ่าน' },
      read:    { bg: 'rgba(59,130,246,.12)',   color: 'var(--color-azure)',   label: 'อ่านแล้ว' },
      replied: { bg: 'rgba(16,185,129,.12)',   color: 'var(--color-jade)',    label: 'ตอบแล้ว' },
    }
    return m[s] ?? { bg: 'rgba(148,163,184,.10)', color: 'var(--color-smoke)', label: s }
  }

  deleteMsgMutation = injectMutation(() => ({
    mutationFn: ({ id }: { id: number }) =>
      new Promise<unknown>((res, rej) => {
        this.http.delete(`/api/contact-messages/${id}`, { withCredentials: true })
          .subscribe({ next: res, error: rej })
      }),
    onSuccess: () => {
      this.qc.invalidateQueries({ queryKey: ['contact-messages'] })
    },
  }))

  deleteAllMsgsMutation = injectMutation(() => ({
    mutationFn: () =>
      new Promise<unknown>((res, rej) => {
        this.http.delete('/api/contact-messages', { withCredentials: true })
          .subscribe({ next: res, error: rej })
      }),
    onSuccess: () => {
      this.expandedMsgId.set(null)
      this.qc.invalidateQueries({ queryKey: ['contact-messages'] })
    },
  }))

  toggleMsgExpand(id: number) {
    this.expandedMsgId.update(cur => cur === id ? null : id)
  }

  markAs(id: number, status: string) {
    this.updateMsgMutation.mutate({ id, status })
  }

  async deleteMsg(id: number) {
    const ok = await this.confirmDialog.confirm('ลบข้อความ', 'ต้องการลบข้อความนี้ใช่หรือไม่?', { type: 'danger', confirmText: 'ลบ' })
    if (!ok) return
    this.deleteMsgMutation.mutate({ id })
  }

  async deleteAllMsgs() {
    const ok = await this.confirmDialog.confirm('ลบข้อความทั้งหมด', 'การกระทำนี้ไม่สามารถย้อนกลับได้ ต้องการลบทั้งหมดใช่หรือไม่?', { type: 'danger', confirmText: 'ลบทั้งหมด' })
    if (!ok) return
    this.deleteAllMsgsMutation.mutate(undefined as any)
  }

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
        } else if (action === 'update_full') {
          this.api.updateEmployeeFull(id!, extra as { emp_name: string; role: string })
            .subscribe({ next: res, error: rej })
        } else if (action === 'delete') {
          this.api.deleteEmployee(id!).subscribe({ next: res, error: rej })
        } else {
          this.api.updateEmployee(id!, action, extra).subscribe({ next: res, error: rej })
        }
      }),
    onSuccess: (_: unknown, vars: { action: string; id?: number; extra?: Record<string, unknown> }) => {
      this.qc.invalidateQueries({ queryKey: ['employees'] })
      const msg = vars.action === 'create' ? 'สร้างบัญชีสำเร็จ' :
                  vars.action === 'reset_password' ? 'Reset รหัสผ่านสำเร็จ' :
                  vars.action === 'delete' ? 'ลบพนักงานแล้ว' : 'อัปเดตสำเร็จ'
      this.showFlash(true, msg)
      this.showCreate.set(false)
      this.resetTarget.set(null)
      this.editTarget.set(null)
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
  editForm = this.fb.group({
    emp_name: ['', Validators.required],
    role:     ['STAFF'],
  })

  statusRows = [
    { key: 'WAITING',   label: 'รอยืนยัน', color: 'var(--color-amber)' },
    { key: 'CONFIRMED', label: 'ยืนยัน',    color: 'var(--color-azure)' },
    { key: 'SEATED',    label: 'นั่งโต๊ะ', color: 'var(--color-jade)' },
    { key: 'FINISHED',  label: 'เสร็จ',     color: 'var(--color-smoke)' },
    { key: 'CANCELLED', label: 'ยกเลิก',    color: 'var(--color-crimson)' },
  ]
  tableHeaders = ['พนักงาน', 'Role', 'สถานะ', '']
  slotHeaders  = ['เวลา', 'ความจุ', 'จอง/วันที่เลือก', '']
  createFields = [
    { key: 'emp_name', label: 'ชื่อ-นามสกุล', type: 'text',     placeholder: 'ชื่อพนักงาน' },
    { key: 'username', label: 'Username',       type: 'text',     placeholder: 'username' },
    { key: 'password', label: 'Password (≥ 6)', type: 'password', placeholder: 'รหัสผ่าน' },
    { key: 'role',     label: 'Role',           type: 'select',   placeholder: '' },
  ]

  addSlotForm = this.fb.group({
    slot_time:    ['', Validators.required],
    max_capacity: [30, [Validators.required, Validators.min(1)]],
  })

  submitAddSlot() {
    if (this.addSlotForm.invalid) return
    const v = this.addSlotForm.value
    this.slotMutation.mutate({ data: { slot_time: v.slot_time!, max_capacity: v.max_capacity! } })
  }

  toggleSlot(sl: TimeSlot) {
    this.slotMutation.mutate({ id: sl.slot_id, data: { is_active: sl.is_active ? 0 : 1 } })
  }

  updateSlotCapacity(id: number, val: string) {
    const cap = parseInt(val, 10)
    if (cap > 0) this.slotMutation.mutate({ id, data: { max_capacity: cap } })
  }

  showSlotFlash(ok: boolean, text: string) {
    this.slotFlash.set({ ok, text })
    setTimeout(() => this.slotFlash.set(null), 3000)
  }

  constructor() {
    afterNextRender(() => { this.buildRevenueChart() })
    effect(() => {
      const data = this.revenueQuery.data()
      if (data) setTimeout(() => this.buildRevenueChart(), 0)
    })
  }

  openEdit(e: Employee) {
    this.editTarget.set(e)
    this.editForm.setValue({ emp_name: e.emp_name, role: e.role })
  }

  submitEdit() {
    if (this.editForm.invalid) return
    const v = this.editForm.value
    this.empMutation.mutate({ action: 'update_full', id: this.editTarget()!.emp_id, extra: { emp_name: v.emp_name!, role: v.role! } })
  }

  async deleteEmp(e: Employee) {
    const ok = await this.confirmDialog.confirm('ลบพนักงาน', `ต้องการลบพนักงาน "${e.emp_name}" ใช่หรือไม่?`, { type: 'danger', confirmText: 'ลบ' })
    if (!ok) return
    this.empMutation.mutate({ action: 'delete', id: e.emp_id })
  }

  getAtUsername(username: string): string { return '@' + username }

  private buildRevenueChart() {
    const canvas = this.chartRef()?.nativeElement
    if (!canvas) return

    this.revenueChart?.destroy()

    const d       = this.revenueQuery.data()
    const labels  = d?.labels  ?? []
    const revenue = d?.revenue ?? []
    const queues  = d?.queues  ?? []

    const ctx = canvas.getContext('2d')!
    this.revenueChart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'line' as const,
            label: 'รายได้',
            data: revenue,
            borderColor: '#C9A84C',
            backgroundColor: 'rgba(201,168,76,.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#C9A84C',
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            type: 'bar' as const,
            label: 'คิว',
            data: queues,
            backgroundColor: 'rgba(255,140,0,.35)',
            borderColor: 'rgba(255,140,0,.65)',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A1D2E',
            borderColor: 'rgba(255,255,255,.10)',
            borderWidth: 1,
            titleColor: '#E8ECF5',
            bodyColor: '#FF8A65',
            padding: 10,
            callbacks: {
              label: (c: TooltipItem<'bar'>) =>
                c.datasetIndex === 0
                  ? '฿' + (c.parsed.y as number).toLocaleString('th-TH')
                  : `${c.parsed.y} คิว`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#4A5468', font: { family: 'JetBrains Mono', size: 10 }, maxRotation: 45 },
            border: { color: 'rgba(255,255,255,.06)' },
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(255,255,255,.04)' },
            ticks: {
              color: '#C9A84C',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (v: string | number) => '฿' + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(1) + 'k' : v),
            },
            border: { color: 'rgba(255,255,255,.06)' },
          },
          y2: {
            position: 'right',
            grid: { display: false },
            ticks: { color: '#FF8C00', font: { family: 'JetBrains Mono', size: 10 } },
            border: { color: 'rgba(255,255,255,.06)' },
          },
        },
      },
    } as any)
  }

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
  setPeriod(p: 'daily' | 'weekly' | 'monthly') {
    this.chartPeriod.set(p)
  }

  exportCsv() {
    const from = this.csvFrom()
    const to   = this.csvTo()
    this.csvLoading.set(true)
    this.http.get(`/api/report/export?from=${from}&to=${to}`, {
      responseType: 'blob',
      withCredentials: true,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = `bbq-report-${from}-to-${to}.csv`
        a.click()
        URL.revokeObjectURL(url)
        this.csvLoading.set(false)
      },
      error: () => this.csvLoading.set(false),
    })
  }

  methodLabel(m: string) { return { CASH:'เงินสด', QR:'QR PromptPay', PROMPTPAY:'QR PromptPay', CARD:'บัตร' }[m] ?? m }
  methodIcon(m: string)  { return { CASH:'💵', QR:'📱', PROMPTPAY:'📱', CARD:'💳' }[m] ?? '💰' }

  openHistory(c: any) { this.historyCustomer.set(c) }

  segmentStyle(c: any) {
    if (!c) return { emoji: '', label: '', bg: 'transparent', color: 'inherit', border: '1px solid transparent' }
    const lastVisitDate = c.last_visit ? new Date(c.last_visit) : null
    const daysSinceLast = lastVisitDate ? (Date.now() - lastVisitDate.getTime()) / 86400000 : 999
    if (Number(c.total_spent)    > 5000) return { emoji: '💎', label: 'VIP',     bg: 'linear-gradient(135deg,rgba(201,168,76,.20),rgba(201,168,76,.08))', color: 'var(--color-gold)',    border: '1px solid rgba(201,168,76,.30)' }
    if (Number(c.completed)     >= 3)    return { emoji: '⭐', label: 'Regular', bg: 'rgba(59,130,246,.12)',  color: 'var(--color-azure)',   border: '1px solid rgba(59,130,246,.22)' }
    if (Number(c.total_bookings) <= 1)   return { emoji: '🆕', label: 'New',     bg: 'rgba(16,185,129,.12)', color: 'var(--color-jade)',    border: '1px solid rgba(16,185,129,.22)' }
    if (daysSinceLast > 30)              return { emoji: '⚠️', label: 'At Risk', bg: 'rgba(239,68,68,.10)',  color: 'var(--color-crimson)', border: '1px solid rgba(239,68,68,.20)' }
    return { emoji: '⭐', label: 'Regular', bg: 'rgba(59,130,246,.12)', color: 'var(--color-azure)', border: '1px solid rgba(59,130,246,.22)' }
  }

  qStatusStyle(s: string) {
    const m: Record<string, { bg: string; color: string }> = {
      WAITING:   { bg: 'rgba(245,158,11,.12)',  color: 'var(--color-amber)' },
      CONFIRMED: { bg: 'rgba(59,130,246,.12)',  color: 'var(--color-azure)' },
      SEATED:    { bg: 'rgba(16,185,129,.12)',  color: 'var(--color-jade)' },
      FINISHED:  { bg: 'rgba(148,163,184,.10)', color: 'var(--color-smoke)' },
      CANCELLED: { bg: 'rgba(239,68,68,.12)',   color: 'var(--color-crimson)' },
    }
    return m[s] ?? { bg: 'rgba(148,163,184,.10)', color: 'var(--color-smoke)' }
  }

  vouchersQuery = injectQuery(() => ({
    queryKey: ['vouchers'],
    queryFn: () => new Promise<{ vouchers: Voucher[] }>((res, rej) => {
      this.api.getVouchers().subscribe({ next: res, error: rej })
    }),
    refetchInterval: 30_000,
  }))

  voucherMutation = injectMutation(() => ({
    mutationFn: ({ action, id, data }: { action: string; id?: number; data?: Record<string, unknown> }) =>
      new Promise<unknown>((res, rej) => {
        if (action === 'create') {
          this.api.createVoucher(data as any).subscribe({ next: res, error: rej })
        } else if (action === 'update') {
          this.api.updateVoucher(id!, data!).subscribe({ next: res, error: rej })
        } else if (action === 'delete') {
          this.api.deleteVoucher(id!).subscribe({ next: res, error: rej })
        }
      }),
    onSuccess: (_: unknown, vars: { action: string; id?: number; data?: Record<string, unknown> }) => {
      this.qc.invalidateQueries({ queryKey: ['vouchers'] })
      const msg = vars.action === 'create' ? 'สร้างโค้ดสำเร็จ' :
                  vars.action === 'delete' ? 'ลบโค้ดแล้ว' : 'อัปเดตสำเร็จ'
      this.voucherFlash.set({ ok: true, text: msg })
      setTimeout(() => this.voucherFlash.set(null), 3000)
      this.showCreateVoucher.set(false)
      this.voucherForm.reset({ discount_pct: 10, max_uses: 1 })
    },
    onError: (err: unknown) => {
      const msg = (err as { error?: { error?: string } }).error?.error ?? 'เกิดข้อผิดพลาด'
      this.voucherFlash.set({ ok: false, text: msg })
      setTimeout(() => this.voucherFlash.set(null), 4000)
    },
  }))

  submitCreateVoucher() {
    if (this.voucherForm.invalid) return
    const v = this.voucherForm.value
    this.voucherMutation.mutate({
      action: 'create',
      data: {
        code:         v.code!.toUpperCase(),
        discount_pct: v.discount_pct!,
        max_uses:     v.max_uses!,
        expires_at:   v.expires_at || '',
        description:  v.description || '',
        is_active:    1,
      }
    })
  }

  async deleteVoucher(v: Voucher) {
    const ok = await this.confirmDialog.confirm('ลบโค้ด', `ต้องการลบโค้ด "${v.code}" ใช่หรือไม่?`, { type: 'danger', confirmText: 'ลบ' })
    if (!ok) return
    this.voucherMutation.mutate({ action: 'delete', id: v.voucher_id })
  }

  toggleVoucherActive(v: Voucher) {
    this.voucherMutation.mutate({ action: 'update', id: v.voucher_id, data: { is_active: v.is_active ? 0 : 1 } })
  }

  exportCustomerCsv() {
    const c = this.historyCustomer()
    if (!c) return
    const queues: any[] = this.customerHistoryQuery.data()?.queues ?? []
    const header = ['queue_id', 'วันที่จอง', 'tier', 'โต๊ะ', 'จำนวนคน', 'สถานะ', 'ยอด', 'วิธีชำระ']
    const rows = queues.map((q: any) => [
      '#' + String(q.queue_id).padStart(4, '0'),
      q.created_at ?? '', q.tier ?? '', q.table_number ?? '-',
      q.pax_amount, q.queue_status, q.total_amount ?? '-', q.payment_method ?? '-',
    ])
    const csv = '\uFEFF' + [header, ...rows]
      .map(r => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `customer-${c.customer_id}-history.csv`; a.click()
    URL.revokeObjectURL(url)
  }
}
