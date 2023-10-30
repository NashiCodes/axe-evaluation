const puppeteer = require("puppeteer");
const {AxePuppeteer} = require("@axe-core/puppeteer");
const fs = require("fs");
require("dotenv").config();

/**
 * Função principal
 */
(async () => {

    // Busca todas urls dos sites cadastrados
    const urlsResponse = await fetch("https://wpteste2.ufjf.br/wp-json/acessibilidade/v1/pages_posts");
    const sitesUrls = await urlsResponse.json();

    // Busca as regras que devem ser desabilitadas
    const rulesDisabled = process.env.RULES_DISABLED.split(",");
    const ignoredPages = process.env.IGNORED_PAGES.split(",");

    // Para cada site, abre o navegador e analisa as urls
    for (const site of sitesUrls) {
        console.log("\n\nSite: "+ site.id)

        let browser;
        let page;

        // Abre o navegador
        try {
            console.log("Abrindo navegador...");
            browser = await puppeteer.launch({headless : "new"});
            page = await browser.newPage();
            await page.setBypassCSP(true);
            console.log("Navegador aberto");
        } catch (e) {
            console.log(e);
            await browser.close();
            break;
        }

        // Busca o arquivo de tradução
        const rawTranslate = fs.readFileSync("./node_modules/axe-core/locales/pt_BR.json");
        const translate = JSON.parse(rawTranslate);

        // Cria o objeto que irá conter os resultados
        const results = {};
        console.log("Iniciando análise do site: " + site.id);
        // Para cada url, analisa a acessibilidade
        for (const url of site.urls) {

            // Verifica se a url deve ser ignorada
            // Somente para urls que terminam com algum dos valores de ignoredPages
            if (ignoredPages.some(page => url.endsWith(page))) {
                console.log("Ignorando: " + url);
                continue;
            }

            // Tenta acessar a url e analisar a acessibilidade
            try {
                // Acessa a url
                page.setDefaultNavigationTimeout(0);
                await page.goto(url);

                // Configuração de tradução do axe
                const config = {
                    locale: translate,
                };

                console.log("Analisando: " + url);
                // Analisa a acessibilidade
                let result = await new AxePuppeteer(page)
                    .configure(config)
                    .include("main")
                    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
                    .disableRules(rulesDisabled)
                    .analyze();

                // Limpa o resultado da análise
                result = reportCleaner(result);
                // Adiciona o resultado da análise ao objeto de resultados caso não seja nulo
                if (result) results[url] = result;

                console.log("Fim da análise");
            } catch (err) {
                console.log("Erro ao analisar: " + url);
                // Caso ocorra algum erro, cria um arquivo de log de erros contendo a url a data e o erro, mantendo os anteriores
                if (!fs.existsSync("./api/errors_logs")) fs.mkdirSync("./api/errors_logs");
                fs.appendFileSync("./api/errors_logs/site-".concat(site.id.concat(".log")), url.concat(" - ").concat(creationDate()).concat(" - \n").concat(err).concat("\n\n"));
            }
        }

        if (!fs.existsSync("./api/reports")) fs.mkdirSync("./api/reports");

        fs.writeFileSync("./api/reports/".concat(site.id.concat("-emag.json")), JSON.stringify(results));

        await browser.close();
    }
    console.log("Fim");
})();

/**
 * Retorna o relatório limpo ou null caso não haja violações
 * @param report
 * @returns {{}|null}
 */
function reportCleaner(report) {
    const imgAlt = VerificaAltImagem(report.passes);
    if (invalidReport(report, imgAlt))
        return null;

    let newReport = {};
    newReport.url = report.url;
    newReport.date = creationDate();
    newReport.violations = report.violations;
    // newReport.passes = report.passes;
    // newReport.inapplicable = report.inapplicable;
    newReport.incomplete = report.incomplete;
    if (imgAlt) newReport.incomplete.push(imgAlt);

    newReport.countViolations = newReport.violations.length;
    newReport.countIncomplete = newReport.incomplete.length;

    return newReport;
}

/**
 * Verifica se o relatório é válido
 * @param report
 * @param imgAlt
 * @returns {boolean}
 */
function invalidReport(report, imgAlt) {
    return report.violations.length === 0 && report.incomplete.length === 0 && imgAlt === false;
}

/**
 * Retorna a data atual
 * @returns {string}
 */
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

/**
 * Retorna o objeto que contém as imagens sem alt ou com alt vazio
 * @param passes
 * @returns {*}
 */
function getImgAlt(passes) {
    const incomplete = passes.filter(pass => pass.id === "image-alt");
    return incomplete[0];
}

/**
 * Verifica se há imagens sem alt ou com alt vazio
 * @param passes
 * @returns {*|boolean}
 */
function VerificaAltImagem(passes) {
    let imgAlt = getImgAlt(passes);

    if (imgAlt) {
        const imgs = imgAlt.nodes;
        const imgsAlt = imgs.filter(img => img.html.includes("alt=\"\""));
        imgsAlt.push(...imgs.filter(img => !img.html.includes("alt=")));

        if (imgsAlt.length > 0) {
            imgAlt.nodes = imgsAlt;
            return imgAlt;
        }
    }
    return false;
}
