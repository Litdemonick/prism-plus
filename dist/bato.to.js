// ==PrismHubExtension==
// @name         Bato
// @version      v0.0.2
// @author       bethro
// @lang         all
// @license      MIT
// @icon         https://bato.to/amsta/img/batoto/favicon.ico?v0
// @package      bato.to
// @type         manga
// @webSite      https://bato.to
// ==/PrismHubExtension==

export default class extends Extension {
  async req(url2) {
    return this.request(url2, {
      headers: {
        "Miru-Url": await this.getSetting("bato")
      }
    });
  }
  async load() {
    this.registerSetting({
      title: "Bato Base URL",
      key: "bato",
      type: "input",
      desc: "this is the url where the comics are fetched from",
      defaultValue: "https://bato.to"
    });
  }
  async latest(page) {
    let latestResponse = await this.req(`/latest?page=${page}`);
    let html = latestResponse.res ? latestResponse.res.html : latestResponse;
    const cleanHtml = html.replace(/\n/g, "");
    let items = await this.querySelectorAll(cleanHtml, "div.item");
    let respItems = await Promise.all(items.map(async (item) => ({
      url: await this.getAttributeText(item.content, "a.item-cover", "href"),
      cover: await this.getAttributeText(item.content, "img", "src"),
      title: await this.querySelector(item.content, "a.item-title").text
    })));
    return respItems;
  }
  async search(kw, page) {
    let searchResponse = await this.req(`/search?q=${kw}&page=${page}`);
    let items = await this.querySelectorAll(searchResponse, "div.item");
    let respItems = await Promise.all(items.map(async (item) => ({
      url: await this.getAttributeText(item.content, "a.item-cover", "href"),
      cover: await this.getAttributeText(item.content, "img", "src"),
      title: await this.querySelector(item.content, "a.item-title").text
    })));
    return respItems;
  }
  async detail(url2) {
    let detailResponse = await this.req(url2);
    const title = (await this.querySelector(detailResponse, "#mainer > div > div > h3 > a").text).trim();
    const cover = await this.getAttributeText(detailResponse, "#mainer > div > div > div > img", "src");
    const desc = await this.querySelector(detailResponse, "#limit-height-body-summary > div").text;
    const episodeList = await this.querySelectorAll(detailResponse, "#mainer > div > div > div.main > div");
    const episodes = await Promise.all(episodeList.map(async (item) => ({
      url: await this.getAttributeText(item.content, "a", "href"),
      name: (await this.querySelector(item.content, "a").text).trim()
    })));
    return {
      title,
      cover,
      desc,
      episodes: [
        {
          title: "Chapters",
          urls: episodes
        }
      ]
    };
  }
  async watch(url) {
    var _a, _b, _c, _d, _e, _f;
    let res = await this.req(url);
    const batoPass = eval((_b = (_a = res.match(/const\s+batoPass\s*=\s*(.*?);/)) == null ? void 0 : _a[1]) != null ? _b : "").toString();
    const batoWord = (_d = (_c = res.match(/const\s+batoWord\s*=\s*"(.*)";/)) == null ? void 0 : _c[1]) != null ? _d : "";
    const imgList = JSON.parse((_f = (_e = res.match(/const\s+imgHttps\s*=\s*(.*?);/)) == null ? void 0 : _e[1]) != null ? _f : "");
    const tknList = JSON.parse(CryptoJS.AES.decrypt(batoWord, batoPass).toString(CryptoJS.enc.Utf8));
    let pages = [];
    for (let i = 0; i < Math.min(imgList.length, tknList.length); i++) {
      pages.push(`${imgList[i]}?${tknList[i]}`);
    }
    return {
      urls: imgList
    };
  }
}
