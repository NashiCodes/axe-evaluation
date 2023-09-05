const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const fs = require("fs");

(async () => {
  const raw_translate = fs.readFileSync(
    "./node_modules/axe-core/locales/pt_BR.json"
  );
  const translate = JSON.parse(raw_translate);

  //The URL of the page to be evaluated
  let url = "";

  let browser;
  let page;
  try {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(url);

    const config = {
      locale: translate,
    };

    const results = await new AxePuppeteer(page).configure(config).analyze();

    const dir = "/results/".concat(urlToFoldes(results.url));

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    console.log(results);

    fs.writeFileSync(url.concat("result.json"), JSON.stringify(results));
  } catch (err) {
    console.log(err);
  }
  await page.close();
  await browser.close();
})();

function urlToFoldes(url) {
  url = url.replace(/(^\w+:|^)\/\//, "");
  url = url.replace(/\./g, "_");
  url = url.split("/");
  if (url[url.length - 1] === "") url.pop();
  url = url.join("/");
  return url;
}
