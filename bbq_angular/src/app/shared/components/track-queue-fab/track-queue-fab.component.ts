import { Component, signal, inject, ChangeDetectionStrategy, HostBinding } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, NavigationEnd } from '@angular/router'
import { filter } from 'rxjs/operators'
import { Queue } from '../../../core/models'

@Component({
  selector: 'app-track-queue-fab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-6 right-6 z-50 group">
      <button
        (click)="showModal.set(true)"
        class="w-12 h-12 rounded-full flex items-center justify-center
               transition-all duration-300 hover:scale-110 shadow-lg"
        style="background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.4);"
        onmouseover="this.style.background='rgba(201,168,76,0.25)'"
        onmouseout="this.style.background='rgba(201,168,76,0.15)'"
      >
        <span class="text-2xl" style="color: #C9A84C;">🔔</span>
      </button>
      <div class="absolute px-3 py-1.5 rounded-lg whitespace-nowrap
                  opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
           style="background: rgba(12,14,24,0.95); border: 1px solid rgba(201,168,76,0.3);
                  bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);">
        <span class="text-sm" style="color: #E8E6E3;">ติดตามคิว</span>
      </div>
    </div>

    @if (showModal()) {
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        (click)="showModal.set(false)"
      >
        <div
          class="w-full max-w-md mx-4 p-6 rounded-xl space-y-5"
          style="background: #0C0E18; border: 1px solid rgba(201,168,76,0.25);"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-semibold" style="color: #C9A84C;">ค้นหาคิวของคุณ</h3>
            <button
              (click)="showModal.set(false)"
              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              style="color: #E8E6E3;"
            >
              ✕
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm mb-2" style="color: #E8E6E3;">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                [(ngModel)]="phoneNumber"
                placeholder="0812345678"
                maxlength="10"
                class="w-full px-4 py-3 rounded-lg focus:outline-none transition-all"
                style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
                       color: #E8E6E3;"
                onfocus="this.style.borderColor='rgba(201,168,76,0.5)'"
                onblur="this.style.borderColor='rgba(255,255,255,0.15)'"
                (keyup.enter)="searchQueue()"
              />
            </div>

            @if (errorMessage()) {
              <div class="px-4 py-3 rounded-lg" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);">
                <p class="text-sm" style="color: #EF4444;">{{ errorMessage() }}</p>
              </div>
            }

            @if (loading()) {
              <div class="text-center py-4">
                <div class="inline-block w-8 h-8 border-4 rounded-full animate-spin"
                     style="border-color: rgba(201,168,76,0.3); border-top-color: #C9A84C;"></div>
              </div>
            }
          </div>

          <div class="flex gap-3">
            <button
              (click)="showModal.set(false)"
              class="flex-1 px-4 py-3 rounded-lg font-medium transition-all hover:bg-white/5"
              style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #E8E6E3;"
            >
              ยกเลิก
            </button>
            <button
              (click)="searchQueue()"
              [disabled]="loading() || !isValidPhone()"
              class="flex-1 px-4 py-3 rounded-lg font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style="background: linear-gradient(135deg, #D4B962, #C9A84C); color: #050608;"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .glass-card {
      background: rgba(255, 255, 255, 0.035);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  `]
})
export class TrackQueueFabComponent {
  private router = inject(Router)

  showModal    = signal(false)
  phoneNumber  = ''
  errorMessage = signal('')
  loading      = signal(false)
  hidden       = signal(false)

  @HostBinding('style.display')
  get hostDisplay() { return this.hidden() ? 'none' : '' }

  constructor() {
    const savedTel = localStorage.getItem('bbq_last_tel')
    if (savedTel) this.phoneNumber = savedTel

    const isHidden = (url: string) => url.startsWith('/admin') || url.startsWith('/staff') || url === '/' || url === ''
    this.hidden.set(isHidden(this.router.url))
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.hidden.set(isHidden(e.urlAfterRedirects))
    })
  }

  isValidPhone(): boolean {
    return /^0\d{8,9}$/.test(this.phoneNumber)
  }

  async searchQueue(): Promise<void> {
    if (!this.isValidPhone()) {
      this.errorMessage.set('กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก')
      return
    }

    this.loading.set(true)
    this.errorMessage.set('')

    try {
      const response = await fetch('/api/queues?status=all')
      if (!response.ok) throw new Error('Failed to fetch queues')
      
      const data = await response.json()
      const queues: Queue[] = data.queues || []

      const activeQueue = queues
        .filter(q => 
          q.customer_tel === this.phoneNumber &&
          q.queue_status !== 'CANCELLED' &&
          q.queue_status !== 'FINISHED'
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      if (activeQueue) {
        localStorage.setItem('bbq_last_tel', this.phoneNumber)
        this.showModal.set(false)
        this.router.navigate(['/queue-status', activeQueue.queue_id])
      } else {
        this.errorMessage.set('ไม่พบคิวที่ active อยู่สำหรับเบอร์นี้')
      }
    } catch (error) {
      this.errorMessage.set('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      this.loading.set(false)
    }
  }
}
