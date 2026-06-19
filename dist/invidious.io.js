// ==PrismHubExtension==
// @name         Invidious
// @version      v0.0.4
// @author       OshekharO
// @lang         all
// @license      MIT
// @icon         https://invidious.io/apple-touch-icon.png
// @package      invidious.io
// @type         bangumi
// @webSite      https://cal1.iv.ggtyler.dev/api/v1
// ==/PrismHubExtension==

export default class extends Extension {
  async latest() {
    const res = await this.request(`/trending?region=US`);
    if (!Array.isArray(res)) {
      return [];
    }
    return res.map((item) => {
      var _a, _b;
      return {
        title: item.title || "",
        url: item.videoId || "",
        cover: ((_b = (_a = item.videoThumbnails) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) || ""
        // Use the first thumbnail's URL if available
      };
    });
  }
  async search(kw) {
    const res = await this.request(`/search?q=${kw}`);
    return res.map((item) => {
      var _a, _b;
      return {
        title: item.title || "",
        url: item.videoId || "",
        cover: ((_b = (_a = item.videoThumbnails) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) || ""
      };
    });
  }
  async detail(url) {
    var _a, _b;
    const res = await this.request(`/videos/${url}`, {
      headers: {
        "Miru-Url": "https://cal1.iv.ggtyler.dev/api/v1"
      }
    });
    return {
      title: res.title,
      cover: (_b = (_a = res.videoThumbnails) == null ? void 0 : _a[0]) == null ? void 0 : _b.url,
      desc: res.description,
      episodes: [
        {
          title: "Watch",
          urls: [
            {
              name: res.title,
              url: res.videoId
            }
          ]
        }
      ]
    };
  }
  async watch(url) {
    var _a, _b;
    const res = await this.request(`/videos/${url}`);
    return {
      type: "hls",
      url: (_b = (_a = res.formatStreams) == null ? void 0 : _a[0]) == null ? void 0 : _b.url
    };
  }
}
