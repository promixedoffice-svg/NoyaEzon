import { chromium, devices } from 'playwright'
import { sealData } from 'iron-session'
import fs from 'fs'
import path from 'path'

// Load env vars from .env.local (SESSION_SECRET needed to forge an admin session cookie)
const envContent = fs.readFileSync('.env.local', 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const BASE_URL = 'http://localhost:3002'
const OUT_DIR = path.resolve('demo-video')
fs.mkdirSync(OUT_DIR, { recursive: true })
for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f))

const device = devices['iPhone 13']

const browser = await chromium.launch()
const context = await browser.newContext({
  ...device,
  recordVideo: { dir: OUT_DIR, size: { width: 390, height: 844 } },
})

// Visible cursor + click-ripple overlay (injected on every page so clicks are visible on screen)
await context.addInitScript(() => {
  const style = document.createElement('style')
  style.textContent = `
    #__demo-cursor { position: fixed; width: 26px; height: 26px; border-radius: 50%;
      background: rgba(217,70,160,0.30); border: 2px solid rgba(217,70,160,0.95);
      pointer-events: none; z-index: 2147483647; transform: translate(-50%,-50%);
      transition: background-color .12s, transform .12s; left: -100px; top: -100px; }
    #__demo-cursor.down { background: rgba(217,70,160,0.65); transform: translate(-50%,-50%) scale(0.85); }
    .__demo-ripple { position: fixed; width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid rgba(217,70,160,0.85); pointer-events: none; z-index: 2147483646;
      transform: translate(-50%,-50%) scale(0.5); opacity: 0.9;
      animation: __demo-ripple-anim .65s ease-out forwards; }
    @keyframes __demo-ripple-anim {
      from { transform: translate(-50%,-50%) scale(0.5); opacity: 0.9; }
      to   { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
    }
  `
  document.documentElement.appendChild(style)
  const cursor = document.createElement('div')
  cursor.id = '__demo-cursor'
  document.documentElement.appendChild(cursor)
  window.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px'
    cursor.style.top = e.clientY + 'px'
  }, true)
  window.addEventListener('mousedown', e => {
    cursor.classList.add('down')
    const ripple = document.createElement('div')
    ripple.className = '__demo-ripple'
    ripple.style.left = e.clientX + 'px'
    ripple.style.top = e.clientY + 'px'
    document.documentElement.appendChild(ripple)
    setTimeout(() => ripple.remove(), 700)
  }, true)
  window.addEventListener('mouseup', () => cursor.classList.remove('down'), true)
})

// Forge an admin session cookie (same shape as src/lib/auth.ts)
const sealed = await sealData({ isLoggedIn: true }, { password: process.env.SESSION_SECRET, ttl: 0 })
await context.addCookies([
  { name: 'noya_session', value: sealed, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
])

const page = await context.newPage()

// ── Helpers ──────────────────────────────────────────────

async function moveTo(x, y) {
  await page.mouse.move(x, y, { steps: 28 })
}

// Click an element while showing the cursor moving to it and a ripple at the click point.
async function clickAt(locatorOrEl, { wait = 2000, index = 0 } = {}) {
  const el = typeof locatorOrEl === 'string' ? page.locator(locatorOrEl).nth(index) : locatorOrEl
  await el.waitFor({ state: 'visible', timeout: 4000 })
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const box = await el.boundingBox()
  if (!box) throw new Error('no bounding box')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await moveTo(x, y)
  await page.waitForTimeout(450)
  await page.mouse.down()
  await page.waitForTimeout(150)
  await page.mouse.up()
  await page.waitForTimeout(wait)
  return el
}

async function safeClick(locator, opts) {
  try {
    return await clickAt(locator, opts)
  } catch (e) {
    console.log('skip click (' + locator + '): ' + e.message)
    return null
  }
}

// Move the cursor to a field, click it, then type into it (visible "typing").
async function fillAt(locator, text, { wait = 700 } = {}) {
  const el = page.locator(locator).first()
  await el.waitFor({ state: 'visible', timeout: 4000 })
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const box = await el.boundingBox()
  if (box) {
    await moveTo(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(300)
    await page.mouse.down()
    await page.waitForTimeout(100)
    await page.mouse.up()
  }
  const type = await el.getAttribute('type')
  if (type === 'date') {
    await el.fill(text)
  } else {
    await el.fill('')
    await el.pressSequentially(text, { delay: 65 })
  }
  await page.waitForTimeout(wait)
}

async function safeFill(locator, text, opts) {
  try {
    await fillAt(locator, text, opts)
  } catch (e) {
    console.log('skip fill (' + locator + '): ' + e.message)
  }
}

async function scrollSlow(steps = 2, dy = 300, delay = 1300) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy)
    await page.waitForTimeout(delay)
  }
  await page.waitForTimeout(400)
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, -dy)
    await page.waitForTimeout(delay * 0.7)
  }
}

async function visit(url, { wait = 2500 } = {}) {
  console.log('-> ' + url)
  await page.goto(BASE_URL + url, { waitUntil: 'load' })
  await page.waitForTimeout(wait)
}

// ── 1. Client booking portal - full flow start to finish ───
await visit('/book', { wait: 2800 })
await scrollSlow(1, 220, 1000)

