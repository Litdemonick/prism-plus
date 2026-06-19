// ==PrismHubExtension==
// @name         稀饭动漫
// @version      v0.1.1
// @author       hualiong
// @lang         zh-cn
// @license      MIT
// @icon         https://dick.xfani.com/upload/site/20240308-1/813e41f81d6f85bfd7a44bf8a813f9e5.png
// @package      xfani.com
// @type         bangumi
// @webSite      https://dick.xfani.com
// @nsfw         false
// ==/PrismHubExtension==
export default class extends Extension {
  text(element) {
    if (!element.content) return "";
    const dict = /* @__PURE__ */ new Map([
      ["&nbsp;", " "],
      ["&quot;", '"'],
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&amp;", "&"],
      ["&sdot;", "\xB7"]
    ]);
    const str = [...element.content.matchAll(/>([^<]+?)</g)].map((m) => m[1]).join("").trim() || element.content;
    return str.replace(/&[a-z]+;/g, (c) => dict.get(c) || c);
  }
  async querySelector(content, selector) {
    const res = await this.querySelectorAll(content, selector);
    return res === null ? null : res[0];
  }
  decrypt() {
    const time = Math.ceil((/* @__PURE__ */ new Date()).getTime() / 1e3);
    return { time, key: CryptoJS.MD5("DS" + time + "DCC147D11943AF75").toString() };
  }
  base64decode(str) {
    let words = CryptoJS.enc.Base64.parse(str);
    return CryptoJS.enc.Utf8.stringify(words);
  }
  createFilter() {
    const channels = {
      title: "\u9891\u9053",
      max: 1,
      min: 0,
      default: "",
      options: {
        1: "\u8FDE\u8F7D\u65B0\u756A",
        2: "\u5B8C\u7ED3\u65E7\u756A",
        3: "\u5267\u573A\u7248",
        21: "\u7F8E\u6F2B"
      }
    };
    const genres = {
      title: "\u7C7B\u578B",
      max: 1,
      min: 0,
      default: "",
      options: {
        \u641E\u7B11: "\u641E\u7B11",
        \u539F\u521B: "\u539F\u521B",
        \u8F7B\u5C0F\u8BF4\u6539: "\u8F7B\u5C0F\u8BF4\u6539",
        \u604B\u7231: "\u604B\u7231",
        \u767E\u5408: "\u767E\u5408",
        \u6F2B\u6539: "\u6F2B\u6539",
        \u6821\u56ED: "\u6821\u56ED",
        \u6218\u6597: "\u6218\u6597",
        \u6CBB\u6108: "\u6CBB\u6108",
        \u5947\u5E7B: "\u5947\u5E7B",
        \u65E5\u5E38: "\u65E5\u5E38",
        \u9752\u6625: "\u9752\u6625",
        \u4E59\u5973\u5411: "\u4E59\u5973\u5411",
        \u60AC\u7591: "\u60AC\u7591",
        \u540E\u5BAB: "\u540E\u5BAB",
        \u79D1\u5E7B: "\u79D1\u5E7B",
        \u5192\u9669: "\u5192\u9669",
        \u70ED\u8840: "\u70ED\u8840",
        \u5F02\u4E16\u754C: "\u5F02\u4E16\u754C",
        \u6E38\u620F\u6539: "\u6E38\u620F\u6539",
        \u97F3\u4E50: "\u97F3\u4E50",
        \u5076\u50CF: "\u5076\u50CF",
        \u7F8E\u98DF: "\u7F8E\u98DF",
        \u803D\u7F8E: "\u803D\u7F8E"
      }
    };
    return { channels, genres };
  }
  async latest(page) {
    try {
      const res = await this.request(`/index.php/ajax/data.html?mid=1&limit=20&page=${page}`);
      return res.list.map((e) => ({
        title: e.vod_name,
        url: `${e.detail_link}|${e.vod_name}|${e.vod_pic}`,
        cover: e.vod_pic,
        update: e.vod_remarks.replace("|", " | ") || "\u5DF2\u5B8C\u7ED3"
      }));
    } catch (error) {
      return [
        {
          title: "\u8BF7\u5148\u8FDB\u5165\u6B64\u8BE6\u7EC6\u9875\u70B9\u51FB Webview \u7A97\u53E3\u8F93\u5165\u9A8C\u8BC1\u7801\u540E\u624D\u80FD\u6B63\u5E38\u4F7F\u7528\u8BE5\u6269\u5C55",
          url: "/",
          cover: null
        }
      ];
    }
  }
  // async latest(page) {
  //   if (page > 1) {
  //     return [];
  //   }
  //   const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  //   const { time, key } = this.decrypt();
  //   let res = await this.request("/index.php/api/weekday", {
  //     method: "post",
  //     data: { weekday: weekdays[new Date().getDay()], num: 20, time, key },
  //   });
  //   return res.list.map((e) => ({
  //     title: e.vod_name,
  //     url: `/bangumi/${e.vod_id}.html|${e.vod_name}|${e.vod_pic}`,
  //     cover: e.vod_pic,
  //     update: e.vod_remarks,
  //   }));
  // }
  async search(kw, page, filter) {
    var _a, _b, _c;
    if (((_a = filter == null ? void 0 : filter.channels) == null ? void 0 : _a[0]) || ((_b = filter == null ? void 0 : filter.genres) == null ? void 0 : _b[0]) || ((_c = filter == null ? void 0 : filter.years) == null ? void 0 : _c[0])) {
      if (kw) throw new Error("\u5728\u4F7F\u7528\u7B5B\u9009\u5668\u65F6\u65E0\u6CD5\u540C\u65F6\u4F7F\u7528\u641C\u7D22\u529F\u80FD\uFF01");
      return this.select(page, filter);
    } else if (!kw) return this.latest(page);
    const res = await this.request(`/search/wd/${encodeURI(kw)}/page/${page}.html`);
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
      return { title, url, cover, update: update.replace("|", " | ") };
    });
    return await Promise.all(videos);
  }
  async select(page, filter) {
    const { time, key } = this.decrypt();
    const res = await this.request("/index.php/api/vod", {
      method: "post",
      data: { type: filter.channels[0], class: filter.genres[0], page, time, key }
    });
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `/bangumi/${e.vod_id}.html|${e.vod_name}|${e.vod_pic}`,
      cover: e.vod_pic,
      update: e.vod_remarks
    }));
  }
  async detail(str) {
    if (str === "/") {
      return {
        title: "\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684 Webview \u7A97\u53E3\u8FDB\u5165\u7F51\u7AD9\u901A\u8FC7\u9A8C\u8BC1\u52A0\u8F7D\u9996\u9875\u540E\u518D\u91CD\u65B0\u641C\u7D22",
        cover: null,
        desc: "\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684 Webview \u7A97\u53E3\u8FDB\u5165\u7F51\u7AD9\u901A\u8FC7\u9A8C\u8BC1\u52A0\u8F7D\u9996\u9875\u540E\u518D\u91CD\u65B0\u641C\u7D22"
      };
    }
    const data = str.split("|");
    const res = await this.request(data[0]);
    if (res.length < 25e3) {
      throw Error("\u60A8\u6CA1\u6709\u6743\u9650\u8BBF\u95EE\u6B64\u6570\u636E\uFF0C\u8BF7\u5347\u7EA7\u4F1A\u5458 -\u3010\u7A00\u996D\u52A8\u6F2B\u3011");
    }
    const desc = res.match(/\bid="height_limit".*?>([\s\S]*?)</)[1].replace("&nbsp;", " ");
    const labelTask = this.querySelectorAll(res, ".anthology-tab a");
    const sources = await this.querySelectorAll(res, ".anthology-list-play");
    const labels = (await labelTask).map((e) => e.content.match(/i>(.*?)</)[1].replace("&nbsp;", ""));
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
    const res = await this.request(url);
    const json = JSON.parse(res.match(/var player_aaaa=({.+?})</)[1]);
    const link = decodeURIComponent(json.encrypt ? this.base64decode(json.url) : json.url);
    console.log(link);
    return { type: link.indexOf(".mp4") > 0 ? "mp4" : "hls", url: link };
  }
  // async checkUpdate(str) {
  //   const url = str.split("|")[0];
  //   const res = await this.request(url);
  //   return this.text(await this.querySelector(res, ".slide-info > .slide-info-remarks:nth-child(1)"));
  // }
}
