// src/app/core/services/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core'
import { Router } from '@angular/router'
import { ApiService } from './api.service'
import { User } from '../models'
import { tap, catchError } from 'rxjs/operators'
import { of } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api    = inject(ApiService)
  private router = inject(Router)

  private _user    = signal<User | null>(null)
  private _loading = signal(true)

  readonly user        = this._user.asReadonly()
  readonly loading     = this._loading.asReadonly()
  readonly isLoggedIn  = computed(() => !!this._user())
  readonly isAdmin     = computed(() => this._user()?.role === 'ADMIN')
  readonly userName    = computed(() => this._user()?.emp_name ?? '')
  readonly userInitial = computed(() => this._user()?.emp_name?.charAt(0) ?? '?')

  init() {
    return this.api.me().pipe(
      tap(r => {
        this._user.set(r.user)
        this._loading.set(false)   // ✅ success
      }),
      catchError(() => {
        // API ล้มเหลว (404, network error ฯลฯ) → ยังใช้งานได้ แค่ไม่ login
        this._user.set(null)
        this._loading.set(false)   // ✅ always unblock UI
        return of({ user: null })
      })
    )
  }

  login(username: string, password: string) {
    return this.api.login(username, password).pipe(
      tap(r => this._user.set(r.user))
    )
  }

  logout(): void {
    this.api.logout().subscribe()
    this._user.set(null)
    this.router.navigate(['/login'])
  }
}
