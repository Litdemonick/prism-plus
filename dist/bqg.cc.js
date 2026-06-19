// ==PrismHubExtension==
// @name         笔趣阁
// @version      v0.0.2
// @author       yxxyun
// @lang         zh-cn
// @icon         https://m.bi17.cc/favicon.ico
// @license      MIT
// @package      bqg.cc
// @type         fikushon
// @webSite      https://m.bi17.cc
// ==/PrismHubExtension==

var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var _options;
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "headers", {
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36"
    });
    __privateAdd(this, _options, {
      "1": "\u7384\u5E7B",
      "2": "\u6B66\u4FA0",
      "3": "\u90FD\u5E02",
      "4": "\u5386\u53F2",
      "6": "\u79D1\u5E7B",
      "5": "\u7F51\u6E38",
      "7": "\u5973\u751F",
      "0": "\u5168\u672C"
    });
  }
  async latest(page) {
    const defaultCategory = await this.getSetting("defaultCategory");
    const res = await this.request(`/json?sortid=${defaultCategory}&page=${page}`);
    return res.map((e) => {
      return { title: e.articlename, url: e.url_list, cover: e.url_img };
    });
  }
  async createFilter(filter) {
    const defaultCategory = await this.getSetting("defaultCategory");
    const categories = {
      title: "\u7C7B\u578B",
      max: 1,
      min: 1,
      default: defaultCategory,
      options: __privateGet(this, _options)
    };
    if (filter) {
      this.defaultCategory = filter.categories[0];
    }
    return {
      categories
    };
  }
  async search(kw, page, filter) {
    if (kw.trim().length == 0) {
      const res2 = await this.request(`/json?sortid=${filter["categories"]}&page=${page}`);
      return res2.map((e) => {
        return { title: e.articlename, url: e.url_list, cover: e.url_img };
      });
    }
    const res = await this.request(`/user/search.html?q=${kw}`);
    return res.map((item) => ({
      title: item.articlename,
      url: item.url_list,
      cover: item.url_img
    }));
  }
  async load() {
    await this.registerSetting({
      title: "\u9810\u8A2D\u985E\u5225",
      key: "defaultCategory",
      type: "radio",
      defaultValue: "1",
      description: "\u4FEE\u6539\u9810\u8A2D\u641C\u5C0B\u985E\u5225",
      options: Object.entries(__privateGet(this, _options)).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
      }, {})
    });
  }
  async detail(url) {
    const res = await this.request(`${url}`);
    const title = await this.querySelector(res, 'meta[property="og:novel:book_name"]').getAttributeText("content");
    const cover = await this.querySelector(res, 'meta[property="og:image"]').getAttributeText("content");
    const desc = await this.querySelector(res, 'meta[property="og:description"]').getAttributeText("content");
    const listres = await this.request(`${url}list.html`);
    const episodes = [];
    const bsxList = await this.querySelectorAll(listres, "div.book_last > dl > dd");
    for (const element of bsxList) {
      const html = await element.content;
      const url2 = await this.getAttributeText(html, "a", "href");
      const name = await this.querySelector(html, "a").text;
      episodes.push({
        name,
        url: url2
      });
    }
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
    const res = await this.request(`${url}`);
    const contentList = await this.querySelectorAll(res, "div.Readarea.ReadAjax_content");
    const title = await this.querySelector(res, "span.title").text;
    let contenthtml = await this.querySelector(contentList[0].content, "div").content.replace(/<div.*?>|<\/div>|\t|\n/g, "");
    let id = await this.getAttributeText(res, "a.Readpage_down", "href");
    while (true) {
      const res2 = await this.request(`${id}`);
      const contentList2 = await this.querySelectorAll(res2, "div.Readarea.ReadAjax_content");
      contenthtml += await this.querySelector(contentList2[0].content, "div").content.replace(/<div.*?>|<\/div>|\t|\n/g, "");
      id = await this.getAttributeText(res2, "a.Readpage_down", "href");
      if (id.indexOf("_") < 0) break;
    }
    contenthtml = contenthtml.replace(/<br>|请收藏.*?<\/p>/g, "\n");
    contenthtml = contenthtml.trim();
    const content = contenthtml.split("\n").filter((item) => item.trim() !== "");
    return {
      title,
      content
    };
  }
}
_options = new WeakMap();
