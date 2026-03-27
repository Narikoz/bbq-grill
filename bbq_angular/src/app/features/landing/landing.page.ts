// src/app/features/landing/landing.page.ts
import {
  Component, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, ElementRef, afterNextRender, viewChild,
} from '@angular/core'
import { RouterLink, Router } from '@angular/router'
import { CommonModule } from '@angular/common'
import { AnimationService } from '../../core/services/animation.service'

@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ═══ NAVBAR — Adaptive Glassmorphism ═══ -->
    <nav class="fixed top-0 left-0 right-0 z-50"
         [class.nav-scrolled]="scrolled()">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="font-display text-2xl tracking-widest" style="color:#C9A84C">BBQ GRILL</div>
        <div class="hidden md:flex items-center gap-8 text-sm" style="font-family:var(--font-sans)">
          <a href="#about"     class="nav-link-v2">เกี่ยวกับเรา</a>
          <a href="#menu"      class="nav-link-v2">เมนู</a>
          <a href="#how"       class="nav-link-v2">วิธีจอง</a>
          <a href="#reviews"   class="nav-link-v2">รีวิว</a>
          <a routerLink="/login" class="nav-link-v2">พนักงาน</a>
          <a class="nav-link-v2" style="cursor:pointer" (click)="trackModalOpen.set(true)">ติดตามคิว</a>
        </div>
        <a routerLink="/booking"
           class="cta-nav hidden md:flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold"
           style="background:linear-gradient(135deg,#D4B962,#C9A84C);color:#050608;font-family:var(--font-sans)">
          จองโต๊ะ
        </a>
        <button class="md:hidden p-2" style="background:none;border:none;cursor:pointer;color:#E8E6E3"
                (click)="mobileOpen.set(!mobileOpen())">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            @if (mobileOpen()) {
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            } @else {
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            }
          </svg>
        </button>
      </div>
      @if (mobileOpen()) {
        <div class="md:hidden border-t px-6 py-4 flex flex-col gap-3"
             style="border-color:rgba(201,168,76,.12);background:rgba(5,6,8,.96);backdrop-filter:blur(24px)">
          <a href="#about"   class="nav-link-v2 text-sm py-2" (click)="mobileOpen.set(false)">เกี่ยวกับเรา</a>
          <a href="#menu"    class="nav-link-v2 text-sm py-2" (click)="mobileOpen.set(false)">เมนู</a>
          <a href="#how"     class="nav-link-v2 text-sm py-2" (click)="mobileOpen.set(false)">วิธีจอง</a>
          <a href="#reviews" class="nav-link-v2 text-sm py-2" (click)="mobileOpen.set(false)">รีวิว</a>
          <button (click)="mobileOpen.set(false); trackModalOpen.set(true)"
                  class="mt-2 py-3 rounded text-center text-sm font-medium"
                  style="border:1px solid rgba(201,168,76,.40);color:#C9A84C;background:transparent;cursor:pointer;font-family:var(--font-sans)">
            🔔 ติดตามคิว
          </button>
          <a routerLink="/booking" class="cta-nav mt-2 py-3 rounded text-center text-sm font-semibold"
             style="background:linear-gradient(135deg,#D4B962,#C9A84C);color:#050608">
            จองโต๊ะ
          </a>
        </div>
      }
    </nav>

    <!-- ═══ TRACK QUEUE MODAL ═══ -->
    @if (trackModalOpen()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center"
           style="background:rgba(0,0,0,.70);backdrop-filter:blur(4px)"
           (click)="trackModalOpen.set(false)">
        <div class="w-full max-w-sm mx-4 p-6 rounded-2xl"
             style="background:#0C0E18;border:1px solid rgba(201,168,76,.25);font-family:var(--font-sans);"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-5">
            <h3 style="color:#C9A84C;font-size:18px;font-weight:600;">ติดตามคิวของฉัน</h3>
            <button (click)="trackModalOpen.set(false)"
                    style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:20px;line-height:1;">✕</button>
          </div>
          <label style="display:block;color:#E8E6E3;font-size:14px;margin-bottom:8px;">เบอร์โทรศัพท์</label>
          <input type="tel" maxlength="10" placeholder="0812345678"
                 [value]="trackPhone()" (input)="trackPhone.set($any($event.target).value)"
                 (keyup.enter)="searchTrackQueue()"
                 style="width:100%;box-sizing:border-box;padding:12px 16px;border-radius:10px;
                        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);
                        color:#E8E6E3;font-family:var(--font-sans);font-size:14px;outline:none;"
                 onfocus="this.style.borderColor='rgba(201,168,76,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.15)'">
          @if (trackError()) {
            <div style="margin-top:8px;padding:10px 14px;border-radius:8px;
                        background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.25);
                        color:#EF4444;font-size:13px;">
              {{ trackError() }}
            </div>
          }
          <div style="display:flex;gap:10px;margin-top:16px;">
            <button (click)="trackModalOpen.set(false)"
                    style="flex:1;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.20);
                           background:transparent;color:#E8E6E3;font-family:var(--font-sans);font-size:14px;cursor:pointer;">ยกเลิก</button>
            <button (click)="searchTrackQueue()" [disabled]="trackLoading()"
                    style="flex:1;padding:11px;border-radius:10px;border:none;
                           background:linear-gradient(135deg,#D4B962,#C9A84C);
                           color:#050608;font-family:var(--font-sans);font-size:14px;font-weight:600;
                           cursor:pointer;opacity:1;transition:opacity 150ms;"
                    [style.opacity]="trackLoading() ? '0.5' : '1'">
              {{ trackLoading() ? 'กำลังค้นหา...' : 'ค้นหา' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ HERO — Full Cinematic ═══ -->
    <section class="relative min-h-dvh flex items-center justify-center overflow-hidden" style="padding-top:80px">
      <canvas #orbCanvas class="absolute inset-0 w-full h-full pointer-events-none z-0" style="will-change:transform"></canvas>
      <canvas #fluidCanvas class="absolute inset-0 w-full h-full pointer-events-none z-0" style="will-change:transform"></canvas>
      <div class="absolute inset-0 z-[1]" style="background:rgba(5,6,8,.15)"></div>
      <div class="absolute inset-0 z-[1] pointer-events-none"
           style="background:radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(5,6,8,.55) 100%)"></div>
      <div class="absolute inset-0 z-[1] pointer-events-none noise-overlay"></div>

      <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div class="inline-flex items-center gap-2 glass-pill mb-8 hero-word"
             style="border-color:rgba(201,168,76,.25)">
          
          <span class="font-mono text-xs tracking-[.2em] uppercase" style="color:rgba(201,168,76,.9)">PREMIUM BBQ BUFFET · BANGKOK</span>
        </div>

        <h1 class="font-display leading-none mb-8"
            style="font-size:clamp(3.5rem,8vw,8rem);letter-spacing:.08em">
          <span class="block hero-word" style="color:var(--color-ash);font-weight:200">THE ART OF</span>
          <span class="block hero-word"
                style="font-weight:300;background:linear-gradient(135deg,#D4B962,#C9A84C,#D4B962);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
            CHARCOAL
          </span>
          <span class="block hero-word text-outline-gold" style="font-weight:300">GRILL</span>
        </h1>

        <div class="mb-12 hero-word" style="min-height:28px">
          <span class="font-mono text-base tracking-wide" style="color:var(--color-smoke)">{{ typedText() }}</span>
          <span class="typing-cursor">|</span>
        </div>

        <div class="flex items-center justify-center gap-4 flex-wrap hero-word">
          <a routerLink="/booking" #ctaBtn
             class="cta-magnetic glass-gold relative overflow-hidden px-10 py-4 rounded-xl text-base font-semibold"
             style="color:#C9A84C;font-family:var(--font-sans);box-shadow:0 20px 80px rgba(201,168,76,.2);will-change:transform;text-decoration:none;backdrop-filter:blur(16px)"
             (mousemove)="onCtaMove($event)" (mouseleave)="onCtaLeave()" (click)="addRipple($event)">
            จองโต๊ะเลย
          </a>
          <a href="#how" class="glass px-8 py-4 rounded-xl text-base font-semibold"
             style="color:var(--color-smoke);font-family:var(--font-sans);text-decoration:none">
            ดูวิธีจอง →
          </a>
        </div>

        <div class="mt-16 flex items-center justify-center gap-2 flex-wrap hero-word">
          @for (s of heroStats; track s.label; let i = $index) {
            @if (i > 0) {
              <div class="hidden md:block" style="width:1px;height:32px;background:rgba(255,255,255,.08)"></div>
            }
            <div class="glass-pill flex items-center gap-2 text-sm">
              <span class="font-display" style="color:#C9A84C">{{ s.value }}</span>
              <span style="color:var(--color-smoke);font-family:var(--font-sans);font-size:.75rem">{{ s.label }}</span>
            </div>
          }
        </div>
      </div>

      <div class="scroll-dots absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
           [style.opacity]="scrolled() ? '0' : '1'"
           style="transition:opacity .4s ease">
        <span class="text-[10px] tracking-widest font-mono uppercase" style="color:var(--color-smoke)">Scroll</span>
        <div class="flex gap-1.5">
          <span class="scroll-dot" style="animation-delay:0s"></span>
          <span class="scroll-dot" style="animation-delay:.2s"></span>
          <span class="scroll-dot" style="animation-delay:.4s"></span>
        </div>
      </div>
    </section>

    <!-- ═══ ABOUT — Split Glass Panel ═══ -->
    <section id="about" class="py-28 px-6 section-reveal">
      <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div class="about-text-col">
          <p class="font-mono text-xs tracking-[.25em] uppercase mb-4" style="color:rgba(201,168,76,.7)">OUR STORY</p>
          <h2 class="font-display text-5xl md:text-6xl mb-6" style="color:#E8E6E3;font-weight:300;line-height:1.1">
            ศิลปะแห่ง<br>
            <span style="color:#C9A84C">การปิ้งย่าง</span>
          </h2>
          <p class="text-base leading-relaxed mb-8" style="color:var(--color-smoke);font-family:var(--font-sans);font-weight:300">
            BBQ GRILL ก่อตั้งขึ้นด้วยความหลงใหลในศิลปะการย่างถ่านหิน
            ทุกเนื้อสัตว์คัดสรรมาอย่างพิถีพิถัน เสิร์ฟในบรรยากาศหรูหราที่
            ออกแบบมาเพื่อประสบการณ์อันน่าจดจำ
          </p>

          <div class="grid grid-cols-3 gap-4">
            @for (stat of statCards; track stat.label; let i = $index) {
              <div #statEl class="stat-counter glass text-center py-5 rounded-xl">
                <div class="font-display text-3xl mb-1 stat-num" style="color:#C9A84C" [attr.data-target]="stat.target" [attr.data-suffix]="stat.suffix">0{{ stat.suffix }}</div>
                <div class="text-[10px] tracking-wider uppercase" style="color:var(--color-smoke);font-family:var(--font-sans)">{{ stat.label }}</div>
              </div>
            }
          </div>
        </div>

        <div class="relative">
          <div class="aspect-square rounded-2xl overflow-hidden relative glass"
               style="border-color:rgba(201,168,76,.15)">
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none"
                 style="background:radial-gradient(circle at 50% 45%, rgba(255,100,10,.20), transparent 70%);filter:blur(30px)"></div>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <canvas #fireMain width="360" height="440" style="display:block;width:180px;height:220px;will-change:transform"></canvas>
              <div class="font-display text-2xl tracking-widest" style="color:#C9A84C">CHARCOAL FIRE</div>
              <div class="text-xs tracking-widest font-mono" style="color:var(--color-smoke)">PREMIUM WAGYU · SEAFOOD · PORK</div>
            </div>
            <div class="absolute inset-0 pointer-events-none rounded-2xl"
                 style="background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 40%,transparent 60%,rgba(255,255,255,.02) 100%)"></div>
          </div>
          <div class="absolute -top-3 -right-3 glass-pill text-xs font-semibold float-badge" style="color:#C9A84C;border-color:rgba(201,168,76,.25)">Wagyu A5</div>
          <div class="absolute -bottom-3 -left-3 glass-pill text-xs font-semibold float-badge" style="color:#C9A84C;border-color:rgba(201,168,76,.25);animation-delay:.5s">90 นาที</div>
          <div class="absolute top-1/2 -right-4 glass-pill text-xs font-semibold float-badge" style="color:#C9A84C;border-color:rgba(201,168,76,.25);animation-delay:1s">Premium</div>
          <div class="absolute -top-4 -left-4 w-20 h-20 rounded-full flex flex-col items-center justify-center ambient-gold"
               style="background:linear-gradient(135deg,#D4B962,#C9A84C);box-shadow:0 12px 40px rgba(201,168,76,.35)">
            <div class="font-display text-xl" style="color:#050608;line-height:1">4.9</div>
            <div class="text-[9px] font-semibold" style="color:#050608;font-family:var(--font-sans)">★ รีวิว</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ MENU — Glass Gallery ═══ -->
    <section id="menu" class="py-24 px-6 section-reveal" style="background:linear-gradient(180deg,transparent,rgba(201,168,76,.04),transparent)">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="font-mono text-xs tracking-[.25em] uppercase mb-3" style="color:rgba(201,168,76,.7)">SIGNATURE</p>
          <h2 class="font-display text-5xl" style="color:#E8E6E3;font-weight:300">เมนูแนะนำ</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          @for (dish of menuItems; track dish.name; let i = $index) {
            <div class="menu-card-v2 rounded-2xl overflow-hidden cursor-pointer"
                 [style.animation-delay]="(i * 100) + 'ms'"
                 (mouseenter)="onCardEnter($event)" (mouseleave)="onCardLeave($event)"
                 (mousemove)="onCardMove($event)">
              <div class="relative">
                <div class="aspect-video overflow-hidden">
                  <img [src]="dish.img" [alt]="dish.name" class="w-full h-full object-cover menu-img"
                       loading="lazy" style="aspect-ratio:16/9">
                </div>
                <div class="absolute top-3 right-3 glass-pill text-xs font-mono font-semibold z-10"
                     style="color:#C9A84C;border-color:rgba(201,168,76,.30)">{{ dish.price }}</div>
                <div class="absolute bottom-0 left-0 right-0 p-6 pt-12"
                     style="background:linear-gradient(to top, rgba(5,6,8,.92) 0%, rgba(5,6,8,.6) 60%, transparent 100%)">
                  <div class="font-display text-2xl mb-1" style="color:#E8E6E3;font-weight:400">{{ dish.name }}</div>
                  <div class="text-sm" style="color:var(--color-smoke);font-family:var(--font-sans)">{{ dish.desc }}</div>
                </div>
              </div>
              <div class="card-spotlight absolute inset-0 pointer-events-none opacity-0"></div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══ PRICING — Premium Packages ═══ -->
    <section id="pricing" class="py-24 px-6 section-reveal"
             style="background:linear-gradient(180deg,transparent,rgba(201,168,76,.03),transparent)">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <p class="font-mono text-xs tracking-[.25em] uppercase mb-3" style="color:rgba(201,168,76,.7)">BUFFET PACKAGES</p>
          <h2 class="font-display text-5xl mb-3" style="color:#E8E6E3;font-weight:300">เลือกระดับที่ใช่สำหรับคุณ</h2>
          <p class="text-sm" style="color:var(--color-smoke);font-family:var(--font-sans)">ทุก tier รวม Service 10% + VAT 7%</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 items-start mb-12">
          @for (tier of pricingTiers; track tier.key; let i = $index) {
            <div class="pricing-card relative overflow-hidden"
                 [class.pricing-gold]="tier.highlight"
                 [style.border]="'1px solid ' + tier.border"
                 [style.background]="tier.bg || 'rgba(255,255,255,.02)'"
                 style="border-radius:16px">
              @if (tier.badge) {
                <div class="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-b-lg text-xs font-semibold z-10 float-badge"
                     style="background:rgba(201,168,76,.15);backdrop-filter:blur(12px);border:1px solid rgba(201,168,76,.40);border-top:none;color:#C9A84C;font-family:var(--font-sans)">
                  {{ tier.badge }}
                </div>
              }
              <div style="padding:24px 24px 28px">
                <div class="flex items-center gap-3 mb-5">
                  <div class="flex items-center justify-center"
                       [style.background]="'rgba(' + tier.rgb + ',.10)'"
                       [style.border]="'1px solid rgba(' + tier.rgb + ',.18)'"
                       style="width:48px;height:48px;border-radius:14px;flex-shrink:0">
                    <span [innerHTML]="tier.icon" style="line-height:0;display:flex"></span>
                  </div>
                  <div>
                    <div class="font-display text-2xl" [style.color]="tier.accent" style="font-weight:400">{{ tier.name }}</div>
                    <div class="text-xs" style="color:var(--color-smoke);opacity:.6;font-family:var(--font-sans)">{{ tier.duration }}</div>
                  </div>
                </div>
                <div class="mb-6">
                  <span class="font-mono font-semibold" [style.color]="tier.accent" style="font-size:2.25rem;letter-spacing:-.02em">฿{{ tier.price }}</span>
                  <span class="text-sm ml-1" style="color:var(--color-smoke);font-family:var(--font-sans)">/คน</span>
                </div>
                <ul style="list-style:none;padding:0;margin:0 0 28px 0" class="space-y-2.5">
                  @for (f of tier.features; track f.text) {
                    <li class="flex items-start gap-2.5 text-sm" style="font-family:var(--font-sans)">
                      @if (f.ok) {
                        <svg class="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style="color:var(--color-ash)">{{ f.text }}</span>
                      } @else {
                        <svg class="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,.4)" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span style="color:var(--color-smoke);opacity:.4">{{ f.text }}</span>
                      }
                    </li>
                  }
                </ul>
                <a routerLink="/booking"
                   class="block w-full py-3 rounded-xl text-center text-sm font-semibold"
                   [style.background]="tier.highlight ? 'linear-gradient(135deg,#D4B962,#C9A84C)' : 'rgba(' + tier.rgb + ',.10)'"
                   [style.color]="tier.highlight ? '#050608' : tier.accent"
                   [style.border]="'1px solid ' + (tier.highlight ? 'transparent' : 'rgba(' + tier.rgb + ',.22)')"
                   style="text-decoration:none;font-family:var(--font-sans);transition:all 250ms;cursor:pointer">
                  {{ tier.cta }}
                </a>
              </div>
            </div>
          }
        </div>

        <div class="text-center mb-6">
          <button (click)="showCompare.set(!showCompare())"
                  class="px-6 py-2.5 rounded-full text-sm cursor-pointer"
                  style="background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.15);color:var(--color-smoke);font-family:var(--font-sans);transition:all 250ms">
            ดูตารางเปรียบเทียบ {{ showCompare() ? '▲' : '▼' }}
          </button>
        </div>

        <div class="compare-table-wrap" [class.compare-open]="showCompare()">
          <div class="overflow-x-auto rounded-xl" style="background:rgba(255,255,255,.02);border:1px solid rgba(201,168,76,.10)">
            <table class="w-full text-sm" style="border-collapse:collapse;font-family:var(--font-sans)">
              <thead>
                <tr style="border-bottom:1px solid rgba(201,168,76,.15)">
                  <th class="text-left px-4 py-3 font-semibold" style="color:var(--color-smoke);min-width:140px">รายการ</th>
                  <th class="text-center px-4 py-3 font-semibold" style="color:#94a3b8">🥈 Silver</th>
                  <th class="text-center px-4 py-3 font-semibold" style="color:#C9A84C">⭐ Gold</th>
                  <th class="text-center px-4 py-3 font-semibold" style="color:#a78bfa">💎 Platinum</th>
                </tr>
              </thead>
              <tbody>
                @for (cat of compareData; track cat.cat) {
                  <tr>
                    <td colspan="4" class="px-4 py-2 text-xs font-semibold tracking-wider uppercase"
                        style="background:rgba(201,168,76,.06);color:#C9A84C">{{ cat.cat }}</td>
                  </tr>
                  @for (row of cat.items; track row.name; let ri = $index) {
                    <tr class="compare-row" [style.background]="ri % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent'">
                      <td class="px-4 py-2.5" style="color:var(--color-ash)">{{ row.name }}</td>
                      <td class="text-center px-4 py-2.5" [innerHTML]="fmtCell(row.s)"></td>
                      <td class="text-center px-4 py-2.5" [innerHTML]="fmtCell(row.g)"></td>
                      <td class="text-center px-4 py-2.5" [innerHTML]="fmtCell(row.p)"></td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ HOW IT WORKS — Timeline Cinematic ═══ -->
    <section id="how" class="py-24 px-6 section-reveal">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="font-mono text-xs tracking-[.25em] uppercase mb-3" style="color:rgba(201,168,76,.7)">PROCESS</p>
          <h2 class="font-display text-5xl" style="color:#E8E6E3;font-weight:300">วิธีจองโต๊ะ</h2>
        </div>

        <div class="relative">
          <!-- SVG connecting line — stroke-dashoffset animation -->
          <svg #timelineSvg class="absolute top-8 left-0 right-0 w-full hidden md:block" height="4" style="overflow:visible;filter:drop-shadow(0 0 8px rgba(201,168,76,.25))">
            <line x1="12.5%" y1="2" x2="87.5%" y2="2"
                  stroke="url(#lineGrad)" stroke-width="2" class="timeline-line-v2"/>
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stop-color="rgba(201,168,76,0)"/>
                <stop offset="30%"  stop-color="rgba(201,168,76,.5)"/>
                <stop offset="70%"  stop-color="rgba(201,168,76,.5)"/>
                <stop offset="100%" stop-color="rgba(201,168,76,0)"/>
              </linearGradient>
            </defs>
          </svg>

          <div class="grid md:grid-cols-4 gap-8">
            @for (step of steps; track step.num; let i = $index) {
              <div class="flex flex-col items-center text-center step-card"
                   [style.--delay]="(i * 150) + 'ms'">
                <div class="step-icon w-16 h-16 rounded-full flex items-center justify-center mb-4 relative z-10 glass"
                     style="border-color:rgba(201,168,76,.30);box-shadow:0 0 28px rgba(201,168,76,.20);will-change:transform">
                  @switch (step.num) {
                    @case (1) {
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    }
                    @case (2) {
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    }
                    @case (3) {
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="5" y="3" width="14" height="9" rx="2"/>
                        <path d="M5 9h14"/>
                        <path d="M8 21v-9"/><path d="M16 21v-9"/>
                        <path d="M6 21h12"/>
                      </svg>
                    }
                    @case (4) {
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    }
                  }
                </div>
                <div class="font-mono text-xs mb-2" style="color:#C9A84C">0{{ step.num }}</div>
                <div class="font-display text-xl mb-2" style="color:#E8E6E3;font-weight:400">{{ step.title }}</div>
                <div class="text-sm" style="color:var(--color-smoke);font-family:var(--font-sans);font-weight:300">{{ step.desc }}</div>
              </div>
            }
          </div>
        </div>

        <div class="text-center mt-14">
          <a routerLink="/booking"
             class="cta-magnetic inline-flex items-center gap-3 px-10 py-4 rounded text-base font-semibold relative overflow-hidden"
             style="background:linear-gradient(135deg,#D4B962,#C9A84C);color:#050608;font-family:var(--font-sans);box-shadow:0 16px 50px rgba(201,168,76,.25);will-change:transform"
             (click)="addRipple($event)" (mousemove)="onCtaMove($event)" (mouseleave)="onCtaLeave()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            จองโต๊ะเลย
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ REVIEWS — Infinite Marquee ═══ -->
    <section id="reviews" class="py-24 overflow-hidden section-reveal"
             style="background:linear-gradient(180deg,transparent,rgba(201,168,76,.03),transparent)">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center mb-14">
          <p class="font-mono text-xs tracking-[.25em] uppercase mb-3" style="color:rgba(201,168,76,.7)">REVIEWS</p>
          <h2 class="font-display text-5xl" style="color:#E8E6E3;font-weight:300">เสียงจากลูกค้า</h2>
        </div>
      </div>

      <!-- Marquee with edge fade -->
      <div class="marquee-container" (mouseenter)="pauseCarousel()" (mouseleave)="resumeCarousel()">
        <div class="marquee-track flex gap-6">
          @for (r of marqueeReviews; track $index) {
            <div class="review-glass shrink-0 w-80 rounded-2xl p-6 relative">
              <!-- Decorative quote -->
              <span class="absolute top-3 right-4 font-display text-6xl leading-none pointer-events-none" style="color:rgba(201,168,76,.08)">"</span>
              <div class="flex gap-1 mb-3">
                @for (s of [1,2,3,4,5]; track s) {
                  <span class="star-fill" style="color:#C9A84C;font-size:.85rem">★</span>
                }
              </div>
              <p class="text-sm mb-4 leading-relaxed relative z-10" style="color:#E8E6E3;font-family:var(--font-sans);font-weight:300">
                "{{ r.text }}"
              </p>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                     style="background:linear-gradient(135deg,#D4B962,#C9A84C);color:#050608">
                  {{ r.name.charAt(0) }}
                </div>
                <div>
                  <div class="text-sm font-semibold" style="color:#E8E6E3;font-family:var(--font-sans)">{{ r.name }}</div>
                  <div class="text-xs" style="color:var(--color-smoke);font-family:var(--font-mono)">{{ r.date }}</div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══ FOOTER — Ember Atmosphere ═══ -->
    <footer class="relative py-16 px-6 border-t overflow-hidden" style="border-color:rgba(201,168,76,.10)">
      <canvas #footerEmber class="absolute inset-0 w-full h-full pointer-events-none" style="opacity:.3;will-change:transform"></canvas>
      <div class="relative z-10 max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        <div>
          <div class="font-display text-3xl mb-3" style="background:linear-gradient(135deg,#D4B962,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">BBQ GRILL</div>
          <p class="text-sm leading-relaxed" style="color:var(--color-smoke);font-family:var(--font-sans);font-weight:300">
            ประสบการณ์ปิ้งย่างระดับพรีเมียม<br>ในบรรยากาศที่สง่างาม
          </p>
        </div>
        <div>
          <div class="text-sm font-semibold mb-4 tracking-wider uppercase" style="color:#E8E6E3;font-family:var(--font-sans)">เวลาทำการ</div>
          <div class="space-y-2 text-sm" style="color:var(--color-smoke);font-family:var(--font-sans)">
            <div class="footer-link">จันทร์–ศุกร์  <span class="font-mono" style="color:#E8E6E3">17:00–23:00</span></div>
            <div class="footer-link">เสาร์–อาทิตย์ <span class="font-mono" style="color:#E8E6E3">11:00–23:00</span></div>
          </div>
        </div>
        <div>
          <div class="text-sm font-semibold mb-4 tracking-wider uppercase" style="color:#E8E6E3;font-family:var(--font-sans)">ติดต่อ</div>
          <div class="space-y-2 text-sm" style="color:var(--color-smoke);font-family:var(--font-sans)">
            <div class="footer-link">📍 ซอยสุขุมวิท 11 กรุงเทพฯ</div>
            <div class="footer-link">📞 <span class="font-mono" style="color:#E8E6E3">02-123-4567</span></div>
            <div class="footer-link">📧 info&#64;bbqgrill.th</div>
          </div>
        </div>
      </div>
      <div class="relative z-10 mt-12 pt-6 border-t text-center text-xs"
           style="border-color:rgba(255,255,255,.05);color:var(--color-haze);font-family:var(--font-mono)">
        © 2025 BBQ GRILL · All rights reserved
      </div>
    </footer>

    <!-- Mobile FAB — Living Button -->
    <a routerLink="/booking" id="fab-book"
       class="fixed bottom-6 right-6 z-40 md:hidden flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm"
       style="background:linear-gradient(135deg,#D4B962,#C9A84C);color:#050608;font-family:var(--font-sans);box-shadow:0 8px 40px rgba(201,168,76,.5);text-decoration:none">
      <!-- Double pulse rings -->
      <span class="fab-pulse-ring"></span>
      <span class="fab-pulse-ring" style="animation-delay:.6s"></span>
      <canvas #fireFab width="22" height="30" style="display:inline-block;vertical-align:middle;will-change:transform"></canvas> จองโต๊ะ
    </a>

    <style>
      :host { display: block; }

      /* ═══ GLOBAL GLASS UTILITIES ═══ */
      .glass {
        background: rgba(255,255,255,.04);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255,255,255,.08);
      }
      .glass-gold {
        background: rgba(201,168,76,.06);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(201,168,76,.15);
      }
      .glass-pill {
        background: rgba(255,255,255,.06);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 999px;
        padding: 6px 16px;
      }
      .text-outline-gold {
        -webkit-text-stroke: 1.5px rgba(201,168,76,.7);
        color: transparent;
      }
      .ambient-gold { filter: drop-shadow(0 0 40px rgba(201,168,76,.20)); }
      .ambient-purple { filter: drop-shadow(0 0 40px rgba(139,92,246,.20)); }

      .noise-overlay::before {
        content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        opacity: .018;
      }

      .float-badge {
        animation: float-updown 3s ease-in-out infinite;
      }
      @keyframes float-updown {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      /* ═══ NAVBAR — Frosted Glass ═══ */
      nav {
        transition: all 400ms cubic-bezier(.4,0,.2,1);
        background: rgba(5,6,8,.40);
        backdrop-filter: blur(24px) saturate(200%);
        -webkit-backdrop-filter: blur(24px) saturate(200%);
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
      .nav-scrolled {
        background: rgba(5,6,8,.88) !important;
        border-bottom-color: rgba(201,168,76,.18) !important;
        box-shadow: 0 1px 0 rgba(201,168,76,.08), 0 8px 32px rgba(0,0,0,.4);
      }
      .nav-link-v2 {
        color: var(--color-smoke); text-decoration: none; font-family: var(--font-sans);
        font-weight: 300; letter-spacing: .03em; transition: color .3s ease;
        position: relative; display: inline-block;
      }
      .nav-link-v2::after {
        content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 1px;
        background: #C9A84C; transition: width .3s cubic-bezier(.4,0,.2,1);
      }
      .nav-link-v2:hover { color: #C9A84C; }
      .nav-link-v2:hover::after { width: 100%; }
      .cta-nav { transition: all .2s ease; text-decoration: none; }
      .cta-nav:hover { transform: scale(1.05); box-shadow: 0 12px 40px rgba(201,168,76,.4); }

      /* ═══ HERO — Cinematic ═══ */
      .hero-word {
        opacity: 0; transform: translateY(40px);
        animation: hero-enter .8s cubic-bezier(.16,1,.3,1) forwards;
      }
      .hero-word:nth-child(1) { animation-delay: .1s; }
      .hero-word:nth-child(2) { animation-delay: .22s; }
      .hero-word:nth-child(3) { animation-delay: .34s; }
      .hero-word:nth-child(4) { animation-delay: .46s; }
      .hero-word:nth-child(5) { animation-delay: .58s; }
      .hero-word:nth-child(6) { animation-delay: .7s; }
      @keyframes hero-enter { to { opacity: 1; transform: translateY(0); } }

      .typing-cursor {
        color: #C9A84C; font-weight: 300;
        animation: blink-cursor .8s step-end infinite;
      }
      @keyframes blink-cursor {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      .cta-magnetic {
        transition: transform .15s ease, box-shadow .3s ease; text-decoration: none; position: relative; overflow: hidden;
      }
      .cta-magnetic::after {
        content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent);
        transition: none;
      }
      .cta-magnetic:hover::after { animation: shimmer-sweep .6s ease forwards; }
      .cta-magnetic:active { transform: scale(.97) !important; }
      @keyframes shimmer-sweep { to { left: 120%; } }

      .scroll-dot {
        width: 5px; height: 5px; border-radius: 50%; background: var(--color-smoke);
        animation: dot-breathe 1.8s ease-in-out infinite;
      }
      @keyframes dot-breathe {
        0%, 100% { opacity: .3; transform: scale(.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }

      /* ═══ SECTION REVEAL ═══ */
      .section-reveal { opacity: 0; transform: translateY(30px); transition: opacity .7s ease, transform .7s ease; }
      .section-reveal.visible { opacity: 1; transform: translateY(0); }

      /* ═══ MENU — Glass Gallery ═══ */
      .menu-card-v2 {
        position: relative;
        background: rgba(255,255,255,.04);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,.08);
        transition: transform .4s cubic-bezier(.4,0,.2,1), box-shadow .4s ease, border-color .4s ease;
        will-change: transform; transform-style: preserve-3d;
        opacity: 0; transform: translateY(30px);
      }
      .menu-card-v2.visible { opacity: 1; transform: translateY(0); }
      .menu-card-v2:hover {
        box-shadow: 0 0 0 1px rgba(201,168,76,.30), 0 24px 60px rgba(201,168,76,.15);
        border-color: rgba(201,168,76,.30);
      }
      .menu-img { transition: transform .4s cubic-bezier(.4,0,.2,1); }
      .menu-card-v2:hover .menu-img { transform: scale(1.08); }
      .card-spotlight {
        background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(201,168,76,.12), transparent 60%);
        transition: opacity .3s ease;
      }
      .menu-card-v2:hover .card-spotlight { opacity: 1; }

      /* ═══ PRICING — Glass Cards ═══ */
      .pricing-card {
        opacity: 0; transform: translateY(30px);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        transition: opacity .5s ease, transform .5s ease, box-shadow .3s ease;
      }
      .pricing-card.visible { opacity: 1; transform: translateY(0); }
      .pricing-card.visible:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 48px rgba(0,0,0,.2);
      }
      .pricing-gold { z-index: 1; }
      .pricing-gold.visible {
        transform: scale(1.04);
        box-shadow: 0 24px 60px rgba(201,168,76,.15);
      }
      .pricing-gold.visible:hover {
        transform: scale(1.06) translateY(-4px);
        box-shadow: 0 32px 72px rgba(201,168,76,.22);
      }
      .compare-table-wrap { max-height: 0; overflow: hidden; transition: max-height 400ms ease; }
      .compare-table-wrap.compare-open { max-height: 2000px; }
      .compare-row {
        border-bottom: 1px solid rgba(255,255,255,.04);
        border-left: 2px solid transparent; transition: all 200ms ease;
      }
      .compare-row:hover { background: rgba(201,168,76,.04) !important; border-left-color: #C9A84C; }

      /* ═══ HOW IT WORKS — Glass Timeline ═══ */
      .timeline-line-v2 {
        stroke-dasharray: 800; stroke-dashoffset: 800;
        transition: stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1);
      }
      .timeline-line-v2.drawn { stroke-dashoffset: 0; }
      .step-card {
        opacity: 0; transform: translateY(24px);
        transition: opacity .5s ease var(--delay, 0ms), transform .5s ease var(--delay, 0ms);
      }
      .step-card.visible { opacity: 1; transform: translateY(0); }
      .step-icon { transition: transform .3s ease, box-shadow .3s ease; }
      .step-icon:hover { transform: scale(1.1); box-shadow: 0 0 36px rgba(201,168,76,.35); }

      /* ═══ REVIEWS — Glass Marquee ═══ */
      .marquee-container {
        position: relative; overflow: hidden;
        mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
        -webkit-mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
      }
      .marquee-track { animation: marquee-scroll 32s linear infinite; width: max-content; }
      .marquee-track:hover { animation-play-state: paused; }
      @keyframes marquee-scroll {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .review-glass {
        background: rgba(255,255,255,.04);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,.06);
        transition: border-color .3s ease;
      }
      .review-glass:hover { border-color: rgba(201,168,76,.20); }

      /* ═══ FOOTER ═══ */
      .footer-link { transition: transform .2s ease, color .2s ease; }
      .footer-link:hover { transform: translateX(-2px); color: #C9A84C; }

      /* ═══ MOBILE FAB ═══ */
      .fab-pulse-ring {
        position: absolute; inset: 0; border-radius: 9999px;
        border: 2px solid rgba(201,168,76,.4);
        animation: fab-ring 2s ease-out infinite; pointer-events: none;
      }
      .fab-pulse-ring:nth-child(2) {
        animation-delay: .5s;
      }
      @keyframes fab-ring {
        0%   { transform: scale(1); opacity: .4; }
        100% { transform: scale(2.2); opacity: 0; }
      }

      /* ═══ RIPPLE ═══ */
      .ripple-host { position: relative; overflow: hidden; }
      .ripple-host .ripple {
        position: absolute; border-radius: 50%; background: rgba(255,255,255,.35);
        transform: scale(0); animation: ripple-out .7s ease forwards; pointer-events: none;
        width: 120px; height: 120px; margin: -60px 0 0 -60px;
      }
      @keyframes ripple-out { to { transform: scale(4); opacity: 0; } }
    </style>
  `,
})
export class LandingPage implements OnInit, OnDestroy {
  private anim   = inject(AnimationService)
  private router  = inject(Router)
  private fluidCanvas  = viewChild<ElementRef<HTMLCanvasElement>>('fluidCanvas')
  private orbCanvas    = viewChild<ElementRef<HTMLCanvasElement>>('orbCanvas')
  private fireMain     = viewChild<ElementRef<HTMLCanvasElement>>('fireMain')
  private fireFab      = viewChild<ElementRef<HTMLCanvasElement>>('fireFab')
  private footerEmber  = viewChild<ElementRef<HTMLCanvasElement>>('footerEmber')
  private cancelFire: Array<() => void> = []
  private observers: IntersectionObserver[] = []

  scrolled    = signal(false)
  mobileOpen  = signal(false)
  typedText   = signal('')

  trackModalOpen = signal(false)
  trackPhone     = signal('')
  trackError     = signal('')
  trackLoading   = signal(false)

  private typingPhrases = [
    'Wagyu A5 · Tiger Prawn · King Crab',
    'Premium Cuts · Artisan Sauces',
    'An Experience Beyond Dining',
  ]

  private cleanupFluid?: () => void
  private cleanupFooterEmber?: () => void
  private cleanupTyping?: () => void
  private scrollFn!: () => void

  heroStats = [
    { value: '10+ ปี',     label: 'ประสบการณ์' },
    { value: '50,000+',    label: 'ลูกค้า' },
    { value: '4.9 ★',     label: 'รีวิว' },
  ]

  statCards = [
    { target: 10,    suffix: '+',  label: 'ปี ประสบการณ์' },
    { target: 50000, suffix: '+',  label: 'ลูกค้า' },
    { target: 4.9,   suffix: '★', label: 'คะแนนรีวิว' },
  ]

  menuItems = [
    { img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80', name: 'Wagyu A5',    desc: 'วากิวญี่ปุ่นเกรด A5 คัดพิเศษ',    price: '฿1,290/200g' },
    { img: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80', name: 'Tiger Prawn', desc: 'กุ้งแม่น้ำตัวใหญ่ย่างถ่านหิน',    price: '฿490/4pcs' },
    { img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80', name: 'Sea Bass',   desc: 'ปลากะพงย่างพร้อมซอสเลมอนเบิร์ด', price: '฿350/portion' },
  ]

  showCompare = signal(false)

  pricingTiers = [
    {
      key: 'SILVER', name: 'Silver', price: 299, duration: '90 นาที',
      accent: '#94a3b8', rgb: '148,163,184', border: 'rgba(148,163,184,.20)', bg: '',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5L12 2z" fill="rgba(148,163,184,.15)" stroke="#94A3B8" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      badge: '',
      features: [
        { text: 'เนื้อออสเตรเลียคัดพิเศษ', ok: true },
        { text: 'คอหมู / สามชั้นนุ่ม', ok: true },
        { text: 'กุ้งแม่น้ำ / ปลาหมึก', ok: true },
        { text: 'ผักและเครื่องเคียงครบ', ok: true },
        { text: 'น้ำดื่ม / น้ำอัดลม', ok: true },
        { text: 'Wagyu / Seafood Premium', ok: false },
        { text: 'ของหวาน Premium', ok: false },
      ],
      cta: 'จองโต๊ะ Silver', highlight: false,
    },
    {
      key: 'GOLD', name: 'Gold', price: 399, duration: '100 นาที',
      accent: '#C9A84C', rgb: '201,168,76', border: 'rgba(201,168,76,.40)', bg: 'rgba(201,168,76,.06)',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.94 6.04 6.56.96-4.68 4.63 1.1 6.53L12 17.27 6.08 20.16l1.1-6.53L2.5 9l6.56-.96L12 2z" fill="rgba(201,168,76,.3)" stroke="#C9A84C" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
      badge: 'ยอดนิยม',
      features: [
        { text: 'Wagyu MB3-5 คัดพิเศษ', ok: true },
        { text: 'Iberico Pork', ok: true },
        { text: 'Tiger Prawn / หอยเชลล์', ok: true },
        { text: 'Sea Bass / Salmon', ok: true },
        { text: 'ชีสย่าง', ok: true },
        { text: 'Mocktail / น้ำผลไม้', ok: true },
        { text: 'ไอศกรีม Premium', ok: true },
        { text: 'Wagyu A5 / Lobster', ok: false },
      ],
      cta: 'จองโต๊ะ Gold', highlight: true,
    },
    {
      key: 'PLATINUM', name: 'Platinum', price: 599, duration: '120 นาที',
      accent: '#a78bfa', rgb: '139,92,246', border: 'rgba(139,92,246,.25)', bg: '',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6 3h12l4 6-10 13L2 9l4-6z" fill="rgba(139,92,246,.2)" stroke="#A78BFA" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 9h20M9 3l-1.5 6L12 22M15 3l1.5 6L12 22" stroke="#A78BFA" stroke-width=".8" opacity=".5"/></svg>`,
      badge: '',
      features: [
        { text: 'Wagyu A5 Japanese', ok: true },
        { text: 'Kurobuta Premium Pork', ok: true },
        { text: 'Lobster / King Crab', ok: true },
        { text: 'Bluefin Tuna / Foie Gras', ok: true },
        { text: 'Truffle Selection', ok: true },
        { text: 'Premium Cocktail', ok: true },
        { text: 'Häagen-Dazs', ok: true },
        { text: 'Caviar Appetizer', ok: true },
      ],
      cta: 'จองโต๊ะ Platinum', highlight: false,
    },
  ]

  compareData = [
    { cat: 'เนื้อวัว', items: [
      { name: 'เนื้อออสเตรเลีย', s: '✓', g: '✓', p: '✓' },
      { name: 'Wagyu MB3-5', s: '✗', g: '✓', p: '✓' },
      { name: 'Wagyu A5 Japan', s: '✗', g: '✗', p: '✓' },
    ]},
    { cat: 'หมู', items: [
      { name: 'สามชั้น / คอหมู', s: '✓', g: '✓', p: '✓' },
      { name: 'Iberico Pork', s: '✗', g: '✓', p: '✓' },
      { name: 'Kurobuta', s: '✗', g: '✗', p: '✓' },
    ]},
    { cat: 'อาหารทะเล', items: [
      { name: 'กุ้งแม่น้ำ', s: '✓', g: '✓', p: '✓' },
      { name: 'Tiger Prawn', s: '✗', g: '✓', p: '✓' },
      { name: 'Lobster', s: '✗', g: '✗', p: '✓' },
      { name: 'King Crab', s: '✗', g: '✗', p: '✓' },
    ]},
    { cat: 'พิเศษ', items: [
      { name: 'ชีสย่าง', s: '✗', g: '✓', p: '✓' },
      { name: 'Foie Gras', s: '✗', g: '✗', p: '✓' },
      { name: 'Truffle', s: '✗', g: '✗', p: '✓' },
      { name: 'Caviar', s: '✗', g: '✗', p: '✓' },
    ]},
    { cat: 'เครื่องดื่ม', items: [
      { name: 'น้ำ / น้ำอัดลม', s: '✓', g: '✓', p: '✓' },
      { name: 'Mocktail', s: '✗', g: '✓', p: '✓' },
      { name: 'Premium Cocktail', s: '✗', g: '✗', p: '✓' },
    ]},
    { cat: 'ของหวาน', items: [
      { name: 'ไอศกรีม', s: '✗', g: '✓', p: '✓' },
      { name: 'Häagen-Dazs', s: '✗', g: '✗', p: '✓' },
    ]},
    { cat: 'เวลา', items: [
      { name: 'ระยะเวลา', s: '90 นาที', g: '100 นาที', p: '120 นาที' },
    ]},
    { cat: 'ราคา', items: [
      { name: 'ราคา/คน', s: '฿299', g: '฿399', p: '฿599' },
    ]},
  ]

  steps = [
    { num: 1, title: 'จองโต๊ะ',   desc: 'เลือกวันเวลา กรอกข้อมูล ยืนยันในไม่กี่วินาที' },
    { num: 2, title: 'รับคิว',     desc: 'ได้รับหมายเลขคิวทันที ไม่ต้องรอที่ร้าน' },
    { num: 3, title: 'นั่งโต๊ะ',  desc: 'พนักงานพร้อมต้อนรับ จัดโต๊ะไว้ให้แล้ว' },
    { num: 4, title: 'ชำระเงิน',  desc: 'สะดวก รวดเร็ว QR PromptPay หรือเงินสด' },
  ]

  private _reviews = [
    { name: 'คุณสมศรี',   text: 'อาหารอร่อยมาก บรรยากาศหรูหรา บริการดีเยี่ยม แนะนำมาก!',      date: 'มี.ค. 2025' },
    { name: 'คุณวิชัย',   text: 'ระบบจองออนไลน์ใช้งานง่าย ไม่ต้องรอนาน ประทับใจมากๆ',          date: 'มี.ค. 2025' },
    { name: 'คุณนิภา',    text: 'เนื้อวากิวคุณภาพดีจริงๆ นุ่มมากกกก จะกลับมาอีกแน่นอน',         date: 'ก.พ. 2025' },
    { name: 'คุณธนกร',   text: 'มาฉลองวันเกิดแฟน บรรยากาศโรแมนติก พนักงานเอาใจใส่ดีมาก',       date: 'ก.พ. 2025' },
    { name: 'คุณพรทิพย์', text: 'คุ้มค่ามากๆ อาหารทะเลสดมาก กุ้งอร่อยที่สุดที่เคยทาน',           date: 'ม.ค. 2025' },
    { name: 'คุณสมชาย',  text: 'อาหารอร่อยมาก บรรยากาศหรูหรา บริการดีเยี่ยม แนะนำมาก!',      date: 'ม.ค. 2025' },
  ]
  marqueeReviews = [...this._reviews, ...this._reviews]

  constructor() {
    afterNextRender(() => {
      // Color orbs layer (under ember particles)
      const orb = this.orbCanvas()?.nativeElement
      if (orb) this.cancelFire.push(this.initColorOrbs(orb))

      // Fluid animated background
      const canvas = this.fluidCanvas()?.nativeElement
      if (canvas) this.cleanupFluid = this.initCinemaEmbers(canvas)

      // Footer ember canvas
      const fe = this.footerEmber()?.nativeElement
      if (fe) this.cleanupFooterEmber = this.initCinemaEmbers(fe, 40)

      // Fire canvases
      const fm = this.fireMain()?.nativeElement
      if (fm) this.cancelFire.push(this.startFire(fm))
      const ff = this.fireFab()?.nativeElement
      if (ff) this.cancelFire.push(this.startFire(ff))

      // Typing animation
      this.cleanupTyping = this.startTypingAnimation()

      // Scroll listener
      this.scrollFn = () => this.scrolled.set(window.scrollY > 60)
      window.addEventListener('scroll', this.scrollFn, { passive: true })

      // Observers
      this.initSectionReveal()
      this.initStepObserver()
      this.initMenuCardObserver()
      this.initStatCountUp()
      this.initTimelineObserver()
      this.initPricingObserver()
    })
  }

  ngOnInit() {}

  async searchTrackQueue() {
    const phone = this.trackPhone().trim()
    if (!/^0\d{8,9}$/.test(phone)) {
      this.trackError.set('กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก')
      return
    }
    this.trackLoading.set(true)
    this.trackError.set('')
    try {
      const res = await fetch('/api/queues?status=all')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const active = (data.queues ?? []).filter((q: any) =>
        q.customer_tel === phone &&
        q.queue_status !== 'CANCELLED' &&
        q.queue_status !== 'FINISHED'
      ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (active) {
        localStorage.setItem('bbq_last_tel', phone)
        this.trackModalOpen.set(false)
        this.router.navigate(['/queue-status', active.queue_id])
      } else {
        this.trackError.set('ไม่พบคิวที่ active สำหรับเบอร์นี้')
      }
    } catch {
      this.trackError.set('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      this.trackLoading.set(false)
    }
  }

  ngOnDestroy() {
    this.cleanupFluid?.()
    this.cleanupFooterEmber?.()
    this.cleanupTyping?.()
    this.cancelFire.forEach(fn => fn())
    this.observers.forEach(o => o.disconnect())
    window.removeEventListener('scroll', this.scrollFn)
  }

  // ═══════════════════════════════════════════════════════════════
  // COLOR ORBS — Warm Ambient Glow Layer
  // ═══════════════════════════════════════════════════════════════
  private initColorOrbs(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const orbs = [
      { x: .75, y: .25, r: 350, color: [201,168,76], alpha: .20, sx: .0003, sy: .0004, px: 0, py: 0 },
      { x: .20, y: .60, r: 300, color: [255,69,0],   alpha: .15, sx: .0005, sy: .0003, px: 1.5, py: .8 },
      { x: .60, y: .70, r: 250, color: [180,100,20], alpha: .10, sx: .0004, sy: .0005, px: 3, py: 2 },
    ]

    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const o of orbs) {
        const cx = (o.x + Math.sin(t * o.sx + o.px) * .18) * canvas.width
        const cy = (o.y + Math.cos(t * o.sy + o.py) * .14) * canvas.height
        const r = o.r * (canvas.width / 1400)
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        gr.addColorStop(0, `rgba(${o.color.join(',')},${o.alpha})`)
        gr.addColorStop(.6, `rgba(${o.color.join(',')},${o.alpha * .3})`)
        gr.addColorStop(1, `rgba(${o.color.join(',')},0)`)
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FLUID BACKGROUND — Animated Color Orbs
  // ═══════════════════════════════════════════════════════════════
  private initFluidBackground(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const orbs = [
      { x: .25, y: .4, r: 500, color: [201,168,76], alpha: .35, sx: .0003, sy: .0004, px: 0, py: 0 },
      { x: .75, y: .3, r: 400, color: [255,69,0],   alpha: .25, sx: .0005, sy: .0003, px: 1.5, py: .8 },
      { x: .5,  y: .7, r: 350, color: [139,92,246], alpha: .18, sx: .0004, sy: .0005, px: 3, py: 2 },
      { x: .3,  y: .6, r: 500, color: [30,58,138],  alpha: .12, sx: .0002, sy: .00015, px: 4.5, py: 3.5 },
    ]

    let t = 0
    const draw = () => {
      t++
      ctx.fillStyle = '#050608'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (const o of orbs) {
        const cx = (o.x + Math.sin(t * o.sx + o.px) * .15) * canvas.width
        const cy = (o.y + Math.cos(t * o.sy + o.py) * .12) * canvas.height
        const r = o.r * (canvas.width / 1400)
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        gr.addColorStop(0, `rgba(${o.color.join(',')},${o.alpha})`)
        gr.addColorStop(.5, `rgba(${o.color.join(',')},${o.alpha * .4})`)
        gr.addColorStop(1, `rgba(${o.color.join(',')},0)`)
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TYPING ANIMATION — Typewriter Effect
  // ═══════════════════════════════════════════════════════════════
  private startTypingAnimation(): () => void {
    let cancelled = false
    let timeoutId: any = 0

    const sleep = (ms: number) => new Promise<void>(res => { timeoutId = setTimeout(res, ms) })

    const run = async () => {
      let idx = 0
      while (!cancelled) {
        const phrase = this.typingPhrases[idx % this.typingPhrases.length]
        // Type
        for (let i = 0; i <= phrase.length && !cancelled; i++) {
          this.typedText.set(phrase.slice(0, i))
          await sleep(80)
        }
        if (cancelled) break
        await sleep(2000)
        // Delete
        for (let i = phrase.length; i >= 0 && !cancelled; i--) {
          this.typedText.set(phrase.slice(0, i))
          await sleep(40)
        }
        if (cancelled) break
        await sleep(300)
        idx++
      }
    }
    run()
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }

  // ═══════════════════════════════════════════════════════════════
  // EMBER PARTICLES — Cinema Grade (120 particles, depth effect)
  // ═══════════════════════════════════════════════════════════════
  private initCinemaEmbers(canvas: HTMLCanvasElement, count = 120): () => void {
    const ctx = canvas.getContext('2d')!
    const palette = ['#FF4500','#FF8C00','#FFD700','#FFF8DC','#FF6B35','#C9A84C']
    let raf = 0

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: count }, () => {
      const depth = Math.random()
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * canvas.height,
        size: 1.5 + depth * 3.5,
        speed: 0.3 + depth * 0.7,
        sway: (Math.random() - .5) * 0.5,
        opacity: 0.2 + depth * 0.7,
        color: palette[Math.floor(Math.random() * palette.length)],
        phase: Math.random() * Math.PI * 2,
        depth,
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.y -= p.speed
        p.x += Math.sin(p.phase + p.y * 0.008) * 0.4 * (0.5 + p.depth * 0.5)
        p.phase += 0.008
        if (p.y < -p.size * 2) {
          p.y = canvas.height + p.size
          p.x = Math.random() * canvas.width
        }
        ctx.globalAlpha = p.opacity * Math.min(1, (canvas.height - p.y) / 80)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }

  // ═══════════════════════════════════════════════════════════════
  // FIRE CANVAS — Photorealistic BBQ Scene
  // ═══════════════════════════════════════════════════════════════
  private startFire(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return () => {}
    const W = canvas.width, H = canvas.height
    const BASE_Y = H * 0.92, GRATE_Y = H * 0.80, LOG_Y = H * 0.74, LOG_R = H * 0.055
    const LOG_DEFS = [
      { cx: W * 0.33, angle: 0.18 },
      { cx: W * 0.50, angle: -0.05 },
      { cx: W * 0.67, angle: 0.14 },
    ]
    type P = { x:number;y:number;vx:number;vy:number;life:number;maxLife:number;size:number }
    type E = { x:number;y:number;vx:number;vy:number;life:number;size:number }
    const flames: P[] = [], embers: E[] = []
    let rafId = 0, frame = 0

    const drawBase = () => {
      const ash = ctx.createLinearGradient(0, GRATE_Y + 4, 0, BASE_Y)
      ash.addColorStop(0, 'rgba(60,20,5,0.9)'); ash.addColorStop(1, 'rgba(15,6,2,1)')
      ctx.fillStyle = ash; ctx.beginPath()
      ctx.ellipse(W * 0.5, BASE_Y - 4, W * 0.44, H * 0.06, 0, 0, Math.PI * 2); ctx.fill()
      const pulse = 0.15 + 0.1 * Math.sin(frame * 0.04)
      for (let i = 0; i < 8; i++) {
        const ex = W * (0.18 + i * 0.09), ey = BASE_Y - 6 + Math.sin(frame * 0.03 + i) * 2
        const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, 7)
        gr.addColorStop(0, `rgba(255,140,20,${pulse + i * 0.015})`); gr.addColorStop(1, 'rgba(200,30,0,0)')
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill()
      }
    }

    const drawGrate = () => {
      const barCount = 8, gx1 = W * 0.10, gx2 = W * 0.90, gBottom = BASE_Y - 4
      ctx.lineCap = 'round'
      for (let i = 0; i < barCount; i++) {
        const gy = GRATE_Y + (gBottom - GRATE_Y) * (i / (barCount - 1))
        ctx.lineWidth = 3.5
        const grad = ctx.createLinearGradient(gx1, gy, gx2, gy)
        const bright = i < 3 ? 'rgba(180,90,30,0.85)' : 'rgba(60,25,10,0.9)'
        grad.addColorStop(0, 'rgba(40,18,8,0.7)'); grad.addColorStop(0.5, bright); grad.addColorStop(1, 'rgba(40,18,8,0.7)')
        ctx.strokeStyle = grad; ctx.beginPath(); ctx.moveTo(gx1, gy); ctx.lineTo(gx2, gy); ctx.stroke()
      }
      ctx.lineWidth = 4
      ;[gx1 + 6, gx2 - 6].forEach(sx => {
        const sg = ctx.createLinearGradient(sx, GRATE_Y, sx, gBottom)
        sg.addColorStop(0, 'rgba(80,35,12,0.9)'); sg.addColorStop(1, 'rgba(30,12,5,0.9)')
        ctx.strokeStyle = sg; ctx.beginPath(); ctx.moveTo(sx, GRATE_Y); ctx.lineTo(sx, gBottom); ctx.stroke()
      })
    }

    const drawLog = (cx: number, angle: number, flickerHeat: number) => {
      ctx.save(); ctx.translate(cx, LOG_Y); ctx.rotate(angle)
      const lw = W * 0.50
      const bark = ctx.createLinearGradient(0, -LOG_R, 0, LOG_R)
      bark.addColorStop(0, '#3a1e0e'); bark.addColorStop(0.4, '#1e0e06'); bark.addColorStop(1, '#0a0503')
      ctx.fillStyle = bark; ctx.beginPath(); ctx.ellipse(0, 0, lw / 2, LOG_R, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath(); ctx.ellipse(0, -LOG_R + LOG_R * 2 * (r / 4), lw * 0.48, LOG_R * 0.15, 0, 0, Math.PI * 2); ctx.stroke()
      }
      const top = ctx.createLinearGradient(0, -LOG_R, 0, -LOG_R * 0.3)
      top.addColorStop(0, 'rgba(90,45,15,0.5)'); top.addColorStop(1, 'rgba(40,18,6,0)')
      ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(0, -LOG_R * 0.6, lw * 0.46, LOG_R * 0.4, 0, 0, Math.PI * 2); ctx.fill()
      const hg = ctx.createLinearGradient(-lw/2, -LOG_R, lw/2, -LOG_R)
      hg.addColorStop(0, 'rgba(255,80,10,0)'); hg.addColorStop(0.3, `rgba(255,160,40,${0.35 + flickerHeat * 0.4})`)
      hg.addColorStop(0.7, `rgba(255,120,20,${0.30 + flickerHeat * 0.35})`); hg.addColorStop(1, 'rgba(255,80,10,0)')
      ctx.fillStyle = hg; ctx.fillRect(-lw/2, -LOG_R - 2, lw, LOG_R * 0.7)
      ctx.save(); ctx.translate(-lw / 2, 0)
      const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, LOG_R)
      eg.addColorStop(0, '#5a2e12'); eg.addColorStop(0.5, '#3a1a08'); eg.addColorStop(1, '#1a0a04')
      ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(0, 0, LOG_R * 0.55, LOG_R, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8
      for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.ellipse(0, 0, LOG_R * 0.55 * r / 3.5, LOG_R * r / 3.5, 0, 0, Math.PI * 2); ctx.stroke() }
      ctx.restore(); ctx.restore()
    }

    const tick = () => {
      frame++; ctx.clearRect(0, 0, W, H)
      drawBase(); drawGrate()
      LOG_DEFS.forEach((ld, i) => drawLog(ld.cx, ld.angle, 0.5 + 0.5 * Math.sin(frame * 0.04 + i * 1.3)))
      const spawnRate = Math.max(2, Math.round(W / 18))
      for (let s = 0; s < spawnRate; s++) {
        const ld = LOG_DEFS[Math.floor(Math.random() * LOG_DEFS.length)]
        const l = 0.55 + Math.random() * 0.45
        flames.push({ x: ld.cx + (Math.random() - 0.5) * W * 0.22, y: LOG_Y - LOG_R,
          vx: (Math.random() - 0.5) * 0.9, vy: -(1.8 + Math.random() * 3.2) * (H / 220),
          life: l, maxLife: l, size: W * 0.07 + Math.random() * W * 0.16 })
      }
      if (Math.random() < 0.3) {
        const ld = LOG_DEFS[Math.floor(Math.random() * LOG_DEFS.length)]
        embers.push({ x: ld.cx + (Math.random() - 0.5) * W * 0.3, y: LOG_Y - LOG_R,
          vx: (Math.random() - 0.5) * 1.2, vy: -(0.8 + Math.random() * 2), life: 1, size: 1.2 + Math.random() * 2 })
      }
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i]
        f.x += f.vx + (Math.random() - 0.5) * 0.5; f.y += f.vy
        f.vy *= 0.981 + Math.random() * 0.014; f.life -= 0.012 + Math.random() * 0.009; f.size *= 0.972
        if (f.life <= 0 || f.size < 1) { flames.splice(i, 1); continue }
        const t = 1 - f.life / f.maxLife, alpha = Math.min(1, f.life * 2.4)
        const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size)
        if (t < 0.25) {
          gr.addColorStop(0, `rgba(255,255,200,${alpha})`); gr.addColorStop(0.2, `rgba(255,230,100,${alpha * 0.9})`)
          gr.addColorStop(0.5, `rgba(255,140,40,${alpha * 0.65})`); gr.addColorStop(0.8, `rgba(255,70,15,${alpha * 0.35})`)
          gr.addColorStop(1, 'rgba(150,20,0,0)')
        } else {
          gr.addColorStop(0, `rgba(255,180,60,${alpha})`); gr.addColorStop(0.3, `rgba(255,110,30,${alpha * 0.8})`)
          gr.addColorStop(0.65, `rgba(255,50,10,${alpha * 0.45})`); gr.addColorStop(1, 'rgba(120,10,0,0)')
        }
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill()
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.x += e.vx; e.y += e.vy; e.vy += 0.025; e.life -= 0.014
        if (e.life <= 0 || e.y > H) { embers.splice(i, 1); continue }
        const br = Math.floor(200 + e.life * 55)
        ctx.fillStyle = `rgba(${br},${Math.floor(br * 0.38)},0,${e.life})`
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill()
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }

  // ═══════════════════════════════════════════════════════════════
  // OBSERVERS
  // ═══════════════════════════════════════════════════════════════
  private initSectionReveal() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.15 })
    document.querySelectorAll('.section-reveal').forEach(el => obs.observe(el))
    this.observers.push(obs)
  }

  private initStepObserver() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.2 })
    document.querySelectorAll('.step-card').forEach(el => obs.observe(el))
    this.observers.push(obs)
  }

  private initMenuCardObserver() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.15 })
    document.querySelectorAll('.menu-card-v2').forEach(el => obs.observe(el))
    this.observers.push(obs)
  }

  private initStatCountUp() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const numEl = entry.target.querySelector('.stat-num') as HTMLElement
        if (!numEl || numEl.dataset['counted']) return
        numEl.dataset['counted'] = '1'
        const target = parseFloat(numEl.dataset['target'] || '0')
        const suffix = numEl.dataset['suffix'] || ''
        const isFloat = target % 1 !== 0
        const duration = 1400
        const start = performance.now()
        const step = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = p * (2 - p) // easeOutQuad
          const v = eased * target
          numEl.textContent = (isFloat ? v.toFixed(1) : Math.round(v).toLocaleString()) + suffix
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
    }, { threshold: 0.3 })
    document.querySelectorAll('.stat-counter').forEach(el => obs.observe(el))
    this.observers.push(obs)
  }

  private initTimelineObserver() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.timeline-line-v2').forEach(l => l.classList.add('drawn'))
        }
      })
    }, { threshold: 0.3 })
    const howSection = document.getElementById('how')
    if (howSection) obs.observe(howSection)
    this.observers.push(obs)
  }

  private initPricingObserver() {
    const cards = document.querySelectorAll('.pricing-card')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Array.from(cards).indexOf(e.target)
          setTimeout(() => e.target.classList.add('visible'), idx * 100)
        }
      })
    }, { threshold: 0.15 })
    cards.forEach(el => obs.observe(el))
    this.observers.push(obs)
  }

  fmtCell(v: string): string {
    if (v === '✓') return '<span style="color:#22c55e;font-weight:600">✓</span>'
    if (v === '✗') return '<span style="color:rgba(239,68,68,.4)">✗</span>'
    return `<span style="color:var(--color-smoke)">${v}</span>`
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════
  pauseCarousel() {}
  resumeCarousel() {}

  addRipple(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    el.classList.add('ripple-host')
    this.anim.ripple(el, e)
  }

  onCtaMove(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left - r.width / 2) / r.width * 10
    const dy = (e.clientY - r.top - r.height / 2) / r.height * 10
    el.style.transform = `translate(${dx}px,${dy}px)`
  }

  onCtaLeave() {
    document.querySelectorAll<HTMLElement>('.cta-magnetic').forEach(el => {
      el.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1)'
      el.style.transform = 'translate(0,0)'
      setTimeout(() => { el.style.transition = '' }, 400)
    })
  }

  onCardEnter(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    el.style.boxShadow = '0 0 0 1px rgba(201,168,76,.4), 0 24px 60px rgba(201,168,76,.15)'
    el.style.borderColor = 'rgba(201,168,76,.4)'
  }

  onCardLeave(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
    el.style.boxShadow = ''
    el.style.borderColor = 'rgba(201,168,76,.12)'
    const spotlight = el.querySelector('.card-spotlight') as HTMLElement
    if (spotlight) spotlight.style.opacity = '0'
  }

  onCardMove(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width
    const my = (e.clientY - r.top) / r.height
    const rx = (my - .5) * -12
    const ry = (mx - .5) * 12
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
    const spotlight = el.querySelector('.card-spotlight') as HTMLElement
    if (spotlight) {
      spotlight.style.setProperty('--mx', `${mx * 100}%`)
      spotlight.style.setProperty('--my', `${my * 100}%`)
      spotlight.style.opacity = '1'
    }
  }
}
