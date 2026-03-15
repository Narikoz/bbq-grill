// src/app/app.component.ts
import { Component, inject, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AuthService } from './core/services/auth.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (auth.loading()) {
      <div class="min-h-dvh flex items-center justify-center relative z-10">
        <div class="flex flex-col items-center gap-4">
          <span class="text-5xl animate-glow-lava">🔥</span>
          <div class="animate-spin rounded-full"
               style="width:32px;height:32px;border:2px solid rgba(255,255,255,.1);border-top-color:#FF5722;"></div>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent implements OnInit {
  auth = inject(AuthService)

  ngOnInit() {
    this.auth.init().subscribe()
  }
}
