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

// 🔥 Open link in separate window (can be controlled)
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

// load & save data
ipcMain.handle('load-data', () => {
  if (!fs.existsSync(DATA_PATH)) return []
  return JSON.parse(fs.readFileSync(DATA_PATH))
})

ipcMain.handle('save-data', (_, data) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
})

// 🔍 Detect subscribe status
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
        
        // Check if already subscribed (button text changed)
        const isSubscribed = subBtn.textContent.toLowerCase().includes('unsubscribe') || 
                            subBtn.getAttribute('aria-label')?.toLowerCase().includes('unsubscribe')
        
        return {
          subscribed: isSubscribed ? 'yes' : 'no',
          buttonText: subBtn.textContent,
          message: isSubscribed ? 'Already subscribed' : 'Not subscribed yet'
        }
      })()
    `)
    
    return result
  } catch (err) {
    return { status: 'error', message: err.message }
  }
})

// 🤖 Humanoid auto-clicker
ipcMain.handle('auto-subscribe', async () => {
  if (!ytWindow) return { status: 'error', message: 'YouTube window not open' }

  try {
    const result = await ytWindow.webContents.executeJavaScript(`
      (async () => {
        // Function for random delay (human-like)
        const randomDelay = (min, max) => Math.random() * (max - min) + min
        
        // Function for humanoid mouse movement
        const moveMouse = async (startX, startY, endX, endY, duration = 500) => {
          const steps = Math.floor(duration / 50) + Math.random() * 10
          const startTime = Date.now()
          
          for (let i = 0; i < steps; i++) {
            const progress = i / steps
            // Easing function for more natural movement
            const easeProgress = progress < 0.5 
              ? 2 * progress * progress 
              : -1 + (4 - 2 * progress) * progress
            
            const x = startX + (endX - startX) * easeProgress
            const y = startY + (endY - startY) * easeProgress
            
            // Simulate mouse move with custom event
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
        
        // Check if already subscribed
        const alreadySubscribed = subBtn.textContent.toLowerCase().includes('unsubscribe')
        if (alreadySubscribed) {
          return { success: false, message: 'Already subscribed' }
        }
        
        // Get button position
        const rect = subBtn.getBoundingClientRect()
        const btnX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 20
        const btnY = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10
        
        // Random starting position (far away)
        const startX = Math.random() * window.innerWidth
        const startY = Math.random() * window.innerHeight
        
        // Humanoid mouse movement to button
        await moveMouse(startX, startY, btnX, btnY, 800 + Math.random() * 400)
        
        // Pause before hover (humans usually hover first)
        await new Promise(r => setTimeout(r, randomDelay(200, 800)))
        
        // Hover event
        const hoverEvent = new MouseEvent('mouseover', {
          bubbles: true,
          clientX: btnX,
          clientY: btnY
        })
        subBtn.dispatchEvent(hoverEvent)
        
        await new Promise(r => setTimeout(r, randomDelay(300, 700)))
        
        // Random pause to "read" or "consider"
        if (Math.random() < 0.5) {
          await new Promise(r => setTimeout(r, randomDelay(500, 1500)))
        }
        
        // Click with natural timing
        subBtn.click()
        
        // Dispatch click event too
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: btnX,
          clientY: btnY
        })
        subBtn.dispatchEvent(clickEvent)
        
        // Wait to see response
        await new Promise(r => setTimeout(r, 2000))
        
        // Verify if successful
        const isNowSubscribed = subBtn.textContent.toLowerCase().includes('unsubscribe')
        
        return {
          success: isNowSubscribed,
          message: isNowSubscribed ? 'Successfully subscribed! ✓' : 'Subscription may have failed'
        }
      })()
    `)
    
    return result
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message }
  }
})