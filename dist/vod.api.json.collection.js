// ==PrismHubExtension==
// @name         影视集合
// @version      v0.0.3
// @author       Horis
// @lang         zh-cn
// @license      MIT
// @package      vod.api.json.collection
// @type         bangumi
// @webSite      https://
// ==/PrismHubExtension==

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
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
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "apis", {
      baidu: "https://api.apibdzy.com/api.php/provide/vod/from/dbm3u8/",
      baofen: "https://bfzyapi.com/api.php/provide/vod/",
      "394tv": "https://www.394tv.com/api.php/provide/vod/",
      languang: "http://www.zzrhgg.com/api.php/provide/vod/",
      lehuo: "https://cj.vodimg.top/api.php/provide/vod/",
      oletv: "https://olevod1.com/api.php/provide/vod/",
      piaoling: "https://p2100.net/api.php/provide/vod/",
      shenmajuhe: "https://img.smdyw.top/api.php/provide/vod/",
      yingmi: "https://www.inmi.app/api.php/provide/vod/",
      yingtu: "https://cj.vodimg.top/api.php/provide/vod/",
      feifan: "https://cj.ffzyapi.com/api.php/provide/vod/from/ffm3u8/",
      feisu: "https://www.feisuzyapi.com/api.php/provide/vod/from/fsm3u8/",
      guangsu: "https://api.guangsuapi.com/api.php/provide/vod/from/gsm3u8/",
      haiwaikan: "https://haiwaikan.com/api.php/provide/vod/",
      hongniu: "https://www.hongniuzy2.com/api.php/provide/vod/from/hnm3u8/",
      ikun: "https://ikunzyapi.com/api.php/provide/vod",
      jinying: "https://jyzyapi.com/provide/vod/from/jinyingm3u8/",
      jisu: "https://jszyapi.com/api.php/provide/vod/from/jsm3u8/",
      kuaiche: "https://caiji.kczyapi.com/api.php/provide/vod/from/kcm3u8/",
      liangzi: "https://cj.lziapi.com/api.php/provide/vod/from/lzm3u8/",
      qihu: "https://caiji.qhzyapi.com/api.php/provide/vod/from/qhm3u8/",
      shandian: "https://sdzyapi.com/api.php/provide/vod/from/sdm3u8/",
      subo: "https://subocaiji.com/api.php/provide/vod/from/subm3u8/",
      taopian: "https://taopianapi.com/cjapi/mc/vod/json/m3u8.html",
      tiankong: "https://api.tiankongapi.com/api.php/provide/vod/from/tkm3u8/",
      uku: "https://api.ukuapi.com/api.php/provide/vod/from/ukm3u8/",
      wolong: "https://collect.wolongzyw.com/api.php/provide/vod/",
      wujin: "https://api.wujinapi.me/api.php/provide/vod/from/wjm3u8/",
      xinlang: "https://api.xinlangapi.com/xinlangapi.php/provide/vod/from/xlm3u8/",
      yinghua: "https://m3u8.apiyhzy.com/api.php/provide/vod/",
      youzhi: "https://api.1080zyku.com/inc/apijson.php/provide/vod/",
      suoni: "https://suoniapi.com/api.php/provide/vod/from/snm3u8/",
      zhongzi: "https://zzdj.cc/api.php/provide/vod/from/zzdj/",
      leshi: "https://leshizyapi.com/api.php/provide/vod/from/leshi/",
      modu: "https://caiji.moduapi.cc/api.php/provide/vod/from/modum3u8/",
      yaoxie: "http://zyz.yxys.top/api.php/provide/vod/from/yxys/",
      haohua: "https://hhzyapi.com/api.php/provide/vod/from/hhm3u8/",
      jiafeimao: "https://xzcjz.com/api.php/provide/vod/",
      sijiu: "https://49zyw.com/api.php/provide/vod/from/49zyw/",
      jiguang: "https://jiguang.la/api.php/provide/vod/from/jiguang/",
      kuaiyun: "https://kuaiyun-api.com/api.php/provide/vod/from/kuaiyun/",
      kuaikan: "https://kuaikan-api.com/api.php/provide/vod/from/kuaikan/",
      qihu: "https://caiji.qhzyapi.com/api.php/provide/vod/from/qhm3u8/"
    });
    __publicField(this, "api", "https://api.apibdzy.com/api.php/provide/vod/from/dbm3u8/");
    __publicField(this, "headers", {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36"
    });
    __publicField(this, "videoInfoCache", {});
    __publicField(this, "apiCategoryCache", {});
    __publicField(this, "defaultApiKey", null);
  }
  async latest(page) {
    let res;
    if (!this.defaultApiKey) {
      for (const key of Object.keys(this.apis)) {
        this.api = this.apis[key];
        this.defaultApiKey = key;
        try {
          res = await this.callApi({ page, action: "videolist" });
          break;
        } catch (error) {
          console.log(`\u6E90 ${key} \u52A0\u8F7D\u5931\u8D25\uFF0C\u81EA\u52A8\u5207\u6362\u5230\u4E0B\u4E00\u4E2A\u6E90`);
        }
      }
    } else {
      res = await this.callApi({ page, action: "videolist" });
    }
    res.list.forEach((item) => {
      this.videoInfoCache[item.vod_id] = item;
    });
    return res.list.map((item) => ({
      title: item.vod_name,
      url: `${this.api}|${item.vod_id}`,
      cover: item.vod_pic,
      //desc: item.vod_content,
      update: item.vod_remarks
    }));
  }
  async createFilter(filter) {
    const api = {
      title: "\u6E90",
      min: 1,
      max: 1,
      default: this.defaultApiKey || "baidu",
      options: {
        baidu: "\u767E\u5EA6\u5F71\u89C6",
        baofen: "\u66B4\u98CE\u5F71\u89C6",
        "394tv": "39\u5F71\u89C6",
        languang: "\u84DD\u5149\u5F71\u89C6",
        lehuo: "\u4E50\u6D3B\u5F71\u89C6",
        oletv: "\u6B27\u4E50\u5F71\u89C6",
        piaoling: "\u98D8\u96F6\u5F71\u89C6",
        shenmajuhe: "\u795E\u9A6C\u805A\u5408\u5F71\u89C6",
        yingmi: "\u6620\u8FF7\u5F71\u89C6",
        yingtu: "\u5F71\u56FE\u5F71\u89C6",
        feifan: "\u975E\u51E1\u5F71\u89C6",
        feisu: "\u98DE\u901F\u5F71\u89C6",
        guangsu: "\u5149\u901F\u5F71\u89C6",
        haiwaikan: "\u6D77\u5916\u770B\u5F71\u89C6",
        hongniu: "\u7EA2\u725B\u5F71\u89C6",
        ikun: "iKun\u5F71\u89C6",
        jinying: "\u91D1\u9E70\u5F71\u89C6",
        jisu: "\u6781\u901F\u5F71\u89C6",
        kuaiche: "\u5FEB\u8F66\u5F71\u89C6",
        liangzi: "\u91CF\u5B50\u5F71\u89C6",
        qihu: "\u5947\u864E\u5F71\u89C6",
        shandian: "\u95EA\u7535\u5F71\u89C6",
        subo: "\u901F\u64AD\u5F71\u89C6",
        taopian: "\u6DD8\u7247\u5F71\u89C6",
        tiankong: "\u5929\u7A7A\u5F71\u89C6",
        uku: "U\u9177\u5F71\u89C6",
        wolong: "\u5367\u9F99\u5F71\u89C6",
        wujin: "\u65E0\u5C3D\u5F71\u89C6",
        xinlang: "\u65B0\u6D6A\u5F71\u89C6",
        yinghua: "\u6A31\u82B1\u5F71\u89C6",
        youzhi: "\u4F18\u8D28\u5F71\u89C6",
        suoni: "\u7D22\u5C3C\u5F71\u89C6",
        zhongzi: "\u79CD\u5B50\u77ED\u5267",
        leshi: "\u4E50\u89C6\u5F71\u89C6",
        modu: "\u9B54\u90FD\u52A8\u6F2B",
        yaoxie: "\u8000\u534F\u5F71\u89C6",
        haohua: "\u8C6A\u534E\u5F71\u89C6",
        jiafeimao: "\u52A0\u83F2\u732B\u5F71\u89C6",
        sijiu: "49\u5F71\u89C6",
        jiguang: "\u6781\u5149\u5F71\u89C6",
        kuaiyun: "\u5FEB\u4E91\u5F71\u89C6",
        kuaikan: "\u5FEB\u770B\u5F71\u89C6",
        qihu: "\u5947\u864E\u5F71\u89C6"
      }
    };
    let apiKey = this.defaultApiKey || "baidu";
    if (filter && filter.api) {
      this.api = this.apis[filter.api[0]];
      apiKey = filter.api[0];
    }
    return {
      api,
      category: {
        title: "\u5206\u7C7B",
        max: 1,
        min: 1,
        default: "all",
        options: __spreadValues({
          all: "\u5168\u90E8"
        }, await this.category(apiKey))
      }
    };
  }
  async search(kw, page, filter) {
    var _a, _b;
    const apiKey = (_a = filter == null ? void 0 : filter.api) == null ? void 0 : _a[0];
    const category = (_b = filter == null ? void 0 : filter.category) == null ? void 0 : _b[0];
    if (kw === "" && (!category || category === "all")) {
      return this.latest(page);
    }
    let res;
    if (kw && apiKey === "haiwaikan") {
      res = await this.callApi({ query: kw, page });
      kw = res.list.map((item) => item.vod_id).join();
    }
    if (kw.split(",").every((s) => isNumeric(s))) {
      res = await this.callApi({ ids: kw, action: "videolist" });
    } else if (category && category !== "all") {
      res = await this.callApi({
        type: category,
        page,
        action: "videolist"
      });
    } else {
      res = await this.callApi({ query: kw, page, action: "videolist" });
    }
    res.list.forEach((item) => {
      this.videoInfoCache[item.vod_id] = item;
    });
    return res.list.map((item) => ({
      title: item.vod_name,
      url: `${this.api}|${item.vod_id}`,
      cover: item.vod_pic,
      //desc: item.vod_content,
      update: item.vod_remarks
    }));
  }
  async detail(url) {
    var [api, url] = url.split("|");
    const item = this.videoInfoCache[url] || (await this.callApi({ ids: url, action: "videolist", api })).list[0];
    const servers = item.vod_play_from.split("$$$");
    const episodes = [];
    loop: for (const [index, playlist] of Object.entries(
      item.vod_play_url.split("$$$")
    )) {
      const urls = [];
      for (const info of rtrim(playlist, "#").split("#")) {
        const [episodeName, playUrl] = info.split("$");
        urls.push({
          name: episodeName,
          url: playUrl
        });
      }
      episodes.push({
        title: servers[index],
        urls
      });
    }
    var desc = item.vod_blurb;
    if (!desc) {
      desc = item.vod_content;
    }
    return {
      title: item.vod_name,
      cover: item.vod_pic,
      desc,
      episodes
    };
  }
  async watch(url) {
    return {
      type: "hls",
      url
    };
  }
  async category(apiKey) {
    if (this.apiCategoryCache[apiKey]) {
      return this.apiCategoryCache[apiKey];
    }
    try {
      const res = await this.callApi();
      const options = Object.fromEntries(
        res.class.map((item) => [item.type_id, item.type_name])
      );
      this.apiCategoryCache[apiKey] = options;
      return options;
    } catch (error) {
      return {};
    }
  }
  async callApi({
    query,
    page = 0,
    ids,
    type,
    pageSize,
    action = "list",
    api = this.api
  } = {}) {
    var params = `?ac=${action}`;
    if (query) {
      params += `&wd=${encodeURIComponent(query)}`;
    } else if (ids) {
      params += `&ids=${ids}`;
    }
    if (page > 0) {
      params += `&pg=${page}`;
    }
    if (type) {
      params += `&t=${type}`;
    }
    if (pageSize) {
      params += `&pagesize=${pageSize}`;
    }
    const options = {
      headers: __spreadProps(__spreadValues({}, this.headers), {
        Referer: api + params,
        "Miru-Url": api
      }),
      method: "get"
    };
    return await this.request(params, options);
  }
}
function rtrim(str, ch) {
  let i = str.length;
  while (i-- && str.charAt(i) === ch) ;
  return str.substring(0, i + 1);
}
function isNumeric(str) {
  if (typeof str != "string") return false;
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
  !isNaN(parseFloat(str));
}
