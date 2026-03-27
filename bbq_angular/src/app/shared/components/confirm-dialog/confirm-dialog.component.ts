import { Component, inject, HostListener, ChangeDetectionStrategy } from '@angular/core'
import { ConfirmDialogService } from '../../services/confirm-dialog.service'

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dialog.visible()) {
      <div class="cd-overlay" (click)="onBackdrop()">
        <div class="cd-card" (click)="$event.stopPropagation()">

          <!-- Icon -->
          <div class="cd-icon-wrap" [style.background]="iconBg()" [style.borderColor]="iconBorder()">
            <span class="cd-icon">{{ icon() }}</span>
          </div>

          <!-- Title -->
          <h3 class="cd-title">{{ dialog.config().title }}</h3>

          <!-- Message -->
          <p class="cd-message">{{ dialog.config().message }}</p>

          <!-- Actions -->
          <div class="cd-actions">
            @if (dialog.config().showCancel) {
              <button class="cd-btn cd-btn-cancel" (click)="dialog.respond(false)">
                {{ dialog.config().cancelText }}
              </button>
            }
            <button class="cd-btn cd-btn-confirm"
                    [style.background]="confirmBg()"
                    [style.borderColor]="confirmBorder()"
                    (click)="dialog.respond(true)">
              {{ dialog.config().confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cd-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(5, 6, 8, 0.82);
      backdrop-filter: blur(14px);
      animation: cdFadeIn 180ms ease-out;
    }

    @keyframes cdFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes cdSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .cd-card {
      width: 100%;
      max-width: 400px;
      background: linear-gradient(160deg, #14161E, #0D0E14);
      border: 1px solid rgba(201, 168, 76, 0.15);
      border-radius: 20px;
      padding: 32px 28px 24px;
      text-align: center;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.03) inset;
      animation: cdSlideUp 250ms cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Kanit', sans-serif;
    }

    .cd-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 18px;
      border: 1px solid;
    }

    .cd-icon {
      font-size: 26px;
      line-height: 1;
    }

    .cd-title {
      color: #E8E6E3;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px;
    }

    .cd-message {
      color: #9CA3AF;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px;
    }

    .cd-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .cd-btn {
      flex: 1;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 180ms ease;
      font-family: 'Kanit', sans-serif;
      outline: none;
    }

    .cd-btn:hover {
      filter: brightness(1.15);
    }

    .cd-btn:active {
      transform: scale(0.97);
    }

    .cd-btn-cancel {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.10);
      color: #9CA3AF;
    }

    .cd-btn-cancel:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #E8E6E3;
    }

    .cd-btn-confirm {
      border: 1px solid;
      color: white;
    }
  `],
})
export class ConfirmDialogComponent {
  dialog = inject(ConfirmDialogService)

  icon() {
    const t = this.dialog.config().type
    if (t === 'danger')  return '⚠️'
    if (t === 'warning') return '⚡'
    if (t === 'success') return '✅'
    return 'ℹ️'
  }

  iconBg() {
    const t = this.dialog.config().type
    if (t === 'danger')  return 'rgba(239,68,68,.10)'
    if (t === 'warning') return 'rgba(245,158,11,.10)'
    if (t === 'success') return 'rgba(16,185,129,.10)'
    return 'rgba(59,130,246,.10)'
  }

  iconBorder() {
    const t = this.dialog.config().type
    if (t === 'danger')  return 'rgba(239,68,68,.22)'
    if (t === 'warning') return 'rgba(245,158,11,.22)'
    if (t === 'success') return 'rgba(16,185,129,.22)'
    return 'rgba(59,130,246,.22)'
  }

  confirmBg() {
    const t = this.dialog.config().type
    if (t === 'danger')  return 'rgba(239,68,68,.18)'
    if (t === 'warning') return 'rgba(245,158,11,.18)'
    if (t === 'success') return 'rgba(16,185,129,.18)'
    return 'rgba(59,130,246,.18)'
  }

  confirmBorder() {
    const t = this.dialog.config().type
    if (t === 'danger')  return 'rgba(239,68,68,.35)'
    if (t === 'warning') return 'rgba(245,158,11,.35)'
    if (t === 'success') return 'rgba(16,185,129,.35)'
    return 'rgba(59,130,246,.35)'
  }

  onBackdrop() {
    if (this.dialog.config().showCancel) {
      this.dialog.respond(false)
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.dialog.visible()) {
      this.dialog.respond(false)
    }
  }
}