// Choose a treatment (one with a rich description + add-ons)
await safeClick('button:has-text("פרנץ")', { wait: 2400 })

// Pick a date - retry the next enabled day until one has available time slots
let timeReady = false
for (let attempt = 0; attempt < 5 && !timeReady; attempt++) {
  const enabledDates = page.locator('.grid-cols-7 button:not([disabled])')
  const count = await enabledDates.count()
  if (count === 0) break
  const idx = Math.min(attempt, count - 1)
  await clickAt(enabledDates.nth(idx), { wait: 2200 })
  await page.waitForTimeout(1000)
  const noSlots = await page.locator('text=אין שעות פנויות ביום זה').count()
  if (noSlots > 0) {
    await safeClick('text=בחרי תאריך אחר', { wait: 1500 })
    continue
  }
  timeReady = true
}

// Pick a time slot
await safeClick('.grid-cols-4 button', { wait: 2400 })

// Fill in the order details, like a real client would
await scrollSlow(1, 150, 900)
await safeClick('label:has-text("פויל") input[type="checkbox"]', { wait: 1600 })
await safeClick('label:has-text("חיילת") input[type="checkbox"]', { wait: 1600 })
await scrollSlow(1, 200, 1000)

await safeFill('input[type="tel"]', '0528344075', { wait: 1800 })
await page.waitForTimeout(1300) // allow the returning-client lookup to resolve

const nameInput = page.locator('input[placeholder="שם פרטי + שם משפחה"]').first()
const nameVal = await nameInput.inputValue().catch(() => '')
if (!nameVal) {
  await safeFill('input[placeholder="שם פרטי + שם משפחה"]', 'נועה כהן', { wait: 1300 })
}
await safeFill('input[type="email"]', 'demo@promixed.co.il', { wait: 1300 })
await safeFill('textarea[placeholder*="בקשות מיוחדות"]', 'מחכה לטיפול, תודה! 🌸', { wait: 1300 })

if (await page.locator('input[type="date"]').count() > 0) {
  await safeFill('input[type="date"]', '1995-05-20', { wait: 1300 })
}

await scrollSlow(1, 280, 1100)
await safeClick('input[type="checkbox"][required]', { wait: 1600 })
await safeClick('button:has-text("שליחת בקשת תור")', { wait: 3200 })
await scrollSlow(1, 200, 1300)

// ── 2. Admin dashboard ──────────────────────────────────────
await visit('/admin', { wait: 2800 })
await scrollSlow(2, 300, 1400)

// ── 3. Calendar - open an appointment ───────────────────────
await visit('/admin/calendar', { wait: 2800 })
await safeClick('.cursor-pointer', { wait: 2600 })
await scrollSlow(1, 200, 1100)

// ── 4. Clients list + a client profile ──────────────────────
await visit('/admin/clients', { wait: 2800 })
await scrollSlow(2, 300, 1400)
await safeClick('a[href^="/admin/clients/"]:not([href="/admin/clients/new"]):not([href="/admin/clients/deleted"])', { wait: 2600 })
await scrollSlow(2, 300, 1400)

// ── 5. Tasks ─────────────────────────────────────────────────
await visit('/admin/tasks', { wait: 2800 })
await scrollSlow(2, 260, 1300)

// ── 6. Treatments - "adding a new treatment" ─────────────────
await visit('/admin/treatments', { wait: 2600 })
await scrollSlow(1, 200, 1100)
await safeClick('button:has-text("טיפול חדש")', { wait: 2200 })
await safeFill('input[placeholder="לק ג׳ל..."]', 'מניקור ספא יוקרתי VIP', { wait: 1300 })
await safeFill('input[type="number"]', '180', { wait: 1100 })
await safeFill('textarea', 'טיפול מניקור פרימיום עם עיסוי ידיים, חמאות טיפוח ולק ג\'ל איכותי - חוויה מפנקת של כ-75 דקות.', { wait: 1600 })
await safeClick('button[style*="background-color"]', { wait: 1600, index: 4 })
await scrollSlow(1, 250, 1300)

// ── 7. Settings (the practitioner's settings screen) ─────────
await visit('/admin/settings', { wait: 2800 })
await scrollSlow(4, 350, 1500)

// ── 8. Receipts - full list + issuing a receipt ───────────────
await visit('/admin/receipts', { wait: 2800 })
await scrollSlow(2, 300, 1400)
await safeClick('button:has-text("הפקת קבלה")', { wait: 2200 })
await safeClick('a[href*="new=1"]', { wait: 2600 })
await scrollSlow(1, 250, 1300)

// ── 9. Reports ─────────────────────────────────────────────────
await visit('/admin/reports', { wait: 2800 })
await scrollSlow(3, 350, 1500)

// ── 10. Broadcast (תפוצה) ────────────────────────────────────
await visit('/admin/broadcast', { wait: 2800 })
await scrollSlow(1, 250, 1200)
await safeClick('text=נועה כהן', { wait: 2000 })
await scrollSlow(1, 250, 1300)

await context.close()
await browser.close()

const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'))
console.log('DONE. Video saved: ' + path.join(OUT_DIR, files[files.length - 1]))
