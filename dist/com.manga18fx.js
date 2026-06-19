// ==PrismHubExtension==
// @name         manga18fx
// @version      v0.0.1
// @author       vvsolo
// @lang         en
// @license      MIT
// @type         manga
// @icon         https://manga18fx.com/images/favicon-96x96.jpg
// @package      com.manga18fx
// @webSite      https://manga18fx.com
// @nsfw         true
// ==/PrismHubExtension==

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var _opts, _cache;
export default class extends Extension {
  constructor() {
    super(...arguments);
    __privateAdd(this, _opts, {
      base: "https://manga18fx.com",
      uptime: 0,
      expire: 5
    });
    __privateAdd(this, _cache, /* @__PURE__ */ new Map([
      ["@cover", {}]
    ]));
  }
  async latest(page) {
    return await this.getMangas(`/page/${page}?orderby=latest`);
  }
  async search(kw, page, filter) {
    const filt = (filter == null ? void 0 : filter.data) && filter.data[0] || "All";
    let seaKW = filt === "All" ? `/page/${page}?orderby=latest` : `${filt}/${page}`;
    if (kw) {
      seaKW = `/search?q=${kw}&page=${page}`;
    }
    return await this.getMangas(seaKW);
  }
  async createFilter(filter) {
    if (!this.checkCache("@genres")) {
      const res = await this.request(`/`);
      let genres = {
        "All": "All"
      };
      await this.queryAll(res, ".genre-menu > ul > li", async (html) => {
        let title = (await this.querySelector(html, "a").text || "").trim();
        const href = await this.getAttributeText(html, "a", "href");
        genres[href] = title;
      });
      __privateGet(this, _cache).set("@genres", genres);
    }
    return {
      "data": {
        title: "Genre",
        max: 1,
        min: 1,
        default: "All",
        options: __privateGet(this, _cache).get("@genres")
      }
    };
  }
  async detail(url) {
    const res = await this.req(url);
    const title = (await this.querySelector(res, ".post-title > h1").text).trim();
    const desc = (await this.querySelector(res, ".dsct > p").text).trim();
    const imgs = await this.queryAll(res, ".row-content-chapter li.a-h", async (html) => {
      return {
        name: await this.querySelector(html, "a").text,
        url: await this.getAttributeText(html, "a", "href")
      };
    });
    const cover = __privateGet(this, _cache).get("@cover")[url] || await this.getAttributeText(res, "img.img-loading", "data-src") || "";
    const info = (await this.queryAll(res, ".post-content .post-content_item", async (html) => {
      return html.replace(/<\/?[^>]+>/g, "").replace(/\n/g, " ").replace(/&amp;/g, "&").trim();
    }) || []).join("\n");
    return {
      title: title.trim(),
      cover,
      desc: info + "\n\n" + desc,
      episodes: [{
        title: "Graphis",
        urls: imgs
      }]
    };
  }
  async watch(url) {
    const res = await this.req(url);
    const urls = await this.queryAll(res, ".page-break", async (html) => {
      return await this.getAttributeText(html, "img", "data-src");
    }) || [];
    return {
      urls
    };
  }
  async getMangas(path) {
    const md5path = md5(path);
    if (this.checkCache(md5path)) {
      return __privateGet(this, _cache).get(md5path);
    }
    const res = await this.request(path);
    const mangas = await this.queryAll(res, ".listupd .page-item", async (html) => {
      let title = await this.getAttributeText(html, ".thumb-manga img", "alt");
      const url = await this.getAttributeText(html, ".thumb-manga a", "href");
      const cover = await this.getAttributeText(html, ".thumb-manga img", "data-src");
      let update = await this.queryAll(html, ".btn-link", async (v) => {
        return v.match(/class="btn-link">([^<]+)<\/a>/)[1].trim();
      }) || [];
      title = title.trim();
      __privateGet(this, _cache).get("@cover")[url] = cover;
      return {
        title,
        url,
        cover,
        update: update.join("\n")
      };
    });
    __privateGet(this, _cache).set(md5path, mangas);
    __privateGet(this, _opts).uptime = Date.now();
    return mangas;
  }
  async req(path) {
    return await this.request(path.replace(__privateGet(this, _opts).base, ""));
  }
  async queryAll(res, selector, func) {
    return await Promise.all(
      (await this.querySelectorAll(res, selector)).map(async (v, i) => {
        const html = await v.content;
        return await func(html, v, i);
      })
    ) || [];
  }
  checkCache(item) {
    const expire = +__privateGet(this, _opts).expire;
    return __privateGet(this, _cache).has(item) && expire > 0 && Date.now() - __privateGet(this, _opts).uptime < expire * 60 * 1e3;
  }
}
_opts = new WeakMap();
_cache = new WeakMap();
