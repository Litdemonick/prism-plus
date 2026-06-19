// ==PrismHubExtension==
// @name         IDLIX
// @version      v0.0.2
// @author       Nazz
// @lang         id
// @license      MIT
// @type         bangumi
// @icon         https://vip.idlixofficial.net/wp-content/uploads/2020/06/idlix.png
// @package      idlix
// @webSite      https://vip.idlixofficial.net
// @nsfw         false
// @tags         movie,tvseries,anime,english
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
export default class extends Extension {
  async load() {
    this.registerSetting({
      title: "Idlix",
      key: "domain_idlix",
      type: "input",
      description: "Idlix Domain",
      defaultValue: "https://vip.idlixofficial.net"
    });
  }
  async requestWSetting(url) {
    return this.request(url, {
      headers: {
        "Miru-Url": await this.getSetting("domain_idlix")
      }
    });
  }
  async search(query, page) {
    try {
      const page_domain = await this.getSetting("domain_idlix");
      const query_parse = query.replaceAll(" ", "+");
      const url = `/search/${query_parse}/page/${page}`;
      const fetch_search = await this.requestWSetting(url);
      const $ = fetch_search.replace(/<!-- WP.+/, "</html>").replace(/[\r\n]+/gm, "");
      const element_item_search = await this.querySelectorAll(
        $,
        "div.search-page > div.result-item"
      );
      let list_search = [];
      for (const element of element_item_search) {
        const cover = await this.getAttributeText(
          element.content,
          "img",
          "src"
        );
        const title = await this.querySelector(element.content, "div.title > a").text;
        const urls = await this.getAttributeText(
          element.content,
          "div.title > a",
          "href"
        );
        const url2 = urls.replace(page_domain, "");
        list_search.push({
          title,
          url: url2,
          cover
        });
      }
      list_search = list_search.filter((list_item) => {
        return !list_item.url.includes("season");
      });
      return list_search;
    } catch (e) {
      return [];
    }
  }
  async latest(page) {
    const page_domain = await this.getSetting("domain_idlix");
    let list_item = [];
    if (page == 1) {
      const fetch_featured = await this.requestWSetting(`/`);
      const $ = fetch_featured.replace(/<!-- WP.+/, "</html>").replace(/[\r\n]+/gm, "");
      const element_featureds = await this.querySelectorAll(
        $,
        "div.items.featured > article"
      );
      for (const element of element_featureds) {
        const title = await this.querySelector(element.content, "h3").text;
        const cover = await this.getAttributeText(
          element.content,
          "div.poster > img",
          "src"
        );
        const elementUrl = await this.getAttributeText(
          element.content,
          "h3 > a",
          "href"
        );
        const url = await elementUrl.toString().replace(page_domain, "");
        list_item.push({
          title,
          cover,
          url
        });
      }
    }
    const fetch_movie_latest = await this.requestWSetting(`/movie/page/${page}/`);
    const $$ = fetch_movie_latest.replace(/<!-- WP.+/, "</html>").replace(/[\r\n]+/gm, "");
    const element_movie = await this.querySelectorAll(
      $$,
      "div#archive-content > article"
    );
    for (const element of element_movie) {
      const title = await this.querySelector(element.content, "h3").text;
      const cover = await this.getAttributeText(
        element.content,
        "div.poster > img",
        "src"
      );
      const elementUrl = await this.getAttributeText(
        element.content,
        "h3 > a",
        "href"
      );
      const url = await elementUrl.toString().replace(page_domain, "");
      list_item.push({
        title,
        cover,
        url
      });
    }
    return list_item;
  }
  async detail(url) {
    const page_domain = await this.getSetting("domain_idlix");
    const fetch_detail_movie = await this.requestWSetting(`/${url}`);
    const $ = fetch_detail_movie.replace(/<!-- WP.+/, "</html>").replace(/[\r\n]+/gm, "");
    const quality = ["360p", "720p", "1080p"];
    if (url.includes("movie")) {
      const title = await this.querySelector($, "div.sheader > div.data > h1").text;
      const cover = await this.getAttributeText(
        $,
        "div.sheader > div.poster > img",
        "src"
      );
      const desc = await this.querySelector($, "#info > div.wp-content > p").text;
      const episodes = quality.map((item, i) => {
        return {
          title: item,
          urls: [
            {
              name: title,
              url: url + `#${item}`
            }
          ]
        };
      });
      return {
        title,
        cover,
        desc,
        episodes
      };
    } else if (url.includes("tvseries")) {
      const title = await this.querySelector(
        $,
        "#single > div > div.sheader > div.data > h1"
      ).text;
      const cover = await this.getAttributeText(
        $,
        "#single > div > div.sheader > div.poster > img",
        "src"
      );
      const element_desc_1 = await this.querySelectorAll($, "center");
      const element_desc_2 = element_desc_1.filter(
        (element) => element.content.includes("Synopsis")
      )[0];
      const element_desc_3 = await this.querySelectorAll(
        element_desc_2.content,
        "p",
        "text"
      );
      const desc = element_desc_3.map((element) => element.content).join().replaceAll(/<p>|<\/p>/g, "");
      const element_seasons = await this.querySelectorAll(
        $,
        "#seasons > .se-c"
      );
      let episode_season = [];
      for (let element_season of element_seasons) {
        const title_season_1 = await this.querySelector(
          element_season.content,
          "span.title"
        ).text;
        const title_season = await title_season_1.toString().split(" ").slice(0, 2).join(" ");
        const element_episodes = await this.querySelectorAll(
          element_season.content,
          ".episodios > li"
        );
        for (let element_episode of element_episodes) {
          const title2 = await this.querySelector(
            element_episode.content,
            ".episodiotitle > a"
          ).text;
          const elementUrl = await this.getAttributeText(
            element_episode.content,
            ".episodiotitle > a",
            "href"
          );
          const urls = await elementUrl.toString().replace(page_domain, "");
          episode_season.push({
            name: `${title_season} ${title2}`,
            url: urls
          });
        }
      }
      const episodes = quality.map((item_quality, i) => {
        let temp_episode = episode_season.map((item_eps) => {
          return __spreadProps(__spreadValues({}, item_eps), {
            url: `${item_eps.url}/#${item_quality}`
          });
        });
        return {
          title: item_quality,
          urls: temp_episode
        };
      });
      return {
        title,
        cover,
        desc,
        episodes
      };
    }
  }
  async watch(url) {
    const quality = url.split("#")[1] || "720p";
    const page_domain = await this.getSetting("domain_idlix");
    const fetch_watch = await this.requestWSetting(`/${url}`);
    const $ = fetch_watch.replace(/<!-- WP.+/, "</html>").replace(/[\r\n]+/gm, "");
    const element_option = "li#player-option-1";
    const data_type = await this.getAttributeText(
      $,
      element_option,
      "data-type"
    );
    const data_nume = await this.getAttributeText(
      $,
      element_option,
      "data-nume"
    );
    const data_post = await this.getAttributeText(
      $,
      element_option,
      "data-post"
    );
    const raw_data_embed_url = `action=doo_player_ajax&post=${data_post}&nume=${data_nume}&type=${data_type}`;
    const fetch_embed_url = await this.request("", {
      method: "POST",
      data: raw_data_embed_url,
      headers: {
        "Miru-Url": "https://vip.idlixofficial.net/wp-admin/admin-ajax.php",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      }
    });
    const embed_url = await this.decryptAES(
      fetch_embed_url.embed_url,
      fetch_embed_url.key
    );
    const parsedUrl = this.parseUrl(embed_url);
    const videoUrlHash = parsedUrl.pathname.indexOf("video") >= 0 ? parsedUrl.pathname.replace("/video/", "") : "data" in parseUrl.searchParams ? parseUrl.searchParams["data"] : false;
    let raw_data_m3u8_url = `hash=${videoUrlHash}&r=https%3A%2F%2Fvip.idlixofficial.net%2F`;
    const fetch_m3u8_url = await this.request("", {
      method: "POST",
      data: raw_data_m3u8_url,
      headers: {
        "Miru-Url": `https://jeniusplay.com/player/index.php?data=${videoUrlHash}&do=getVideo`,
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    const fetch_m3u8_data = await this.request("", {
      headers: {
        "Miru-Url": fetch_m3u8_url.videoSource
      }
    });
    function extractLinksAndQuality(m3u8Content) {
      const lines = m3u8Content.split("\n");
      const results = {};
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
          let quality2 = lines[i].match(/NAME="(\d+p)"/);
          if (!quality2) {
            quality2 = lines[i].match(/RESOLUTION=\d+x(\d+)/);
            if (quality2) {
              quality2 = quality2[1] + "p";
            }
          } else {
            quality2 = quality2[1];
          }
          const link = lines[i + 1].trim();
          if (quality2) {
            results[quality2] = { url: link };
          }
        }
      }
      return results;
    }
    const parsedM3u8 = extractLinksAndQuality(fetch_m3u8_data);
    const m3u8_url = parsedM3u8[quality].url || fetch_m3u8_url.videoSource;
    const fetch_m3u8_subtitle = await this.request("", {
      headers: {
        "Miru-Url": `https://jeniusplay.com/video/${videoUrlHash}`,
        "Referer": "https://vip.idlixofficial.net/",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    const element_scripts = await this.querySelectorAll(fetch_m3u8_subtitle, "script");
    let scriptss = "";
    element_scripts.forEach((element) => {
      if (element.content.includes("playerjsSubtitle")) {
        scriptss = element.content;
      }
    });
    let subtitles = [];
    if (scriptss) {
      const subtitle_url = this.cariMatch(scriptss, /playerjsSubtitle = "(.+?)"/);
      const arr_subtitle_url = subtitle_url.split(",");
      subtitles = arr_subtitle_url.map((item, i) => {
        const title_subtitle = this.cariMatch(item, /\[(.+?)\]/);
        const url_subtitle = item.replace(/\[.+?\]/, "");
        return {
          title: title_subtitle,
          url: url_subtitle
        };
      });
    }
    return {
      type: "hls",
      url: m3u8_url,
      subtitles
    };
  }
  async decryptAES(decrypted, key) {
    var CryptoJS_ = (function(t, e) {
      var r = {}, i = r.lib = {}, n = function() {
      }, s = i.Base = {
        extend: function(t2) {
          n.prototype = this;
          var e2 = new n();
          return t2 && e2.mixIn(t2), e2.hasOwnProperty("init") || (e2.init = function() {
            e2.$super.init.apply(this, arguments);
          }), e2.init.prototype = e2, e2.$super = this, e2;
        },
        create: function() {
          var t2 = this.extend();
          return t2.init.apply(t2, arguments), t2;
        },
        init: function() {
        },
        mixIn: function(t2) {
          for (var e2 in t2) t2.hasOwnProperty(e2) && (this[e2] = t2[e2]);
          t2.hasOwnProperty("toString") && (this.toString = t2.toString);
        },
        clone: function() {
          return this.init.prototype.extend(this);
        }
      }, o = i.WordArray = s.extend({
        init: function(t2, e2) {
          t2 = this.words = t2 || [], this.sigBytes = void 0 != e2 ? e2 : 4 * t2.length;
        },
        toString: function(t2) {
          return (t2 || a).stringify(this);
        },
        concat: function(t2) {
          var e2 = this.words, r2 = t2.words, i2 = this.sigBytes;
          if (t2 = t2.sigBytes, this.clamp(), i2 % 4)
            for (var n2 = 0; n2 < t2; n2++)
              e2[i2 + n2 >>> 2] |= (r2[n2 >>> 2] >>> 24 - 8 * (n2 % 4) & 255) << 24 - 8 * ((i2 + n2) % 4);
          else if (65535 < r2.length)
            for (n2 = 0; n2 < t2; n2 += 4) e2[i2 + n2 >>> 2] = r2[n2 >>> 2];
          else e2.push.apply(e2, r2);
          return this.sigBytes += t2, this;
        },
        clamp: function() {
          var e2 = this.words, r2 = this.sigBytes;
          e2[r2 >>> 2] &= 4294967295 << 32 - 8 * (r2 % 4), e2.length = t.ceil(r2 / 4);
        },
        clone: function() {
          var t2 = s.clone.call(this);
          return t2.words = this.words.slice(0), t2;
        },
        random: function(e2) {
          for (var r2 = [], i2 = 0; i2 < e2; i2 += 4)
            r2.push(4294967296 * t.random() | 0);
          return new o.init(r2, e2);
        }
      }), c = r.enc = {}, a = c.Hex = {
        stringify: function(t2) {
          var e2 = t2.words;
          t2 = t2.sigBytes;
          for (var r2 = [], i2 = 0; i2 < t2; i2++) {
            var n2 = e2[i2 >>> 2] >>> 24 - 8 * (i2 % 4) & 255;
            r2.push((n2 >>> 4).toString(16)), r2.push((15 & n2).toString(16));
          }
          return r2.join("");
        },
        parse: function(t2) {
          for (var e2 = t2.length, r2 = [], i2 = 0; i2 < e2; i2 += 2)
            r2[i2 >>> 3] |= parseInt(t2.substr(i2, 2), 16) << 24 - 4 * (i2 % 8);
          return new o.init(r2, e2 / 2);
        }
      }, f = c.Latin1 = {
        stringify: function(t2) {
          var e2 = t2.words;
          t2 = t2.sigBytes;
          for (var r2 = [], i2 = 0; i2 < t2; i2++)
            r2.push(
              String.fromCharCode(e2[i2 >>> 2] >>> 24 - 8 * (i2 % 4) & 255)
            );
          return r2.join("");
        },
        parse: function(t2) {
          for (var e2 = t2.length, r2 = [], i2 = 0; i2 < e2; i2++)
            r2[i2 >>> 2] |= (255 & t2.charCodeAt(i2)) << 24 - 8 * (i2 % 4);
          return new o.init(r2, e2);
        }
      }, h = c.Utf8 = {
        stringify: function(t2) {
          try {
            return decodeURIComponent(escape(f.stringify(t2)));
          } catch (e2) {
            throw Error("Malformed UTF-8 data");
          }
        },
        parse: function(t2) {
          return f.parse(unescape(encodeURIComponent(t2)));
        }
      }, u = i.BufferedBlockAlgorithm = s.extend({
        reset: function() {
          this._data = new o.init(), this._nDataBytes = 0;
        },
        _append: function(t2) {
          "string" == typeof t2 && (t2 = h.parse(t2)), this._data.concat(t2), this._nDataBytes += t2.sigBytes;
        },
        _process: function(e2) {
          var r2 = this._data, i2 = r2.words, n2 = r2.sigBytes, s2 = this.blockSize, c2 = n2 / (4 * s2), c2 = e2 ? t.ceil(c2) : t.max((0 | c2) - this._minBufferSize, 0);
          if (e2 = c2 * s2, n2 = t.min(4 * e2, n2), e2) {
            for (var a2 = 0; a2 < e2; a2 += s2) this._doProcessBlock(i2, a2);
            a2 = i2.splice(0, e2), r2.sigBytes -= n2;
          }
          return new o.init(a2, n2);
        },
        clone: function() {
          var t2 = s.clone.call(this);
          return t2._data = this._data.clone(), t2;
        },
        _minBufferSize: 0
      });
      i.Hasher = u.extend({
        cfg: s.extend(),
        init: function(t2) {
          this.cfg = this.cfg.extend(t2), this.reset();
        },
        reset: function() {
          u.reset.call(this), this._doReset();
        },
        update: function(t2) {
          return this._append(t2), this._process(), this;
        },
        finalize: function(t2) {
          return t2 && this._append(t2), this._doFinalize();
        },
        blockSize: 16,
        _createHelper: function(t2) {
          return function(e2, r2) {
            return new t2.init(r2).finalize(e2);
          };
        },
        _createHmacHelper: function(t2) {
          return function(e2, r2) {
            return new _.HMAC.init(t2, r2).finalize(e2);
          };
        }
      });
      var _ = r.algo = {};
      return r;
    })(Math);
    !(function() {
      var t = CryptoJS_, e = t.lib.WordArray;
      t.enc.Base64 = {
        stringify: function(t2) {
          var e2 = t2.words, r = t2.sigBytes, i = this._map;
          t2.clamp(), t2 = [];
          for (var n = 0; n < r; n += 3)
            for (var s = (e2[n >>> 2] >>> 24 - 8 * (n % 4) & 255) << 16 | (e2[n + 1 >>> 2] >>> 24 - 8 * ((n + 1) % 4) & 255) << 8 | e2[n + 2 >>> 2] >>> 24 - 8 * ((n + 2) % 4) & 255, o = 0; 4 > o && n + 0.75 * o < r; o++)
              t2.push(i.charAt(s >>> 6 * (3 - o) & 63));
          if (e2 = i.charAt(64)) for (; t2.length % 4; ) t2.push(e2);
          return t2.join("");
        },
        parse: function(t2) {
          var r = t2.length, i = this._map, n = i.charAt(64);
          n && -1 != (n = t2.indexOf(n)) && (r = n);
          for (var n = [], s = 0, o = 0; o < r; o++)
            if (o % 4) {
              var c = i.indexOf(t2.charAt(o - 1)) << 2 * (o % 4), a = i.indexOf(t2.charAt(o)) >>> 6 - 2 * (o % 4);
              n[s >>> 2] |= (c | a) << 24 - 8 * (s % 4), s++;
            }
          return e.create(n, s);
        },
        _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
      };
    })(), (function(t) {
      function e(t2, e2, r2, i2, n2, s2, o2) {
        return ((t2 = t2 + (e2 & r2 | ~e2 & i2) + n2 + o2) << s2 | t2 >>> 32 - s2) + e2;
      }
      function r(t2, e2, r2, i2, n2, s2, o2) {
        return ((t2 = t2 + (e2 & i2 | r2 & ~i2) + n2 + o2) << s2 | t2 >>> 32 - s2) + e2;
      }
      function i(t2, e2, r2, i2, n2, s2, o2) {
        return ((t2 = t2 + (e2 ^ r2 ^ i2) + n2 + o2) << s2 | t2 >>> 32 - s2) + e2;
      }
      function n(t2, e2, r2, i2, n2, s2, o2) {
        return ((t2 = t2 + (r2 ^ (e2 | ~i2)) + n2 + o2) << s2 | t2 >>> 32 - s2) + e2;
      }
      for (var s = CryptoJS_, o = s.lib, c = o.WordArray, a = o.Hasher, o = s.algo, f = [], h = 0; 64 > h; h++)
        f[h] = 4294967296 * t.abs(t.sin(h + 1)) | 0;
      o = o.MD5 = a.extend({
        _doReset: function() {
          this._hash = new c.init([
            1732584193,
            4023233417,
            2562383102,
            271733878
          ]);
        },
        _doProcessBlock: function(t2, s2) {
          for (var o2 = 0; 16 > o2; o2++) {
            var c2 = s2 + o2, a2 = t2[c2];
            t2[c2] = (a2 << 8 | a2 >>> 24) & 16711935 | (a2 << 24 | a2 >>> 8) & 4278255360;
          }
          var o2 = this._hash.words, c2 = t2[s2 + 0], a2 = t2[s2 + 1], h2 = t2[s2 + 2], u = t2[s2 + 3], _ = t2[s2 + 4], p = t2[s2 + 5], d = t2[s2 + 6], l = t2[s2 + 7], y = t2[s2 + 8], v = t2[s2 + 9], g = t2[s2 + 10], $ = t2[s2 + 11], B = t2[s2 + 12], x = t2[s2 + 13], k = t2[s2 + 14], S = t2[s2 + 15], m = o2[0], z = o2[1], w = o2[2], C = o2[3], m = e(m, z, w, C, c2, 7, f[0]), C = e(C, m, z, w, a2, 12, f[1]), w = e(w, C, m, z, h2, 17, f[2]), z = e(z, w, C, m, u, 22, f[3]), m = e(m, z, w, C, _, 7, f[4]), C = e(C, m, z, w, p, 12, f[5]), w = e(w, C, m, z, d, 17, f[6]), z = e(z, w, C, m, l, 22, f[7]), m = e(m, z, w, C, y, 7, f[8]), C = e(C, m, z, w, v, 12, f[9]), w = e(w, C, m, z, g, 17, f[10]), z = e(z, w, C, m, $, 22, f[11]), m = e(m, z, w, C, B, 7, f[12]), C = e(C, m, z, w, x, 12, f[13]), w = e(w, C, m, z, k, 17, f[14]), z = e(z, w, C, m, S, 22, f[15]), m = r(m, z, w, C, a2, 5, f[16]), C = r(C, m, z, w, d, 9, f[17]), w = r(w, C, m, z, $, 14, f[18]), z = r(z, w, C, m, c2, 20, f[19]), m = r(m, z, w, C, p, 5, f[20]), C = r(C, m, z, w, g, 9, f[21]), w = r(w, C, m, z, S, 14, f[22]), z = r(z, w, C, m, _, 20, f[23]), m = r(m, z, w, C, v, 5, f[24]), C = r(C, m, z, w, k, 9, f[25]), w = r(w, C, m, z, u, 14, f[26]), z = r(z, w, C, m, y, 20, f[27]), m = r(m, z, w, C, x, 5, f[28]), C = r(C, m, z, w, h2, 9, f[29]), w = r(w, C, m, z, l, 14, f[30]), z = r(z, w, C, m, B, 20, f[31]), m = i(m, z, w, C, p, 4, f[32]), C = i(C, m, z, w, y, 11, f[33]), w = i(w, C, m, z, $, 16, f[34]), z = i(z, w, C, m, k, 23, f[35]), m = i(m, z, w, C, a2, 4, f[36]), C = i(C, m, z, w, _, 11, f[37]), w = i(w, C, m, z, l, 16, f[38]), z = i(z, w, C, m, g, 23, f[39]), m = i(m, z, w, C, x, 4, f[40]), C = i(C, m, z, w, c2, 11, f[41]), w = i(w, C, m, z, u, 16, f[42]), z = i(z, w, C, m, d, 23, f[43]), m = i(m, z, w, C, v, 4, f[44]), C = i(C, m, z, w, B, 11, f[45]), w = i(w, C, m, z, S, 16, f[46]), z = i(z, w, C, m, h2, 23, f[47]), m = n(m, z, w, C, c2, 6, f[48]), C = n(C, m, z, w, l, 10, f[49]), w = n(w, C, m, z, k, 15, f[50]), z = n(z, w, C, m, p, 21, f[51]), m = n(m, z, w, C, B, 6, f[52]), C = n(C, m, z, w, u, 10, f[53]), w = n(w, C, m, z, g, 15, f[54]), z = n(z, w, C, m, a2, 21, f[55]), m = n(m, z, w, C, y, 6, f[56]), C = n(C, m, z, w, S, 10, f[57]), w = n(w, C, m, z, d, 15, f[58]), z = n(z, w, C, m, x, 21, f[59]), m = n(m, z, w, C, _, 6, f[60]), C = n(C, m, z, w, $, 10, f[61]), w = n(w, C, m, z, h2, 15, f[62]), z = n(z, w, C, m, v, 21, f[63]);
          o2[0] = o2[0] + m | 0, o2[1] = o2[1] + z | 0, o2[2] = o2[2] + w | 0, o2[3] = o2[3] + C | 0;
        },
        _doFinalize: function() {
          var e2 = this._data, r2 = e2.words, i2 = 8 * this._nDataBytes, n2 = 8 * e2.sigBytes;
          r2[n2 >>> 5] |= 128 << 24 - n2 % 32;
          var s2 = t.floor(i2 / 4294967296);
          for (r2[(n2 + 64 >>> 9 << 4) + 15] = (s2 << 8 | s2 >>> 24) & 16711935 | (s2 << 24 | s2 >>> 8) & 4278255360, r2[(n2 + 64 >>> 9 << 4) + 14] = (i2 << 8 | i2 >>> 24) & 16711935 | (i2 << 24 | i2 >>> 8) & 4278255360, e2.sigBytes = 4 * (r2.length + 1), this._process(), r2 = (e2 = this._hash).words, i2 = 0; 4 > i2; i2++)
            n2 = r2[i2], r2[i2] = (n2 << 8 | n2 >>> 24) & 16711935 | (n2 << 24 | n2 >>> 8) & 4278255360;
          return e2;
        },
        clone: function() {
          var t2 = a.clone.call(this);
          return t2._hash = this._hash.clone(), t2;
        }
      }), s.MD5 = a._createHelper(o), s.HmacMD5 = a._createHmacHelper(o);
    })(Math), (function() {
      var t = CryptoJS_, e = t.lib, r = e.Base, i = e.WordArray, e = t.algo, n = e.EvpKDF = r.extend({
        cfg: r.extend({
          keySize: 4,
          hasher: e.MD5,
          iterations: 1
        }),
        init: function(t2) {
          this.cfg = this.cfg.extend(t2);
        },
        compute: function(t2, e2) {
          for (var r2 = this.cfg, n2 = r2.hasher.create(), s = i.create(), o = s.words, c = r2.keySize, r2 = r2.iterations; o.length < c; ) {
            a && n2.update(a);
            var a = n2.update(t2).finalize(e2);
            n2.reset();
            for (var f = 1; f < r2; f++) a = n2.finalize(a), n2.reset();
            s.concat(a);
          }
          return s.sigBytes = 4 * c, s;
        }
      });
      t.EvpKDF = function(t2, e2, r2) {
        return n.create(r2).compute(t2, e2);
      };
    })(), CryptoJS_.lib.Cipher || (function(t) {
      var e = CryptoJS_, r = e.lib, i = r.Base, n = r.WordArray, s = r.BufferedBlockAlgorithm, o = e.enc.Base64, c = e.algo.EvpKDF, a = r.Cipher = s.extend({
        cfg: i.extend(),
        createEncryptor: function(t2, e2) {
          return this.create(this._ENC_XFORM_MODE, t2, e2);
        },
        createDecryptor: function(t2, e2) {
          return this.create(this._DEC_XFORM_MODE, t2, e2);
        },
        init: function(t2, e2, r2) {
          this.cfg = this.cfg.extend(r2), this._xformMode = t2, this._key = e2, this.reset();
        },
        reset: function() {
          s.reset.call(this), this._doReset();
        },
        process: function(t2) {
          return this._append(t2), this._process();
        },
        finalize: function(t2) {
          return t2 && this._append(t2), this._doFinalize();
        },
        keySize: 4,
        ivSize: 4,
        _ENC_XFORM_MODE: 1,
        _DEC_XFORM_MODE: 2,
        _createHelper: function(t2) {
          return {
            encrypt: function(e2, r2, i2) {
              return ("string" == typeof r2 ? d : p).encrypt(t2, e2, r2, i2);
            },
            decrypt: function(e2, r2, i2) {
              e2 = JSON.parse(e2);
              var r2 = r2.split("\\x"), n2 = "";
              const bb = CryptoJS.enc.Utf8.stringify(
                CryptoJS.enc.Base64.parse(
                  e2.m.split("").reduce((t3, e3) => e3 + t3, "") + "=="
                )
              );
              for (var s2 of bb.split("|"))
                n2 += "\\x" + r2[parseInt(s2) + 1];
              return r2 = n2, e2 = JSON.stringify(e2), ("string" == typeof r2 ? d : p).decrypt(t2, e2, r2, i2);
            }
          };
        }
      });
      r.StreamCipher = a.extend({
        _doFinalize: function() {
          return this._process(true);
        },
        blockSize: 1
      });
      var f = e.mode = {}, h = function(t2, e2, r2) {
        var i2 = this._iv;
        i2 ? this._iv = void 0 : i2 = this._prevBlock;
        for (var n2 = 0; n2 < r2; n2++) t2[e2 + n2] ^= i2[n2];
      }, u = (r.BlockCipherMode = i.extend({
        createEncryptor: function(t2, e2) {
          return this.Encryptor.create(t2, e2);
        },
        createDecryptor: function(t2, e2) {
          return this.Decryptor.create(t2, e2);
        },
        init: function(t2, e2) {
          this._cipher = t2, this._iv = e2;
        }
      })).extend();
      u.Encryptor = u.extend({
        processBlock: function(t2, e2) {
          var r2 = this._cipher, i2 = r2.blockSize;
          h.call(this, t2, e2, i2), r2.encryptBlock(t2, e2), this._prevBlock = t2.slice(e2, e2 + i2);
        }
      }), u.Decryptor = u.extend({
        processBlock: function(t2, e2) {
          var r2 = this._cipher, i2 = r2.blockSize, n2 = t2.slice(e2, e2 + i2);
          r2.decryptBlock(t2, e2), h.call(this, t2, e2, i2), this._prevBlock = n2;
        }
      }), f = f.CBC = u, u = (e.pad = {}).Pkcs7 = {
        pad: function(t2, e2) {
          for (var r2 = 4 * e2, r2 = r2 - t2.sigBytes % r2, i2 = r2 << 24 | r2 << 16 | r2 << 8 | r2, s2 = [], o2 = 0; o2 < r2; o2 += 4)
            s2.push(i2);
          r2 = n.create(s2, r2), t2.concat(r2);
        },
        unpad: function(t2) {
          t2.sigBytes -= 255 & t2.words[t2.sigBytes - 1 >>> 2];
        }
      }, r.BlockCipher = a.extend({
        cfg: a.cfg.extend({
          mode: f,
          padding: u
        }),
        reset: function() {
          a.reset.call(this);
          var t2 = this.cfg, e2 = t2.iv, t2 = t2.mode;
          if (this._xformMode == this._ENC_XFORM_MODE)
            var r2 = t2.createEncryptor;
          else r2 = t2.createDecryptor, this._minBufferSize = 1;
          this._mode = r2.call(t2, this, e2 && e2.words);
        },
        _doProcessBlock: function(t2, e2) {
          this._mode.processBlock(t2, e2);
        },
        _doFinalize: function() {
          var t2 = this.cfg.padding;
          if (this._xformMode == this._ENC_XFORM_MODE) {
            t2.pad(this._data, this.blockSize);
            var e2 = this._process(true);
          } else e2 = this._process(true), t2.unpad(e2);
          return e2;
        },
        blockSize: 4
      });
      var _ = r.CipherParams = i.extend({
        init: function(t2) {
          this.mixIn(t2);
        },
        toString: function(t2) {
          return (t2 || this.formatter).stringify(this);
        }
      }), f = (e.format = {}).OpenSSL = {
        stringify: function(t2) {
          var e2 = t2.ciphertext;
          return ((t2 = t2.salt) ? n.create([1398893684, 1701076831]).concat(t2).concat(e2) : e2).toString(o);
        },
        parse: function(t2) {
          var e2 = (t2 = o.parse(t2)).words;
          if (1398893684 == e2[0] && 1701076831 == e2[1]) {
            var r2 = n.create(e2.slice(2, 4));
            e2.splice(0, 4), t2.sigBytes -= 16;
          }
          return _.create({
            ciphertext: t2,
            salt: r2
          });
        }
      }, p = r.SerializableCipher = i.extend({
        cfg: i.extend({
          format: f
        }),
        encrypt: function(t2, e2, r2, i2) {
          i2 = this.cfg.extend(i2);
          var n2 = t2.createEncryptor(r2, i2);
          return e2 = n2.finalize(e2), n2 = n2.cfg, _.create({
            ciphertext: e2,
            key: r2,
            iv: n2.iv,
            algorithm: t2,
            mode: n2.mode,
            padding: n2.padding,
            blockSize: t2.blockSize,
            formatter: i2.format
          });
        },
        decrypt: function(t2, e2, r2, i2) {
          return i2 = this.cfg.extend(i2), e2 = this._parse(e2, i2.format), t2.createDecryptor(r2, i2).finalize(e2.ciphertext);
        },
        _parse: function(t2, e2) {
          return "string" == typeof t2 ? e2.parse(t2, this) : t2;
        }
      }), e = (e.kdf = {}).OpenSSL = {
        execute: function(t2, e2, r2, i2) {
          return i2 || (i2 = n.random(8)), t2 = c.create({
            keySize: e2 + r2
          }).compute(t2, i2), r2 = n.create(t2.words.slice(e2), 4 * r2), t2.sigBytes = 4 * e2, _.create({
            key: t2,
            iv: r2,
            salt: i2
          });
        }
      }, d = r.PasswordBasedCipher = p.extend({
        cfg: p.cfg.extend({
          kdf: e
        }),
        encrypt: function(t2, e2, r2, i2) {
          return r2 = (i2 = this.cfg.extend(i2)).kdf.execute(
            r2,
            t2.keySize,
            t2.ivSize
          ), i2.iv = r2.iv, (t2 = p.encrypt.call(this, t2, e2, r2.key, i2)).mixIn(r2), t2;
        },
        decrypt: function(t2, e2, r2, i2) {
          return i2 = this.cfg.extend(i2), e2 = this._parse(e2, i2.format), r2 = i2.kdf.execute(r2, t2.keySize, t2.ivSize, e2.salt), i2.iv = r2.iv, p.decrypt.call(this, t2, e2, r2.key, i2);
        }
      });
    })(), (function() {
      for (var t = CryptoJS_, e = t.lib.BlockCipher, r = t.algo, i = [], n = [], s = [], o = [], c = [], a = [], f = [], h = [], u = [], _ = [], p = [], d = 0; 256 > d; d++)
        p[d] = 128 > d ? d << 1 : d << 1 ^ 283;
      for (var l = 0, y = 0, d = 0; 256 > d; d++) {
        var v = y ^ y << 1 ^ y << 2 ^ y << 3 ^ y << 4, v = v >>> 8 ^ 255 & v ^ 99;
        i[l] = v, n[v] = l;
        var g = p[l], $ = p[g], B = p[$], x = 257 * p[v] ^ 16843008 * v;
        s[l] = x << 24 | x >>> 8, o[l] = x << 16 | x >>> 16, c[l] = x << 8 | x >>> 24, a[l] = x, x = 16843009 * B ^ 65537 * $ ^ 257 * g ^ 16843008 * l, f[v] = x << 24 | x >>> 8, h[v] = x << 16 | x >>> 16, u[v] = x << 8 | x >>> 24, _[v] = x, l ? (l = g ^ p[p[p[B ^ g]]], y ^= p[p[y]]) : l = y = 1;
      }
      var k = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54], r = r.AES = e.extend({
        _doReset: function() {
          for (var t2 = this._key, e2 = t2.words, r2 = t2.sigBytes / 4, t2 = 4 * ((this._nRounds = r2 + 6) + 1), n2 = this._keySchedule = [], s2 = 0; s2 < t2; s2++)
            if (s2 < r2) n2[s2] = e2[s2];
            else {
              var o2 = n2[s2 - 1];
              s2 % r2 ? 6 < r2 && 4 == s2 % r2 && (o2 = i[o2 >>> 24] << 24 | i[o2 >>> 16 & 255] << 16 | i[o2 >>> 8 & 255] << 8 | i[255 & o2]) : (o2 = i[(o2 = o2 << 8 | o2 >>> 24) >>> 24] << 24 | i[o2 >>> 16 & 255] << 16 | i[o2 >>> 8 & 255] << 8 | i[255 & o2], o2 ^= k[s2 / r2 | 0] << 24), n2[s2] = n2[s2 - r2] ^ o2;
            }
          for (r2 = 0, e2 = this._invKeySchedule = []; r2 < t2; r2++)
            s2 = t2 - r2, o2 = r2 % 4 ? n2[s2] : n2[s2 - 4], e2[r2] = 4 > r2 || 4 >= s2 ? o2 : f[i[o2 >>> 24]] ^ h[i[o2 >>> 16 & 255]] ^ u[i[o2 >>> 8 & 255]] ^ _[i[255 & o2]];
        },
        encryptBlock: function(t2, e2) {
          this._doCryptBlock(t2, e2, this._keySchedule, s, o, c, a, i);
        },
        decryptBlock: function(t2, e2) {
          var r2 = t2[e2 + 1];
          t2[e2 + 1] = t2[e2 + 3], t2[e2 + 3] = r2, this._doCryptBlock(t2, e2, this._invKeySchedule, f, h, u, _, n), r2 = t2[e2 + 1], t2[e2 + 1] = t2[e2 + 3], t2[e2 + 3] = r2;
        },
        _doCryptBlock: function(t2, e2, r2, i2, n2, s2, o2, c2) {
          for (var a2 = this._nRounds, f2 = t2[e2] ^ r2[0], h2 = t2[e2 + 1] ^ r2[1], u2 = t2[e2 + 2] ^ r2[2], _2 = t2[e2 + 3] ^ r2[3], p2 = 4, d2 = 1; d2 < a2; d2++)
            var l2 = i2[f2 >>> 24] ^ n2[h2 >>> 16 & 255] ^ s2[u2 >>> 8 & 255] ^ o2[255 & _2] ^ r2[p2++], y2 = i2[h2 >>> 24] ^ n2[u2 >>> 16 & 255] ^ s2[_2 >>> 8 & 255] ^ o2[255 & f2] ^ r2[p2++], v2 = i2[u2 >>> 24] ^ n2[_2 >>> 16 & 255] ^ s2[f2 >>> 8 & 255] ^ o2[255 & h2] ^ r2[p2++], _2 = i2[_2 >>> 24] ^ n2[f2 >>> 16 & 255] ^ s2[h2 >>> 8 & 255] ^ o2[255 & u2] ^ r2[p2++], f2 = l2, h2 = y2, u2 = v2;
          l2 = (c2[f2 >>> 24] << 24 | c2[h2 >>> 16 & 255] << 16 | c2[u2 >>> 8 & 255] << 8 | c2[255 & _2]) ^ r2[p2++], y2 = (c2[h2 >>> 24] << 24 | c2[u2 >>> 16 & 255] << 16 | c2[_2 >>> 8 & 255] << 8 | c2[255 & f2]) ^ r2[p2++], v2 = (c2[u2 >>> 24] << 24 | c2[_2 >>> 16 & 255] << 16 | c2[f2 >>> 8 & 255] << 8 | c2[255 & h2]) ^ r2[p2++], _2 = (c2[_2 >>> 24] << 24 | c2[f2 >>> 16 & 255] << 16 | c2[h2 >>> 8 & 255] << 8 | c2[255 & u2]) ^ r2[p2++], t2[e2] = l2, t2[e2 + 1] = y2, t2[e2 + 2] = v2, t2[e2 + 3] = _2;
        },
        keySize: 8
      });
      t.AES = e._createHelper(r);
    })();
    var CryptoJSAesJson = {
      encrypt: function(value, password) {
        return CryptoJS_.AES.encrypt(JSON.stringify(value), password, {
          format: CryptoJSAesJson
        }).toString();
      },
      decrypt: function(jsonStr, password) {
        const a = CryptoJS_.AES.decrypt(jsonStr, password, {
          format: CryptoJSAesJson
        });
        const b = a.toString(CryptoJS_.enc.Utf8);
        return JSON.parse(b);
      },
      stringify: function(cipherParams) {
        var j = { ct: cipherParams.ciphertext.toString(CryptoJS_.enc.Base64) };
        if (cipherParams.iv) j.iv = cipherParams.iv.toString();
        if (cipherParams.salt) j.s = cipherParams.salt.toString();
        return JSON.stringify(j).replace(/\s/g, "");
      },
      parse: function(jsonStr) {
        var j = JSON.parse(jsonStr);
        var cipherParams = CryptoJS_.lib.CipherParams.create({
          ciphertext: CryptoJS_.enc.Base64.parse(j.ct)
        });
        if (j.iv) cipherParams.iv = CryptoJS_.enc.Hex.parse(j.iv);
        if (j.s) cipherParams.salt = CryptoJS_.enc.Hex.parse(j.s);
        return cipherParams;
      }
    };
    const decrypting = await CryptoJSAesJson.decrypt(decrypted, key);
    return decrypting;
  }
  cariMatch(input, regex) {
    const match = input.match(regex);
    return match ? match.length > 2 ? match : match[1] : null;
  }
  parseUrl(url) {
    function getUrlParamsRegex(queryString) {
      const paramRegex = /([^&=]+)=?([^&]*)/g;
      const params = {};
      let match2;
      while ((match2 = paramRegex.exec(queryString)) !== null) {
        const key = decodeURIComponent(match2[1]);
        const value = decodeURIComponent(match2[2]);
        if (params.hasOwnProperty(key)) {
          if (!Array.isArray(params[key])) {
            params[key] = [params[key]];
          }
          params[key].push(value);
        } else {
          params[key] = value;
        }
      }
      return params;
    }
    const urlRegex = /^(([^ :/?#]+):\/\/)?([^/?#]*)(?:[:]([^/?#]*))?([^?#]*)(?:[?]([^#]*))?(#.*)?/;
    const match = url.match(urlRegex);
    if (!match) {
      return null;
    }
    const parsedUrl = {};
    parsedUrl.protocol = match[2] || "";
    parsedUrl.host = match[3] || "";
    parsedUrl.port = match[4] || "";
    parsedUrl.pathname = match[5] || "";
    parsedUrl.search = match[6] || "";
    parsedUrl.hash = match[7] || "";
    if (parsedUrl.search) {
      parsedUrl.searchParams = getUrlParamsRegex(parsedUrl.search);
    } else {
      parsedUrl.searchParams = {};
    }
    return parsedUrl;
  }
}
