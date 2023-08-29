if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { Builder, By, Key, until, Capabilities, Capability  } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const firefox = require('selenium-webdriver/firefox')
const fs = require('fs')

// 休息
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function seleniumInput(url) {
  let browser = 'chrome' // 選擇使用瀏覽器
  
  // 設置瀏覽器選項
  let browserOptions
  switch (browser) {
    case 'chrome':
      browserOptions = new chrome.Options()
      browserOptions.addArguments('--disable-extensions')
      browserOptions.addArguments('--headless')  // 不顯示瀏覽器
      browserOptions.addArguments('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36')
      browserOptions.addArguments('--window-size=1920,1080') // 設置瀏覽器大小
      browserOptions.setUserPreferences({ credential_enable_service: false }) // 禁用密碼保存提示
      break
    case 'firefox':
      browserOptions = new firefox.Options()
      browserOptions.addArguments('--disable-extensions')
      browserOptions.headless()    // 不顯示瀏覽器
      browserOptions.addArguments('--user-agent=Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/116.0')
      browserOptions.addArguments('--window-size=1920,1080') // 設置瀏覽器大小
      browserOptions.setPreference("signon.rememberSignons", false) // 禁用密碼保存提示
      break
    default:
      break
  }

  // 忽略TLS認證
  const capabilities = Capabilities.chrome();
  capabilities.set(Capability.ACCEPT_INSECURE_TLS_CERTS, true)

  // 建立Webdriver
  let driver
  switch (browser) {
    case 'chrome':
      driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(browserOptions)
        .withCapabilities(capabilities)
        .build()
      break
    case 'firefox':
      driver = new Builder()
        .forBrowser('firefox')
        .setChromeOptions(browserOptions)
        .withCapabilities(capabilities)
        .build()
      break
    default:
      break
  }

  try {
    await driver.get(url)
    await sleep(Math.random() * 3000)

    await driver.findElement(By.name('username')).sendKeys(process.env.ACCOUNT)
    await driver.findElement(By.name('passwd')).sendKeys(process.env.PASSWORD, Key.RETURN)

    // 錯誤彈窗
    await driver.wait(until.alertIsPresent(), 5000) // 等待彈窗出現
    const alert = await driver.switchTo().alert() // 切換到彈窗
    const alertText = await alert.getText() // 獲取彈窗文本並輸出
    await fs.promises.appendFile(`./files/results/result.txt`, `${url}: ${alertText}\n`)
    await alert.accept() // 關閉緊告視窗
  } catch (err) {
    // 沒找到錯誤彈窗 (1非該服務頁面 2成功登入)
    if (err.name === 'NoSuchElementError') {
      const title = await driver.getTitle()
      await fs.promises.appendFile(`./files/results/result.txt`, `${url}: ${title}\n`)
    }
  } 
  finally {
    const screenshot = await driver.takeScreenshot()
    fs.writeFileSync(`./files/results/images/${url.split('//')[1]}.png`, screenshot, 'base64')
    await driver.quit()
    return url
  }
}

// seleniumInput()

// 從Json file獲取目標url(來源Censys)
function getTargetUrls() {
  const datas = require('./files/urls/urls.json')
  const targets = []
  datas.data.forEach(data => {
    data.services.forEach(service => {
      if (service.service_name === 'HTTP') {
        const url = `https://${data.ip}:${service.port}`
        targets.push(url)
      }
    })
  })

  return targets
}

// 將數據拆分成每組10個url
function chunkArray(array, chunkSize) {
  const result = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

// 非同步啟動selenium並等待時間
async function sendRequests(urls) {
  for (const chunk of chunkArray(urls, 10)) { // 一次開10個
    try {
      const requests = chunk.map(url => seleniumInput(url))
      const results = await Promise.allSettled(requests)
      
      console.log('Batch completed:', results)
      await sleep(3000)
    } catch (err) {
      console.log(err)
    }
  }
}

sendRequests(getTargetUrls())
  .then(() => {
    console.log('All requests completed.')
  })
  .catch(error => {
    console.error('Error:', error.message)
  })
