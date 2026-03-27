import { Component, signal, computed, inject, ChangeDetectionStrategy, HostListener } from '@angular/core'
import { Router } from '@angular/router'
import { HttpClient } from '@angular/common/http'

const FAQ_CATEGORIES = [
  {
    id: 'booking', icon: '📋', title: 'การจองโต๊ะ',
    items: [
      { id: 'book-1', q: 'วิธีจองโต๊ะทำอย่างไร?', a: 'เลือกวันที่ → เลือกรอบเวลา → เลือก Tier บุฟเฟ่ต์ → กรอกชื่อและเบอร์โทร → ยืนยันการจอง ง่ายๆ ใน 3 ขั้นตอน' },
      { id: 'book-2', q: 'สามารถจองล่วงหน้าได้กี่วัน?', a: 'จองได้ล่วงหน้าทุกวัน เลือกวันที่ต้องการในปฏิทินได้เลยครับ' },
      { id: 'book-3', q: 'แต่ละ Tier แตกต่างกันอย่างไร?', a: '🥈 Silver ฿299/คน — บุฟเฟ่ต์มาตรฐาน | 🥇 Gold ฿399/คน — เนื้อพรีเมียม | 💎 Platinum ฿599/คน — วัตถุดิบระดับสูงสุด' },
    ]
  },
  {
    id: 'payment', icon: '💳', title: 'การชำระเงิน',
    items: [
      { id: 'pay-1', q: 'ชำระเงินผ่าน QR ทำอย่างไร?', a: 'เลือก QR PromptPay ตอนจอง → สแกน QR ในแอปธนาคาร → โอนเงิน → กด "ยืนยันว่าโอนแล้ว" ระบบบันทึกอัตโนมัติ' },
      { id: 'pay-2', q: 'มัดจำคืออะไร?', a: 'ถ้าเลือก "QR มัดจำ" จ่ายเพียง ฿100/คน ตอนจอง ส่วนที่เหลือชำระหน้าร้านเมื่อรับประทานเสร็จ' },
      { id: 'pay-3', q: 'เลือกจ่ายเงินสดได้ไหม?', a: 'ได้ครับ เลือก "เงินสด" ตอนจอง แต่ยังต้องสแกน QR จ่ายมัดจำ ฿100/คน ก่อน ส่วนที่เหลือจ่ายหน้าร้าน' },
      { id: 'pay-4', q: 'QR Code หมดอายุแล้วทำอย่างไร?', a: 'กด "ขอ QR ใหม่" ในหน้าชำระเงิน หรือแจ้งพนักงานหน้าร้าน QR มีอายุ 30 นาที' },
    ]
  },
  {
    id: 'tracking', icon: '📍', title: 'การติดตามคิว',
    items: [
      { id: 'track-1', q: 'ดูสถานะคิวได้ที่ไหน?', a: 'กดปุ่ม 🔔 มุมขวาล่าง หรือกด "ติดตามคิวของฉัน" หลังจองสำเร็จ ระบบอัพเดทอัตโนมัติทุก 10 วินาที' },
      { id: 'track-2', q: 'จะรู้ได้อย่างไรว่าถึงคิวแล้ว?', a: 'ระบบส่ง Notification ผ่าน Browser เมื่อพนักงานยืนยันคิวและจัดโต๊ะ กรุณาอนุญาต Notification เมื่อระบบขอ' },
      { id: 'track-3', q: 'บันทึกใบยืนยันการจองได้ไหม?', a: 'ได้ กดปุ่ม "📷 บันทึกใบยืนยัน" ในหน้าติดตามคิว ระบบดาวน์โหลด PNG ให้อัตโนมัติ' },
    ]
  },
  {
    id: 'cancel', icon: '❌', title: 'การยกเลิก',
    items: [
      { id: 'cancel-1', q: 'ยกเลิกการจองได้ไหม?', a: 'ยกเลิกได้เฉพาะสถานะ "รอยืนยัน (WAITING)" เข้าหน้าติดตามคิว แล้วกด "ยกเลิกการจอง"' },
      { id: 'cancel-2', q: 'ยกเลิกแล้วได้เงินมัดจำคืนไหม?', a: 'กรุณาติดต่อร้านที่ 02-123-4567 เพื่อดำเนินการคืนเงิน' },
    ]
  },
]

