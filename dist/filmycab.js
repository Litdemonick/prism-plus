// ==PrismHubExtension==
// @name         FilmyCab
// @version      v0.0.2
// @author       OshekharO
// @lang         hi
// @license      MIT
// @package      filmycab
// @type         bangumi
// @icon         https://i.postimg.cc/SNhTmxT5/FilmyCab.png
// @webSite      https://afilmyhub.mom
// @nsfw         false
// ==/PrismHubExtension==

export default class extends Extension {
  async latest(page) {
    const res = await this.request(`/?to-page=${page}`);
    const bsxList = await this.querySelectorAll(res, "div.grid > div.card");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a.post-thumbnail", "href");
      const title = await this.querySelector(html, "div.info h3 b").text;
      const cover = await this.querySelector(html, "img").getAttributeText("src");
      novel.push({
        title,
        url: "https://afilmyhub.online" + url,
        cover
      });
    }
    return novel;
  }
  async search(kw) {
    const res = await this.request(`/site-search.html?to-search=${kw}`);
    const bsxList = await this.querySelectorAll(res, "div.container > article.post");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a.post-thumbnail", "href");
      const title = await this.querySelector(html, "h3 a").text;
      const cover = await this.querySelector(html, "img").getAttributeText("src");
      novel.push({
        title,
        url: "https://afilmyhub.online" + url,
        cover
      });
    }
    return novel;
  }
  async detail(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url
      }
    });
    const title = await this.querySelector(res, "title").text;
    const cover = await this.querySelector(res, "meta[property='og:image']").getAttributeText("content");
    const desc = await this.querySelector(res, "div.info").text;
    const linkmake = await this.getAttributeText(res, "div.entry-meta > p > a", "href");
    const ses = await this.request("", {
      headers: {
        "Miru-Url": linkmake
      }
    });
    const episodes = [];
    const epiList = await this.querySelectorAll(ses, "div.dlink.dl");
    for (const element of epiList) {
      const html = await element.content;
      const name = await this.querySelector(html, "a").text;
      const url2 = await this.getAttributeText(html, "a", "href");
      episodes.push({
        name: name.trim(),
        url: url2
      });
    }
    return {
      title: title.trim(),
      cover,
      desc: desc.trim(),
      episodes: [
        {
          title: "Directory",
          urls: episodes.reverse()
        }
      ]
    };
  }
  async watch(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url
      }
    });
    const dwishLink = res.match(/https:\/\/hubcloud\.[^\s'"]+/);
    const dwishLinkRes = await this.request("", {
      headers: {
        "Miru-Url": dwishLink,
        "Miru-Referer": dwishLink
      }
    });
    const fast = dwishLinkRes.match(/https:\/\/hubcloud\.[^\s'"]+/);
    const FastRes = await this.request("", {
      headers: {
        "Miru-Url": fast,
        "Miru-Referer": fast
      }
    });
    const hub = await this.getAttributeText(FastRes, "div.vd.d-none > a", "href");
    const HubRes = await this.request("", {
      headers: {
        "Miru-Url": hub,
        "Miru-Referer": hub
      }
    });
    const directUrlMatch = HubRes.match(/https:\/\/pixeldra\.in\/api\/[^"?]*(\?[^"?]*)?/);
    const directUrl = directUrlMatch ? directUrlMatch[0] : "";
    return {
      type: "hls",
      url: directUrl || ""
    };
  }
}
