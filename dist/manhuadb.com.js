// ==PrismHubExtension==
// @name         漫画DB
// @version      v0.0.1
// @author       ftbom
// @lang         zh
// @license      MIT
// @type         manga
// @icon         https://www.manhuadb.com/assets/www/img/favicon.png
// @package      manhuadb.com
// @webSite      https://www.manhuadb.com
// @nsfw         false
// ==/PrismHubExtension==

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "baseurl", "https://www.manhuadb.com");
    __publicField(this, "headers", {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      Referer: this.baseurl
    });
  }
  base64decode(str) {
    var base64DecodeChars = new Array(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);
    var c1, c2, c3, c4;
    var i, len, out;
    len = str.length;
    i = 0;
    out = "";
    while (i < len) {
      do {
        c1 = base64DecodeChars[str.charCodeAt(i++) & 255];
      } while (i < len && c1 == -1);
      if (c1 == -1)
        break;
      do {
        c2 = base64DecodeChars[str.charCodeAt(i++) & 255];
      } while (i < len && c2 == -1);
      if (c2 == -1)
        break;
      out += String.fromCharCode(c1 << 2 | (c2 & 48) >> 4);
      do {
        c3 = str.charCodeAt(i++) & 255;
        if (c3 == 61)
          return out;
        c3 = base64DecodeChars[c3];
      } while (i < len && c3 == -1);
      if (c3 == -1)
        break;
      out += String.fromCharCode((c2 & 15) << 4 | (c3 & 60) >> 2);
      do {
        c4 = str.charCodeAt(i++) & 255;
        if (c4 == 61)
          return out;
        c4 = base64DecodeChars[c4];
      } while (i < len && c4 == -1);
      if (c4 == -1)
        break;
      out += String.fromCharCode((c3 & 3) << 6 | c4);
    }
    return out;
  }
  cover_convert(cover_url) {
    if (cover_url.search("com") == -1) {
      return this.baseurl + cover_url;
    }
    return cover_url;
  }
  async get_mangas(url, search) {
    const res = await this.request(url, { headers: this.headers });
    var str;
    if (search) {
      str = "div.comicbook-index";
    } else {
      str = "div.media";
    }
    const items = await this.querySelectorAll(res, str);
    const mangas = [];
    for (let item of items) {
      const html = item.content;
      const cover = this.cover_convert(await this.getAttributeText(html, "a.d-block > img", "src"));
      var title;
      if (search) {
        title = await this.getAttributeText(html, "a.d-block", "title");
      } else {
        title = await this.getAttributeText(html, "a.d-block > img", "alt");
        title = title.replace("\u7684\u5C01\u9762\u56FE", "");
      }
      const url2 = await this.getAttributeText(html, "a.d-block", "href");
      mangas.push({
        title,
        url: url2,
        cover,
        headers: this.headers
      });
    }
    return mangas;
  }
  async createFilter(filter) {
    const locations = {
      title: "\u5730\u533A",
      max: 1,
      min: 1,
      default: "all",
      options: {
        "all": "\u5168\u90E8",
        "-r-4": "\u65E5\u672C",
        "-r-5": "\u9999\u6E2F",
        "-r-6": "\u97E9\u56FD",
        "-r-7": "\u53F0\u6E7E",
        "-r-8": "\u5185\u5730",
        "-r-9": "\u6B27\u7F8E"
      }
    };
    const readers = {
      title: "\u8BFB\u8005",
      max: 1,
      min: 1,
      default: "all",
      options: {
        "all": "\u5168\u90E8",
        "-a-3": "\u5C11\u5E74",
        "-a-4": "\u9752\u5E74",
        "-a-5": "\u5C11\u5973",
        "-a-6": "\u7537\u6027",
        "-a-7": "\u5973\u6027",
        "-a-9": "\u901A\u7528",
        "-a-10": "\u513F\u7AE5",
        "-a-11": "\u5973\u9752",
        "-a-12": "18\u9650"
      }
    };
    const status = {
      title: "\u72B6\u6001",
      max: 1,
      min: 1,
      default: "all",
      options: {
        "all": "\u5168\u90E8",
        "-s-1": "\u8FDE\u8F7D\u4E2D",
        "-s-2": "\u5DF2\u5B8C\u7ED3"
      }
    };
    const categories = {
      title: "\u7C7B\u578B",
      max: 1,
      min: 1,
      default: "all",
      options: {
        "all": "\u5168\u90E8",
        "-c-26": "\u7231\u60C5",
        "-c-66": "\u4E1C\u65B9",
        "-c-12": "\u5192\u9669",
        "-c-64": "\u6B22\u4E50\u5411",
        "-c-39": "\u767E\u5408",
        "-c-41": "\u641E\u7B11",
        "-c-20": "\u79D1\u5E7B",
        "-c-40": "\u6821\u56ED",
        "-c-33": "\u751F\u6D3B",
        "-c-48": "\u9B54\u5E7B",
        "-c-13": "\u5947\u5E7B",
        "-c-46": "\u70ED\u8840",
        "-c-44": "\u683C\u6597",
        "-c-71": "\u5176\u4ED6",
        "-c-52": "\u795E\u9B3C",
        "-c-43": "\u9B54\u6CD5",
        "-c-27": "\u60AC\u7591",
        "-c-18": "\u52A8\u4F5C",
        "-c-55": "\u7ADE\u6280",
        "-c-72": "\u7EAF\u7231",
        "-c-32": "\u559C\u5267",
        "-c-59": "\u840C\u7CFB",
        "-c-16": "\u6050\u6016",
        "-c-53": "\u803D\u7F8E",
        "-c-56": "\u56DB\u683C",
        "-c-80": "\u3086\u308A",
        "-c-54": "\u6CBB\u6108",
        "-c-60": "\u4F2A\u5A18",
        "-c-73": "\u8230\u5A18",
        "-c-47": "\u52B1\u5FD7",
        "-c-58": "\u804C\u573A",
        "-c-30": "\u6218\u4E89",
        "-c-51": "\u4FA6\u63A2",
        "-c-21": "\u60CA\u609A",
        "-c-22": "\u804C\u4E1A",
        "-c-9": "\u5386\u53F2",
        "-c-11": "\u4F53\u80B2",
        "-c-45": "\u7F8E\u98DF",
        "-c-68": "\u79C0\u5409",
        "-c-67": "\u6027\u8F6C\u6362",
        "-c-19": "\u63A8\u7406",
        "-c-70": "\u97F3\u4E50\u821E\u8E48",
        "-c-57": "\u540E\u5BAB",
        "-c-29": "\u6599\u7406",
        "-c-61": "\u673A\u6218",
        "-c-78": "AA",
        "-c-37": "\u793E\u4F1A",
        "-c-76": "\u8282\u64CD",
        "-c-17": "\u97F3\u4E50",
        "-c-23": "\u6B66\u4FA0",
        "-c-65": "\u897F\u65B9\u9B54\u5E7B",
        "-c-28": "\u8D44\u6599\u96C6",
        "-c-10": "\u4F20\u8BB0",
        "-c-49": "\u5B85\u7537",
        "-c-69": "\u8F7B\u5C0F\u8BF4",
        "-c-62": "\u9ED1\u9053",
        "-c-50": "\u821E\u8E48",
        "-c-42": "\u6742\u5FD7",
        "-c-34": "\u707E\u96BE",
        "-c-77": "\u5B85\u7CFB",
        "-c-74": "\u989C\u827A",
        "-c-63": "\u8150\u5973",
        "-c-81": "\u9732\u8425",
        "-c-82": "\u65C5\u884C",
        "-c-83": "TS"
      }
    };
    return {
      locations,
      readers,
      status,
      categories
    };
  }
  async latest(page) {
    if (page > 1) {
      return [];
    }
    const res = await this.request("", { headers: this.headers });
    const items = await this.querySelectorAll(res, "div.comicbook-index");
    var mangas = [];
    for (let item of items) {
      const html = item.content;
      const cover = this.cover_convert(await this.getAttributeText(html, "a > img", "src"));
      const title = await this.getAttributeText(html, "a > img", "alt");
      const url = await this.getAttributeText(html, "a", "href");
      mangas.push({
        title: title.replace("\u5C01\u9762", ""),
        url,
        cover,
        headers: this.headers
      });
    }
    return mangas;
  }
  async search(kw, page, filter) {
    if (kw) {
      return await this.get_mangas(`/search?q=${kw}&p=${page}`, 1);
    } else {
      const url = `/manhua/list${filter["locations"][0]}${filter["readers"][0]}${filter["status"][0]}${filter["categories"][0]}-page-${page}.html`;
      console.log(url.replaceAll("all", ""));
      return await this.get_mangas(url.replaceAll("all", ""), 0);
    }
  }
  async detail(url) {
    const res = await this.request(url, { headers: this.headers });
    const title = await this.querySelector(res, "h1.comic-title").text;
    const cover = this.cover_convert(await this.getAttributeText(res, "td.comic-cover > img", "src"));
    const desc = await this.querySelector(res, "p.comic_story").text;
    const items = await this.querySelectorAll(res, "ol.links-of-books");
    const episodes = [];
    const ep_names = await this.querySelectorAll(res, "span.h3");
    const ep_titles = [];
    for (const ep_name of ep_names) {
      ep_titles.push(ep_name.content.replace('<span class="h3 comic_version">', "").replace("</span>", "").replace('<span class="h3">', ""));
    }
    var index = 0;
    for (const lists of items) {
      const html = lists.content;
      const chapters = await this.querySelectorAll(html, "li");
      const urls = [];
      for (const chapter of chapters) {
        const h = chapter.content;
        const name = await this.getAttributeText(h, "a", "title");
        const url2 = await this.getAttributeText(h, "a", "href");
        urls.push({ name, url: url2 });
      }
      episodes.push({ title: ep_titles[index], urls });
      index = index + 1;
    }
    return {
      title,
      cover,
      desc,
      episodes
    };
  }
  async watch(url) {
    const res = await this.request(url, { headers: this.headers });
    const urls = [];
    var script_str = res.match(/<script>var img_data = '([^']*)';<\/script>/)[1];
    const img_urls = JSON.parse(this.base64decode(script_str));
    var img_base = await this.getAttributeText(res, "img.show-pic", "src");
    img_base = img_base.substring(0, img_base.search(img_urls[0]["img"]));
    for (const url2 of img_urls) {
      urls.push(img_base + url2["img"]);
    }
    return {
      urls,
      headers: this.headers
    };
  }
}
