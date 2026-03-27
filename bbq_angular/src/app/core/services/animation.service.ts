// src/app/core/services/animation.service.ts
import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AnimationService {

  // ── Ember Particles ──────────────────────────────────────────
  emberParticles(canvas: HTMLCanvasElement, count = 80): () => void {
    const ctx = canvas.getContext('2d')!
    const colors = ['#FF4500','#FF6B35','#F59E0B','#C9A84C','#FF8C00','#FFD700']
    let raf = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: count }, () => ({
      x:     Math.random() * canvas.width,
      y:     canvas.height + Math.random() * canvas.height,
      size:  2 + Math.random() * 4,
      speed: 0.4 + Math.random() * 0.8,
      sway:  (Math.random() - .5) * 0.6,
      opacity: 0.3 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.y  -= p.speed
        p.x  += Math.sin(p.phase + p.y * 0.01) * 0.4
        p.phase += 0.01
        if (p.y < -p.size * 2) {
          p.y = canvas.height + p.size
          p.x = Math.random() * canvas.width
        }
        ctx.globalAlpha = p.opacity * Math.min(1, (canvas.height - p.y) / 60)
        ctx.fillStyle   = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }

  // ── Magnetic Button ───────────────────────────────────────────
  magneticButton(el: HTMLElement, strength = 8): () => void {
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width  / 2
      const cy = r.top  + r.height / 2
      const dx = (e.clientX - cx) / (r.width  / 2)
      const dy = (e.clientY - cy) / (r.height / 2)
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`
    }
    const onLeave = () => {
      el.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1)'
      el.style.transform  = 'translate(0,0)'
      setTimeout(() => { el.style.transition = '' }, 400)
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }

  // ── Ripple on Click ───────────────────────────────────────────
  ripple(el: HTMLElement, e: MouseEvent) {
    const r    = el.getBoundingClientRect()
    const span = document.createElement('span')
    span.className = 'ripple'
    span.style.left = `${e.clientX - r.left}px`
    span.style.top  = `${e.clientY - r.top}px`
    el.classList.add('ripple-host')
    el.appendChild(span)
    setTimeout(() => span.remove(), 700)
  }

  // ── Count-Up Numbers ──────────────────────────────────────────
  countUp(el: HTMLElement, target: number, duration = 1200, prefix = '', suffix = '') {
    const start = performance.now()
    const step  = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const v = Math.round(this.easeOut(p) * target)
      el.textContent = prefix + v.toLocaleString('th-TH') + suffix
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // ── IntersectionObserver count-up trigger ─────────────────────
  observeCountUp(el: HTMLElement, target: number, prefix = '', suffix = '') {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        this.countUp(el, target, 1200, prefix, suffix)
        obs.disconnect()
      }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }

  // ── Confetti Burst ────────────────────────────────────────────
  confetti(canvas: HTMLCanvasElement) {
    const ctx  = canvas.getContext('2d')!
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const colors = ['#C9A84C','#FF4500','#F59E0B','#10B981','#38BDF8','#FF6B35','#E8C96A']
    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width  / 2,
      y: canvas.height / 2,
      vx: (Math.random() - .5) * 14,
      vy: (Math.random() - .5) * 14 - 4,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - .5) * .2,
      life: 1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        p.x  += p.vx;  p.y  += p.vy + 2
        p.vy += 0.3;   p.rot += p.rv
        p.life -= 0.018
        if (p.life <= 0) continue
        alive = true
        ctx.globalAlpha = p.life
        ctx.fillStyle   = p.color
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      if (alive) requestAnimationFrame(draw)
    }
    draw()
  }

  // ── Stagger children ─────────────────────────────────────────
  staggerIn(parent: HTMLElement, selector = '*', baseDelay = 60) {
    const children = parent.querySelectorAll<HTMLElement>(selector)
    children.forEach((el, i) => {
      el.style.opacity   = '0'
      el.style.transform = 'translateY(24px)'
      el.style.transition = `opacity .4s ease ${i * baseDelay}ms, transform .4s ease ${i * baseDelay}ms`
      requestAnimationFrame(() => {
        el.style.opacity   = '1'
        el.style.transform = 'translateY(0)'
      })
    })
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }
}
