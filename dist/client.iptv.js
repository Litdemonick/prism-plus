// ==PrismHubExtension==
// @name         MyIPTV
// @description  A simple IPTV client
// @version      v0.0.6
// @author       vvsolo
// @lang         all
// @license      MIT
// @package      client.iptv
// @type         bangumi
// @icon         https://s11.ax1x.com/2024/01/11/pFCMKit.png
// @webSite      https://live.fanmingming.com
// @nsfw         false
// ==/PrismHubExtension==


var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var _opts, _group, _cache;
export default class extends Extension {
  constructor() {
    super(...arguments);
    __privateAdd(this, _opts, {
      url: "https://live.fanmingming.com/tv/m3u/ipv6.m3u",
      exturl: "https://cdn.jsdelivr.net/gh/vvsolo/miru-extension-MyIPTV-sources/sources.json",
      lists: {
        "none": "",
        "\u{1F1E8}\u{1F1F3} fanmingming-IPV6": "https://live.fanmingming.com/tv/m3u/ipv6.m3u",
        "\u{1F1E8}\u{1F1F3} MyIPTV-IPV6": "https://cdn.jsdelivr.net/gh/vvsolo/miru-extension-MyIPTV-sources/ipv6.m3u",
        "\u{1F1E8}\u{1F1F3} MyIPTV-IPV4": "https://cdn.jsdelivr.net/gh/vvsolo/miru-extension-MyIPTV-sources/ipv4.m3u",
        "\u{1F1E8}\u{1F1F3} MyIPTV-VOD": "https://cdn.jsdelivr.net/gh/vvsolo/miru-extension-MyIPTV-sources/ipv4.vod.m3u",
        "\u{1F1E8}\u{1F1F3} MyIPTV-RADIO": "https://cdn.jsdelivr.net/gh/vvsolo/miru-extension-MyIPTV-sources/radio.m3u"
      }
    });
    __privateAdd(this, _group, {
      val: "All",
      lists: {
        "All": "All"
      }
    });
    __privateAdd(this, _cache, {
      res: {},
      items: [],
      groups: __privateGet(this, _group).lists,
      uptime: 0,
      exturl: null
    });
  }
  async cacheJSON() {
    if (__privateGet(this, _cache).exturl && await this.checkExpire()) {
      return __privateGet(this, _cache).exturl;
    }
    const res = await this.request("", {
      headers: {
        "Content-Type": "application/json",
        "Miru-Url": __privateGet(this, _opts).exturl
      }
    });
    return __privateGet(this, _cache).exturl = res;
  }
  async load() {
    const lists = __privateGet(this, _opts).lists;
    Object.assign(lists, await this.cacheJSON() || {});
    await this.registerSetting({
      title: "Built-in Source",
      key: "builtin",
      type: "radio",
      description: 'Choose the `Custom Source` below when you choose "None"',
      defaultValue: "",
      options: lists
    });
    await this.registerSetting({
      title: "Custom Source",
      key: "source",
      type: "input",
      description: "IPTV source address (.m3u;.m3u8;.txt)",
      defaultValue: __privateGet(this, _opts).url
    });
    await this.registerSetting({
      title: "Cache Expire Time",
      key: "expire",
      type: "radio",
      description: "Set `none` is no cache\nTips: After changing the source address, the delay will be refreshed",
      defaultValue: "60",
      options: {
        "none": "0",
        "15 minute": "15",
        "30 minute": "30",
        "1 hour": "60",
        "6 hour": "360",
        "12 hour": "720",
        "1 day": "1440"
      }
    });
  }
  async createFilter(filter) {
    const filt = (filter == null ? void 0 : filter.data) && filter.data[0] || "";
    __privateGet(this, _cache).groups = __privateGet(this, _cache).items.map((v) => v.group && v.group.split(";")).flat().reduce((g, v) => {
      return v ? __spreadProps(__spreadValues({}, g), { [v]: v }) : g;
    }, __privateGet(this, _group).lists);
    return {
      "data": {
        title: "",
        max: 1,
        min: 1,
        default: filt || __privateGet(this, _group).val,
        options: __privateGet(this, _cache).groups
      }
    };
  }
  async req(path) {
    return await this.request("", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
        "Miru-Url": path
      }
    });
  }
  async checkExpire() {
    const expire = +await this.getSetting("expire");
    return expire > 0 && Date.now() - __privateGet(this, _cache).uptime < expire * 60 * 1e3;
  }
  async latest(page) {
    if (page > 1) {
      return [];
    }
    const baseUrl = await this.getSetting("builtin") || await this.getSetting("source") || "";
    if (!baseUrl) {
      throw "No valid address set!";
    }
    const md5path = md5(baseUrl);
    if (md5path in __privateGet(this, _cache).res && await this.checkExpire()) {
      return __privateGet(this, _cache).items = __privateGet(this, _cache).res[md5path];
    }
    const res = (await this.req(baseUrl)).replace(/\r?\n/g, "\n").replace(/\n+/g, "\n").replace(/\.m3u8\?\n([\w\=\-&]+)\n/g, ".m3u8?$1\n").replace(/\.m3u8\n\?([\w\=\-&]+)\n/g, ".m3u8?$1\n").replace(/^(#EXTINF:\-?[\d\.]+) *\,/gmi, "$1 ").replace(/^(#EXTINF:\-?[\d\.]+) ([^,]+)$/gmi, "$1,$2").trim();
    const ext = baseUrl.slice(baseUrl.lastIndexOf(".")).toLowerCase();
    const content = res.split("\n");
    const repeats = {};
    if (~res.search(/#genre#/i) || ext === ".txt") {
      let group, tmp;
      content.forEach((item) => {
        if (~item.search(/,#genre#$/i)) {
          group = item.split(",#")[0];
          return;
        }
        if (!~item.search(/,/) && !~item.search(/(?:https?|rs[tcm]p|rsp|mms|udp)/)) {
          group = item;
          return;
        }
        let [title, url] = item.split(",");
        if (title in repeats) {
          repeats[title].url += "#" + url;
          return;
        }
        repeats[title] = {
          title,
          url,
          cover: null,
          group
        };
      });
    } else if (~res.search(/#EXT(?:M3U|INF)/i) || [".m3u", ".m3u8"].includes(ext)) {
      let title, cover, group;
      let headers = {};
      const vlcopt = {
        "User-Agent": "#EXTVLCOPT:http-user-agent=",
        "Referer": "#EXTVLCOPT:http-referrer="
      };
      content.forEach((item) => {
        var _a, _b;
        if (item.startsWith("#EXTINF:")) {
          title = item.slice(item.lastIndexOf(",") + 1).trim();
          group = ((_a = item.match(/group\-title\="([^"]+)"/)) == null ? void 0 : _a[1]) || "";
          cover = ((_b = item.match(/tvg\-logo\="([^"]+)"/)) == null ? void 0 : _b[1]) || null;
        } else if (item.startsWith("#EXTVLCOPT:")) {
          for (let v in vlcopt) if (item.startsWith(vlcopt[v])) {
            headers[v] = item.slice(vlcopt[v].length);
          }
        } else if (title && ~item.search(/^(?:https?|rs[tcm]p|rsp|mms|udp)/) && !~item.search(/\.mpd/)) {
          if (title in repeats && repeats[title].group === group) {
            repeats[title].url += "#" + item.trim();
            return;
          }
          repeats[title] = {
            title,
            url: item.trim(),
            cover,
            group,
            headers
          };
          title = "";
          headers = {};
        }
      });
    }
    const bangumi = Object.values(repeats) || [];
    __privateGet(this, _cache).uptime = Date.now();
    return __privateGet(this, _cache).items = __privateGet(this, _cache).res[md5path] = bangumi;
  }
  async search(kw, page, filter) {
    if (page > 1) {
      return [];
    }
    !~__privateGet(this, _cache).items.length && await this.latest();
    const filt = (filter == null ? void 0 : filter.data) && filter.data[0] || __privateGet(this, _group).val;
    const bangumi = __privateGet(this, _cache).items;
    if (filt === __privateGet(this, _group).val) {
      return !kw ? bangumi : bangumi.filter((v) => ~v.title.indexOf(kw));
    }
    return bangumi.filter((v) => v.group && ~`;${v.group};`.indexOf(`;${filt};`) && (kw ? ~v.title.indexOf(kw) : true));
  }
  async detail(url) {
    const bangumi = __privateGet(this, _cache).items.find((v) => v.url === url);
    const parseUrls = (item) => [...new Set(item.url.split("#"))].map((v, i, t) => {
      return {
        name: t.length > 1 ? `${item.title} [${i + 1}]` : `${item.title}`,
        url: v
      };
    });
    bangumi.episodes = [
      {
        title: bangumi.title,
        urls: parseUrls(bangumi)
      }
    ];
    let groups;
    bangumi.group && bangumi.group.split(";").forEach((g) => {
      groups = __privateGet(this, _cache).items.filter((v) => v.group && ~`;${v.group};`.indexOf(`;${g};`)).map((v) => parseUrls(v)) || [];
      ~groups.length && bangumi.episodes.push({
        title: `[${g}]`,
        urls: groups.flat()
      });
    });
    return bangumi;
  }
  async watch(url) {
    const bangumi = __privateGet(this, _cache).items.find((v) => v.url === url || ~v.url.indexOf(url));
    const item = {
      type: "hls",
      url
    };
    if ("headers" in bangumi && ~Object.keys(bangumi.headers).length) {
      item["headers"] = bangumi.headers;
    }
    return item;
  }
}
_opts = new WeakMap();
_group = new WeakMap();
_cache = new WeakMap();
