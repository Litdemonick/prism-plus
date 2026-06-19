// ==PrismHubExtension==
// @name         libvio
// @version      v0.0.3
// @author       appdevelpo & hualiong
// @lang         zh-cn
// @license      MIT
// @icon         https://libvio.art/statics/img/favicon.ico
// @package      libvio.app
// @type         bangumi
// @webSite      https://www.libvio.app
// ==/PrismHubExtension==
export default class extends Extension {
  base64decode(str) {
    let words = CryptoJS.enc.Base64.parse(str);
    return CryptoJS.enc.Utf8.stringify(words);
  }
  async $req(url, options = {}, count = 3, timeout = 5e3) {
    try {
      return await Promise.race([
        this.request(url, options),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timed out!"));
          }, timeout);
        })
      ]);
    } catch (error) {
      if (count > 1) {
        console.log(`[Retry (${count})]: ${url}`);
        return this.$req(url, options, count - 1);
      } else {
        throw error;
      }
    }
  }
  async load() {
    var _a, _b;
    try {
      const resp = await this.$req("");
      this.domain = (_b = (_a = resp.match(/<a href="(.*?)" target="_blank">/)) == null ? void 0 : _a[1]) != null ? _b : "https://libvio.art";
    } catch (error) {
      this.domain = "https://libvio.art";
    }
  }
  async createFilter(filter) {
    const mainbar = {
      title: "",
      max: 1,
      min: 0,
      default: "/show/4--------~---.html",
      options: {
        "/show/2--------~---.html": "\u9023\u7E8C\u5287",
        "/show/1--------~---.html": "\u96FB\u5F71",
        "/show/3--------~---.html": "\u7D9C\u85DD",
        "/show/4--------~---.html": "\u52D5\u6F2B"
      }
    };
    return {
      mainbar
    };
  }
  async latest(page) {
    const res = await this.request(`/index.php/ajax/data.html?mid=1&limit=20&page=${page}`, {
      headers: { "Miru-Url": this.domain }
    });
    return res.list.map((e) => ({
      title: e.vod_name,
      url: e.detail_link,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  async search(kw, page, filter) {
    let url = `/search/${kw}----------${page}---.html`;
    if (!kw) {
      url = filter["mainbar"][0].replace("~", page);
      const res2 = await this.$req(url, { headers: { "Miru-Url": this.domain } });
      const selector = await this.querySelectorAll(res2, "div.stui-vodlist__box");
      const bangumi2 = selector.map(async (element) => {
        const html = await element.content;
        const url2 = await this.getAttributeText(html, "a", "href");
        const title = await this.getAttributeText(html, "a", "title");
        const cover = await this.getAttributeText(html, "a", "data-original");
        return { title, url: url2, cover };
      });
      return await Promise.all(bangumi2);
    }
    const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
    const bsxList = await this.querySelectorAll(res, "li.col-xs-3.col-sm-4.col-md-6");
    const bangumi = bsxList.map(async (element) => {
      const html = await element.content;
      const url2 = await this.getAttributeText(html, "a", "href");
      const title = await this.getAttributeText(html, "a", "title");
      const cover = await this.getAttributeText(html, "a", "data-original");
      return { title, url: url2, cover };
    });
    return await Promise.all(bangumi);
  }
  async detail(url) {
    const episodes = [];
    const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
    let queryepArea = await this.querySelectorAll(res, "div.stui-vodlist__head");
    const title = await this.querySelector(res, "h1.title").text;
    const cover = await this.getAttributeText(res, ".pic > .lazyload", "data-original");
    for (var i = 0; i < queryepArea.length - 1; i++) {
      const ep = [];
      const html = queryepArea[i].content;
      const text = await this.querySelectorAll(html, "li");
      const mirrorTitle = await this.querySelector(html, "h3.iconfont.icon-iconfontplay2").text;
      if (mirrorTitle.indexOf("\u4E0B\u8F7D") > 0) continue;
      for (var j = 0; j < text.length; j++) {
        const subHtml = text[j].content;
        const name = await this.querySelector(subHtml, "a").text;
        const url2 = await this.getAttributeText(subHtml, "a", "href");
        ep.push({ name, url: url2 });
      }
      episodes.push({ title: mirrorTitle, urls: ep });
    }
    if (episodes.length == 0) episodes.push({ title: "\u6682\u65E0\u53EF\u7528\u64AD\u653E\u6E90", urls: [] });
    return { title, cover, episodes };
  }
  async watch(url) {
    const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
    const player = JSON.parse(res.match(/var player_aaaa=({.+?})</)[1]);
    const raw = decodeURIComponent(player.encrypt == 2 ? this.base64decode(player.url) : player.url);
    const resp = await this.$req(`/vid/ty4.php?url=${raw}`, {
      headers: { "Miru-Url": this.domain, Referer: this.domain }
    });
    const link = resp.match(/var vid = '(.+?)';/)[1];
    console.log(link);
    return { type: link.indexOf(".mp4") > 0 ? "mp4" : "hls", url: link, headers: { Referer: this.domain } };
  }
}