@Component({
  selector: 'app-help-widget',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!shouldHide()) {

      <!-- FLOATING BUTTON -->
      <div style="position:fixed; bottom:24px; right:24px; z-index:9999;"
           (mouseenter)="isHovered.set(true)" (mouseleave)="isHovered.set(false)">

        <!-- Pulse ring -->
        @if (!isOpen()) {
          <div class="pulse-ring"></div>
        }

        <!-- Tooltip -->
        @if (!isOpen() && isHovered()) {
          <div class="help-tooltip">
            ต้องการความช่วยเหลือ?
          </div>
        }

        <button (click)="togglePanel()" class="help-fab"
                [attr.aria-label]="isOpen() ? 'ปิด Help' : 'เปิด Help'">
          @if (isOpen()) {
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#050608" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          } @else {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#050608">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM11 5h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          }
        </button>
      </div>

      <!-- HELP PANEL -->
      @if (isOpen()) {
        <div class="help-panel" role="dialog" aria-label="ศูนย์ช่วยเหลือ">
          <div style="display:flex; flex-direction:column; flex:1; min-height:0;">

            <!-- SCROLLABLE CONTENT AREA -->
            <div style="flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain;">

              <!-- HOME TAB -->
              @if (activeTab() === 'home') {
                <div class="tab-header-home">
                  <div style="color:#C9A84C; font-weight:700; font-size:18px;">🔥 BBQ GRILL</div>
                  <div style="color:#E8E6E3; font-weight:600; font-size:22px; margin-top:8px;">ต้องการความช่วยเหลือ?</div>
                  <div style="color:#9CA3AF; font-size:13px; margin-top:4px;">เราพร้อมช่วยเหลือคุณตลอดเวลา</div>
                </div>

                <div style="padding:16px;">
                  <!-- Status card -->
                  <div class="status-card">
                    <div class="status-dot"></div>
                    <div>
                      <div style="color:#E8E6E3; font-weight:500; font-size:14px;">ระบบทำงานปกติ</div>
                      <div style="color:#9CA3AF; font-size:12px;">อัพเดทล่าสุด: {{ currentDateTime() }}</div>
                    </div>
                  </div>

                  <!-- Quick actions -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
                    <button (click)="switchTab('messages')" class="quick-card">
                      <div style="font-size:20px;">💬</div>
                      <div style="color:#E8E6E3; font-size:13px; font-weight:500; margin-top:4px;">ส่งข้อความหาเรา</div>
                      <div style="color:#9CA3AF; font-size:11px;">ตอบกลับใน 24 ชม.</div>
                    </button>
                    <button (click)="switchTab('help')" class="quick-card">
                      <div style="font-size:20px;">🔍</div>
                      <div style="color:#E8E6E3; font-size:13px; font-weight:500; margin-top:4px;">ค้นหาคำตอบ</div>
                      <div style="color:#9CA3AF; font-size:11px;">FAQ ครอบคลุมทุกคำถาม</div>
                    </button>
                  </div>

                  <!-- FAQ shortcuts -->
                  <div style="margin-top:20px;">
                    <div style="color:#6B7280; font-size:11px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px;">คำถามยอดนิยม</div>
                    @for (item of [
                      { label: 'วิธีจองโต๊ะทำอย่างไร?', id: 'book-1' },
                      { label: 'ชำระเงินผ่าน QR ทำอย่างไร?', id: 'pay-1' },
                      { label: 'ดูสถานะคิวได้ที่ไหน?', id: 'track-1' }
                    ]; track item.id) {
                      <button (click)="goToFaq(item.id)" class="faq-shortcut">
                        <span>{{ item.label }}</span>
                        <span style="color:#C9A84C;">›</span>
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- MESSAGES TAB -->
              @if (activeTab() === 'messages') {
                <div class="tab-header-simple">ส่งข้อความ</div>

                <div style="padding:20px;">
                  @if (!messageSent()) {
                    <div style="display:flex; flex-direction:column; gap:14px;">

                      <div>
                        <label class="form-label">ชื่อ-นามสกุล</label>
                        <input type="text" class="form-input" placeholder="กรอกชื่อของคุณ"
                               [value]="formName()" (input)="formName.set($any($event.target).value)">
                        @if (formErrors()['name']) {
                          <div class="error-text">{{ formErrors()['name'] }}</div>
                        }
                      </div>

                      <div>
                        <label class="form-label">เบอร์โทรศัพท์</label>
                        <input type="tel" class="form-input" placeholder="0XX-XXX-XXXX"
                               [value]="formTel()" (input)="formTel.set($any($event.target).value)">
                        @if (formErrors()['tel']) {
                          <div class="error-text">{{ formErrors()['tel'] }}</div>
                        }
                      </div>

                      <div>
                        <label class="form-label">อีเมล (Gmail)</label>
                        <input type="email" class="form-input" placeholder="example@gmail.com"
                               [value]="formEmail()" (input)="formEmail.set($any($event.target).value)">
                        @if (formErrors()['email']) {
                          <div class="error-text">{{ formErrors()['email'] }}</div>
                        }
                      </div>

                      <div>
                        <label class="form-label">หัวข้อ</label>
                        <select class="form-input"
                                [value]="formSubject()" (change)="formSubject.set($any($event.target).value)">
                          <option value="">เลือกหัวข้อ...</option>
                          <option value="booking">ปัญหาการจองโต๊ะ</option>
                          <option value="payment">ปัญหาการชำระเงิน</option>
                          <option value="queue">ปัญหาการติดตามคิว</option>
                          <option value="cancel">ปัญหาการยกเลิก</option>
                          <option value="general">สอบถามทั่วไป</option>
                          <option value="other">อื่นๆ</option>
                        </select>
                        @if (formErrors()['subject']) {
                          <div class="error-text">{{ formErrors()['subject'] }}</div>
                        }
                      </div>

                      <div>
                        <label class="form-label">ข้อความ</label>
                        <textarea class="form-input" rows="4"
                                  placeholder="อธิบายปัญหาหรือคำถามของคุณ..."
                                  [value]="formMessage()"
                                  (input)="formMessage.set($any($event.target).value)"
                                  style="resize:none;"></textarea>
                        @if (formErrors()['message']) {
                          <div class="error-text">{{ formErrors()['message'] }}</div>
                        }
                      </div>

                      @if (formErrors()['submit']) {
                        <div class="error-text" style="text-align:center;">{{ formErrors()['submit'] }}</div>
                      }

                      <button (click)="submitMessage()" class="submit-btn" [disabled]="isSubmitting()">
                        {{ isSubmitting() ? 'กำลังส่ง...' : 'ส่งข้อความ →' }}
                      </button>
                    </div>
                  } @else {
                    <!-- Success state -->
                    <div style="text-align:center; padding:24px 0;">
                      <div class="success-icon">✓</div>
                      <div style="color:#E8E6E3; font-size:20px; font-weight:600; margin-top:16px;">ได้รับข้อความแล้ว!</div>
                      <div style="color:#9CA3AF; font-size:14px; margin-top:8px;">ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง</div>

                      <div style="border-top:1px solid rgba(201,168,76,.10); margin-top:24px; padding-top:16px;">
                        <div style="color:#9CA3AF; font-size:12px;">สำหรับเรื่องเร่งด่วน</div>
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px;
                                    background:rgba(255,255,255,.04); border:1px solid rgba(201,168,76,.15);
                                    border-radius:10px; padding:12px 16px;">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <span>📞</span>
                            <span style="color:#E8E6E3; font-weight:600;">02-123-4567</span>
                          </div>
                          <a href="tel:02-123-4567" class="outline-btn">โทรเลย</a>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- HELP TAB -->
              @if (activeTab() === 'help') {
                <!-- Search -->
                <div style="padding:16px 20px; border-bottom:1px solid rgba(201,168,76,.10);">
                  <div style="position:relative;">
                    <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#6B7280; font-size:14px;">🔍</span>
                    <input type="text" class="form-input" placeholder="ค้นหาคำถาม..."
                           style="padding-left:36px;"
                           [value]="searchQuery()"
                           (input)="searchQuery.set($any($event.target).value)">
                  </div>
                </div>

                <div style="padding:0 20px 20px;">

                  @if (filteredCategories().length === 0) {
                    <div style="text-align:center; padding:32px 0; color:#9CA3AF; font-size:14px;">
                      🔍 ไม่พบคำถามที่ตรงกัน<br>
                      <button (click)="switchTab('messages')"
                              style="color:#C9A84C; background:none; border:none; cursor:pointer; margin-top:8px; font-family:Kanit;">
                        ส่งข้อความถามเราได้เลย →
                      </button>
                    </div>
                  } @else {
                    @for (cat of filteredCategories(); track cat.id) {
                      <div style="margin-top:8px;">
                        <div style="display:flex; align-items:center; gap:8px; padding:12px 0;
                                    border-bottom:1px solid rgba(255,255,255,.05); color:#E8E6E3;
                                    font-size:14px; font-weight:500;">
                          <span>{{ cat.icon }}</span>
                          <span>{{ cat.title }}</span>
                        </div>

                        @for (item of cat.items; track item.id) {
                          <div [id]="'faq-' + item.id" style="padding-left:24px;">
                            <button (click)="toggleFaq(item.id)" class="faq-question">
                              <span class="faq-q-badge">Q</span>
                              <span style="flex:1; color:#E8E6E3; font-size:13px; text-align:left;">{{ item.q }}</span>
                              <span [style.transform]="expandedFaqId() === item.id ? 'rotate(180deg)' : 'rotate(0)'"
                                    style="color:#9CA3AF; font-size:12px; transition:transform 200ms; flex-shrink:0;">▼</span>
                            </button>

                            @if (expandedFaqId() === item.id) {
                              <div class="faq-answer">{{ item.a }}</div>
                            }
                          </div>
                        }
                      </div>
                    }
                  }

                  <!-- Contact section -->
                  <div style="border-top:1px solid rgba(201,168,76,.10); margin-top:16px; padding-top:16px;">
                    <div style="color:#6B7280; font-size:11px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; margin-bottom:12px;">ติดต่อร้านโดยตรง</div>

                    @for (contact of [
                      { icon: '📞', label: '02-123-4567', href: 'tel:02-123-4567', btn: 'โทร' },
                      { icon: '💬', label: '\u0040bbqgrill', href: 'https://line.me/ti/p/\u0040bbqgrill', btn: 'LINE' }
                    ]; track contact.label) {
                      <div style="display:flex; align-items:center; gap:12px; padding:10px 0;
                                  border-bottom:1px solid rgba(255,255,255,.05);">
                        <span>{{ contact.icon }}</span>
                        <span style="flex:1; color:#E8E6E3; font-size:14px;">{{ contact.label }}</span>
                        <a [href]="contact.href" target="_blank" class="outline-btn">{{ contact.btn }}</a>
                      </div>
                    }

                    <div style="padding:10px 0; color:#9CA3AF; font-size:12px;">
                      🕐 จ.-ศ. 17:00-23:00 &nbsp;|&nbsp; ส.-อา. 11:00-23:00
                    </div>
                  </div>

                </div>
              }

            </div><!-- end scrollable -->

            <!-- BOTTOM TAB BAR -->
            <div class="tab-bar">
              <button (click)="switchTab('home')" class="tab-btn"
                      [class.tab-active]="activeTab() === 'home'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Home</span>
              </button>
              <button (click)="switchTab('messages')" class="tab-btn"
                      [class.tab-active]="activeTab() === 'messages'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                </svg>
                <span>Messages</span>
              </button>
              <button (click)="switchTab('help')" class="tab-btn"
                      [class.tab-active]="activeTab() === 'help'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                </svg>
                <span>Help</span>
              </button>
            </div>

          </div><!-- end flex col -->
        </div><!-- end panel -->
      }

    }
  `,
  styles: [`
    /* Floating button */
    .help-fab {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4B962, #C9A84C, #B89A3F);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(201,168,76,.40);
      position: relative; z-index: 1;
      transition: transform 200ms, box-shadow 200ms;
    }
    .help-fab:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 40px rgba(201,168,76,.55);
    }

    /* Pulse ring */
    .pulse-ring {
      position: absolute; width: 56px; height: 56px;
      border-radius: 50%;
      background: rgba(201,168,76,.35);
      animation: pulse-ring 2s ease-out infinite;
      pointer-events: none;
    }
    @keyframes pulse-ring {
      0%   { transform: scale(1);   opacity: .6; }
      100% { transform: scale(1.7); opacity: 0;  }
    }

    /* Tooltip */
    .help-tooltip {
      position: absolute; right: 68px; top: 50%; transform: translateY(-50%);
      background: rgba(5,6,8,.92); border: 1px solid rgba(201,168,76,.25);
      color: #C9A84C; font-size: 12px; font-family: Kanit;
      padding: 6px 12px; border-radius: 8px; white-space: nowrap;
      pointer-events: none;
      animation: tooltip-in 200ms ease;
    }
    @keyframes tooltip-in {
      from { opacity:0; transform: translateY(-50%) translateX(4px); }
      to   { opacity:1; transform: translateY(-50%) translateX(0); }
    }
    .help-tooltip::after {
      content: ''; position: absolute; right: -6px; top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-right: none;
      border-left-color: rgba(201,168,76,.25);
    }

    /* Help panel */
    .help-panel {
      position: fixed;
      bottom: 88px; right: 24px;
      width: 380px; max-height: 580px;
      background: rgba(5,6,8,.96);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(201,168,76,.20);
      border-radius: 20px;
      box-shadow: 0 24px 80px rgba(0,0,0,.60), 0 0 0 1px rgba(201,168,76,.08);
      overflow: hidden;
      z-index: 9998;
      display: flex; flex-direction: column;
      animation: panel-in 300ms cubic-bezier(.16,1,.3,1);
      font-family: Kanit;
    }
    @keyframes panel-in {
      from { opacity:0; transform: translateY(20px) scale(.97); }
      to   { opacity:1; transform: translateY(0)    scale(1);   }
    }

    /* Tab header styles */
    .tab-header-home {
      background: linear-gradient(160deg, rgba(201,168,76,.18) 0%, rgba(5,6,8,0) 100%);
      border-bottom: 1px solid rgba(201,168,76,.12);
      padding: 24px 20px 20px;
    }
    .tab-header-simple {
      padding: 20px;
      border-bottom: 1px solid rgba(201,168,76,.10);
      color: #E8E6E3; font-size: 18px; font-weight: 600;
      font-family: Kanit;
    }

    /* Status card */
    .status-card {
      display: flex; align-items: center; gap: 12px;
      background: rgba(16,185,129,.08);
      border: 1px solid rgba(16,185,129,.20);
      border-radius: 12px; padding: 12px 16px;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #10B981; flex-shrink: 0;
      animation: status-pulse 2s ease-in-out infinite;
    }
    @keyframes status-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.4); }
      50%      { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
    }

    /* Quick action cards */
    .quick-card {
      background: rgba(255,255,255,.035);
      border: 1px solid rgba(201,168,76,.12);
      border-radius: 12px; padding: 14px;
      cursor: pointer; text-align: left;
      display: flex; flex-direction: column;
      transition: border-color 200ms, background 200ms;
      font-family: Kanit;
    }
    .quick-card:hover {
      border-color: rgba(201,168,76,.35);
      background: rgba(201,168,76,.06);
    }

    /* FAQ shortcuts */
    .faq-shortcut {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; padding: 10px 0;
      border: none; border-bottom: 1px solid rgba(255,255,255,.05);
      background: none; cursor: pointer;
      color: #E8E6E3; font-size: 13px; font-family: Kanit;
      transition: color 200ms;
    }
    .faq-shortcut:hover { color: #C9A84C; }

    /* Form inputs */
    .form-label {
      display: block; color: #9CA3AF;
      font-size: 12px; font-weight: 500; font-family: Kanit;
      margin-bottom: 6px;
    }
    .form-input {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(201,168,76,.15);
      border-radius: 10px; padding: 10px 14px;
      color: #E8E6E3; font-family: Kanit; font-size: 14px;
      outline: none; transition: border-color 200ms, box-shadow 200ms;
    }
    .form-input:focus {
      border-color: #C9A84C;
      box-shadow: 0 0 0 3px rgba(201,168,76,.12);
    }
    .form-input::placeholder { color: #6B7280; }
    select.form-input option { background: #0d0e10; color: #E8E6E3; }
    .error-text { color: #EF4444; font-size: 12px; margin-top: 4px; font-family: Kanit; }

    /* Submit button */
    .submit-btn {
      width: 100%; padding: 12px;
      background: linear-gradient(135deg, #D4B962, #C9A84C);
      border: none; border-radius: 10px;
      color: #050608; font-family: Kanit; font-weight: 600; font-size: 15px;
      cursor: pointer; transition: opacity 200ms, transform 100ms;
      margin-top: 4px;
    }
    .submit-btn:hover:not(:disabled) { opacity: .9; }
    .submit-btn:active:not(:disabled) { transform: scale(.98); }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Success icon */
    .success-icon {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #34D399, #10B981);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 32px; font-weight: 700;
      margin: 0 auto;
      animation: success-in 400ms cubic-bezier(.16,1,.3,1);
    }
    @keyframes success-in {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    /* Outline button */
    .outline-btn {
      padding: 4px 12px; border-radius: 6px;
      border: 1px solid rgba(201,168,76,.40);
      color: #C9A84C; font-size: 12px; font-family: Kanit;
      text-decoration: none; cursor: pointer; background: none;
      transition: background 150ms;
      white-space: nowrap;
    }
    .outline-btn:hover { background: rgba(201,168,76,.10); }

    /* FAQ */
    .faq-question {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 10px 0;
      border: none; border-bottom: 1px solid rgba(255,255,255,.03);
      background: none; cursor: pointer; font-family: Kanit;
    }
    .faq-q-badge {
      min-width: 18px; height: 18px;
      background: rgba(201,168,76,.12); color: #C9A84C;
      border-radius: 4px; font-size: 11px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      font-family: Kanit;
    }
    .faq-answer {
      padding: 0 0 12px 28px;
      margin-left: 8px;
      border-left: 2px solid rgba(201,168,76,.30);
      color: #9CA3AF; font-size: 13px; line-height: 1.6;
      font-family: Kanit;
      animation: fade-in 200ms ease;
    }
    @keyframes fade-in {
      from { opacity:0; transform: translateY(-4px); }
      to   { opacity:1; transform: translateY(0); }
    }

    /* Tab bar */
    .tab-bar {
      display: flex; border-top: 1px solid rgba(201,168,76,.10);
      background: rgba(5,6,8,.98); border-radius: 0 0 20px 20px;
      flex-shrink: 0;
    }
    .tab-btn {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 4px; padding: 12px 0;
      background: none; border: none; cursor: pointer;
      color: #6B7280; font-size: 11px; font-family: Kanit;
      transition: color 200ms; position: relative;
    }
    .tab-btn:hover { color: #9CA3AF; }
    .tab-active { color: #C9A84C !important; }
    .tab-active::before {
      content: ''; position: absolute; top: 0; left: 20%; right: 20%;
      height: 2px; background: #C9A84C; border-radius: 0 0 2px 2px;
    }

    /* Mobile responsive */
    @media (max-width: 420px) {
      .help-panel { width: calc(100vw - 32px); right: 16px; }
    }
  `]
})
export class HelpWidgetComponent {
  private router = inject(Router)
  private http = inject(HttpClient)

  isOpen        = signal(false)
  isHovered     = signal(false)
  activeTab     = signal<'home' | 'messages' | 'help'>('home')
  expandedFaqId = signal<string | null>(null)
  searchQuery   = signal('')
  messageSent   = signal(false)
  isSubmitting  = signal(false)
  formErrors    = signal<Record<string, string>>({})

  formName    = signal('')
  formTel     = signal('')
  formEmail   = signal('')
  formSubject = signal('')
  formMessage = signal('')

  shouldHide = computed(() => {
    const url = this.router.url
    return ['/staff', '/admin', '/login'].some(r => url.startsWith(r))
  })

  filteredCategories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim()
    if (!q) return FAQ_CATEGORIES
    return FAQ_CATEGORIES
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
        )
      }))
      .filter(cat => cat.items.length > 0)
  })

  currentDateTime = computed(() =>
    new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'short',
      timeStyle: 'short'
    })
  )

  togglePanel() {
    this.isOpen.update(v => !v)
    if (this.isOpen()) this.activeTab.set('home')
  }

  switchTab(tab: 'home' | 'messages' | 'help') {
    this.activeTab.set(tab)
  }

  goToFaq(faqId: string) {
    this.activeTab.set('help')
    this.expandedFaqId.set(faqId)
    setTimeout(() => {
      document.getElementById('faq-' + faqId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  toggleFaq(id: string) {
    this.expandedFaqId.update(cur => cur === id ? null : id)
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (this.formName().trim().length < 2) errors['name'] = 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'
    if (!/^[0-9]{9,10}$/.test(this.formTel().replace(/\D/g, ''))) errors['tel'] = 'เบอร์โทรไม่ถูกต้อง'
    const email = this.formEmail().trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors['email'] = 'รูปแบบอีเมลไม่ถูกต้อง'
    if (!this.formSubject()) errors['subject'] = 'กรุณาเลือกหัวข้อ'
    if (this.formMessage().trim().length < 10) errors['message'] = 'ข้อความต้องมีอย่างน้อย 10 ตัวอักษร'
    this.formErrors.set(errors)
    return Object.keys(errors).length === 0
  }

  submitMessage() {
    if (!this.validateForm()) return
    this.isSubmitting.set(true)
    this.http.post('/api/contact-messages', {
      name:    this.formName().trim(),
      tel:     this.formTel().trim(),
      email:   this.formEmail().trim(),
      subject: this.formSubject(),
      message: this.formMessage().trim(),
    }).subscribe({
      next: () => {
        this.messageSent.set(true)
        this.isSubmitting.set(false)
      },
      error: () => {
        this.formErrors.set({ submit: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' })
        this.isSubmitting.set(false)
      }
    })
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.isOpen.set(false) }
}
