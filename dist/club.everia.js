// ==PrismHubExtension==
// @name         EVERIA.CLUB[Photo]
// @version      v0.0.4
// @author       vvsolo
// @lang         all
// @license      MIT
// @type         manga
// @icon         https://everia.club/wp-content/uploads/2023/08/Everiaicon.jpg
// @package      club.everia
// @webSite      https://everia.club
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
      base: "https://everia.club",
      uptime: 0,
      expire: 5
    });
    __privateAdd(this, _cache, /* @__PURE__ */ new Map([["@cover", {}]]));
  }
  async createFilter(filter) {
    if (!this.checkCache("@genres")) {
      const res = await this.request(`/`);
      let genres = {
        All: "All"
      };
      await this.queryAll(res, "#menu-mainmenu > li.menu-item", async (html) => {
        const title = (await this.querySelector(html, "a").text || "").trim();
        let href = await this.getAttributeText(html, "a", "href");
        href = href.replace(__privateGet(this, _opts).base, "");
        genres[href] = title;
      });
      __privateGet(this, _cache).set("@genres", genres);
    }
    return {
      data: {
        title: "Category",
        max: 1,
        min: 1,
        default: "All",
        options: __privateGet(this, _cache).get("@genres")
      }
    };
  }
  async latest(page) {
    return await this.getMangas(`/page/${page}/`);
  }
  async search(kw, page, filter) {
    const filt = (filter == null ? void 0 : filter.data) && filter.data[0] || "All";
    let seaKW = `/page/${page}/`;
    if (filt != "All") {
      seaKW = filt + seaKW;
    }
    if (kw) {
      seaKW = `/page/${page}/?s=${kw}`;
    }
    return await this.getMangas(seaKW);
  }
  async detail(url) {
    const res = await this.req(url);
    const title = await this.querySelector(res, "header > h1").text;
    const imgs = await this.queryAll(res, "figure.wp-block-image", async (html, v, i) => {
      return {
        name: `[P${(i + 1 + "").padStart(3, "0")}]`,
        url: await this.getAttributeText(html, "img", "data-src") || await this.getAttributeText(html, "img", "src")
      };
    });
    const cover = __privateGet(this, _cache).get("@cover")[url] || (imgs.length > 0 ? imgs[0].url : "");
    return {
      title: title.trim(),
      cover,
      episodes: [
        {
          title: "Images",
          urls: imgs
        }
      ]
    };
  }
  async watch(url) {
    return {
      urls: [url]
    };
  }
  async getMangas(path) {
    const md5path = md5(path);
    if (this.checkCache(md5path)) {
      return __privateGet(this, _cache).get(md5path);
    }
    const res = await this.req(path);
    const mangas = await this.queryAll(res, "#content .thumbnail", async (html) => {
      let title = await this.getAttributeText(html, "img", "alt");
      const url = await this.getAttributeText(html, "a", "href");
      const cover = await this.getAttributeText(html, "img", "src");
      title = title.trim().replace("Read more about the article ", "");
      __privateGet(this, _cache).get("@cover")[url] = cover;
      return {
        title,
        url,
        cover
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
