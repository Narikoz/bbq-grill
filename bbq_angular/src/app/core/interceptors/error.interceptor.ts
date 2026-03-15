// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, throwError } from 'rxjs'

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router)
  return next(req).pipe(
    catchError(err => {
      // Only redirect to login for protected routes, not for auth/me check
      if (err.status === 401 && !req.url.includes('/auth/me')) {
        router.navigate(['/login'])
      }
      return throwError(() => err)
    })
  )
}
