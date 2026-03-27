// src/app/app.component.ts
import { Component, inject, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AuthService } from './core/services/auth.service'
import { TrackQueueFabComponent } from './shared/components/track-queue-fab/track-queue-fab.component'
import { HelpWidgetComponent } from './shared/components/help-widget/help-widget.component'
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TrackQueueFabComponent, HelpWidgetComponent, ConfirmDialogComponent],
  template: `
    @if (auth.loading()) {
      <div class="min-h-dvh flex items-center justify-center relative z-10">
        <div class="flex flex-col items-center gap-4">
          <span class="css-flame animate-glow-lava" style="font-size:3.5rem"></span>
          <div class="animate-spin rounded-full"
               style="width:32px;height:32px;border:2px solid rgba(255,255,255,.1);border-top-color:#FF5722;"></div>
        </div>
      </div>
    } @else {
      <router-outlet />
      <app-track-queue-fab />
      <app-help-widget />
      <app-confirm-dialog />
    }
  `,
})
export class AppComponent implements OnInit {
  auth = inject(AuthService)

  ngOnInit() {
    this.auth.init().subscribe()
  }
}
