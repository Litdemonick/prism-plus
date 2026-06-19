// ==PrismHubExtension==
// @name         Movieku
// @version      v0.0.3
// @author       appdevelpo
// @lang         id
// @license      MIT
// @icon         https://i2.wp.com/107.152.37.223/wp-content/uploads/2020/12/cropped-Movieku-2-32x32.jpg
// @package      movieku.lol
// @type         bangumi
// @webSite      https://movieku.lol
// @nsfw         false
// ==/PrismHubExtension==

export default class extends Extension {
  async load() {
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
    this.CryptoJS = CryptoJS;
    var CryptoJSAesJson = {
      /**
       * Encrypt any value
       * @param {*} value
       * @param {string} password
       * @return {string}
       */
      "encrypt": function(value, password) {
        if (password.match(/[^\x00-\x7F]/)) {
          console.warn("CryptoJSAES: Your passphrase contains non ASCII characters - This is not supported. Hash your passphrase with MD5 or similar hashes to prevent those issues");
        }
        return CryptoJS.AES.encrypt(JSON.stringify(value), password, { format: CryptoJSAesJson }).toString();
      },
      /**
       * Decrypt a previously encrypted value
       * @param {string} jsonStr
       * @param {string} password
       * @return {*}
       */
      "decrypt": function(jsonStr, password) {
        if (password.match(/[^\x00-\x7F]/)) {
          console.warn("CryptoJSAES: Your passphrase contains non ASCII characters - This is not supported. Hash your passphrase with MD5 or similar hashes to prevent those issues");
        }
        return JSON.parse(CryptoJS.AES.decrypt(jsonStr, password, { format: CryptoJSAesJson }).toString(CryptoJS.enc.Utf8));
      },
      /**
       * Stringify cryptojs data
       * @param {Object} cipherParams
       * @return {string}
       */
      "stringify": function(cipherParams) {
        var j = { ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64) };
        if (cipherParams.iv) j.iv = cipherParams.iv.toString();
        if (cipherParams.salt) j.s = cipherParams.salt.toString();
        return JSON.stringify(j).replace(/\s/g, "");
      },
      /**
       * Parse cryptojs data
       * @param {string} jsonStr
       * @return {*}
       */
      "parse": function(jsonStr) {
        var j = JSON.parse(jsonStr);
        var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(j.ct) });
        if (j.iv) cipherParams.iv = CryptoJS.enc.Hex.parse(j.iv);
        if (j.s) cipherParams.salt = CryptoJS.enc.Hex.parse(j.s);
        return cipherParams;
      }
    };
    this.CryptoJSAesJson = CryptoJSAesJson;
  }
  async get_content(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
        "Referer": "https://107.152.37.223/"
      }
    });
    const _0xc82e = ["", "split", "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/", "slice", "indexOf", "", "", ".", "pow", "reduce", "reverse", "0"], _0xe10c = function(d, e, f) {
      var g = _0xc82e[2][_0xc82e[1]](_0xc82e[0]);
      var h = g[_0xc82e[3]](0, e);
      var i = g[_0xc82e[3]](0, f);
      var j = d[_0xc82e[1]](_0xc82e[0])[_0xc82e[10]]()[_0xc82e[9]](function(a, b, c) {
        if (h[_0xc82e[4]](b) !== -1) return a += h[_0xc82e[4]](b) * Math[_0xc82e[8]](e, c);
      }, 0);
      var k = _0xc82e[0];
      while (j > 0) {
        k = i[j % f] + k;
        j = (j - j % f) / f;
      }
      return k || _0xc82e[11];
    }, _0xc60f = function(p, l, a, y, e, r) {
      r = "";
      for (var i = 0, len = p.length; i < len; i++) {
        var s = "";
        while (p[i] !== a[e]) {
          s += p[i];
          i++;
        }
        for (var j = 0; j < a.length; j++) s = s.replace(new RegExp(a[j], "g"), j);
        r += String.fromCharCode(_0xe10c(s, e, 10) - y);
        if (r.match(/'.+?'/)) {
          const script_title = r.match(/decrypt\((.+?),/)[1];
          return [script_title, r.match(/'(.+?)'/)[1]];
        }
      }
      return decodeURIComponent(encodeURI(r));
    };
    const eval_area = res.match(/eval\((.+?\))/)[1];
    const eval_script = eval_area.replace(/\w+x\w+/, "_0xc60f");
    const output = eval(eval_script);
    const key = output[1];
    const JscRIPT = res.match(RegExp(`${output[0]} = ('.+?')`))[1] + ";";
    const JSCRIPT = eval(JscRIPT);
    const str = JSCRIPT;
    const decrypt_data = this.CryptoJSAesJson.decrypt(str, key);
    const m3u8_link = decrypt_data.match(/(https:.+?m3u8.+?)"/)[1];
    const baseurl = m3u8_link.match(/(http.+?\/)video/)[1];
    const subtitle_link = decrypt_data.match(/https.+?srt/)[0];
    const sub_lang = decrypt_data.match(/default_subtitle.*?"(\w+)"/)[1];
    this.subs = {
      title: sub_lang,
      url: subtitle_link
    };
    const m3u8_source = await this.request("", {
      headers: {
        "Miru-Url": m3u8_link,
        "Referer": " https://data.sikocak.xyz/"
      }
    });
    const m3u8_source_list = [{ url: m3u8_link, name: "auto" }];
    const m3u8_link_area = m3u8_source.match(/\d+.m3u8\?token.+/g);
    m3u8_link_area.forEach((element) => {
      m3u8_source_list.push({
        name: element.match(/\d+/)[0],
        url: baseurl + element
      });
    });
    return m3u8_source_list;
  }
  async search(kw, page, filter) {
    if (kw == "") {
      var res2 = await this.request(`/${filter.filter1[0]}/page/${page}/`);
    } else {
      var res2 = await this.request(`/page/${page}/?s=${kw}`);
    }
    const bsxList = res2.match(/<article[\s\S]+?<\/article>/g);
    const videos = [];
    bsxList.forEach((element) => {
      const url2 = element.match(/href="https:\/\/movieku.lol(.+?)"/)[1];
      const title = element.match(/title="(.+?)"/)[1];
      const cover = element.match(/img src="(.+?)"/)[1];
      videos.push({
        title,
        url: url2,
        cover
      });
    });
    return videos;
  }
  async createFilter(filter) {
    const filter1 = {
      title: "",
      max: 1,
      min: 1,
      default: "latest-movies",
      options: {
        "latest-movies": "latest movie",
        "series": "latest series"
      }
    };
    return { filter1 };
  }
  async latest(page) {
    const res2 = await this.request(`/latest-movies/page/${page}/`);
    const bsxList = res2.match(/<article[\s\S]+?<\/article>/g);
    const videos = [];
    bsxList.forEach((element) => {
      const url2 = element.match(/href="https:\/\/movieku.lol(.+?)"/)[1];
      const title = element.match(/title="(.+?)"/)[1];
      const cover = element.match(/img src="(.+?)"/)[1];
      videos.push({
        title,
        url: url2,
        cover
      });
    });
    return videos;
  }
  async detail(url2) {
    const res2 = await this.request(url2);
    const title = res2.match(/<h1.+?>(.+?)<\/h1>/)[1];
    const cover = res2.match(/(https:\/\/i\d.wp.com[^\?]+?)"/)[1];
    const desc = res2.match(/<p>([\S\s]+?)<\/p>/)[1];
    const ep_list_area = res2.match(/<ul style[\s\S]+?<\/ul>/);
    if (ep_list_area === null) {
      const player_link = res2.match(/<iframe src="(.+?)"/);
      if (player_link === null) {
        return {
          title,
          cover,
          desc
        };
      }
      const response = await this.get_content(player_link[1]);
      return {
        title,
        cover,
        desc,
        episodes: [
          {
            title: "auto",
            urls: response
          }
        ]
      };
    }
    const ep_list = ep_list_area[0].match(/<li[\s\S]+?<\/li>/g);
    const episodes = [];
    const quality = ["auto", "1080", "720", "360"];
    quality.forEach((element) => {
      episodes.push({
        title: element,
        urls: ep_list.map((index) => {
          return {
            name: index.match(/<b>(.+?)<\/b>/)[1],
            url: index.match(/href="https:\/\/movieku.lol(.+?)"/)[1] + ";" + element
          };
        })
      });
    });
    return {
      title,
      cover,
      desc,
      episodes
    };
  }
  async watch(url2) {
    if (url2.includes("zcdn")) {
      return {
        type: "hls",
        url: url2,
        subtitles: [this.subs]
      };
    }
    const req_url = url2.split(";")[0];
    const resolution = url2.split(";")[1];
    const res2 = await this.request(req_url);
    const player_link = res2.match(/<iframe src="(.+?)"/);
    const response = await this.get_content(player_link[1]);
    const res_contain_list = response.map((item) => {
      return item.name;
    });
    const stream_link = res_contain_list.includes(resolution) ? response[res_contain_list.indexOf(resolution)].url : response[0].url;
    return {
      type: "hls",
      url: stream_link,
      subtitles: [this.subs]
    };
  }
}
