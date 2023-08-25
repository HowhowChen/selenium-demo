if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { Builder, By, Key, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const fs = require('fs')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function seleniumInput() {
  // 設置瀏覽器選項
  let options = new chrome.Options()
  options.addArguments('--disable-extensions')
  options.addArguments('--headless')  // 不顯示瀏覽器
  options.addArguments('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36')
  options.addArguments('--window-size=1920,1080') // 設置瀏覽器大小
  options.setUserPreferences({ credential_enable_service: false }) // 禁用密碼保存提示

  // 創見Chrome Webdriver
  let driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()

    try {
      await driver.get('https://zh-tw.facebook.com/')
      await sleep(Math.random() * 3000)

      await driver.findElement(By.name('email')).sendKeys(process.env.ACCOUNT)
      await driver.findElement(By.name('pass')).sendKeys(process.env.PASSWORD, Key.RETURN)

      // await driver.wait(until.titleContains('Selenium'), 5000)
      
      console.log(await driver.getTitle())
      
      // 截圖
      const screenshot = await driver.takeScreenshot()
      fs.writeFileSync('screenshot.png', screenshot, 'base64')
    } catch (err) {
      console.log(err)
    } finally {
      await driver.quit()
    }
}

seleniumInput()
