// ==PrismHubExtension==
// @name         动漫之家
// @version      v0.0.2
// @author       MiaoMint
// @lang         zh-cn
// @license      MIT
// @package      com.dmzj.www
// @type         manga
// @icon         https://www.dmzj.com/_nuxt/logo_dmzj.1c94014a.png
// @webSite      https://www.dmzj.com
// ==/PrismHubExtension==

export default class extends Extension {
  async load() {
    await this.registerSetting({
      title: "\u542F\u7528\u9AD8\u6E05\u753B\u8D28",
      key: "quality",
      type: "toggle",
      description: "\u542F\u7528\u540E\u4F1A\u4F7F\u7528\u9AD8\u6E05\u753B\u8D28,\u4F1A\u6D88\u8017\u66F4\u591A\u6D41\u91CF",
      defaultValue: "false"
    });
  }
  async latest(page) {
    const res = await this.request(
      `/api/v1/comic1/update_list?channel=pc&app_name=dmzj&version=1.0.0&page=${page}&size=20`
    );
    const manga = [];
    res.data.list.forEach((element) => {
      manga.push({
        title: element.title,
        cover: element.cover,
        update: element.lastUpdateChapterName,
        url: element.comic_py
      });
    });
    return manga;
  }
  async search(kw, page) {
    const res = await this.request(
      `/api/v1/comic1/search?keyword=${kw}&page=${page}`
    );
    const manga = [];
    if (Array.isArray(res.data.comic_list)) {
      res.data.comic_list.forEach((element) => {
        manga.push({
          title: element.name,
          cover: element.cover,
          update: element.last_update_chapter_name,
          url: element.comic_py
        });
      });
    }
    return manga;
  }
  async detail(url) {
    const res = await this.request(
      `/api/v1/comic1/comic/detail?channel=pc&app_name=dmzj&version=1.0.0&comic_py=${url}`
    );
    const comicInfo = res.data.comicInfo || {};
    const episodes = [];
    if (Array.isArray(comicInfo.chapterList)) {
      comicInfo.chapterList.forEach((element) => {
        const urls = [];
        if (Array.isArray(element.data)) {
          element.data.forEach((e) => {
            urls.push({
              name: e.chapter_title,
              url: `${comicInfo.id}|${e.chapter_id.toString()}`
            });
          });
        }
        episodes.push({
          title: element.title,
          urls: urls.reverse()
        });
      });
    }
    return {
      title: comicInfo.title,
      cover: comicInfo.cover,
      desc: comicInfo.description,
      episodes
    };
  }
  async watch(url) {
    var _a;
    const [comicId, chapterId] = url.split("|");
    console.log(comicId);
    const res = await this.request(
      `/api/v1/comic1/chapter/detail?channel=pc&app_name=dmzj&version=1.0.0&comic_id=${comicId}&chapter_id=${chapterId}`
    );
    const page_url = res.data.chapterInfo.page_url;
    const page_url_hd = (_a = res.data.chapterInfo.page_url_hd) != null ? _a : page_url;
    let urls = await this.getSetting("quality") === "true" ? page_url_hd : page_url;
    return {
      urls
    };
  }
}
