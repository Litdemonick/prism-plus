// ==PrismHubExtension==
// @name         漫画屋
// @version      v0.0.1
// @author       瑜君之学-杨瑜候
// @lang         zh
// @license      MIT
// @type         manga
// @icon         https://www.mhua5.com/template/pc/default/images/pic_nav_logo.png?v=0504b75
// @package      manHuaWu
// @webSite      https://www.mhua5.com
// @nsfw         false
// ==/PrismHubExtension==

export default class extends Extension {
  // 截取url
  extractImageUrl(imageUrl) {
    const urlIndex = imageUrl.indexOf("url=");
    const webpIndex = imageUrl.indexOf("&");
    const extractedUrl = imageUrl.substring(urlIndex + 4, webpIndex);
    return extractedUrl;
  }
  async latest(page) {
    const res = await this.request(
      `/index.php/category/order/hits/page/${page}`
    );
    const bsxList = await this.querySelectorAll(res, "div.common-comic-item");
    const novel = [];
    for (const element of bsxList) {
      const html = element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.getAttributeText(html, "img", "alt");
      const updateImg = await this.getAttributeText(html, "img", "src");
      const img = updateImg.split("?")[0];
      novel.push({
        title,
        url,
        img
      });
    }
    return novel;
  }
  async search(keyword, page) {
    const res = await this.request(`/index.php/search/${keyword}/${page}`);
    const bsxList = await this.querySelectorAll(res, "div.common-comic-item");
    const lieBiao = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.getAttributeText(html, "img", "alt");
      const updateImg = await this.getAttributeText(html, "img", "src");
      const img = updateImg.split("?")[0];
      lieBiao.push({
        title,
        url,
        img
      });
    }
    return lieBiao;
  }
  async detail(url) {
    var _a, _b, _c, _d, _e, _f, _g;
    const res = await this.request(`${url}`);
    const coverTitle = (_b = await ((_a = this.querySelector(res, ".de-info__box > p")) == null ? void 0 : _a.text)) != null ? _b : "";
    console.log(coverTitle + "coverTitle");
    const Img = await this.getAttributeText(
      res,
      ".de-info__cover > img",
      "src"
    );
    const coverImg = Img.split("?")[0];
    const coverDesc = (_d = await ((_c = this.querySelector(res, ".intro-total")) == null ? void 0 : _c.text)) != null ? _d : "";
    const selectList = await this.querySelectorAll(
      res,
      ".chapter__list.clearfix > ul > li"
    );
    const muLuDAta = [];
    for (const element of selectList) {
      const html = element.content;
      const title = (_g = (_f = await ((_e = this.querySelector(html, "a")) == null ? void 0 : _e.text)) == null ? void 0 : _f.trim().replace(/\s+/g, " ")) != null ? _g : "";
      const url2 = await this.getAttributeText(html, "a", "href");
      muLuDAta.push({
        name: title,
        url: url2
      });
    }
    return {
      title: coverTitle,
      cover: coverImg,
      desc: coverDesc,
      episodes: [
        {
          title: "Directory",
          urls: muLuDAta
        }
      ]
    };
  }
  async watch(url) {
    var res = await this.request(`${url}`);
    const imgList = await this.querySelectorAll(res, ".lazy-read");
    console.log(imgList.length + "imgList");
    const imgDAta = [];
    for (const element of imgList) {
      const html = element.content;
      const url2 = await this.getAttributeText(html, "img", "data-original");
      imgDAta.push(url2);
    }
    return {
      urls: imgDAta,
      headers: {
        "User-Agent": "Mozilla/5.0(Windows NT 10.0; Win64; x64)AppleWebKit/537.36(KHTML, like Gecko)Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        Referer: "https://m.g-mh.org/"
      }
    };
  }
}
