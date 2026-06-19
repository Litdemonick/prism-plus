// ==PrismHubExtension==
// @name         次元城动漫
// @version      v0.1.2
// @author       hualiong
// @lang         zh-cn
// @license      MIT
// @icon         https://www.cyc-anime.net/upload/site/20240319-1/25e700991446a527804c82a744731b60.png
// @package      cycanime.com
// @type         bangumi
// @webSite      https://www.cyc-anime.net
// @nsfw         false
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "dict", /* @__PURE__ */ new Map([
      ["&nbsp;", " "],
      ["&quot;", '"'],
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&amp;", "&"],
      ["&sdot;", "\xB7"]
    ]));
    __publicField(this, "decrypt", {
      filter: () => {
        const time = Math.ceil((/* @__PURE__ */ new Date()).getTime() / 1e3);
        return { time, key: CryptoJS.MD5("DS" + time + "DCC147D11943AF75").toString() };
      },
      player: (src, key1, key2) => {
        let prefix = new Array(key2.length);
        for (let i = 0; i < key2.length; i++) {
          prefix[key1[i]] = key2[i];
        }
        let a = CryptoJS.MD5(prefix.join("") + "YLwJVbXw77pk2eOrAnFdBo2c3mWkLtodMni2wk81GCnP94ZltW").toString(), key = CryptoJS.enc.Utf8.parse(a.substring(16)), iv = CryptoJS.enc.Utf8.parse(a.substring(0, 16)), dec = CryptoJS.AES.decrypt(src, key, {
          iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        return dec.toString(CryptoJS.enc.Utf8);
      }
    });
  }
  text(content) {
    if (!content) return "";
    const str = [...content.matchAll(/>([^<]+?)</g)].map((m) => m[1]).join("").trim() || content;
    return str.replace(/&[a-z]+;/g, (c) => this.dict.get(c) || c);
  }
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
  async select(page, filter) {
    const { time, key } = this.decrypt.filter();
    const res = await this.$req("/index.php/api/vod", {
      method: "post",
      data: { type: filter.channels[0], class: filter.genres[0], year: filter.years[0], page, time, key }
    });
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.vod_id}`,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  // =============================== 分割线 ============================== //
  async createFilter() {
    const channels = {
      title: "\u9891\u9053",
      max: 1,
      min: 0,
      default: "",
      options: {
        20: "TV\u52A8\u753B",
        21: "\u5267\u573A\u7248"
      }
    };
    const genres = {
      title: "\u7C7B\u578B\uFF08\u5206\u7C7B\u8D44\u6E90\u4E0D\u4EE3\u8868\u5168\u90E8\u8D44\u6E90\uFF09",
      max: 1,
      min: 0,
      default: "",
      options: {
        \u539F\u521B: "\u539F\u521B",
        \u6F2B\u753B\u6539: "\u6F2B\u753B\u6539",
        \u5C0F\u8BF4\u6539: "\u5C0F\u8BF4\u6539",
        \u6E38\u620F\u6539: "\u6E38\u620F\u6539",
        \u7279\u6444: "\u7279\u6444",
        \u70ED\u8840: "\u70ED\u8840",
        \u7A7F\u8D8A: "\u7A7F\u8D8A",
        \u5947\u5E7B: "\u5947\u5E7B",
        \u6218\u6597: "\u6218\u6597",
        \u641E\u7B11: "\u641E\u7B11",
        \u65E5\u5E38: "\u65E5\u5E38",
        \u79D1\u5E7B: "\u79D1\u5E7B",
        \u6CBB\u6108: "\u6CBB\u6108",
        \u6821\u56ED: "\u6821\u56ED",
        \u6CE1\u9762: "\u6CE1\u9762",
        \u604B\u7231: "\u604B\u7231",
        \u5C11\u5973: "\u5C11\u5973",
        \u9B54\u6CD5: "\u9B54\u6CD5",
        \u5192\u9669: "\u5192\u9669",
        \u5386\u53F2: "\u5386\u53F2",
        \u67B6\u7A7A: "\u67B6\u7A7A",
        \u673A\u6218: "\u673A\u6218",
        \u8FD0\u52A8: "\u8FD0\u52A8",
        \u52B1\u5FD7: "\u52B1\u5FD7",
        \u97F3\u4E50: "\u97F3\u4E50",
        \u63A8\u7406: "\u63A8\u7406",
        \u793E\u56E2: "\u793E\u56E2",
        \u667A\u6597: "\u667A\u6597",
        \u50AC\u6CEA: "\u50AC\u6CEA",
        \u7F8E\u98DF: "\u7F8E\u98DF",
        \u5076\u50CF: "\u5076\u50CF",
        \u4E59\u5973: "\u4E59\u5973",
        \u804C\u573A: "\u804C\u573A"
      }
    };
    const years = {
      title: "\u5E74\u4EFD",
      max: 1,
      min: 0,
      default: "",
      options: Object.fromEntries(
        new Map(
          Array.from({ length: (/* @__PURE__ */ new Date()).getFullYear() - 2006 }, (_, i) => [
            (2007 + i).toString(),
            (2007 + i).toString()
          ])
        )
      )
    };
    return { channels, genres, years };
  }
  async latest(page) {
    const res = await this.$req(`/api.php/provide/vod?ac=detail&pg=${page}&pagesize=20`);
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.vod_id}`,
      cover: e.vod_pic,
      update: e.vod_remarks || "\u5DF2\u5B8C\u7ED3"
    }));
  }
  async search(kw, page, filter) {
    var _a, _b, _c;
    if (((_a = filter == null ? void 0 : filter.channels) == null ? void 0 : _a[0]) || ((_b = filter == null ? void 0 : filter.genres) == null ? void 0 : _b[0]) || ((_c = filter == null ? void 0 : filter.years) == null ? void 0 : _c[0])) {
      if (kw) throw new Error("\u5728\u4F7F\u7528\u7B5B\u9009\u5668\u65F6\u65E0\u6CD5\u540C\u65F6\u4F7F\u7528\u641C\u7D22\u529F\u80FD\uFF01");
      return this.select(page, filter);
    } else if (!kw) return this.latest(page);
    const res = await this.$req(`/api.php/provide/vod?ac=detail&wd=${kw}&pg=${page}`);
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.vod_id}`,
      cover: e.vod_pic,
      update: e.vod_remarks || "\u5DF2\u5B8C\u7ED3"
    }));
  }
  async detail(id) {
    let desc = "\u65E0";
    const anime = (await this.$req(`/api.php/provide/vod?ac=detail&ids=${id}`)).list[0];
    const blurb = this.text(anime.vod_blurb);
    const content = this.text(anime.vod_content);
    desc = desc.length < (blurb == null ? void 0 : blurb.length) ? blurb : desc;
    desc = desc.length < content.length ? content : desc;
    const urls = anime.vod_play_url.split("#").filter((e) => e).map((e) => {
      const s = e.split("$");
      return { name: s[0], url: s[1] };
    });
    return { title: anime.vod_name, cover: anime.vod_pic, desc, episodes: [{ title: this.name, urls }] };
  }
  async watch(url) {
    const resp = await this.request(`/?url=${url}`, { headers: { "Miru-Url": "https://player.cyc-anime.net" } });
    const reg = /now_(\w+)/g;
    const link = this.decrypt.player(resp.match(/"url": "([^:]+?)"/)[1], reg.exec(resp)[1], reg.exec(resp)[1]);
    console.log(link);
    return { type: link.indexOf(".mp4") > 0 ? "mp4" : "hls", url: link };
  }
  async checkUpdate(id) {
    const anime = await this.$req(`/api.php/provide/vod?ids=${id}`);
    return anime.list[0].vod_remarks;
  }
}
