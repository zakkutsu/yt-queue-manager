let queue = []
let index = 0
let timer = null
let autoSubscribeEnabled = false
let subscribeStatus = {}

async function init() {
  queue = await window.api.loadData()
  render()
}

function addLinks() {
  const raw = document.getElementById('input').value

  const links = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !queue.includes(l))

  queue.push(...links)

  window.api.saveData(queue)

  render()
}

function render() {
  const list = document.getElementById('list')
  list.innerHTML = ''

  queue.forEach((link, i) => {
    const li = document.createElement('li')
    const status = subscribeStatus[link] ? ` [${subscribeStatus[link]}]` : ''
    li.textContent = (i === index ? '👉 ' : '') + link + status
    list.appendChild(li)
  })
}

async function checkSubscribe() {
  const status = document.getElementById('subscribe-status')
  if (!status) return

  status.style.display = 'block'
  status.textContent = '⏳ Checking...'
  status.style.color = 'orange'

  try {
    const result = await window.api.checkSubscribe()
    
    if (result.status === 'error') {
      status.textContent = '❌ ' + result.message
      status.style.color = 'red'
    } else {
      const isSubscribed = result.subscribed === 'yes'
      status.textContent = isSubscribed ? '✅ Sudah Subscribe' : '🔴 Belum Subscribe'
      status.style.color = isSubscribed ? 'green' : 'red'
      
      // Save status
      if (index < queue.length) {
        subscribeStatus[queue[index]] = isSubscribed ? 'subscribed' : 'not-subscribed'
      }
      render()
    }
  } catch (err) {
    status.textContent = '❌ Error: ' + err.message
    status.style.color = 'red'
  }
}

async function autoSubscribe() {
  const status = document.getElementById('subscribe-status')
  if (!status) return

  status.style.display = 'block'
  status.textContent = '🤖 Auto-subscribing... (humanoid mode)'
  status.style.color = 'blue'

  try {
    const result = await window.api.autoSubscribe()
    
    if (result.success) {
      status.textContent = '✅ ' + result.message
      status.style.color = 'green'
      
      if (index < queue.length) {
        subscribeStatus[queue[index]] = 'subscribed'
      }
    } else {
      status.textContent = '⚠️ ' + result.message
      status.style.color = 'orange'
    }
    
    render()
  } catch (err) {
    status.textContent = '❌ Error: ' + err.message
    status.style.color = 'red'
  }
}

function openNext() {
  if (index >= queue.length) return

  const link = queue[index]

  window.api.openLink(link)

  index++
  render()
  
  // Auto-check subscribe status setelah buka link
  setTimeout(() => {
    checkSubscribe()
  }, 3000)
}

function startQueue() {
  if (timer) clearTimeout(timer)

  runQueue()
}

function runQueue() {
  if (index >= queue.length) return

  openNext()

  const delay = randomDelay()

  timer = setTimeout(runQueue, delay)
}

function clearQueue() {
  queue = []
  index = 0

  window.api.saveData(queue)

  render()
}

function stopQueue() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function restartQueue() {
  // reset dari awal
  index = 0

  // stop dulu kalau lagi jalan
  if (timer) {
    clearTimeout(timer)
    timer = null
  }

  // mulai lagi dari awal
  startQueue()
}

function resetIndex() {
  index = 0
  render()
}

function randomDelay() {
  return Math.floor(Math.random() * (7000 - 4000)) + 4000
}

init()