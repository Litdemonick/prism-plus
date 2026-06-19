// ==PrismHubExtension==
// @name         樱花动漫
// @version      v0.0.2
// @author       Monster
// @lang         zh-cn
// @license      MIT
// @package      sakura
// @type         bangumi
// @icon         https://cdn.yinghuazy.xyz/webjs/zkk7/statics/img/favicon.ico
// @webSite      https://www.vdm8.com
// ==/PrismHubExtension==



export default class extends Extension {
  decodeUnicode(str) {
    return unescape(str.replace(/\\u/gi, "%u"));
  }
  async latest(page) {
    let keyword = `/show/ribendongman--------${page}---.html`;
    let hh = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Referer": keyword
      }
    };
    const res = await this.request(keyword, hh);
    const ul = await this.querySelectorAll(res, 'ul[class="myui-vodlist clearfix"] li');
    const bangumi = [];
    for (let i = 0; i < ul.length; i++) {
      let title = await this.queryXPath(ul[i].content, '//h4[@class="title text-overflow"]').text;
      let cover = await this.queryXPath(ul[i].content, '//a[@class="myui-vodlist__thumb lazyload"]/@data-original').attr;
      let url = await this.queryXPath(ul[i].content, '//a[@class="myui-vodlist__thumb lazyload"]/@href').attr;
      bangumi.push({
        title,
        cover,
        url
      });
    }
    return bangumi;
  }
  async search(kw, page) {
    let keyword = `/search/${encodeURI(kw)}----------${page}---.html`;
    let hh = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Referer": keyword
      },
      method: "GET"
    };
    const res = await this.request(keyword, hh);
    const ul = await this.queryXPath(res, '//ul[@id="searchList"]/li').allHTML;
    const bangumi = [];
    for (let i = 0; i < ul.length; i++) {
      let title = await this.queryXPath(ul[i], '//h4[@class="title"]').text;
      let cover = await this.queryXPath(ul[i], '//div[@class="thumb"]/a/@data-original').attr;
      let url = await this.queryXPath(ul[i], '//h4[@class="title"]/a/@href').attr;
      bangumi.push({
        title,
        cover,
        url
      });
    }
    return bangumi;
  }
  async detail(url) {
    const res = await this.request(`${url}`);
    const title = await this.queryXPath(res, '//div[@class="myui-content__detail"]/h1').text;
    const cover = await this.queryXPath(res, '//img[@class="lazyload"]/@data-original').attr;
    const desc = await this.queryXPath(res, '//span[@class="sketch"]').text;
    const ul = await this.queryXPath(res, '//div[@id="playlist1"]/ul/li').allHTML;
    const chapter = [];
    for (let i = 0; i < ul.length; i++) {
      chapter.push({
        name: await this.queryXPath(ul[i], '//a[@class="btn btn-default"]').text,
        url: await this.queryXPath(ul[i], '//a[@class="btn btn-default"]/@href').attr
      });
    }
    return {
      title,
      cover,
      desc,
      episodes: [{
        title: "\u7B2C\u4E00\u7EBF\u8DEF",
        urls: chapter
      }]
    };
  }
  async watch(url) {
    const res = await this.request(`${url}`);
    const m3mu8_url = "https://danmu.yhdmjx.com/m3u8.php?url=" + res.match(/"link_pre":".*","url":"(.*?)"/)[1];
    const m3u8_res = await (await fetch(m3mu8_url)).text();
    const m3u8_result = m3u8_res.match(/"url": getVideoInfo\("(.*?)"\),/)[1];
    const bt_token = m3u8_res.match(/<script>var bt_token = "(.*?)"/)[1];
    let m3u8_token_key = await (await fetch("https://danmu.yhdmjx.com/js/play.js")).text();
    m3u8_token_key = m3u8_token_key.match(/var _token_key=CryptoJS\['enc'\]\['Utf8'\]\[_0x17f1\('67','qETJ'\)\]\((.*?\))/)[1];
    m3u8_token_key = this.decrypt_token_key(m3u8_token_key);
    const m3u8_play_url = await this.getVideoInfo(m3u8_result, m3u8_token_key, bt_token);
    console.log(m3u8_play_url);
    return {
      type: "hls",
      url: m3u8_play_url
    };
  }
  async getVideoInfo(data, key, iv) {
    var CryptoJS = CryptoJS || (function(u, p) {
      var d = {}, l = d.lib = {}, s = function() {
      }, t = l.Base = { extend: function(a) {
        s.prototype = this;
        var c = new s();
        a && c.mixIn(a);
        c.hasOwnProperty("init") || (c.init = function() {
          c.$super.init.apply(this, arguments);
        });
        c.init.prototype = c;
        c.$super = this;
        return c;
      }, create: function() {
        var a = this.extend();
        a.init.apply(a, arguments);
        return a;
      }, init: function() {
      }, mixIn: function(a) {
        for (var c in a) a.hasOwnProperty(c) && (this[c] = a[c]);
        a.hasOwnProperty("toString") && (this.toString = a.toString);
      }, clone: function() {
        return this.init.prototype.extend(this);
      } }, r = l.WordArray = t.extend({ init: function(a, c) {
        a = this.words = a || [];
        this.sigBytes = c != p ? c : 4 * a.length;
      }, toString: function(a) {
        return (a || v).stringify(this);
      }, concat: function(a) {
        var c = this.words, e = a.words, j = this.sigBytes;
        a = a.sigBytes;
        this.clamp();
        if (j % 4) for (var k = 0; k < a; k++) c[j + k >>> 2] |= (e[k >>> 2] >>> 24 - 8 * (k % 4) & 255) << 24 - 8 * ((j + k) % 4);
        else if (65535 < e.length) for (k = 0; k < a; k += 4) c[j + k >>> 2] = e[k >>> 2];
        else c.push.apply(c, e);
        this.sigBytes += a;
        return this;
      }, clamp: function() {
        var a = this.words, c = this.sigBytes;
        a[c >>> 2] &= 4294967295 << 32 - 8 * (c % 4);
        a.length = u.ceil(c / 4);
      }, clone: function() {
        var a = t.clone.call(this);
        a.words = this.words.slice(0);
        return a;
      }, random: function(a) {
        for (var c = [], e = 0; e < a; e += 4) c.push(4294967296 * u.random() | 0);
        return new r.init(c, a);
      } }), w = d.enc = {}, v = w.Hex = { stringify: function(a) {
        var c = a.words;
        a = a.sigBytes;
        for (var e = [], j = 0; j < a; j++) {
          var k = c[j >>> 2] >>> 24 - 8 * (j % 4) & 255;
          e.push((k >>> 4).toString(16));
          e.push((k & 15).toString(16));
        }
        return e.join("");
      }, parse: function(a) {
        for (var c = a.length, e = [], j = 0; j < c; j += 2) e[j >>> 3] |= parseInt(a.substr(
          j,
          2
        ), 16) << 24 - 4 * (j % 8);
        return new r.init(e, c / 2);
      } }, b = w.Latin1 = { stringify: function(a) {
        var c = a.words;
        a = a.sigBytes;
        for (var e = [], j = 0; j < a; j++) e.push(String.fromCharCode(c[j >>> 2] >>> 24 - 8 * (j % 4) & 255));
        return e.join("");
      }, parse: function(a) {
        for (var c = a.length, e = [], j = 0; j < c; j++) e[j >>> 2] |= (a.charCodeAt(j) & 255) << 24 - 8 * (j % 4);
        return new r.init(e, c);
      } }, x = w.Utf8 = { stringify: function(a) {
        try {
          return decodeURIComponent(escape(b.stringify(a)));
        } catch (c) {
          throw Error("Malformed UTF-8 data");
        }
      }, parse: function(a) {
        return b.parse(unescape(encodeURIComponent(a)));
      } }, q = l.BufferedBlockAlgorithm = t.extend({ reset: function() {
        this._data = new r.init();
        this._nDataBytes = 0;
      }, _append: function(a) {
        "string" == typeof a && (a = x.parse(a));
        this._data.concat(a);
        this._nDataBytes += a.sigBytes;
      }, _process: function(a) {
        var c = this._data, e = c.words, j = c.sigBytes, k = this.blockSize, b2 = j / (4 * k), b2 = a ? u.ceil(b2) : u.max((b2 | 0) - this._minBufferSize, 0);
        a = b2 * k;
        j = u.min(4 * a, j);
        if (a) {
          for (var q2 = 0; q2 < a; q2 += k) this._doProcessBlock(e, q2);
          q2 = e.splice(0, a);
          c.sigBytes -= j;
        }
        return new r.init(q2, j);
      }, clone: function() {
        var a = t.clone.call(this);
        a._data = this._data.clone();
        return a;
      }, _minBufferSize: 0 });
      l.Hasher = q.extend({ cfg: t.extend(), init: function(a) {
        this.cfg = this.cfg.extend(a);
        this.reset();
      }, reset: function() {
        q.reset.call(this);
        this._doReset();
      }, update: function(a) {
        this._append(a);
        this._process();
        return this;
      }, finalize: function(a) {
        a && this._append(a);
        return this._doFinalize();
      }, blockSize: 16, _createHelper: function(a) {
        return function(b2, e) {
          return new a.init(e).finalize(b2);
        };
      }, _createHmacHelper: function(a) {
        return function(b2, e) {
          return new n.HMAC.init(
            a,
            e
          ).finalize(b2);
        };
      } });
      var n = d.algo = {};
      return d;
    })(Math);
    (function() {
      var u = CryptoJS, p = u.lib.WordArray;
      u.enc.Base64 = { stringify: function(d) {
        var l = d.words, p2 = d.sigBytes, t = this._map;
        d.clamp();
        d = [];
        for (var r = 0; r < p2; r += 3) for (var w = (l[r >>> 2] >>> 24 - 8 * (r % 4) & 255) << 16 | (l[r + 1 >>> 2] >>> 24 - 8 * ((r + 1) % 4) & 255) << 8 | l[r + 2 >>> 2] >>> 24 - 8 * ((r + 2) % 4) & 255, v = 0; 4 > v && r + 0.75 * v < p2; v++) d.push(t.charAt(w >>> 6 * (3 - v) & 63));
        if (l = t.charAt(64)) for (; d.length % 4; ) d.push(l);
        return d.join("");
      }, parse: function(d) {
        var l = d.length, s = this._map, t = s.charAt(64);
        t && (t = d.indexOf(t), -1 != t && (l = t));
        for (var t = [], r = 0, w = 0; w < l; w++) if (w % 4) {
          var v = s.indexOf(d.charAt(w - 1)) << 2 * (w % 4), b = s.indexOf(d.charAt(w)) >>> 6 - 2 * (w % 4);
          t[r >>> 2] |= (v | b) << 24 - 8 * (r % 4);
          r++;
        }
        return p.create(t, r);
      }, _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" };
    })();
    (function(u) {
      function p(b2, n, a, c, e, j, k) {
        b2 = b2 + (n & a | ~n & c) + e + k;
        return (b2 << j | b2 >>> 32 - j) + n;
      }
      function d(b2, n, a, c, e, j, k) {
        b2 = b2 + (n & c | a & ~c) + e + k;
        return (b2 << j | b2 >>> 32 - j) + n;
      }
      function l(b2, n, a, c, e, j, k) {
        b2 = b2 + (n ^ a ^ c) + e + k;
        return (b2 << j | b2 >>> 32 - j) + n;
      }
      function s(b2, n, a, c, e, j, k) {
        b2 = b2 + (a ^ (n | ~c)) + e + k;
        return (b2 << j | b2 >>> 32 - j) + n;
      }
      for (var t = CryptoJS, r = t.lib, w = r.WordArray, v = r.Hasher, r = t.algo, b = [], x = 0; 64 > x; x++) b[x] = 4294967296 * u.abs(u.sin(x + 1)) | 0;
      r = r.MD5 = v.extend({
        _doReset: function() {
          this._hash = new w.init([1732584193, 4023233417, 2562383102, 271733878]);
        },
        _doProcessBlock: function(q, n) {
          for (var a = 0; 16 > a; a++) {
            var c = n + a, e = q[c];
            q[c] = (e << 8 | e >>> 24) & 16711935 | (e << 24 | e >>> 8) & 4278255360;
          }
          var a = this._hash.words, c = q[n + 0], e = q[n + 1], j = q[n + 2], k = q[n + 3], z = q[n + 4], r2 = q[n + 5], t2 = q[n + 6], w2 = q[n + 7], v2 = q[n + 8], A = q[n + 9], B = q[n + 10], C = q[n + 11], u2 = q[n + 12], D = q[n + 13], E = q[n + 14], x2 = q[n + 15], f = a[0], m = a[1], g = a[2], h = a[3], f = p(f, m, g, h, c, 7, b[0]), h = p(h, f, m, g, e, 12, b[1]), g = p(g, h, f, m, j, 17, b[2]), m = p(m, g, h, f, k, 22, b[3]), f = p(f, m, g, h, z, 7, b[4]), h = p(h, f, m, g, r2, 12, b[5]), g = p(g, h, f, m, t2, 17, b[6]), m = p(m, g, h, f, w2, 22, b[7]), f = p(f, m, g, h, v2, 7, b[8]), h = p(h, f, m, g, A, 12, b[9]), g = p(g, h, f, m, B, 17, b[10]), m = p(m, g, h, f, C, 22, b[11]), f = p(f, m, g, h, u2, 7, b[12]), h = p(h, f, m, g, D, 12, b[13]), g = p(g, h, f, m, E, 17, b[14]), m = p(m, g, h, f, x2, 22, b[15]), f = d(f, m, g, h, e, 5, b[16]), h = d(h, f, m, g, t2, 9, b[17]), g = d(g, h, f, m, C, 14, b[18]), m = d(m, g, h, f, c, 20, b[19]), f = d(f, m, g, h, r2, 5, b[20]), h = d(h, f, m, g, B, 9, b[21]), g = d(g, h, f, m, x2, 14, b[22]), m = d(m, g, h, f, z, 20, b[23]), f = d(f, m, g, h, A, 5, b[24]), h = d(h, f, m, g, E, 9, b[25]), g = d(g, h, f, m, k, 14, b[26]), m = d(m, g, h, f, v2, 20, b[27]), f = d(f, m, g, h, D, 5, b[28]), h = d(
            h,
            f,
            m,
            g,
            j,
            9,
            b[29]
          ), g = d(g, h, f, m, w2, 14, b[30]), m = d(m, g, h, f, u2, 20, b[31]), f = l(f, m, g, h, r2, 4, b[32]), h = l(h, f, m, g, v2, 11, b[33]), g = l(g, h, f, m, C, 16, b[34]), m = l(m, g, h, f, E, 23, b[35]), f = l(f, m, g, h, e, 4, b[36]), h = l(h, f, m, g, z, 11, b[37]), g = l(g, h, f, m, w2, 16, b[38]), m = l(m, g, h, f, B, 23, b[39]), f = l(f, m, g, h, D, 4, b[40]), h = l(h, f, m, g, c, 11, b[41]), g = l(g, h, f, m, k, 16, b[42]), m = l(m, g, h, f, t2, 23, b[43]), f = l(f, m, g, h, A, 4, b[44]), h = l(h, f, m, g, u2, 11, b[45]), g = l(g, h, f, m, x2, 16, b[46]), m = l(m, g, h, f, j, 23, b[47]), f = s(f, m, g, h, c, 6, b[48]), h = s(h, f, m, g, w2, 10, b[49]), g = s(
            g,
            h,
            f,
            m,
            E,
            15,
            b[50]
          ), m = s(m, g, h, f, r2, 21, b[51]), f = s(f, m, g, h, u2, 6, b[52]), h = s(h, f, m, g, k, 10, b[53]), g = s(g, h, f, m, B, 15, b[54]), m = s(m, g, h, f, e, 21, b[55]), f = s(f, m, g, h, v2, 6, b[56]), h = s(h, f, m, g, x2, 10, b[57]), g = s(g, h, f, m, t2, 15, b[58]), m = s(m, g, h, f, D, 21, b[59]), f = s(f, m, g, h, z, 6, b[60]), h = s(h, f, m, g, C, 10, b[61]), g = s(g, h, f, m, j, 15, b[62]), m = s(m, g, h, f, A, 21, b[63]);
          a[0] = a[0] + f | 0;
          a[1] = a[1] + m | 0;
          a[2] = a[2] + g | 0;
          a[3] = a[3] + h | 0;
        },
        _doFinalize: function() {
          var b2 = this._data, n = b2.words, a = 8 * this._nDataBytes, c = 8 * b2.sigBytes;
          n[c >>> 5] |= 128 << 24 - c % 32;
          var e = u.floor(a / 4294967296);
          n[(c + 64 >>> 9 << 4) + 15] = (e << 8 | e >>> 24) & 16711935 | (e << 24 | e >>> 8) & 4278255360;
          n[(c + 64 >>> 9 << 4) + 14] = (a << 8 | a >>> 24) & 16711935 | (a << 24 | a >>> 8) & 4278255360;
          b2.sigBytes = 4 * (n.length + 1);
          this._process();
          b2 = this._hash;
          n = b2.words;
          for (a = 0; 4 > a; a++) c = n[a], n[a] = (c << 8 | c >>> 24) & 16711935 | (c << 24 | c >>> 8) & 4278255360;
          return b2;
        },
        clone: function() {
          var b2 = v.clone.call(this);
          b2._hash = this._hash.clone();
          return b2;
        }
      });
      t.MD5 = v._createHelper(r);
      t.HmacMD5 = v._createHmacHelper(r);
    })(Math);
    (function() {
      var u = CryptoJS, p = u.lib, d = p.Base, l = p.WordArray, p = u.algo, s = p.EvpKDF = d.extend({ cfg: d.extend({ keySize: 4, hasher: p.MD5, iterations: 1 }), init: function(d2) {
        this.cfg = this.cfg.extend(d2);
      }, compute: function(d2, r) {
        for (var p2 = this.cfg, s2 = p2.hasher.create(), b = l.create(), u2 = b.words, q = p2.keySize, p2 = p2.iterations; u2.length < q; ) {
          n && s2.update(n);
          var n = s2.update(d2).finalize(r);
          s2.reset();
          for (var a = 1; a < p2; a++) n = s2.finalize(n), s2.reset();
          b.concat(n);
        }
        b.sigBytes = 4 * q;
        return b;
      } });
      u.EvpKDF = function(d2, l2, p2) {
        return s.create(p2).compute(
          d2,
          l2
        );
      };
    })();
    CryptoJS.lib.Cipher || (function(u) {
      var p = CryptoJS, d = p.lib, l = d.Base, s = d.WordArray, t = d.BufferedBlockAlgorithm, r = p.enc.Base64, w = p.algo.EvpKDF, v = d.Cipher = t.extend({
        cfg: l.extend(),
        createEncryptor: function(e, a2) {
          return this.create(this._ENC_XFORM_MODE, e, a2);
        },
        createDecryptor: function(e, a2) {
          return this.create(this._DEC_XFORM_MODE, e, a2);
        },
        init: function(e, a2, b2) {
          this.cfg = this.cfg.extend(b2);
          this._xformMode = e;
          this._key = a2;
          this.reset();
        },
        reset: function() {
          t.reset.call(this);
          this._doReset();
        },
        process: function(e) {
          this._append(e);
          return this._process();
        },
        finalize: function(e) {
          e && this._append(e);
          return this._doFinalize();
        },
        keySize: 4,
        ivSize: 4,
        _ENC_XFORM_MODE: 1,
        _DEC_XFORM_MODE: 2,
        _createHelper: function(e) {
          return { encrypt: function(b2, k, d2) {
            return ("string" == typeof k ? c : a).encrypt(e, b2, k, d2);
          }, decrypt: function(b2, k, d2) {
            return ("string" == typeof k ? c : a).decrypt(e, b2, k, d2);
          } };
        }
      });
      d.StreamCipher = v.extend({ _doFinalize: function() {
        return this._process(true);
      }, blockSize: 1 });
      var b = p.mode = {}, x = function(e, a2, b2) {
        var c2 = this._iv;
        c2 ? this._iv = u : c2 = this._prevBlock;
        for (var d2 = 0; d2 < b2; d2++) e[a2 + d2] ^= c2[d2];
      }, q = (d.BlockCipherMode = l.extend({ createEncryptor: function(e, a2) {
        return this.Encryptor.create(e, a2);
      }, createDecryptor: function(e, a2) {
        return this.Decryptor.create(e, a2);
      }, init: function(e, a2) {
        this._cipher = e;
        this._iv = a2;
      } })).extend();
      q.Encryptor = q.extend({ processBlock: function(e, a2) {
        var b2 = this._cipher, c2 = b2.blockSize;
        x.call(this, e, a2, c2);
        b2.encryptBlock(e, a2);
        this._prevBlock = e.slice(a2, a2 + c2);
      } });
      q.Decryptor = q.extend({ processBlock: function(e, a2) {
        var b2 = this._cipher, c2 = b2.blockSize, d2 = e.slice(a2, a2 + c2);
        b2.decryptBlock(e, a2);
        x.call(
          this,
          e,
          a2,
          c2
        );
        this._prevBlock = d2;
      } });
      b = b.CBC = q;
      q = (p.pad = {}).Pkcs7 = { pad: function(a2, b2) {
        for (var c2 = 4 * b2, c2 = c2 - a2.sigBytes % c2, d2 = c2 << 24 | c2 << 16 | c2 << 8 | c2, l2 = [], n2 = 0; n2 < c2; n2 += 4) l2.push(d2);
        c2 = s.create(l2, c2);
        a2.concat(c2);
      }, unpad: function(a2) {
        a2.sigBytes -= a2.words[a2.sigBytes - 1 >>> 2] & 255;
      } };
      d.BlockCipher = v.extend({ cfg: v.cfg.extend({ mode: b, padding: q }), reset: function() {
        v.reset.call(this);
        var a2 = this.cfg, b2 = a2.iv, a2 = a2.mode;
        if (this._xformMode == this._ENC_XFORM_MODE) var c2 = a2.createEncryptor;
        else c2 = a2.createDecryptor, this._minBufferSize = 1;
        this._mode = c2.call(
          a2,
          this,
          b2 && b2.words
        );
      }, _doProcessBlock: function(a2, b2) {
        this._mode.processBlock(a2, b2);
      }, _doFinalize: function() {
        var a2 = this.cfg.padding;
        if (this._xformMode == this._ENC_XFORM_MODE) {
          a2.pad(this._data, this.blockSize);
          var b2 = this._process(true);
        } else b2 = this._process(true), a2.unpad(b2);
        return b2;
      }, blockSize: 4 });
      var n = d.CipherParams = l.extend({ init: function(a2) {
        this.mixIn(a2);
      }, toString: function(a2) {
        return (a2 || this.formatter).stringify(this);
      } }), b = (p.format = {}).OpenSSL = { stringify: function(a2) {
        var b2 = a2.ciphertext;
        a2 = a2.salt;
        return (a2 ? s.create([
          1398893684,
          1701076831
        ]).concat(a2).concat(b2) : b2).toString(r);
      }, parse: function(a2) {
        a2 = r.parse(a2);
        var b2 = a2.words;
        if (1398893684 == b2[0] && 1701076831 == b2[1]) {
          var c2 = s.create(b2.slice(2, 4));
          b2.splice(0, 4);
          a2.sigBytes -= 16;
        }
        return n.create({ ciphertext: a2, salt: c2 });
      } }, a = d.SerializableCipher = l.extend({
        cfg: l.extend({ format: b }),
        encrypt: function(a2, b2, c2, d2) {
          d2 = this.cfg.extend(d2);
          var l2 = a2.createEncryptor(c2, d2);
          b2 = l2.finalize(b2);
          l2 = l2.cfg;
          return n.create({ ciphertext: b2, key: c2, iv: l2.iv, algorithm: a2, mode: l2.mode, padding: l2.padding, blockSize: a2.blockSize, formatter: d2.format });
        },
        decrypt: function(a2, b2, c2, d2) {
          d2 = this.cfg.extend(d2);
          b2 = this._parse(b2, d2.format);
          return a2.createDecryptor(c2, d2).finalize(b2.ciphertext);
        },
        _parse: function(a2, b2) {
          return "string" == typeof a2 ? b2.parse(a2, this) : a2;
        }
      }), p = (p.kdf = {}).OpenSSL = { execute: function(a2, b2, c2, d2) {
        d2 || (d2 = s.random(8));
        a2 = w.create({ keySize: b2 + c2 }).compute(a2, d2);
        c2 = s.create(a2.words.slice(b2), 4 * c2);
        a2.sigBytes = 4 * b2;
        return n.create({ key: a2, iv: c2, salt: d2 });
      } }, c = d.PasswordBasedCipher = a.extend({ cfg: a.cfg.extend({ kdf: p }), encrypt: function(b2, c2, d2, l2) {
        l2 = this.cfg.extend(l2);
        d2 = l2.kdf.execute(
          d2,
          b2.keySize,
          b2.ivSize
        );
        l2.iv = d2.iv;
        b2 = a.encrypt.call(this, b2, c2, d2.key, l2);
        b2.mixIn(d2);
        return b2;
      }, decrypt: function(b2, c2, d2, l2) {
        l2 = this.cfg.extend(l2);
        c2 = this._parse(c2, l2.format);
        d2 = l2.kdf.execute(d2, b2.keySize, b2.ivSize, c2.salt);
        l2.iv = d2.iv;
        return a.decrypt.call(this, b2, c2, d2.key, l2);
      } });
    })();
    (function() {
      for (var u = CryptoJS, p = u.lib.BlockCipher, d = u.algo, l = [], s = [], t = [], r = [], w = [], v = [], b = [], x = [], q = [], n = [], a = [], c = 0; 256 > c; c++) a[c] = 128 > c ? c << 1 : c << 1 ^ 283;
      for (var e = 0, j = 0, c = 0; 256 > c; c++) {
        var k = j ^ j << 1 ^ j << 2 ^ j << 3 ^ j << 4, k = k >>> 8 ^ k & 255 ^ 99;
        l[e] = k;
        s[k] = e;
        var z = a[e], F = a[z], G = a[F], y = 257 * a[k] ^ 16843008 * k;
        t[e] = y << 24 | y >>> 8;
        r[e] = y << 16 | y >>> 16;
        w[e] = y << 8 | y >>> 24;
        v[e] = y;
        y = 16843009 * G ^ 65537 * F ^ 257 * z ^ 16843008 * e;
        b[k] = y << 24 | y >>> 8;
        x[k] = y << 16 | y >>> 16;
        q[k] = y << 8 | y >>> 24;
        n[k] = y;
        e ? (e = z ^ a[a[a[G ^ z]]], j ^= a[a[j]]) : e = j = 1;
      }
      var H = [
        0,
        1,
        2,
        4,
        8,
        16,
        32,
        64,
        128,
        27,
        54
      ], d = d.AES = p.extend({ _doReset: function() {
        for (var a2 = this._key, c2 = a2.words, d2 = a2.sigBytes / 4, a2 = 4 * ((this._nRounds = d2 + 6) + 1), e2 = this._keySchedule = [], j2 = 0; j2 < a2; j2++) if (j2 < d2) e2[j2] = c2[j2];
        else {
          var k2 = e2[j2 - 1];
          j2 % d2 ? 6 < d2 && 4 == j2 % d2 && (k2 = l[k2 >>> 24] << 24 | l[k2 >>> 16 & 255] << 16 | l[k2 >>> 8 & 255] << 8 | l[k2 & 255]) : (k2 = k2 << 8 | k2 >>> 24, k2 = l[k2 >>> 24] << 24 | l[k2 >>> 16 & 255] << 16 | l[k2 >>> 8 & 255] << 8 | l[k2 & 255], k2 ^= H[j2 / d2 | 0] << 24);
          e2[j2] = e2[j2 - d2] ^ k2;
        }
        c2 = this._invKeySchedule = [];
        for (d2 = 0; d2 < a2; d2++) j2 = a2 - d2, k2 = d2 % 4 ? e2[j2] : e2[j2 - 4], c2[d2] = 4 > d2 || 4 >= j2 ? k2 : b[l[k2 >>> 24]] ^ x[l[k2 >>> 16 & 255]] ^ q[l[k2 >>> 8 & 255]] ^ n[l[k2 & 255]];
      }, encryptBlock: function(a2, b2) {
        this._doCryptBlock(a2, b2, this._keySchedule, t, r, w, v, l);
      }, decryptBlock: function(a2, c2) {
        var d2 = a2[c2 + 1];
        a2[c2 + 1] = a2[c2 + 3];
        a2[c2 + 3] = d2;
        this._doCryptBlock(a2, c2, this._invKeySchedule, b, x, q, n, s);
        d2 = a2[c2 + 1];
        a2[c2 + 1] = a2[c2 + 3];
        a2[c2 + 3] = d2;
      }, _doCryptBlock: function(a2, b2, c2, d2, e2, j2, l2, f) {
        for (var m = this._nRounds, g = a2[b2] ^ c2[0], h = a2[b2 + 1] ^ c2[1], k2 = a2[b2 + 2] ^ c2[2], n2 = a2[b2 + 3] ^ c2[3], p2 = 4, r2 = 1; r2 < m; r2++) var q2 = d2[g >>> 24] ^ e2[h >>> 16 & 255] ^ j2[k2 >>> 8 & 255] ^ l2[n2 & 255] ^ c2[p2++], s2 = d2[h >>> 24] ^ e2[k2 >>> 16 & 255] ^ j2[n2 >>> 8 & 255] ^ l2[g & 255] ^ c2[p2++], t2 = d2[k2 >>> 24] ^ e2[n2 >>> 16 & 255] ^ j2[g >>> 8 & 255] ^ l2[h & 255] ^ c2[p2++], n2 = d2[n2 >>> 24] ^ e2[g >>> 16 & 255] ^ j2[h >>> 8 & 255] ^ l2[k2 & 255] ^ c2[p2++], g = q2, h = s2, k2 = t2;
        q2 = (f[g >>> 24] << 24 | f[h >>> 16 & 255] << 16 | f[k2 >>> 8 & 255] << 8 | f[n2 & 255]) ^ c2[p2++];
        s2 = (f[h >>> 24] << 24 | f[k2 >>> 16 & 255] << 16 | f[n2 >>> 8 & 255] << 8 | f[g & 255]) ^ c2[p2++];
        t2 = (f[k2 >>> 24] << 24 | f[n2 >>> 16 & 255] << 16 | f[g >>> 8 & 255] << 8 | f[h & 255]) ^ c2[p2++];
        n2 = (f[n2 >>> 24] << 24 | f[g >>> 16 & 255] << 16 | f[h >>> 8 & 255] << 8 | f[k2 & 255]) ^ c2[p2++];
        a2[b2] = q2;
        a2[b2 + 1] = s2;
        a2[b2 + 2] = t2;
        a2[b2 + 3] = n2;
      }, keySize: 8 });
      u.AES = p._createHelper(d);
    })();
    iv = CryptoJS.enc.Utf8.parse(iv);
    key = CryptoJS.enc.Utf8.parse(key);
    let result = CryptoJS.AES.decrypt(
      data,
      key,
      {
        iv,
        mode: CryptoJS.mode.CBC
      }
    );
    let text = CryptoJS.enc.Utf8.stringify(result).toString();
    return text;
  }
  decrypt_token_key(toekn_key) {
    var _0xod4 = "jsjiami.com.v6", _0x175e = [_0xod4, "JMOsw6omwoDCmw==", "wp3DkSx5Eg==", "HB7CscOJfS3DuUjDv2bDjsOmwr3Cm8KcwoI=", "fR/Dqg==", "ShRGTcKa", "w5Y8VBs=", "esKYKQ==", "FgIdwrPDnMKOw7k=", "HhXCmA==", "woNrRsKSwpnDvcKfw4g=", "ezBn", "w43DkcK5w4MaJiE=", "w44Ob8KjwrjCrMKtUA==", "HwtswqI=", "YsKnwrRawro=", "Sm/CpQXCjz4RH8ORSXw=", "IsO6w64=", "T8OeAQ==", "VcK4Hg==", "csOmfBJ4", "d8OAcA5L", "Tn4RL2s=", "w7goGizCmw==", "w6XDlcOGwpoY", "TsK7wpNPwrg=", "w7J1CzLCnsO+HA==", "w4XDkcK0w5YXPg==", "S8KoCcKS", "PcKWHcK/Eg==", "Z2oMJ3rCiw==", "YsKMG8KMwo0=", "QsOecgRIwp4=", "dFzDkUUxw48Qw7nCmX3CicODCMKnw74IOg==", "acO2KU1B", "wrAnw6DDrg==", "w5MsScKwwoA=", "wohZG8KhBg==", "b8OieSpZ", "w4ZmEsORw6I=", "w7jDhxvCh8KY", "w7wQa8KFwr0=", "IMObw4E3wqU=", "JsOjw5Erwrg=", "w6MwcsKOwqU=", "b8KIwqF0wrs=", "XhXDvT52", "wrDCmirChSE=", "w5t1wpvDuwE=", "XA7CtsKeEA==", "wonCvVthw78=", "U8KPP8KMwq4=", "wp7DhCxjGTU=", "woPDoBdiEQ==", "HjzCrE/Dvg==", "SsOQOWHCgg==", "w6NdwoXCkMOx", "w6shYWQ/", "eE/Cgg==", "XW/Csj7CmDoA", "w680OynCgcK5BA8=", "w4PDoMOTwrog", "w5R7wqbCpMOPwrMxUcOiM8OuMVLCisKKFsOXAcOWY8O6w5hM", "WwjDoht0", "PzXCiHHDiA==", "QMOFaMKcfQ==", "bz9bVsK+", "w7Npwp/DsB9ONw==", "EcOPBQ3Cig==", "woHDnzk=", "DsKQLxtd", "R8OCJmk=", "wp55O8On", "bkXCmhTCqg==", "w7vDgx3Cg8KU", "w6nDo8KdAn8=", "O8KwP8KEDw==", "wqzCtCHCtCg=", "w5nDgmYhw5c=", "wp0OZsK+w4A=", "wrFxe8KFwp/DvcKew4EbN8K7BMORMx3DuxtOVELChsOEIQ==", "BMKWRDc=", "IS5dw6nDhQ==", "w6geeG8t", "SsK/wohywpc=", "LBlnw7jDkA==", "wodiLsOg", "Ig5Ow7/Dlw==", "TMOOewRZwoQ=", "LjnClV7DvA==", "woZsO8KcPQ==", "eWvClMKeKQ==", "wq1KWsKswr8=", "w4p+AGFa", "C8O7F8K2CQcKFxxgwo5sfh3DpAFV", "w6XDqMKoCw==", "w6Z8wqnCpMOe", "w6x/CHRhXhV/w7I=", "wrvClndGw5Y=", "VsKcwo5RwoA=", "ZcK2BMKmLQ==", "BCcPwofDvQ==", "eGEsF20=", "eMOcUglq", "w4U9XEAMw4/Dm3rCuzpxTg/DvyDDvMONH8OTwpTCtsKbw6k=", "VwXDkTxG", "CzHCrl3DkQ==", "w7PDkVovw4o=", "dsONYDdj", "w79pwr3Duh4=", "w55kwoLCpMOR", "w6gbc8KGwpw=", "bCnCtMKCCg==", "Php5w64=", "w7x8wpfDtiQ=", "w4TDk2AB", "w7lowoHDtgQ=", "DB/CsnjDuQ==", "woTDl8K3wp4S", "wr0Ewq7Dq8Oh", "GmHCpGxN", "w5/Dm2XDpw==", "w5bDpsOCwqoA", "YMKowphwwqc=", "ahFuVsK9", "w57DtEsbw7k=", "w6LDo8Kq", "UsKzE8KO", "w6xlBFl9", "WMOgIXbCiw==", "DBhjw5fDhQ==", "w6pUwoHCnsOs", "ZF7CtsKiHg==", "wos4w7wCwr0c", "JlXCjlpyw5pMw6s=", "TcO1N8K4wqE=", "SMOzTcKYRw==", "w4HDosOzwrUc", "wqxdwqE2wrY=", "A8OPGQjChw==", "wpkxasOxBQ==", "wpIZSA==", "VsOnEEvChg==", "bMOSZy93", "c8OwZsKnRQ==", "SsK/wpBHwoQ=", "ccOsHVFf", "w6ZKYMO8w6rDr8OrCHxdwqtdwrDDksOMccKZwobDpQPDgsOrAMKXF8OMPcOySsKuL8KLwq8vwr/DkjbDqsOCbRrCkcOTTFfDlsKkw7PChCM1wqTDisKawpHDt8KCQRY3w6DDgMKVw6M=", "w7hYwq3ClsOa", "Fic5wqLDiw==", "KcKqHCVV", "wqvDucKSwrs/", "YcOfQcKPSQ==", "wpjClmNRw7U=", "wpHClSnCizg=", "w4PDh8Kw", "JsOYGwnCpw==", "w5vDksK8w6sl", "U8ORCHt+Rw==", "woVxO8OSJQ==", "b37Chw/Clw==", "w6ViBXZlQg==", "UwPCucKQCgU=", "UMOeZgs=", "MTLCtW7Dq2o=", "wqAQwr/DqcOi", "DiLDtsOOZsKEbsOrGm03EcKEwr/CplQ=", "dzPDnRhP", "wplgT8KBwow=", "XUzCg8KF", "K8KTCcKrCQ==", "w6ZKJMOw", "LxTCmn/DsA==", "wooObcKBw6g=", "w5djwofDoTQ=", "VMOHeAts", "Kw96w7bDig==", "wogpw6crwps=", "PDzDn8OcWQ==", "wrfCoWxfw4E=", "wrrDv8KDwoI+", "w7hnwrjCssOq", "w4LDrMOwwpMp", "S2vCvyjCjic=", "w6DDoT7CtcKNwoo=", "wp1Lw5zCpj4=", "RsOEGcKVwps=", "woxlwo0twoM=", "MAZYw7TDmg==", "w7ENEC7CgA==", "wolVw4jCryEqVMOYdg==", "wp45w6cCwqY=", "w6UhVHs1", "QBZFW8KH", "Ozhvw7vDkQ==", "E8O4DAXCnA==", "AcOXR8OZ", "w4NhwqbCk8O6", "f8OyScKpRRJTBQd9w4t3PgzCtRMQwrjDrUZ9Z8Od", "A8OHw7Inwoc=", "wqlQE8KHDg==", "wqYbZMOVMg==", "w57DuVwAw60=", "W8OyQMKtVAk=", "w60PBwXCng==", "w4h7w70gw55WbHfDuR0VQ8K+asOxwoJn", "w5rDhMK2w5gX", "N0HCklc=", "w58TTsK4wrg=", "w7dXNMOhw79pwqBMw70=", "SsKQCcKf", "KSXCumrDug==", "woc1w7gUwrEEw7s=", "wplowqIvwoFGMQ==", "acO9DcK+", "UMKBwpJNwp1ZfA==", "wpV+NsKCLQ==", "w5PDrMOrwo4iwrcU", "XHjCoyPCkw==", "w5kOUsKkwqXCqcKm", "QMKRAcKDDMK+AA==", "bMKoNcKgwrc=", "w6k0HTPClw==", "wpUYYcOcBA==", "w6k6BjnCnMK9", "w5HDnncPw60=", "jEsjiamLiI.coRVzmBz.v6gWBKxrg=="];
    (function(_0x2410c8, _0x4731c1, _0x21bfda) {
      var _0x12d6b4 = function(_0x56792e, _0x26ff38, _0x14a967, _0x1f013c, _0x21c988) {
        _0x26ff38 = _0x26ff38 >> 8, _0x21c988 = "po";
        var _0x10be12 = "shift", _0x47704d = "push";
        if (_0x26ff38 < _0x56792e) {
          while (--_0x56792e) {
            _0x1f013c = _0x2410c8[_0x10be12]();
            if (_0x26ff38 === _0x56792e) {
              _0x26ff38 = _0x1f013c;
              _0x14a967 = _0x2410c8[_0x21c988 + "p"]();
            } else if (_0x26ff38 && _0x14a967["replace"](/[ELIRVzBzgWBKxrg=]/g, "") === _0x26ff38) {
              _0x2410c8[_0x47704d](_0x1f013c);
            }
          }
          _0x2410c8[_0x47704d](_0x2410c8[_0x10be12]());
        }
        return 672972;
      };
      return _0x12d6b4(++_0x4731c1, _0x21bfda) >> _0x4731c1 ^ _0x21bfda;
    })(_0x175e, 348, 89088);
    var _0x17f1 = function(_0x3abb24, _0x9f8a97) {
      _0x3abb24 = ~~"0x"["concat"](_0x3abb24);
      var _0x411694 = _0x175e[_0x3abb24];
      if (_0x17f1["nIHPps"] === void 0) {
        (function() {
          var _0x264909 = typeof window !== "undefined" ? window : typeof process === "object" && typeof require === "function" && typeof global === "object" ? global : this;
          var _0x52b78f = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
          _0x264909["atob"] || (_0x264909["atob"] = function(_0x202c2d) {
            var _0x2e97e4 = String(_0x202c2d)["replace"](/=+$/, "");
            for (var _0x488147 = 0, _0x1702c1, _0x5d977a, _0x1a87f9 = 0, _0x2378be = ""; _0x5d977a = _0x2e97e4["charAt"](_0x1a87f9++); ~_0x5d977a && (_0x1702c1 = _0x488147 % 4 ? _0x1702c1 * 64 + _0x5d977a : _0x5d977a, _0x488147++ % 4) ? _0x2378be += String["fromCharCode"](255 & _0x1702c1 >> (-2 * _0x488147 & 6)) : 0) {
              _0x5d977a = _0x52b78f["indexOf"](_0x5d977a);
            }
            return _0x2378be;
          });
        })();
        var _0x5cedb3 = function(_0x19b8a7, _0x9f8a972) {
          var _0x2b0e6a = [], _0x4f25fe = 0, _0x29acd8, _0x2643f2 = "", _0x58e8bd = "";
          _0x19b8a7 = atob(_0x19b8a7);
          for (var _0x1ac59f = 0, _0x3346bd = _0x19b8a7["length"]; _0x1ac59f < _0x3346bd; _0x1ac59f++) {
            _0x58e8bd += "%" + ("00" + _0x19b8a7["charCodeAt"](_0x1ac59f)["toString"](16))["slice"](-2);
          }
          _0x19b8a7 = decodeURIComponent(_0x58e8bd);
          for (var _0xb0c930 = 0; _0xb0c930 < 256; _0xb0c930++) {
            _0x2b0e6a[_0xb0c930] = _0xb0c930;
          }
          for (_0xb0c930 = 0; _0xb0c930 < 256; _0xb0c930++) {
            _0x4f25fe = (_0x4f25fe + _0x2b0e6a[_0xb0c930] + _0x9f8a972["charCodeAt"](_0xb0c930 % _0x9f8a972["length"])) % 256;
            _0x29acd8 = _0x2b0e6a[_0xb0c930];
            _0x2b0e6a[_0xb0c930] = _0x2b0e6a[_0x4f25fe];
            _0x2b0e6a[_0x4f25fe] = _0x29acd8;
          }
          _0xb0c930 = 0;
          _0x4f25fe = 0;
          for (var _0x4f50dd = 0; _0x4f50dd < _0x19b8a7["length"]; _0x4f50dd++) {
            _0xb0c930 = (_0xb0c930 + 1) % 256;
            _0x4f25fe = (_0x4f25fe + _0x2b0e6a[_0xb0c930]) % 256;
            _0x29acd8 = _0x2b0e6a[_0xb0c930];
            _0x2b0e6a[_0xb0c930] = _0x2b0e6a[_0x4f25fe];
            _0x2b0e6a[_0x4f25fe] = _0x29acd8;
            _0x2643f2 += String["fromCharCode"](_0x19b8a7["charCodeAt"](_0x4f50dd) ^ _0x2b0e6a[(_0x2b0e6a[_0xb0c930] + _0x2b0e6a[_0x4f25fe]) % 256]);
          }
          return _0x2643f2;
        };
        _0x17f1["RtnfNa"] = _0x5cedb3;
        _0x17f1["afYpDj"] = {};
        _0x17f1["nIHPps"] = !![];
      }
      var _0x5dc739 = _0x17f1["afYpDj"][_0x3abb24];
      if (_0x5dc739 === void 0) {
        if (_0x17f1["OqAPEJ"] === void 0) {
          _0x17f1["OqAPEJ"] = !![];
        }
        _0x411694 = _0x17f1["RtnfNa"](_0x411694, _0x9f8a97);
        _0x17f1["afYpDj"][_0x3abb24] = _0x411694;
      } else {
        _0x411694 = _0x5dc739;
      }
      return _0x411694;
    };
    return eval(toekn_key);
  }
}
