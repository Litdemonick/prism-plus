// ==PrismHubExtension==
// @name         Komiic漫畫
// @version      v0.0.2
// @author       hualiong
// @lang         zh-tw
// @license      MIT
// @icon         https://komiic.com/favicon.ico
// @package      komiic.com
// @type         manga
// @webSite      https://komiic.com
// @nsfw         false
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
export default class extends Extension {
  constructor() {
    super(...arguments);
    __publicField(this, "flag", false);
    __publicField(this, "operation", {
      recentUpdate: "query recentUpdate($pagination: Pagination!) {\n  recentUpdate(pagination: $pagination) {\n    id\n    title\n    status\n    year\n    imageUrl\n    authors {\n      id\n      name\n      __typename\n    }\n    categories {\n      id\n      name\n      __typename\n    }\n    dateUpdated\n    monthViews\n    views\n    favoriteCount\n    lastBookUpdate\n    lastChapterUpdate\n    __typename\n  }\n}",
      searchComicAndAuthorQuery: "query searchComicAndAuthorQuery($keyword: String!) {\n  searchComicsAndAuthors(keyword: $keyword) {\n    comics {\n      id\n      title\n      status\n      year\n      imageUrl\n      authors {\n        id\n        name\n        __typename\n      }\n      categories {\n        id\n        name\n        __typename\n      }\n      dateUpdated\n      monthViews\n      views\n      favoriteCount\n      lastBookUpdate\n      lastChapterUpdate\n      __typename\n    }\n    authors {\n      id\n      name\n      chName\n      enName\n      wikiLink\n      comicCount\n      views\n      __typename\n    }\n    __typename\n  }\n}",
      chapterByComicId: "query chapterByComicId($comicId: ID!) {\n  chaptersByComicId(comicId: $comicId) {\n    id\n    serial\n    type\n    dateCreated\n    dateUpdated\n    size\n    __typename\n  }\n}",
      imagesByChapterId: "query imagesByChapterId($chapterId: ID!) {\n  imagesByChapterId(chapterId: $chapterId) {\n    id\n    kid\n    height\n    width\n    __typename\n  }\n}"
    });
  }
  encode(str) {
    let words = CryptoJS.enc.Utf8.parse(str);
    return CryptoJS.enc.Base64.stringify(words);
  }
  decode(str) {
    let words = CryptoJS.enc.Base64.parse(str);
    return CryptoJS.enc.Utf8.stringify(words);
  }
  async $api(operationName, variables, count = 3, timeout = 5e3) {
    try {
      return await Promise.race([
        this.request("/api/query", {
          method: "post",
          data: {
            query: this.operation[operationName],
            operationName,
            variables
          }
        }),
        new Promise(
          (_, reject) => setTimeout(() => {
            reject(new Error("Request timed out!"));
          }, timeout)
        )
      ]);
    } catch (error) {
      if (count > 0) {
        console.log(`[Retry (${count})]: ${operationName}`);
        return this.$api(operationName, variables, count - 1, timeout + 500);
      } else {
        throw error;
      }
    }
  }
  // =============================== 分割线 ============================== //
  // async load() {
  //   try {
  //     await this.request("/api/image/076f7800-7ac6-41dd-9ffd-0362bdb93a13", {
  //       headers: { Referer: "https://komiic.com/comic/2487/chapter/74408/images/all" },
  //     });
  //   } catch (error) {
  //     this.flag = true;
  //   }
  // }
  // async createFilter() {
  //   const response = await this.request("/api/image/076f7800-7ac6-41dd-9ffd-0362bdb93a13", {
  //     headers: { Referer: "https://komiic.com/comic/2487/chapter/74408/images/all" },
  //   });
  //   return "OK";
  // }
  async latest(page) {
    const response = await this.$api("recentUpdate", {
      pagination: {
        limit: 20,
        offset: (page - 1) * 20,
        orderBy: "DATE_UPDATED",
        asc: true
      }
    });
    const result = response.data.recentUpdate.map((e) => ({
      title: e.title,
      url: this.encode(
        JSON.stringify({
          id: e.id,
          title: e.title,
          cover: e.imageUrl,
          status: e.status,
          year: e.year,
          author: e.authors.map((e2) => e2.name).join("\uFF0C"),
          categories: e.categories.map((e2) => e2.name).join("\uFF0C"),
          views: e.views,
          update: new Date(e.dateUpdated).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
        })
      ),
      cover: e.imageUrl,
      update: `${e.status == "ONGOING" ? "\u9023\u8F09" : "\u5B8C\u7D50"}${e.lastChapterUpdate && " | " + e.lastChapterUpdate + "\u8A71"}${e.lastBookUpdate && " | " + e.lastBookUpdate + "\u5377"}`
    }));
    if (this.flag) result.unshift({
      title: "\u6AA2\u6E2C\u5230\u60A8\u53EF\u80FD\u5DF2\u9054\u7576\u524D24\u5C0F\u6642\u5185\u7684\u6700\u5927\u5716\u7247\u95B1\u8B80\u91CF\uFF0C\u8ACB\u9032\u5165\u8A72\u8A73\u7D30\u9801\u9762\u5617\u8A66\u89E3\u6C7A\u540E\u91CD\u542F\u5E94\u7528",
      url: "/login",
      cover: null
    });
    return result;
  }
  async search(keyword, page) {
    if (page > 1) return [];
    const response = await this.$api("searchComicAndAuthorQuery", { keyword });
    const result = response.data.searchComicsAndAuthors.comics.map((e) => ({
      title: e.title,
      url: this.encode(
        JSON.stringify({
          id: e.id,
          title: e.title,
          cover: e.imageUrl,
          status: e.status,
          year: e.year,
          author: e.authors.map((e2) => e2.name).join("\uFF0C"),
          categories: e.categories.map((e2) => e2.name).join("\uFF0C"),
          views: e.views,
          update: new Date(e.dateUpdated).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
        })
      ),
      cover: e.imageUrl,
      update: `${e.status == "ONGOING" ? "\u9023\u8F09" : "\u5B8C\u7D50"}${e.lastChapterUpdate && " | " + e.lastChapterUpdate + "\u8A71"}${e.lastBookUpdate && " | " + e.lastBookUpdate + "\u5377"}`
    }));
    if (this.flag) result.unshift({
      title: "\u6AA2\u6E2C\u5230\u60A8\u53EF\u80FD\u5DF2\u9054\u7576\u524D24\u5C0F\u6642\u5185\u7684\u6700\u5927\u5716\u7247\u95B1\u8B80\u91CF\uFF0C\u8ACB\u9032\u5165\u8A72\u8A73\u7D30\u9801\u9762\u5617\u8A66\u89E3\u6C7A\u540E\u91CD\u542F\u5E94\u7528",
      url: "/login",
      cover: null
    });
    return result;
  }
  async detail(string) {
    if (string == "/login")
      return {
        title: "\u95B2\u8B80\u4E0B\u9762\u7684\u6982\u89BD\uFF0C\u5617\u8A66\u89E3\u6C7A\u540E\u8A18\u5F97 \u91CD \u542F \u5E94 \u7528 \uFF01",
        cover: null,
        desc: "\u82E5\u60A8\u662F\u672A\u767B\u9304\u7528\u6236\u6216\u767B\u9678\u72C0\u614B\u904E\u671F\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684 Webview \u7A97\u53E3\u8FDB\u5165\u7F51\u7AD9\u767B\u9304\u540E\u5373\u53EF\u589E\u52A0\u95B2\u8B80\u4E0A\u9650\u3002\n\u82E5\u60A8\u5DF2\u767B\u9304\uFF0C\u90A3\u9EBD\u8ACB\u7A0D\u5F8C\u518D\u770B\uFF0C\u95B2\u8B80\u91CF\u6703\u6162\u6162\u6062\u5FA9\uFF08\u6216\u8D0A\u52A9\u8A72\u7AD9\u7372\u5F97\u66F4\u9AD8\u7684\u4E0A\u9650\uFF09\n\u5404\u8CEC\u6236\u9650\u5236\u95B2\u8B80\u91CF\u5982\u4E0B\uFF1A\n\u3010\u7121\u5E33\u865F\u3011- 24\u5C0F\u6642\u5167\u8B80\u53D6 300 \u5F35\n\u3010\u4E00\u822C\u5E33\u865F\u3011- 24\u5C0F\u6642\u5167\u8B80\u53D6 800 \u5F35\n\u3010\u8D0A\u52A9\u5E33\u865F\u3011- 24\u5C0F\u6642\u5167\u8B80\u53D6 1000 \u5F35\n\u3010\u7576\u6708\u8D0A\u52A9$1\u4EE5\u4E0A\u3011- 24\u5C0F\u6642\u5167\u8B80\u53D6 3000 \u5F35\n\u3010\u7576\u6708\u8D0A\u52A9$5\u4EE5\u4E0A\u3011- 24\u5C0F\u6642\u5167\u8B80\u53D6 5000 \u5F35\n\u3010\u7576\u6708\u8D0A\u52A9$10\u4EE5\u4E0A\u3011- 24\u5C0F\u6642\u5167\u8B80\u53D6 10000 \u5F35"
      };
    const data = JSON.parse(this.decode(string));
    const comic = await this.$api("chapterByComicId", { comicId: data.id });
    const episodes = [];
    const chapters = comic.data.chaptersByComicId.filter((e) => e.type == "chapter").map((e) => ({ name: `\u7B2C${e.serial}\u8A71\uFF08${e.size}P\uFF09`, url: `${data.id}|${e.id}` }));
    if (chapters.length) episodes.push({ title: "\u8A71", urls: chapters });
    const volumes = comic.data.chaptersByComicId.filter((e) => e.type == "book").map((e) => ({ name: `\u7B2C${e.serial}\u5377\uFF08${e.size}P\uFF09`, url: `${data.id}|${e.id}` }));
    if (volumes.length) episodes.push({ title: "\u5377", urls: volumes });
    return {
      title: data.title,
      cover: data.cover,
      desc: `\u72C0\u614B\uFF1A${data.status == "ONGOING" ? "\u9023\u8F09" : "\u5B8C\u7D50"}
\u5E74\u4EFD\uFF1A${data.year}
\u4F5C\u8005\uFF1A${data.author}
\u985E\u578B\uFF1A${data.categories}
\u9EDE\u95B1\uFF1A${data.views}
\u6700\u8FD1\u4E00\u6B21\u66F4\u65B0\u6642\u9593\uFF1A${data.update}`,
      episodes
    };
  }
  async watch(str) {
    const ids = str.split("|");
    const images = await this.$api("imagesByChapterId", { chapterId: ids[1] });
    const urls = images.data.imagesByChapterId.map((e) => `https://komiic.com/api/image/${e.kid}`);
    return { urls, headers: { Referer: `https://komiic.com/comic/${ids[0]}/chapter/${ids[1]}/images/all` } };
  }
}
