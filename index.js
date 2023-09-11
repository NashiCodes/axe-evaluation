const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const fs = require("fs");

(async () => {
	const urlsResponse = await fetch("https://wpteste2.ufjf.br/wp-json/acessibilidade/v1/pages_posts");
	const sitesUrls = await urlsResponse.json();
	for ( const site of sitesUrls ) {

		if ( site.id !== "31" ) continue;
		let browser;
		let page;
		try {
			browser = await puppeteer.launch({
				                                 headless: false,
				                                 args: ['--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials', '--disable-features=BlockInsecurePrivateNetworkRequests'],
				                                 devtools: true,
				                                 defaultViewport: { hasTouch: true, isMobile: true, height: 1080, width: 1920 },
			                                 });
			page = await browser.newPage();
			await page.setBypassCSP(true);

		} catch ( e ) {
			console.log(e);
			await browser.close();
			break;
		}

		const rawTranslate = fs.readFileSync("./node_modules/axe-core/locales/pt_BR.json");
		const translate = JSON.parse(rawTranslate);

		const results = {};

		for ( const url of site.urls ) {
			try {
				page.setDefaultNavigationTimeout(0);
				await page.goto(url);
				const config = {
					locale: translate,
				};

				let result = await new AxePuppeteer(page)
					.include(".wp_innerpage_header")
					.configure(config).analyze();
				console.log("Url analisada: ", result.url)

				console.log("Resultados:");
				result = reportCleaner(result);

				results[result.url] = result;
			} catch ( err ) {
				console.log(err);
				await page.close();
				await browser.close();
				break;
			}
		}

		if ( !fs.existsSync("./reports") ) fs.mkdirSync("./reports");

		fs.writeFileSync("./reports/".concat(site.id.concat("-emag.json")), JSON.stringify(results));

		await browser.close();
	}
})();

function reportCleaner(report) {
	let newReport = {};
	newReport.url = report.url;
	newReport.violations = report.violations;
	newReport.passes = report.passes;
	newReport.incomplete = report.incomplete;
	newReport.inapplicable = report.inapplicable;
	newReport.date = creationDate();
	const imgAlt = getImgAlt(newReport.passes);
	if ( imgAlt )
	newReport.incomplete.push(imgAlt);

	return newReport;
}

function creationDate() {
	const date = new Date();
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	return day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
}

function getImgAlt(passes) {
	const incomplete = passes.filter(pass => pass.id === "image-alt");
	return incomplete[0];
}
