// src/app/features/auth/login.page.ts
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms'
import { AuthService } from '../../core/services/auth.service'

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-dvh flex items-center justify-center p-6 score-lines relative">

      <div class="absolute inset-0 pointer-events-none"
           style="background:radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,168,76,.07), transparent 60%)"></div>

      <div class="w-full max-w-[400px] relative z-10">

        <!-- Brand -->
        <div class="text-center mb-10 animate-thermal-in">
          <div class="mb-3 animate-glow-gold" style="font-size:3.5rem;line-height:1;display:inline-block"><span class="css-flame"></span></div>
          <div class="font-display text-4xl tracking-widest mb-1" style="color:var(--color-ash)">BBQ GRILL</div>
          <div class="text-xs tracking-[.2em] uppercase" style="color:var(--color-haze)">Staff Portal</div>
        </div>

        <!-- Card -->
        <div class="glass-card p-9 animate-thermal-in stagger-1">

          @if (error()) {
            <div class="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm mb-6 animate-thermal-in"
                 style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ error() }}
            </div>
          }

          <!-- Hint box -->
          <div class="rounded-xl p-4 mb-6 text-xs"
               style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)">
            <div class="grid grid-cols-2 gap-1" style="color:var(--color-smoke)">
              <span>Admin</span><span class="font-mono" style="color:var(--color-ash)">admin / admin1234</span>
              <span>Staff</span><span class="font-mono" style="color:var(--color-ash)">staff / staff1234</span>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">

            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke)">
                Username
              </label>
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                     width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(74,84,104,.8)" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" formControlName="username" placeholder="กรอก username"
                       autocomplete="username"
                       class="w-full pl-9 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                       style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);font-family:var(--font-sans)"
                       (focus)="f($event,true)" (blur)="f($event,false)">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--color-smoke)">
                Password
              </label>
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                     width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(74,84,104,.8)" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input [type]="showPw() ? 'text' : 'password'" formControlName="password"
                       placeholder="กรอกรหัสผ่าน" autocomplete="current-password"
                       class="w-full pl-9 pr-10 py-3.5 rounded-xl text-sm outline-none transition-all"
                       style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:var(--color-ash);font-family:var(--font-sans)"
                       (focus)="f($event,true)" (blur)="f($event,false)">
                <button type="button" (click)="showPw.set(!showPw())"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                        style="background:none;border:none;cursor:pointer;color:var(--color-haze)">
                  @if (showPw()) {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  } @else {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" [disabled]="loading()"
                    class="w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-1"
                    style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));color:#050608;border:none;cursor:pointer;box-shadow:0 14px 45px rgba(201,168,76,.25);font-family:var(--font-sans)"
                    [style.opacity]="loading() ? '.7' : '1'">
              @if (loading()) {
                <div class="animate-spin rounded-full" style="width:16px;height:16px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff"></div>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              }
              เข้าสู่ระบบ
            </button>
          </form>

          <div class="flex items-center gap-3 my-5">
            <div class="flex-1 h-px" style="background:rgba(255,255,255,.07)"></div>
            <span class="text-xs" style="color:var(--color-haze)">หรือ</span>
            <div class="flex-1 h-px" style="background:rgba(255,255,255,.07)"></div>
          </div>

          <a routerLink="/" class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
             style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:var(--color-smoke);text-decoration:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            กลับหน้าจองลูกค้า
          </a>
        </div>

      </div>
    </div>
  `,
})
export class LoginPage {
  private auth   = inject(AuthService)
  private router = inject(Router)
  private fb     = inject(FormBuilder)

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  })
  error   = signal('')
  loading = signal(false)
  showPw  = signal(false)

  submit() {
    if (this.form.invalid) return
    this.error.set('')
    this.loading.set(true)
    const { username, password } = this.form.value
    this.auth.login(username!, password!).subscribe({
      next: () => this.router.navigate(['/staff']),
      error: (e: { error?: { error?: string } }) => {
        this.error.set(e.error?.error ?? 'เข้าสู่ระบบไม่สำเร็จ')
        this.loading.set(false)
      },
    })
  }

  f(e: FocusEvent, focused: boolean) {
    const el = e.target as HTMLElement
    el.style.borderColor = focused ? 'rgba(201,168,76,.5)'  : 'rgba(255,255,255,.09)'
    el.style.boxShadow   = focused ? '0 0 0 3px rgba(201,168,76,.10)' : 'none'
    el.style.background  = focused ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.04)'
  }
}
