// ==PrismHubExtension==
// @name         NyaFun动漫
// @version      v0.0.6
// @author       hualiong
// @lang         zh-cn
// @license      MIT
// @icon         https://s1.imagehub.cc/images/2024/07/18/4cd2cce8076bb8ffeb7c8f8b34c02a31.png
// @package      nyadm.link
// @type         bangumi
// @webSite      https://www.nyadm.net
// @nsfw         false
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "decrypt", {
      filter: () => {
        const time = Math.ceil((/* @__PURE__ */ new Date()).getTime() / 1e3);
        return { time, key: CryptoJS.MD5("DS" + time + "DCC147D11943AF75").toString() };
      },
      player: (src, key) => {
        let ut = CryptoJS.enc.Utf8.parse("2890" + key + "tB959C"), mm = CryptoJS.enc.Utf8.parse("2F131BE91247866E"), decrypted = CryptoJS.AES.decrypt(src, ut, {
          iv: mm,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        return CryptoJS.enc.Utf8.stringify(decrypted);
      }
    });
  }
  text(element) {
    const str = [...element.content.matchAll(/>([^<]+?)</g)].map((m) => m[1]).join("").trim();
    return this.textParser(str);
  }
  textParser(str) {
    const dict = /* @__PURE__ */ new Map([
      ["&nbsp;", " "],
      ["&quot;", '"'],
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&amp;", "&"],
      ["&sdot;", "\xB7"]
    ]);
    return str.replace(/&[a-z]+;/g, (c) => dict.get(c) || c);
  }
  base64decode(str) {
    let words = CryptoJS.enc.Base64.parse(str);
    return CryptoJS.enc.Utf8.stringify(words);
  }
  async querySelector(content, selector) {
    const res = await this.querySelectorAll(content, selector);
    return res === null ? null : res[0];
  }
  async $req(url, options = { headers: {} }, count = 3, timeout = 5e3) {
    try {
      if (!options.headers["Miru-Url"]) options.headers["Miru-Url"] = this.domain;
      return await Promise.race([
        this.request(url, options),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timed out!"));
          }, timeout);
        })
      ]);
    } catch (error) {
      if (count > 0) {
        console.log(`[Retry (${count})]: ${url}`);
        return this.$req(url, options, count - 1, timeout + 1e3);
      } else {
        throw error;
      }
    }
  }
  async select(page, filter) {
    const { time, key } = this.decrypt.filter();
    const res = await this.$req("/index.php/api/vod", {
      method: "post",
      data: { type: filter.channels[0], class: filter.genres[0], year: filter.years[0], page, time, key }
    });
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `/bangumi/${e.vod_id}.html|${e.vod_name}|${e.vod_pic}`,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  async test() {
    try {
      await this.request("/play/7566-1-1.html", { headers: { "Miru-Url": this.domain } });
      this.verify = false;
    } catch (error) {
      this.verify = true;
    }
    return this.verify;
  }
  // =============================== 分割线 ============================== //
  async load() {
    const res = await this.$req("/", { headers: { "Miru-Url": "https://www.nyadm.link" } });
    this.domain = await this.getAttributeText(res, "div.links > a:nth-child(1)", "href");
    console.log(this.domain);
    console.log(await this.test());
  }
  async createFilter() {
    const channels = {
      title: "\u9891\u9053",
      max: 1,
      min: 0,
      default: "",
      options: {
        1: "\u756A\u5267",
        2: "\u5267\u573A"
      }
    };
    const genres = {
      title: "\u7C7B\u578B\uFF08\u5206\u7C7B\u52A8\u6F2B\u4E0D\u4EE3\u8868\u5168\u90E8\u52A8\u6F2B\uFF09",
      max: 1,
      min: 0,
      default: "",
      options: {
        \u5947\u5E7B: "\u5947\u5E7B",
        \u6218\u6597: "\u6218\u6597",
        \u5192\u9669: "\u5192\u9669",
        \u70ED\u8840: "\u70ED\u8840",
        \u65E5\u5E38: "\u65E5\u5E38",
        \u641E\u7B11: "\u641E\u7B11",
        \u540E\u5BAB: "\u540E\u5BAB",
        \u5F02\u4E16\u754C: "\u5F02\u4E16\u754C",
        \u7A7F\u8D8A: "\u7A7F\u8D8A",
        \u6CBB\u6108: "\u6CBB\u6108",
        \u7231\u60C5: "\u7231\u60C5",
        \u72D7\u7CAE: "\u72D7\u7CAE",
        \u5C0F\u8BF4\u6539: "\u5C0F\u8BF4\u6539",
        \u6F2B\u753B\u6539: "\u6F2B\u753B\u6539",
        \u6E38\u620F\u6539: "\u6E38\u620F\u6539",
        \u5076\u50CF: "\u5076\u50CF",
        \u6821\u56ED: "\u6821\u56ED",
        \u50AC\u6CEA: "\u50AC\u6CEA",
        \u9752\u6625: "\u9752\u6625",
        \u604B\u7231: "\u604B\u7231",
        \u673A\u6218: "\u673A\u6218",
        \u79D1\u5E7B: "\u79D1\u5E7B",
        \u767E\u5408: "\u767E\u5408",
        \u97F3\u4E50: "\u97F3\u4E50",
        \u60AC\u7591: "\u60AC\u7591",
        \u6050\u6016: "\u6050\u6016",
        \u8FD0\u52A8: "\u8FD0\u52A8",
        \u6027\u8F6C: "\u6027\u8F6C",
        \u515A\u4E89: "\u515A\u4E89"
      }
    };
    const years = {
      title: "\u5E74\u4EFD",
      max: 1,
      min: 0,
      default: "",
      options: Object.fromEntries(
        new Map(
          Array.from({ length: (/* @__PURE__ */ new Date()).getFullYear() - 1999 }, (_, i) => [
            (2e3 + i).toString(),
            (2e3 + i).toString()
          ])
        )
      )
    };
    return { channels, genres, years };
  }
  async latest(page) {
    if (this.verify && await this.test()) {
      return [{ title: "\u9700\u8981\u9A8C\u8BC1\u624D\u80FD\u4F7F\u7528\u8BE5\u6269\u5C55\uFF01", url: "/play/7566-1-1.html", cover: null }];
    }
    const res = await this.$req(`/index.php/ajax/data.html?mid=1&limit=20&page=${page}`);
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.detail_link}|${e.vod_name}|${e.vod_pic}`,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  async search(kw, page, filter) {
    var _a, _b, _c;
    if (this.verify && await this.test()) {
      return [{ title: "\u9700\u8981\u9A8C\u8BC1\u624D\u80FD\u4F7F\u7528\u8BE5\u6269\u5C55\uFF01", url: "/play/7566-1-1.html", cover: null }];
    }
    if (((_a = filter == null ? void 0 : filter.channels) == null ? void 0 : _a[0]) || ((_b = filter == null ? void 0 : filter.genres) == null ? void 0 : _b[0]) || ((_c = filter == null ? void 0 : filter.years) == null ? void 0 : _c[0])) {
      if (kw) throw new Error("\u5728\u4F7F\u7528\u7B5B\u9009\u5668\u65F6\u65E0\u6CD5\u540C\u65F6\u4F7F\u7528\u641C\u7D22\u529F\u80FD\uFF01");
      return this.select(page, filter);
    } else if (!kw) return this.latest(page);
    const res = await this.$req(`/search/wd/${encodeURI(kw)}/page/${page}.html`);
    const list = await this.querySelectorAll(res, "div.search-box");
    if (list === null) {
      return [];
    }
    const videos = list.map(async (e) => {
      const label = await this.querySelector(e.content, ".public-list-exp");
      const title = this.text(await this.querySelector(e.content, ".right .thumb-txt"));
      const cover = await this.getAttributeText(label.content, "img.gen-movie-img", "data-src");
      const update = this.text(await this.querySelector(label.content, "span.public-list-prb"));
      const url = `${await label.getAttributeText("href")}|${title}|${cover}`;
      return { title, url, cover, update };
    });
    return await Promise.all(videos);
  }
  async detail(str) {
    if (this.verify) {
      return {
        title: "\u8BF7\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684 Webview \u7A97\u53E3\u8FDB\u5165\u7F51\u7AD9\u901A\u8FC7\u9A8C\u8BC1",
        cover: null,
        desc: "\u8BF7\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684 Webview \u7A97\u53E3\u8FDB\u5165\u7F51\u7AD9\u901A\u8FC7\u9A8C\u8BC1"
      };
    }
    const data = str.split("|");
    const res = await this.$req(data[0]);
    const desc = this.textParser(res.match(/\bid="height_limit".*?>([\s\S]*?)</)[1]);
    const labelTask = this.querySelectorAll(res, ".anthology-tab a");
    const sources = await this.querySelectorAll(res, ".anthology-list-play");
    const labels = (await labelTask).map((e) => this.textParser(e.content.match(/i>(.*?)</)[1]));
    let reg = /href="(.*?)">(.*?)</;
    const episodes = sources.map(async (source, i) => {
      const urls = (await this.querySelectorAll(source.content, "a")).map((a) => {
        const match = reg.exec(a.content);
        return { name: match[2], url: match[1] };
      });
      return { title: labels[i], urls };
    });
    return { title: data[1], cover: data[2], desc, episodes: await Promise.all(episodes) };
  }
  async watch(url) {
    let res = null;
    try {
      res = await this.$req(url);
    } catch (error) {
      this.verify = true;
      throw new Error("\u82E5\u7F51\u7EDC\u6CA1\u95EE\u9898\uFF0C\u5219\u53EF\u80FD\u662F\u7F51\u7AD9\u9700\u8981\u9A8C\u8BC1\uFF0C\u8BF7\u91CD\u542F\u5E94\u7528\u518D\u8BD5");
    }
    const player = JSON.parse(res.match(/var player_aaaa=({.+?})</)[1]);
    const raw = decodeURIComponent(player.encrypt == 2 ? this.base64decode(player.url) : player.url);
    const resp = await this.$req(`/player/ec.php?code=qw&url=${raw}`, {
      headers: { "Miru-Url": this.domain.replace("www", "play"), Referer: this.domain }
    });
    const json = JSON.parse(resp.match(/let ConFig = ({.+})/)[1]);
    const link = this.decrypt.player(json.url, json.config.uid);
    console.log(link);
    return { type: link.indexOf(".mp4") > 0 ? "mp4" : "hls", url: link };
  }
}
