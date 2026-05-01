const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let ytWindow

const DATA_PATH = path.join(__dirname, 'data.json')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

// 🔥 buka link di window sendiri (bisa dikontrol)
ipcMain.handle('open-link', (_, url) => {
  if (!ytWindow) {
    ytWindow = new BrowserWindow({
      width: 1200,
      height: 800
    })

    ytWindow.on('closed', () => {
      ytWindow = null
    })
  }

  ytWindow.loadURL(url)
})

// load & save tetap sama
ipcMain.handle('load-data', () => {
  if (!fs.existsSync(DATA_PATH)) return []
  return JSON.parse(fs.readFileSync(DATA_PATH))
})

ipcMain.handle('save-data', (_, data) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
})

// 🔍 deteksi subscribe status
ipcMain.handle('check-subscribe', async () => {
  if (!ytWindow) return { status: 'error', message: 'YouTube window not open' }

  try {
    const result = await ytWindow.webContents.executeJavaScript(`
      (async () => {
        // Tunggu page load
        await new Promise(r => setTimeout(r, 2000))
        
        // Cari subscribe button
        let subBtn = document.querySelector('[aria-label*="Subscribe"], [aria-label*="subscribe"]')
        
        if (!subBtn) {
          subBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.toLowerCase().includes('subscribe')
          )
        }
        
        if (!subBtn) {
          return { subscribed: 'unknown', message: 'Button not found' }
        }
        
        // Cek apakah sudah subscribe (button text berubah)
        const isSubscribed = subBtn.textContent.toLowerCase().includes('unsubscribe') || 
                            subBtn.getAttribute('aria-label')?.toLowerCase().includes('unsubscribe')
        
        return {
          subscribed: isSubscribed ? 'yes' : 'no',
          buttonText: subBtn.textContent,
          message: isSubscribed ? 'Sudah subscribe' : 'Belum subscribe'
        }
      })()
    `)
    
    return result
  } catch (err) {
    return { status: 'error', message: err.message }
  }
})

// 🤖 auto-clicker humanoid
ipcMain.handle('auto-subscribe', async () => {
  if (!ytWindow) return { status: 'error', message: 'YouTube window not open' }

  try {
    const result = await ytWindow.webContents.executeJavaScript(`
      (async () => {
        // Fungsi untuk random delay (manusia-like)
        const randomDelay = (min, max) => Math.random() * (max - min) + min
        
        // Fungsi untuk humanoid mouse movement
        const moveMouse = async (startX, startY, endX, endY, duration = 500) => {
          const steps = Math.floor(duration / 50) + Math.random() * 10
          const startTime = Date.now()
          
          for (let i = 0; i < steps; i++) {
            const progress = i / steps
            // Easing function untuk movement lebih natural
            const easeProgress = progress < 0.5 
              ? 2 * progress * progress 
              : -1 + (4 - 2 * progress) * progress
            
            const x = startX + (endX - startX) * easeProgress
            const y = startY + (endY - startY) * easeProgress
            
            // Simulasi mouse move dengan custom event
            const event = new MouseEvent('mousemove', {
              bubbles: true,
              clientX: x,
              clientY: y,
              screenX: x,
              screenY: y
            })
            document.elementFromPoint(x, y)?.dispatchEvent(event)
            
            await new Promise(r => setTimeout(r, 30 + Math.random() * 40))
          }
        }
        
        // Tunggu page load
        await new Promise(r => setTimeout(r, 2000))
        
        // Cari subscribe button
        let subBtn = document.querySelector('[aria-label*="Subscribe"], [aria-label*="subscribe"]')
        
        if (!subBtn) {
          subBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.toLowerCase().includes('subscribe')
          )
        }
        
        if (!subBtn) {
          return { success: false, message: 'Subscribe button not found' }
        }
        
        // Cek apakah sudah subscribe
        const alreadySubscribed = subBtn.textContent.toLowerCase().includes('unsubscribe')
        if (alreadySubscribed) {
          return { success: false, message: 'Sudah subscribe' }
        }
        
        // Get button position
        const rect = subBtn.getBoundingClientRect()
        const btnX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 20 // jitter
        const btnY = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10
        
        // Random starting position (jarak jauh)
        const startX = Math.random() * window.innerWidth
        const startY = Math.random() * window.innerHeight
        
        // Humanoid mouse movement ke button
        await moveMouse(startX, startY, btnX, btnY, 800 + Math.random() * 400)
        
        // Pause sebelum hover (manusia biasanya akan hover dulu)
        await new Promise(r => setTimeout(r, randomDelay(200, 800)))
        
        // Hover event
        const hoverEvent = new MouseEvent('mouseover', {
          bubbles: true,
          clientX: btnX,
          clientY: btnY
        })
        subBtn.dispatchEvent(hoverEvent)
        
        await new Promise(r => setTimeout(r, randomDelay(300, 700)))
        
        // Random pause untuk "membaca" atau "mempertimbangkan"
        if (Math.random() < 0.5) {
          await new Promise(r => setTimeout(r, randomDelay(500, 1500)))
        }
        
        // Click dengan timing yang natural
        subBtn.click()
        
        // Dispatch click event juga
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: btnX,
          clientY: btnY
        })
        subBtn.dispatchEvent(clickEvent)
        
        // Wait untuk see response
        await new Promise(r => setTimeout(r, 2000))
        
        // Verifikasi apakah berhasil
        const isNowSubscribed = subBtn.textContent.toLowerCase().includes('unsubscribe')
        
        return {
          success: isNowSubscribed,
          message: isNowSubscribed ? 'Berhasil subscribe! ✓' : 'Mungkin gagal subscribe'
        }
      })()
    `)
    
    return result
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message }
  }
})