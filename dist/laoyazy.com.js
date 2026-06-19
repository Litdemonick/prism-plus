// ==PrismHubExtension==
// @name         老鸭资源
// @version      v0.0.2
// @author       hualiong
// @lang         zh-cn
// @license      MIT
// @icon         https://lyzy8.top/upload/site/20240405-1/0abc49d6b935f5ff17488568f99d2d52.png
// @package      laoyazy.com
// @type         bangumi
// @webSite      https://laoyazy.com
// @nsfw         true
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "genres", {});
    __publicField(this, "domains", [
      "lyzy1.top",
      "lyzy2.top",
      "lyzy3.top",
      "lyzy4.top",
      "lyzy5.top",
      "lyzy6.top",
      "lyzy7.top",
      "lyzy8.top",
      "lyzy9.top",
      "lyzy10.top",
      "api.apilyzy.com"
    ]);
    __publicField(this, "dict", /* @__PURE__ */ new Map([
      ["&nbsp;", " "],
      ["&quot;", '"'],
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&amp;", "&"],
      ["&sdot;", "\xB7"]
    ]));
  }
  text(content) {
    if (!content) return "";
    const str = [...content.matchAll(/>([^<]+?)</g)].map((m) => m[1]).join("").trim() || content;
    return str.replace(/&[a-z]+;/g, (c) => this.dict.get(c) || c);
  }
  async $get(params, count = 2, timeout = 4e3) {
    try {
      const list = this.domains.map(
        (domain) => this.request("/api.php/provide/vod?ac=detail" + params, {
          headers: { "Miru-Url": `https://${domain}` }
        })
      );
      list.push(
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timed out!"));
          }, timeout);
        })
      );
      return await Promise.any(list);
    } catch (error) {
      if (count > 1) {
        console.log(`[Retry (${count})]: ${params}`);
        return this.$get(params, count - 1);
      } else {
        throw error;
      }
    }
  }
  async load() {
    const res = await this.$get("&ac=list");
    res.class.forEach((e) => {
      this.genres[e.type_id] = e.type_name;
    });
  }
  async createFilter() {
    const genres = {
      title: "\u5F71\u7247\u7C7B\u578B",
      max: 1,
      min: 0,
      default: "",
      options: this.genres
    };
    return { genres };
  }
  async latest(page) {
    const h = ((/* @__PURE__ */ new Date()).getUTCHours() + 9) % 24;
    const res = await this.$get(`&pg=${page}&h=${h || 24}`);
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.vod_id}`,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  async search(kw, page, filter) {
    var _a, _b, _c;
    if (!kw && !((_a = filter == null ? void 0 : filter.genres) == null ? void 0 : _a[0])) {
      return this.latest(page);
    }
    const res = await this.$get(`&wd=${kw}&t=${(_c = (_b = filter == null ? void 0 : filter.genres) == null ? void 0 : _b[0]) != null ? _c : ""}&pg=${page}`);
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.vod_id}`,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  async detail(id) {
    let desc = "\u65E0";
    const anime = (await this.$get(`&ids=${id}`)).list[0];
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
    console.log(url);
    return { type: "hls", url };
  }
}
