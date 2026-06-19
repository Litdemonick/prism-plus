// ==PrismHubExtension==
// @name         紳士漫畫
// @version      v0.0.2
// @author       appdevelpo
// @lang         zh-tw
// @license      MIT
// @type         manga
// @icon         https://www.wnacg.com/favicon.ico
// @package      wnacg.com
// @webSite      https://www.wnacg.com
// @nsfw         true
// ==/PrismHubExtension==

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "headers", {});
    __publicField(this, "maxnum", 0);
    __publicField(this, "favnum", 0);
    __publicField(this, "baseurl", "");
    __publicField(this, "fav_lists", {});
    __publicField(this, "url_strs", {
      home: { all: "" },
      new: { all: "/albums-index-page-$.html" },
      dojinshi: {
        all: "/albums-index-page-$-cate-5.html",
        chi: "/albums-index-page-$-cate-1.html",
        jpa: "/albums-index-page-$-cate-12.html",
        eng: "/albums-index-page-$-cate-16.html"
      },
      tankobon: {
        all: "/albums-index-page-$-cate-6.html",
        chi: "/albums-index-page-$-cate-9.html",
        jpa: "/albums-index-page-$-cate-13.html",
        eng: "/albums-index-page-$-cate-17.html"
      },
      magazine: {
        all: "/albums-index-page-$-cate-7.html",
        chi: "/albums-index-page-$-cate-10.html",
        jpa: "/albums-index-page-$-cate-14.html",
        eng: "/albums-index-page-$-cate-18.html"
      },
      korea: {
        all: "/albums-index-page-$-cate-19.html",
        chi: "/albums-index-page-$-cate-20.html",
        oth: "/albums-index-page-$-cate-21.html"
      },
      cg: { all: "/albums-index-page-$-cate-2.html" },
      cosplay: { all: "/albums-index-page-$-cate-3.html" },
      thridd: { all: "/albums-index-page-$-cate-22.html" }
    });
  }
  async load() {
    await this.registerSetting({
      title: "\u7F51\u5740",
      key: "baseurl",
      type: "input",
      description: "\u81EA\u5B9A\u4E49\u7F51\u5740",
      defaultValue: "https://www.wnacg.com"
    });
    await this.registerSetting({
      title: "\u7528\u6237Cookies",
      key: "cookies",
      type: "input",
      description: "\u7528\u4E8E\u8BFB\u53D6\u7528\u6237\u6536\u85CF\u7684Cookies\uFF08MPIC_bnS5\uFF09",
      defaultValue: ""
    });
  }
  //加载设置项
  async load_settings() {
    this.baseurl = await this.getSetting("baseurl");
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      Referer: this.baseurl,
      "Miru-Url": this.baseurl
    };
  }
  async createFilter(filter) {
    const categories = {
      title: "\u5206\u7C7B",
      max: 1,
      min: 1,
      default: "home",
      options: {
        home: "\u4E3B\u9875",
        new: "\u6700\u65B0",
        dojinshi: "\u540C\u4EBA\u5FD7",
        tankobon: "\u5355\u884C\u672C",
        magazine: "\u6742\u5FD7&\u77ED\u7BC7",
        korea: "\u97E9\u6F2B",
        cg: "CG\u756B\u96C6",
        cosplay: "Cosplay",
        thridd: "3D\u6F2B\u756B",
        fav: "\u6536\u85CF"
      }
    };
    const lists = {
      home: { all: "\u5168\u90E8" },
      new: { all: "\u5168\u90E8" },
      dojinshi: { all: "\u5168\u90E8", chi: "\u6F22\u5316", jpa: "\u65E5\u8A9E", eng: "English" },
      tankobon: { all: "\u5168\u90E8", chi: "\u6F22\u5316", jpa: "\u65E5\u8A9E", eng: "English" },
      magazine: { all: "\u5168\u90E8", chi: "\u6F22\u5316", jpa: "\u65E5\u8A9E", eng: "English" },
      korea: { all: "\u5168\u90E8", chi: "\u6F22\u5316", oth: "\u5176\u4ED6" },
      cg: { all: "\u5168\u90E8" },
      cosplay: { all: "\u5168\u90E8" },
      thridd: { all: "\u5168\u90E8" },
      fav: { all: "\u5168\u90E8" }
    };
    let category = "home";
    if (filter && filter["categories"]) {
      category = filter["categories"][0];
    }
    let options = {};
    if (category == "fav") {
      if (!this.fav_lists["all"]) {
        await this.get_fav_lists();
      }
      options = this.fav_lists;
    } else {
      options = lists[category];
    }
    return {
      categories,
      lists: {
        title: "\u5217\u8868",
        max: 1,
        min: 1,
        default: "all",
        options
      }
    };
  }
  async get_maxnum(res) {
    let pre_page_nums = await this.querySelectorAll(res, "div.paginator > a");
    let num_str = "";
    for (let page_num of pre_page_nums) {
      num_str = page_num.content.match(/(\d+)/g)[0];
    }
    const num = parseInt(num_str);
    if (res.search(`<span class="thispage">${num + 1}</span>`) != -1) {
      return num + 1;
    }
    return num;
  }
  //获取收藏列表
  async get_fav_lists() {
    var headers = this.headers;
    headers["Cookie"] = `MPIC_bnS5=${await this.getSetting("cookies")}`;
    var fav_lists = {};
    const res = await this.request(`/users-users_fav.html`, { headers });
    this.favnum = await this.get_maxnum(res);
    const items = await this.querySelectorAll(res, "label.nav_list > a");
    for (const item of items) {
      let id = "";
      try {
        id = "c-" + item.content.match(/(\d+)/g)[0];
      } catch (e) {
        id = "all";
      }
      const name = item.content.match(/">(.*?)<\/a>/)[1];
      fav_lists[id] = name;
    }
    this.fav_lists = fav_lists;
  }
  //获取收藏
  async get_fav(id, page) {
    var headers = this.headers;
    headers["Cookie"] = `MPIC_bnS5=${await this.getSetting("cookies")}`;
    if (id == "all") {
      id = "c-0";
    }
    const res = await this.request(`/users-users_fav-page-${page}-${id}.html`, { headers });
    const bsxList = await this.querySelectorAll(res, "div.asTB");
    const maxnum = await this.get_maxnum(res);
    console.log(`${page}/${maxnum}`);
    if (id == "c-0") {
      this.favnum = maxnum;
    }
    if (page > maxnum) {
      return [];
    }
    const mangas = [];
    for (const element of bsxList) {
      const html = element.content;
      const url = await this.getAttributeText(html, "div.box_cel > p.l_title > a", "href");
      const title = await this.querySelector(html, "div.box_cel > p.l_title > a").text;
      const cover = "https:" + await this.getAttributeText(html, "img", "src");
      mangas.push({
        title,
        url,
        cover
      });
    }
    return mangas;
  }
  //获取漫画
  async get_mangas(url_str, page) {
    if (page != 0) {
      url_str = url_str.replace("$", page.toString());
    }
    if (url_str == "" && page > 1) {
      return [];
    }
    const res = await this.request(url_str, { headers: this.headers });
    if (url_str != "" && url_str.search("cate") == -1) {
      this.maxnum = await this.get_maxnum(res);
    }
    const bsxList = await this.querySelectorAll(res, "li.gallary_item");
    const mangas = [];
    for (const element of bsxList) {
      const html = element.content;
      const url = await this.getAttributeText(html, "div.pic_box > a", "href");
      let title = await this.getAttributeText(html, "div.pic_box > a", "title");
      title = title.replaceAll("<em>", "").replaceAll("</em>", "");
      const cover = "https:" + await this.getAttributeText(html, "div.pic_box > a > img", "src");
      mangas.push({
        title,
        url,
        cover,
        headers: this.headers
      });
    }
    return mangas;
  }
  async latest(page) {
    await this.load_settings();
    return await this.get_mangas("", page);
  }
  async search(kw, page, filter) {
    if (kw) {
      if (kw == "random") {
        if (page > 1) {
          return [];
        }
        const random_page = Math.floor(Math.random() * this.maxnum) + 1;
        return await this.get_mangas(this.url_strs["new"]["all"], random_page);
      }
      if (kw == "random_fav") {
        if (page > 1) {
          return [];
        }
        const random_page = Math.floor(Math.random() * this.favnum) + 1;
        console.log(this.favnum);
        return await this.get_fav("all", random_page);
      }
      return await this.get_mangas(`/search/index.php?q=${kw}&m=&syn=yes&f=_all&s=create_time_DESC&p=$`, page);
    } else {
      if (filter["categories"][0] == "fav") {
        return await this.get_fav(filter["lists"][0], page);
      } else {
        return await this.get_mangas(this.url_strs[filter["categories"][0]][filter["lists"][0]], page);
      }
    }
  }
  async detail(url) {
    const res = await this.request(url, { headers: this.headers });
    const title = await this.querySelector(res, "h2").text;
    let cover = await this.getAttributeText(res, "div.uwthumb > img", "src");
    if (cover[3] == "/") {
      cover = "https:" + cover.substring(2, cover.length);
    } else {
      cover = "https:" + cover;
    }
    const desc = await this.querySelector(res, "div.uwconn > p").text;
    const id = url.match(/-aid-(.+?).html/)[1];
    return {
      title: title || "Unknown title",
      cover: cover || "",
      desc: desc || "No description available.",
      episodes: [
        {
          title: "\u6B63\u5E38\u753B\u8D28",
          urls: [{ name: "\u5F00\u59CB\u9605\u8BFB", url: `/photos-gallery-aid-${id}.html` }]
        },
        {
          title: "\u4F4E\u753B\u8D28",
          urls: [{ name: "\u5F00\u59CB\u9605\u8BFB", url: `/photos-webp-aid-${id}.html` }]
        }
      ]
    };
  }
  async watch(url) {
    const res = await this.request(url, { headers: this.headers });
    const urls = [];
    let urls_str = res.substring(res.search("imglist") + 12, res.search("\u559C\u6B61\u7D33\u58EB\u6F2B\u756B\u7684\u540C\u5B78\u8ACB\u52A0\u5165\u6536\u85CF\u54E6\uFF01") + 17);
    const url_list = urls_str.split("},{");
    for (let url_str of url_list) {
      urls.push("https:" + url_str.substring(url_str.search("img_host") + 11, url_str.search('", ') - 1));
    }
    return {
      urls,
      header: this.headers
    };
  }
}
