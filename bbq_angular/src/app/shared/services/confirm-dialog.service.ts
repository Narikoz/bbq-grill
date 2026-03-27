import { Injectable, signal } from '@angular/core'

export interface DialogConfig {
  title: string
  message: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  visible = signal(false)
  config  = signal<DialogConfig>({ title: '', message: '' })

  private _resolve?: (value: boolean) => void

  confirm(title: string, message: string, opts?: Partial<DialogConfig>): Promise<boolean> {
    this.config.set({
      title,
      message,
      type: opts?.type ?? 'danger',
      confirmText: opts?.confirmText ?? 'ยืนยัน',
      cancelText: opts?.cancelText ?? 'ยกเลิก',
      showCancel: true,
    })
    this.visible.set(true)
    return new Promise<boolean>(resolve => {
      this._resolve = resolve
    })
  }

  alert(title: string, message: string, opts?: Partial<DialogConfig>): Promise<void> {
    this.config.set({
      title,
      message,
      type: opts?.type ?? 'info',
      confirmText: opts?.confirmText ?? 'ตกลง',
      showCancel: false,
    })
    this.visible.set(true)
    return new Promise<void>(resolve => {
      this._resolve = (v: boolean) => resolve()
    })
  }

  respond(value: boolean) {
    this.visible.set(false)
    this._resolve?.(value)
    this._resolve = undefined
  }
}
