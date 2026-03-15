// src/app/app.routes.ts
import { Routes } from '@angular/router'
import { authGuard, adminGuard } from './core/guards/auth.guard'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/booking/booking.page')
      .then(m => m.BookingPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page')
      .then(m => m.LoginPage)
  },
  {
    path: 'staff',
    loadComponent: () => import('./features/staff/staff.page')
      .then(m => m.StaffPage),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.page')
      .then(m => m.AdminPage),
    canActivate: [adminGuard],
  },
  {
    path: 'pay/:id',
    loadComponent: () => import('./features/pay/pay.page')
      .then(m => m.PayPage)
  },
  {
    path: 'receipt/:id',
    loadComponent: () => import('./features/receipt/receipt.page')
      .then(m => m.ReceiptPage)
  },
  { path: '**', redirectTo: '' },
]
