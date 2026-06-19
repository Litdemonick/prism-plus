// ==PrismHubExtension==
// @name         音悦台MTV
// @version      v0.0.2
// @author       vvsolo
// @lang         zh
// @license      MIT
// @package      api.yinyuetai
// @type         bangumi
// @icon         https://www.yinyuetai.com/images/favicon.ico
// @webSite      https://video-api.yinyuetai.com
// @nsfw         false
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
      uptime: 0,
      expire: 24 * 60,
      channel: "6998499728862334976",
      channels: {
        "6998499728862334976": "\u534E\u8BED",
        "6951459197061984256": "\u6B27\u7F8E",
        "6998475633361805312": "\u97E9\u8BED",
        "6997855138153095168": "\u65E5\u8BED",
        "7005423896983887872": "\u97F3\u60A6\u4EBA"
      }
    });
    __privateAdd(this, _cache, /* @__PURE__ */ new Map());
  }
  async createFilter(filter) {
    return {
      "data": {
        title: "Channel",
        max: 1,
        min: 1,
        default: __privateGet(this, _opts).channel,
        options: __privateGet(this, _opts).channels
      }
    };
  }
  async latest(page) {
    return await this.getBangumis(__privateGet(this, _opts).channel, page);
  }
  async search(kw, page, filter) {
    const channelid = (filter == null ? void 0 : filter.data) && filter.data[0] || "";
    if (channelid && !kw) {
      __privateGet(this, _opts).channel = channelid;
      return await this.getBangumis(channelid, page);
    }
    const res = await this.getCacheAll();
    if (kw) {
      kw = kw.toLowerCase();
      return res.filter((v) => ~v.title.toLowerCase().indexOf(kw));
    }
    return res;
  }
  async detail(url) {
    const res = await this.getCacheAll();
    const bangumi = res.find((v) => v.url === url);
    bangumi.episodes = [{
      title: "Clip",
      urls: bangumi.urls.map((v) => {
        return {
          name: v.display,
          url: v.url
        };
      })
    }];
    return bangumi;
  }
  async watch(url) {
    return {
      type: "hls",
      url
    };
  }
  async getCacheAll() {
    if (__privateGet(this, _cache).size < 1) {
      return [];
    }
    const bangumi = [];
    const values = __privateGet(this, _cache).values();
    let v;
    while (v = values.next().value) {
      bangumi.push(v);
    }
    return bangumi.flat();
  }
  async getBangumis(channelid, page) {
    const size = 20;
    const offsets = page * size;
    const baseUrl = `/video/explore/channelVideos?channelId=${channelid}&detailType=2&size=${size}&offset=${offsets}`;
    const md5path = md5(baseUrl);
    if (this.checkCache(md5path)) {
      return __privateGet(this, _cache).get(md5path);
    }
    const res = await this.reqJSON(baseUrl);
    const bangumi = [];
    ~res.length && res.forEach((v) => {
      var _a;
      const title = `${v.allArtistNames} - ${v.title}`;
      const urls = [].concat(((_a = v == null ? void 0 : v.fullClip) == null ? void 0 : _a.urls) || []);
      bangumi.push({
        id: v.id,
        title,
        url: v.id,
        cover: v.fullClip.headImg,
        urls,
        desc: v.content + "\nTags: " + v.tags.map((t) => t.tagName).join(", ")
        //artists: v.allArtistNames,
      });
    });
    __privateGet(this, _cache).set(md5path, bangumi);
    __privateGet(this, _opts).uptime = Date.now();
    return bangumi;
  }
  async reqJSON(path) {
    const res = await this.request(path, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if ("data" in res) {
      return res.data;
    }
    return [];
  }
  checkCache(item) {
    const expire = +__privateGet(this, _opts).expire;
    return __privateGet(this, _cache).has(item) && expire > 0 && Date.now() - __privateGet(this, _opts).uptime < expire * 60 * 1e3;
  }
}
_opts = new WeakMap();
_cache = new WeakMap();
