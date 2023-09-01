const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const fs = require("fs");
const { dir } = require("console");

(async () => {
  const raw_translate = fs.readFileSync(
    "./node_modules/axe-core/locales/pt_BR.json"
  );
  const translate = JSON.parse(raw_translate);


  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setBypassCSP(true);
  await page.goto("http://127.0.0.1:5500/index.html");

  const config = {
    locale: translate,
  };
  try {
    const results = await new AxePuppeteer(page)
      .configure(config)
      .include(".wp_innerpage_header").analyze();
    if (fs.existsSync("./results") === false)
      fs.mkdirSync("./results");
    console.log(results);
    fs.writeFileSync("./results/".concat("result.json"), JSON.stringify(results));
  } catch (err) {
    console.log(err);
  }

  await browser.close();
})();