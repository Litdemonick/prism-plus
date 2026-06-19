// ==PrismHubExtension==
// @name         轻小说文库
// @version      v0.0.1
// @author       NPGamma
// @lang         zh-cn
// @icon         https://www.wenku8.net/favicon.ico
// @license      AGPL-3.0
// @package      moe.wol.wenku8
// @type         fikushon
// @webSite      https://www.wenku8.net
// ==/PrismHubExtension==

var XMLParser;
(() => {
  var t = { 807: (t2) => {
    const e2 = /^[-+]?0x[a-fA-F0-9]+$/, r2 = /^([\-\+])?(0*)(\.[0-9]+([eE]\-?[0-9]+)?|[0-9]+(\.[0-9]+([eE]\-?[0-9]+)?)?)$/;
    !Number.parseInt && window.parseInt && (Number.parseInt = window.parseInt), !Number.parseFloat && window.parseFloat && (Number.parseFloat = window.parseFloat);
    const i = { hex: true, leadingZeros: true, decimalPoint: ".", eNotation: true };
    t2.exports = function(t3, n = {}) {
      if (n = Object.assign({}, i, n), !t3 || "string" != typeof t3) return t3;
      let a = t3.trim();
      if (void 0 !== n.skipLike && n.skipLike.test(a)) return t3;
      if (n.hex && e2.test(a)) return Number.parseInt(a, 16);
      {
        const e3 = r2.exec(a);
        if (e3) {
          const r3 = e3[1], i2 = e3[2];
          let o = (s = e3[3]) && -1 !== s.indexOf(".") ? ("." === (s = s.replace(/0+$/, "")) ? s = "0" : "." === s[0] ? s = "0" + s : "." === s[s.length - 1] && (s = s.substr(0, s.length - 1)), s) : s;
          const l = e3[4] || e3[6];
          if (!n.leadingZeros && i2.length > 0 && r3 && "." !== a[2]) return t3;
          if (!n.leadingZeros && i2.length > 0 && !r3 && "." !== a[1]) return t3;
          {
            const e4 = Number(a), s2 = "" + e4;
            return -1 !== s2.search(/[eE]/) || l ? n.eNotation ? e4 : t3 : -1 !== a.indexOf(".") ? "0" === s2 && "" === o || s2 === o || r3 && s2 === "-" + o ? e4 : t3 : i2 ? o === s2 || r3 + o === s2 ? e4 : t3 : a === s2 || a === r3 + s2 ? e4 : t3;
          }
        }
        return t3;
      }
      var s;
    };
  }, 839: (t2, e2) => {
    "use strict";
    var r2 = "[:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*", i = new RegExp("^" + r2 + "$");
    e2.isExist = function(t3) {
      return void 0 !== t3;
    }, e2.isEmptyObject = function(t3) {
      return 0 === Object.keys(t3).length;
    }, e2.merge = function(t3, e3, r3) {
      if (e3) for (var i2 = Object.keys(e3), n = i2.length, a = 0; a < n; a++) t3[i2[a]] = "strict" === r3 ? [e3[i2[a]]] : e3[i2[a]];
    }, e2.getValue = function(t3) {
      return e2.isExist(t3) ? t3 : "";
    }, e2.isName = function(t3) {
      return !(null == i.exec(t3));
    }, e2.getAllMatches = function(t3, e3) {
      for (var r3 = [], i2 = e3.exec(t3); i2; ) {
        var n = [];
        n.startIndex = e3.lastIndex - i2[0].length;
        for (var a = i2.length, s = 0; s < a; s++) n.push(i2[s]);
        r3.push(n), i2 = e3.exec(t3);
      }
      return r3;
    }, e2.nameRegexp = r2;
  }, 239: (t2, e2, r2) => {
    "use strict";
    var i = r2(839), n = { allowBooleanAttributes: false, unpairedTags: [] };
    function a(t3) {
      return " " === t3 || "	" === t3 || "\n" === t3 || "\r" === t3;
    }
    function s(t3, e3) {
      for (var r3 = e3; e3 < t3.length; e3++) if ("?" != t3[e3] && " " != t3[e3]) ;
      else {
        var i2 = t3.substr(r3, e3 - r3);
        if (e3 > 5 && "xml" === i2) return d("InvalidXml", "XML declaration allowed only at the start of the document.", p(t3, e3));
        if ("?" == t3[e3] && ">" == t3[e3 + 1]) {
          e3++;
          break;
        }
      }
      return e3;
    }
    function o(t3, e3) {
      if (t3.length > e3 + 5 && "-" === t3[e3 + 1] && "-" === t3[e3 + 2]) {
        for (e3 += 3; e3 < t3.length; e3++) if ("-" === t3[e3] && "-" === t3[e3 + 1] && ">" === t3[e3 + 2]) {
          e3 += 2;
          break;
        }
      } else if (t3.length > e3 + 8 && "D" === t3[e3 + 1] && "O" === t3[e3 + 2] && "C" === t3[e3 + 3] && "T" === t3[e3 + 4] && "Y" === t3[e3 + 5] && "P" === t3[e3 + 6] && "E" === t3[e3 + 7]) {
        var r3 = 1;
        for (e3 += 8; e3 < t3.length; e3++) if ("<" === t3[e3]) r3++;
        else if (">" === t3[e3] && 0 == --r3) break;
      } else if (t3.length > e3 + 9 && "[" === t3[e3 + 1] && "C" === t3[e3 + 2] && "D" === t3[e3 + 3] && "A" === t3[e3 + 4] && "T" === t3[e3 + 5] && "A" === t3[e3 + 6] && "[" === t3[e3 + 7]) {
        for (e3 += 8; e3 < t3.length; e3++) if ("]" === t3[e3] && "]" === t3[e3 + 1] && ">" === t3[e3 + 2]) {
          e3 += 2;
          break;
        }
      }
      return e3;
    }
    function l(t3, e3) {
      for (var r3 = "", i2 = "", n2 = false; e3 < t3.length; e3++) {
        if ('"' === t3[e3] || "'" === t3[e3]) "" === i2 ? i2 = t3[e3] : i2 !== t3[e3] || (i2 = "");
        else if (">" === t3[e3] && "" === i2) {
          n2 = true;
          break;
        }
        r3 += t3[e3];
      }
      return "" === i2 && { value: r3, index: e3, tagClosed: n2 };
    }
    e2.validate = function(t3, e3) {
      e3 = Object.assign({}, n, e3);
      var r3, u2 = [], h2 = false, c2 = false;
      "\uFEFF" === t3[0] && (t3 = t3.substr(1));
      for (var v = 0; v < t3.length; v++) if ("<" === t3[v] && "?" === t3[v + 1]) {
        if ((v = s(t3, v += 2)).err) return v;
      } else {
        if ("<" !== t3[v]) {
          if (a(t3[v])) continue;
          return d("InvalidChar", "char '" + t3[v] + "' is not expected.", p(t3, v));
        }
        var m = v;
        if ("!" === t3[++v]) {
          v = o(t3, v);
          continue;
        }
        var x = false;
        "/" === t3[v] && (x = true, v++);
        for (var N = ""; v < t3.length && ">" !== t3[v] && " " !== t3[v] && "	" !== t3[v] && "\n" !== t3[v] && "\r" !== t3[v]; v++) N += t3[v];
        if ("/" === (N = N.trim())[N.length - 1] && (N = N.substring(0, N.length - 1), v--), r3 = N, !i.isName(r3)) return d("InvalidTag", 0 === N.trim().length ? "Invalid space after '<'." : "Tag '" + N + "' is an invalid name.", p(t3, v));
        var b = l(t3, v);
        if (false === b) return d("InvalidAttr", "Attributes for '" + N + "' have open quote.", p(t3, v));
        var E = b.value;
        if (v = b.index, "/" === E[E.length - 1]) {
          var T = v - E.length, w = f(E = E.substring(0, E.length - 1), e3);
          if (true !== w) return d(w.err.code, w.err.msg, p(t3, T + w.err.line));
          h2 = true;
        } else if (x) {
          if (!b.tagClosed) return d("InvalidTag", "Closing tag '" + N + "' doesn't have proper closing.", p(t3, v));
          if (E.trim().length > 0) return d("InvalidTag", "Closing tag '" + N + "' can't have attributes or invalid starting.", p(t3, m));
          var y = u2.pop();
          if (N !== y.tagName) {
            var O = p(t3, y.tagStartPos);
            return d("InvalidTag", "Expected closing tag '" + y.tagName + "' (opened in line " + O.line + ", col " + O.col + ") instead of closing tag '" + N + "'.", p(t3, m));
          }
          0 == u2.length && (c2 = true);
        } else {
          var A = f(E, e3);
          if (true !== A) return d(A.err.code, A.err.msg, p(t3, v - E.length + A.err.line));
          if (true === c2) return d("InvalidXml", "Multiple possible root nodes found.", p(t3, v));
          -1 !== e3.unpairedTags.indexOf(N) || u2.push({ tagName: N, tagStartPos: m }), h2 = true;
        }
        for (v++; v < t3.length; v++) if ("<" === t3[v]) {
          if ("!" === t3[v + 1]) {
            v = o(t3, ++v);
            continue;
          }
          if ("?" !== t3[v + 1]) break;
          if ((v = s(t3, ++v)).err) return v;
        } else if ("&" === t3[v]) {
          var I = g(t3, v);
          if (-1 == I) return d("InvalidChar", "char '&' is not expected.", p(t3, v));
          v = I;
        } else if (true === c2 && !a(t3[v])) return d("InvalidXml", "Extra text at the end", p(t3, v));
        "<" === t3[v] && v--;
      }
      return h2 ? 1 == u2.length ? d("InvalidTag", "Unclosed tag '" + u2[0].tagName + "'.", p(t3, u2[0].tagStartPos)) : !(u2.length > 0) || d("InvalidXml", "Invalid '" + JSON.stringify(u2.map((function(t4) {
        return t4.tagName;
      })), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 }) : d("InvalidXml", "Start tag expected.", 1);
    };
    var u = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
    function f(t3, e3) {
      for (var r3 = i.getAllMatches(t3, u), n2 = {}, a2 = 0; a2 < r3.length; a2++) {
        if (0 === r3[a2][1].length) return d("InvalidAttr", "Attribute '" + r3[a2][2] + "' has no space in starting.", c(r3[a2]));
        if (void 0 !== r3[a2][3] && void 0 === r3[a2][4]) return d("InvalidAttr", "Attribute '" + r3[a2][2] + "' is without value.", c(r3[a2]));
        if (void 0 === r3[a2][3] && !e3.allowBooleanAttributes) return d("InvalidAttr", "boolean attribute '" + r3[a2][2] + "' is not allowed.", c(r3[a2]));
        var s2 = r3[a2][2];
        if (!h(s2)) return d("InvalidAttr", "Attribute '" + s2 + "' is an invalid name.", c(r3[a2]));
        if (n2.hasOwnProperty(s2)) return d("InvalidAttr", "Attribute '" + s2 + "' is repeated.", c(r3[a2]));
        n2[s2] = 1;
      }
      return true;
    }
    function g(t3, e3) {
      if (";" === t3[++e3]) return -1;
      if ("#" === t3[e3]) return (function(t4, e4) {
        var r4 = /\d/;
        for ("x" === t4[e4] && (e4++, r4 = /[\da-fA-F]/); e4 < t4.length; e4++) {
          if (";" === t4[e4]) return e4;
          if (!t4[e4].match(r4)) break;
        }
        return -1;
      })(t3, ++e3);
      for (var r3 = 0; e3 < t3.length; e3++, r3++) if (!(t3[e3].match(/\w/) && r3 < 20)) {
        if (";" === t3[e3]) break;
        return -1;
      }
      return e3;
    }
    function d(t3, e3, r3) {
      return { err: { code: t3, msg: e3, line: r3.line || r3, col: r3.col } };
    }
    function h(t3) {
      return i.isName(t3);
    }
    function p(t3, e3) {
      var r3 = t3.substring(0, e3).split(/\r?\n/);
      return { line: r3.length, col: r3[r3.length - 1].length + 1 };
    }
    function c(t3) {
      return t3.startIndex + t3[1].length;
    }
  }, 106: (t2, e2, r2) => {
    var i = r2(839);
    function n(t3, e3) {
      for (var r3 = ""; e3 < t3.length && "'" !== t3[e3] && '"' !== t3[e3]; e3++) r3 += t3[e3];
      if (-1 !== (r3 = r3.trim()).indexOf(" ")) throw new Error("External entites are not supported");
      for (var i2 = t3[e3++], n2 = ""; e3 < t3.length && t3[e3] !== i2; e3++) n2 += t3[e3];
      return [r3, n2, e3];
    }
    function a(t3, e3) {
      return "!" === t3[e3 + 1] && "-" === t3[e3 + 2] && "-" === t3[e3 + 3];
    }
    function s(t3, e3) {
      return "!" === t3[e3 + 1] && "E" === t3[e3 + 2] && "N" === t3[e3 + 3] && "T" === t3[e3 + 4] && "I" === t3[e3 + 5] && "T" === t3[e3 + 6] && "Y" === t3[e3 + 7];
    }
    function o(t3, e3) {
      return "!" === t3[e3 + 1] && "E" === t3[e3 + 2] && "L" === t3[e3 + 3] && "E" === t3[e3 + 4] && "M" === t3[e3 + 5] && "E" === t3[e3 + 6] && "N" === t3[e3 + 7] && "T" === t3[e3 + 8];
    }
    function l(t3, e3) {
      return "!" === t3[e3 + 1] && "A" === t3[e3 + 2] && "T" === t3[e3 + 3] && "T" === t3[e3 + 4] && "L" === t3[e3 + 5] && "I" === t3[e3 + 6] && "S" === t3[e3 + 7] && "T" === t3[e3 + 8];
    }
    function u(t3, e3) {
      return "!" === t3[e3 + 1] && "N" === t3[e3 + 2] && "O" === t3[e3 + 3] && "T" === t3[e3 + 4] && "A" === t3[e3 + 5] && "T" === t3[e3 + 6] && "I" === t3[e3 + 7] && "O" === t3[e3 + 8] && "N" === t3[e3 + 9];
    }
    function f(t3) {
      if (i.isName(t3)) return t3;
      throw new Error("Invalid entity name " + t3);
    }
    t2.exports = function(t3, e3) {
      var r3 = {};
      if ("O" !== t3[e3 + 3] || "C" !== t3[e3 + 4] || "T" !== t3[e3 + 5] || "Y" !== t3[e3 + 6] || "P" !== t3[e3 + 7] || "E" !== t3[e3 + 8]) throw new Error("Invalid Tag instead of DOCTYPE");
      e3 += 9;
      for (var i2 = 1, g = false, d = false; e3 < t3.length; e3++) if ("<" !== t3[e3] || d) if (">" === t3[e3]) {
        if (d ? "-" === t3[e3 - 1] && "-" === t3[e3 - 2] && (d = false, i2--) : i2--, 0 === i2) break;
      } else "[" === t3[e3] ? g = true : t3[e3];
      else {
        if (g && s(t3, e3)) {
          var h = n(t3, (e3 += 7) + 1);
          entityName = h[0], val = h[1], e3 = h[2], -1 === val.indexOf("&") && (r3[f(entityName)] = { regx: RegExp("&" + entityName + ";", "g"), val });
        } else if (g && o(t3, e3)) e3 += 8;
        else if (g && l(t3, e3)) e3 += 8;
        else if (g && u(t3, e3)) e3 += 9;
        else {
          if (!a) throw new Error("Invalid DOCTYPE");
          d = true;
        }
        i2++;
      }
      if (0 !== i2) throw new Error("Unclosed DOCTYPE");
      return { entities: r3, i: e3 };
    };
  }, 348: (t2, e2) => {
    var r2 = { preserveOrder: false, attributeNamePrefix: "@_", attributesGroupName: false, textNodeName: "#text", ignoreAttributes: true, removeNSPrefix: false, allowBooleanAttributes: false, parseTagValue: true, parseAttributeValue: false, trimValues: true, cdataPropName: false, numberParseOptions: { hex: true, leadingZeros: true, eNotation: true }, tagValueProcessor: function(t3, e3) {
      return e3;
    }, attributeValueProcessor: function(t3, e3) {
      return e3;
    }, stopNodes: [], alwaysCreateTextNode: false, isArray: function() {
      return false;
    }, commentPropName: false, unpairedTags: [], processEntities: true, htmlEntities: false, ignoreDeclaration: false, ignorePiTags: false, transformTagName: false, transformAttributeName: false, updateTag: function(t3, e3, r3) {
      return t3;
    } };
    e2.buildOptions = function(t3) {
      return Object.assign({}, r2, t3);
    }, e2.defaultOptions = r2;
  }, 498: (t2, e2, r2) => {
    "use strict";
    var i = r2(839), n = r2(876), a = r2(106), s = r2(807);
    function o(t3) {
      for (var e3 = Object.keys(t3), r3 = 0; r3 < e3.length; r3++) {
        var i2 = e3[r3];
        this.lastEntities[i2] = { regex: new RegExp("&" + i2 + ";", "g"), val: t3[i2] };
      }
    }
    function l(t3, e3, r3, i2, n2, a2, s2) {
      if (void 0 !== t3 && (this.options.trimValues && !i2 && (t3 = t3.trim()), t3.length > 0)) {
        s2 || (t3 = this.replaceEntitiesValue(t3));
        var o2 = this.options.tagValueProcessor(e3, t3, r3, n2, a2);
        return null == o2 ? t3 : typeof o2 != typeof t3 || o2 !== t3 ? o2 : this.options.trimValues || t3.trim() === t3 ? b(t3, this.options.parseTagValue, this.options.numberParseOptions) : t3;
      }
    }
    function u(t3) {
      if (this.options.removeNSPrefix) {
        var e3 = t3.split(":"), r3 = "/" === t3.charAt(0) ? "/" : "";
        if ("xmlns" === e3[0]) return "";
        2 === e3.length && (t3 = r3 + e3[1]);
      }
      return t3;
    }
    "<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)".replace(/NAME/g, i.nameRegexp);
    var f = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
    function g(t3, e3, r3) {
      if (!this.options.ignoreAttributes && "string" == typeof t3) {
        for (var n2 = i.getAllMatches(t3, f), a2 = n2.length, s2 = {}, o2 = 0; o2 < a2; o2++) {
          var l2 = this.resolveNameSpace(n2[o2][1]), u2 = n2[o2][4], g2 = this.options.attributeNamePrefix + l2;
          if (l2.length) if (this.options.transformAttributeName && (g2 = this.options.transformAttributeName(g2)), "__proto__" === g2 && (g2 = "#__proto__"), void 0 !== u2) {
            this.options.trimValues && (u2 = u2.trim()), u2 = this.replaceEntitiesValue(u2);
            var d2 = this.options.attributeValueProcessor(l2, u2, e3);
            s2[g2] = null == d2 ? u2 : typeof d2 != typeof u2 || d2 !== u2 ? d2 : b(u2, this.options.parseAttributeValue, this.options.numberParseOptions);
          } else this.options.allowBooleanAttributes && (s2[g2] = true);
        }
        if (!Object.keys(s2).length) return;
        if (this.options.attributesGroupName) {
          var h2 = {};
          return h2[this.options.attributesGroupName] = s2, h2;
        }
        return s2;
      }
    }
    var d = function(t3) {
      t3 = t3.replace(/\r\n?/g, "\n");
      for (var e3 = new n("!xml"), r3 = e3, i2 = "", s2 = "", o2 = 0; o2 < t3.length; o2++) if ("<" === t3[o2]) if ("/" === t3[o2 + 1]) {
        var l2 = m(t3, ">", o2, "Closing Tag is not closed."), u2 = t3.substring(o2 + 2, l2).trim();
        if (this.options.removeNSPrefix) {
          var f2 = u2.indexOf(":");
          -1 !== f2 && (u2 = u2.substr(f2 + 1));
        }
        this.options.transformTagName && (u2 = this.options.transformTagName(u2)), r3 && (i2 = this.saveTextToParentTag(i2, r3, s2));
        var g2 = s2.substring(s2.lastIndexOf(".") + 1);
        if (u2 && -1 !== this.options.unpairedTags.indexOf(u2)) throw new Error("Unpaired tag can not be used as closing tag: </" + u2 + ">");
        var d2 = 0;
        g2 && -1 !== this.options.unpairedTags.indexOf(g2) ? (d2 = s2.lastIndexOf(".", s2.lastIndexOf(".") - 1), this.tagsNodeStack.pop()) : d2 = s2.lastIndexOf("."), s2 = s2.substring(0, d2), r3 = this.tagsNodeStack.pop(), i2 = "", o2 = l2;
      } else if ("?" === t3[o2 + 1]) {
        var h2 = x(t3, o2, false, "?>");
        if (!h2) throw new Error("Pi Tag is not closed.");
        if (i2 = this.saveTextToParentTag(i2, r3, s2), this.options.ignoreDeclaration && "?xml" === h2.tagName || this.options.ignorePiTags) ;
        else {
          var p2 = new n(h2.tagName);
          p2.add(this.options.textNodeName, ""), h2.tagName !== h2.tagExp && h2.attrExpPresent && (p2[":@"] = this.buildAttributesMap(h2.tagExp, s2, h2.tagName)), this.addChild(r3, p2, s2);
        }
        o2 = h2.closeIndex + 1;
      } else if ("!--" === t3.substr(o2 + 1, 3)) {
        var c2 = m(t3, "-->", o2 + 4, "Comment is not closed.");
        if (this.options.commentPropName) {
          var v2, N2 = t3.substring(o2 + 4, c2 - 2);
          i2 = this.saveTextToParentTag(i2, r3, s2), r3.add(this.options.commentPropName, [(v2 = {}, v2[this.options.textNodeName] = N2, v2)]);
        }
        o2 = c2;
      } else if ("!D" === t3.substr(o2 + 1, 2)) {
        var b2 = a(t3, o2);
        this.docTypeEntities = b2.entities, o2 = b2.i;
      } else if ("![" === t3.substr(o2 + 1, 2)) {
        var E = m(t3, "]]>", o2, "CDATA is not closed.") - 2, T = t3.substring(o2 + 9, E);
        if (i2 = this.saveTextToParentTag(i2, r3, s2), this.options.cdataPropName) {
          var w;
          r3.add(this.options.cdataPropName, [(w = {}, w[this.options.textNodeName] = T, w)]);
        } else {
          var y = this.parseTextData(T, r3.tagname, s2, true, false, true);
          null == y && (y = ""), r3.add(this.options.textNodeName, y);
        }
        o2 = E + 2;
      } else {
        var O = x(t3, o2, this.options.removeNSPrefix), A = O.tagName, I = O.tagExp, F = O.attrExpPresent, P = O.closeIndex;
        this.options.transformTagName && (A = this.options.transformTagName(A)), r3 && i2 && "!xml" !== r3.tagname && (i2 = this.saveTextToParentTag(i2, r3, s2, false));
        var C = r3;
        if (C && -1 !== this.options.unpairedTags.indexOf(C.tagname) && (r3 = this.tagsNodeStack.pop(), s2 = s2.substring(0, s2.lastIndexOf("."))), A !== e3.tagname && (s2 += s2 ? "." + A : A), this.isItStopNode(this.options.stopNodes, s2, A)) {
          var D = "";
          if (I.length > 0 && I.lastIndexOf("/") === I.length - 1) o2 = O.closeIndex;
          else if (-1 !== this.options.unpairedTags.indexOf(A)) o2 = O.closeIndex;
          else {
            var k = this.readStopNodeData(t3, A, P + 1);
            if (!k) throw new Error("Unexpected end of " + A);
            o2 = k.i, D = k.tagContent;
          }
          var S = new n(A);
          A !== I && F && (S[":@"] = this.buildAttributesMap(I, s2, A)), D && (D = this.parseTextData(D, A, s2, true, F, true, true)), s2 = s2.substr(0, s2.lastIndexOf(".")), S.add(this.options.textNodeName, D), this.addChild(r3, S, s2);
        } else {
          if (I.length > 0 && I.lastIndexOf("/") === I.length - 1) {
            "/" === A[A.length - 1] ? (A = A.substr(0, A.length - 1), s2 = s2.substr(0, s2.length - 1), I = A) : I = I.substr(0, I.length - 1), this.options.transformTagName && (A = this.options.transformTagName(A));
            var _ = new n(A);
            A !== I && F && (_[":@"] = this.buildAttributesMap(I, s2, A)), this.addChild(r3, _, s2), s2 = s2.substr(0, s2.lastIndexOf("."));
          } else {
            var M = new n(A);
            this.tagsNodeStack.push(r3), A !== I && F && (M[":@"] = this.buildAttributesMap(I, s2, A)), this.addChild(r3, M, s2), r3 = M;
          }
          i2 = "", o2 = P;
        }
      }
      else i2 += t3[o2];
      return e3.child;
    };
    function h(t3, e3, r3) {
      var i2 = this.options.updateTag(e3.tagname, r3, e3[":@"]);
      false === i2 || ("string" == typeof i2 ? (e3.tagname = i2, t3.addChild(e3)) : t3.addChild(e3));
    }
    var p = function(t3) {
      if (this.options.processEntities) {
        for (var e3 in this.docTypeEntities) {
          var r3 = this.docTypeEntities[e3];
          t3 = t3.replace(r3.regx, r3.val);
        }
        for (var i2 in this.lastEntities) {
          var n2 = this.lastEntities[i2];
          t3 = t3.replace(n2.regex, n2.val);
        }
        if (this.options.htmlEntities) for (var a2 in this.htmlEntities) {
          var s2 = this.htmlEntities[a2];
          t3 = t3.replace(s2.regex, s2.val);
        }
        t3 = t3.replace(this.ampEntity.regex, this.ampEntity.val);
      }
      return t3;
    };
    function c(t3, e3, r3, i2) {
      return t3 && (void 0 === i2 && (i2 = 0 === Object.keys(e3.child).length), void 0 !== (t3 = this.parseTextData(t3, e3.tagname, r3, false, !!e3[":@"] && 0 !== Object.keys(e3[":@"]).length, i2)) && "" !== t3 && e3.add(this.options.textNodeName, t3), t3 = ""), t3;
    }
    function v(t3, e3, r3) {
      var i2 = "*." + r3;
      for (var n2 in t3) {
        var a2 = t3[n2];
        if (i2 === a2 || e3 === a2) return true;
      }
      return false;
    }
    function m(t3, e3, r3, i2) {
      var n2 = t3.indexOf(e3, r3);
      if (-1 === n2) throw new Error(i2);
      return n2 + e3.length - 1;
    }
    function x(t3, e3, r3, i2) {
      void 0 === i2 && (i2 = ">");
      var n2 = (function(t4, e4, r4) {
        var i3;
        void 0 === r4 && (r4 = ">");
        for (var n3 = "", a3 = e4; a3 < t4.length; a3++) {
          var s3 = t4[a3];
          if (i3) s3 === i3 && (i3 = "");
          else if ('"' === s3 || "'" === s3) i3 = s3;
          else if (s3 === r4[0]) {
            if (!r4[1]) return { data: n3, index: a3 };
            if (t4[a3 + 1] === r4[1]) return { data: n3, index: a3 };
          } else "	" === s3 && (s3 = " ");
          n3 += s3;
        }
      })(t3, e3 + 1, i2);
      if (n2) {
        var a2 = n2.data, s2 = n2.index, o2 = a2.search(/\s/), l2 = a2, u2 = true;
        if (-1 !== o2 && (l2 = a2.substr(0, o2).replace(/\s\s*$/, ""), a2 = a2.substr(o2 + 1)), r3) {
          var f2 = l2.indexOf(":");
          -1 !== f2 && (u2 = (l2 = l2.substr(f2 + 1)) !== n2.data.substr(f2 + 1));
        }
        return { tagName: l2, tagExp: a2, closeIndex: s2, attrExpPresent: u2 };
      }
    }
    function N(t3, e3, r3) {
      for (var i2 = r3, n2 = 1; r3 < t3.length; r3++) if ("<" === t3[r3]) if ("/" === t3[r3 + 1]) {
        var a2 = m(t3, ">", r3, e3 + " is not closed");
        if (t3.substring(r3 + 2, a2).trim() === e3 && 0 == --n2) return { tagContent: t3.substring(i2, r3), i: a2 };
        r3 = a2;
      } else if ("?" === t3[r3 + 1]) r3 = m(t3, "?>", r3 + 1, "StopNode is not closed.");
      else if ("!--" === t3.substr(r3 + 1, 3)) r3 = m(t3, "-->", r3 + 3, "StopNode is not closed.");
      else if ("![" === t3.substr(r3 + 1, 2)) r3 = m(t3, "]]>", r3, "StopNode is not closed.") - 2;
      else {
        var s2 = x(t3, r3, ">");
        s2 && ((s2 && s2.tagName) === e3 && "/" !== s2.tagExp[s2.tagExp.length - 1] && n2++, r3 = s2.closeIndex);
      }
    }
    function b(t3, e3, r3) {
      if (e3 && "string" == typeof t3) {
        var n2 = t3.trim();
        return "true" === n2 || "false" !== n2 && s(t3, r3);
      }
      return i.isExist(t3) ? t3 : "";
    }
    t2.exports = function(t3) {
      this.options = t3, this.currentNode = null, this.tagsNodeStack = [], this.docTypeEntities = {}, this.lastEntities = { apos: { regex: /&(apos|#39|#x27);/g, val: "'" }, gt: { regex: /&(gt|#62|#x3E);/g, val: ">" }, lt: { regex: /&(lt|#60|#x3C);/g, val: "<" }, quot: { regex: /&(quot|#34|#x22);/g, val: '"' } }, this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" }, this.htmlEntities = { space: { regex: /&(nbsp|#160);/g, val: " " }, cent: { regex: /&(cent|#162);/g, val: "\xA2" }, pound: { regex: /&(pound|#163);/g, val: "\xA3" }, yen: { regex: /&(yen|#165);/g, val: "\xA5" }, euro: { regex: /&(euro|#8364);/g, val: "\u20AC" }, copyright: { regex: /&(copy|#169);/g, val: "\xA9" }, reg: { regex: /&(reg|#174);/g, val: "\xAE" }, inr: { regex: /&(inr|#8377);/g, val: "\u20B9" } }, this.addExternalEntities = o, this.parseXml = d, this.parseTextData = l, this.resolveNameSpace = u, this.buildAttributesMap = g, this.isItStopNode = v, this.replaceEntitiesValue = p, this.readStopNodeData = N, this.saveTextToParentTag = c, this.addChild = h;
    };
  }, 870: (t2, e2, r2) => {
    var i = r2(348).buildOptions, n = r2(498), a = r2(400).prettify, s = r2(239), o = (function() {
      function t3(t4) {
        this.externalEntities = {}, this.options = i(t4);
      }
      var e3 = t3.prototype;
      return e3.parse = function(t4, e4) {
        if ("string" == typeof t4) ;
        else {
          if (!t4.toString) throw new Error("XML data is accepted in String or Bytes[] form.");
          t4 = t4.toString();
        }
        if (e4) {
          true === e4 && (e4 = {});
          var r3 = s.validate(t4, e4);
          if (true !== r3) throw Error(r3.err.msg + ":" + r3.err.line + ":" + r3.err.col);
        }
        var i2 = new n(this.options);
        i2.addExternalEntities(this.externalEntities);
        var o2 = i2.parseXml(t4);
        return this.options.preserveOrder || void 0 === o2 ? o2 : a(o2, this.options);
      }, e3.addEntity = function(t4, e4) {
        if (-1 !== e4.indexOf("&")) throw new Error("Entity value can't have '&'");
        if (-1 !== t4.indexOf("&") || -1 !== t4.indexOf(";")) throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
        if ("&" === e4) throw new Error("An entity with value '&' is not permitted");
        this.externalEntities[t4] = e4;
      }, t3;
    })();
    t2.exports = o;
  }, 400: (t2, e2) => {
    "use strict";
    function r2(t3, e3, s) {
      for (var o, l = {}, u = 0; u < t3.length; u++) {
        var f, g = t3[u], d = i(g);
        if (f = void 0 === s ? d : s + "." + d, d === e3.textNodeName) void 0 === o ? o = g[d] : o += "" + g[d];
        else {
          if (void 0 === d) continue;
          if (g[d]) {
            var h = r2(g[d], e3, f), p = a(h, e3);
            g[":@"] ? n(h, g[":@"], f, e3) : 1 !== Object.keys(h).length || void 0 === h[e3.textNodeName] || e3.alwaysCreateTextNode ? 0 === Object.keys(h).length && (e3.alwaysCreateTextNode ? h[e3.textNodeName] = "" : h = "") : h = h[e3.textNodeName], void 0 !== l[d] && l.hasOwnProperty(d) ? (Array.isArray(l[d]) || (l[d] = [l[d]]), l[d].push(h)) : e3.isArray(d, f, p) ? l[d] = [h] : l[d] = h;
          }
        }
      }
      return "string" == typeof o ? o.length > 0 && (l[e3.textNodeName] = o) : void 0 !== o && (l[e3.textNodeName] = o), l;
    }
    function i(t3) {
      for (var e3 = Object.keys(t3), r3 = 0; r3 < e3.length; r3++) {
        var i2 = e3[r3];
        if (":@" !== i2) return i2;
      }
    }
    function n(t3, e3, r3, i2) {
      if (e3) for (var n2 = Object.keys(e3), a2 = n2.length, s = 0; s < a2; s++) {
        var o = n2[s];
        i2.isArray(o, r3 + "." + o, true, true) ? t3[o] = [e3[o]] : t3[o] = e3[o];
      }
    }
    function a(t3, e3) {
      var r3 = e3.textNodeName, i2 = Object.keys(t3).length;
      return 0 === i2 || !(1 !== i2 || !t3[r3] && "boolean" != typeof t3[r3] && 0 !== t3[r3]);
    }
    e2.prettify = function(t3, e3) {
      return r2(t3, e3);
    };
  }, 876: (t2) => {
    "use strict";
    var e2 = (function() {
      function t3(t4) {
        this.tagname = t4, this.child = [], this[":@"] = {};
      }
      var e3 = t3.prototype;
      return e3.add = function(t4, e4) {
        var r2;
        "__proto__" === t4 && (t4 = "#__proto__"), this.child.push(((r2 = {})[t4] = e4, r2));
      }, e3.addChild = function(t4) {
        var e4, r2;
        "__proto__" === t4.tagname && (t4.tagname = "#__proto__"), t4[":@"] && Object.keys(t4[":@"]).length > 0 ? this.child.push(((e4 = {})[t4.tagname] = t4.child, e4[":@"] = t4[":@"], e4)) : this.child.push(((r2 = {})[t4.tagname] = t4.child, r2));
      }, t3;
    })();
    t2.exports = e2;
  } }, e = {}, r = (function r2(i) {
    var n = e[i];
    if (void 0 !== n) return n.exports;
    var a = e[i] = { exports: {} };
    return t[i](a, a.exports, r2), a.exports;
  })(870);
  XMLParser = r;
})();
export default class extends Extension {
  async latest(page) {
    const req = this.generate_encrypted_body(`action=novellist&sort=lastupdate&page=${page}&t=0`);
    const resp = await this.req(req);
    const parser = new this.XMLParser({ ignoreAttributes: false });
    const dom = parser.parse(await resp.text());
    const results = [];
    for (const item of dom.result.item) {
      const aid = item["@_aid"];
      const statusCode = parseInt(parseInt(aid) / 1e3);
      const title = item.data.find(function(data) {
        return data["@_name"] == "Title";
      })["#text"].toString();
      const url = aid;
      const cover = `https://img.wenku8.com/image/${statusCode}/${aid}/${aid}s.jpg`;
      const update = item.data.find(function(data) {
        return data["@_name"] == "LastUpdate";
      })["@_value"];
      results.push({ title, url, cover, update });
    }
    return results;
  }
  async popular(page) {
    const req = this.generate_encrypted_body(`action=novellist&sort=allVisit&page=${page}&t=0`);
    const resp = await this.req(req);
    const parser = new this.XMLParser({ ignoreAttributes: false });
    const dom = parser.parse(await resp.text());
    const results = [];
    for (const item of dom.result.item) {
      const aid = item["@_aid"];
      const statusCode = parseInt(parseInt(aid) / 1e3);
      const title = item.data.find(function(data) {
        return data["@_name"] == "Title";
      })["#text"].toString();
      const url = aid;
      const cover = `https://img.wenku8.com/image/${statusCode}/${aid}/${aid}s.jpg`;
      const update = item.data.find(function(data) {
        return data["@_name"] == "LastUpdate";
      })["@_value"];
      results.push({ title, url, cover, update });
    }
    return results;
  }
  async search(kw, page) {
    var _a, _b;
    if (page > 1) {
      return [];
    }
    const results = [];
    const parser = new this.XMLParser({ ignoreAttributes: false });
    for (const type of ["articlename", "author"]) {
      const req = this.generate_encrypted_body(`action=search&searchtype=${type}&searchkey=${kw}&t=0`);
      const resp = await this.req(req);
      const dom = parser.parse(await resp.text());
      if ((dom == null ? void 0 : dom.result) == "" || (dom == null ? void 0 : dom.result) == void 0) {
        continue;
      }
      if (((_b = (_a = dom == null ? void 0 : dom.result) == null ? void 0 : _a.item) == null ? void 0 : _b.length) == void 0) {
        const item = dom.result.item;
        const aid = item["@_aid"];
        const statusCode = parseInt(parseInt(aid) / 1e3);
        const title = item.data.find(function(data) {
          return data["@_name"] == "Title";
        })["#text"].toString();
        const url = aid;
        const cover = `https://img.wenku8.com/image/${statusCode}/${aid}/${aid}s.jpg`;
        const update = item.data.find(function(data) {
          return data["@_name"] == "LastUpdate";
        })["@_value"];
        results.push({ title, url, cover, update });
      } else {
        for (const item of dom.result.item) {
          const aid = item["@_aid"];
          const statusCode = parseInt(parseInt(aid) / 1e3);
          const title = item.data.find(function(data) {
            return data["@_name"] == "Title";
          })["#text"].toString();
          const url = aid;
          const cover = `https://img.wenku8.com/image/${statusCode}/${aid}/${aid}s.jpg`;
          const update = item.data.find(function(data) {
            return data["@_name"] == "LastUpdate";
          })["@_value"];
          results.push({ title, url, cover, update });
        }
      }
    }
    return results;
  }
  async detail(url) {
    var _a, _b, _c;
    const parser = new this.XMLParser({ ignoreAttributes: false });
    const aid = url;
    const statusCode = parseInt(parseInt(aid) / 1e3);
    const resp = await this.req(this.generate_encrypted_body(`action=book&do=info&aid=${aid}&t=0`));
    const dom = parser.parse(await resp.text());
    const title = dom.metadata.data.find(function(data) {
      return data["@_name"] == "Title";
    })["#text"];
    const cover = `https://img.wenku8.com/image/${statusCode}/${aid}/${aid}s.jpg`;
    const desc = await (await this.req(this.generate_encrypted_body(`action=book&do=intro&aid=${aid}&t=0`))).text();
    const author = dom.metadata.data.find(function(data) {
      return data["@_name"] == "Author";
    })["@_value"];
    const episodes = [];
    const episode_resp = await this.req(this.generate_encrypted_body(`action=book&do=list&aid=${aid}&t=0`));
    const episode_dom = parser.parse(await episode_resp.text());
    if (((_b = (_a = episode_dom == null ? void 0 : episode_dom.package) == null ? void 0 : _a.volume) == null ? void 0 : _b.length) == void 0) {
      const chapters = [];
      const v_title = episode_dom.package.volume["#text"].toString();
      for (const chapter of episode_dom.package.volume.chapter) {
        const c_title = chapter["#text"].toString();
        const cid = chapter["@_cid"];
        const url2 = `${title}/#/${" " + c_title}/#/${aid}/#/${cid}`;
        chapters.push({ "name": c_title, "url": url2 });
      }
      episodes.push({ "title": v_title, "urls": chapters });
    } else {
      for (const volume of episode_dom.package.volume) {
        const chapters = [];
        const v_title = volume["#text"].toString();
        if (((_c = volume == null ? void 0 : volume.chapter) == null ? void 0 : _c.length) == void 0) {
          const chapter = volume.chapter;
          if (chapter == void 0) {
            continue;
          }
          const c_title = chapter["#text"].toString();
          const cid = chapter["@_cid"];
          const url2 = `${title}/#/${" " + c_title}/#/${aid}/#/${cid}`;
          chapters.push({ "name": c_title, "url": url2 });
        } else {
          for (const chapter of volume.chapter) {
            const c_title = chapter["#text"].toString();
            const cid = chapter["@_cid"];
            const url2 = `${title}/#/${" " + c_title}/#/${aid}/#/${cid}`;
            chapters.push({ "name": c_title, "url": url2 });
          }
        }
        episodes.push({ "title": v_title, "urls": chapters });
      }
    }
    return { title, cover, desc, metadata: { "\u4F5C\u8005": author }, episodes };
  }
  async watch(url) {
    const title = url.split("/#/")[0];
    const subtitle = url.split("/#/")[1];
    const aid = url.split("/#/")[2];
    const cid = url.split("/#/")[3];
    const content = await (await this.req(this.generate_encrypted_body(`action=book&do=text&aid=${aid}&cid=${cid}&t=0`))).text();
    let contents = content.split("\n").filter((line) => line.trim() !== "").map((line) => line.replace(/\s+/g, " ").trim());
    if (content.includes("<!--image-->")) {
      contents = ["Miru\u6682\u4E0D\u652F\u6301\u67E5\u770B\u63D2\u56FE\uFF01"];
    }
    return { title, subtitle, "content": contents };
  }
  async load() {
    this.APPVER = "Wenku8-Extension-For-Miru v0.0.1(https://github.com/WorldObservationLog/miru-extensions)";
    this.XMLParser = XMLParser;
  }
  async req(req) {
    var formBody = [];
    for (const property in req) {
      var encodedKey = encodeURI(property);
      var encodedValue = encodeURI(req[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&").replaceAll("%3D", "=");
    return await fetch(
      "https://miru-wenku8.wol.moe/",
      {
        method: "POST",
        body: formBody
      }
    );
  }
  generate_encrypted_body(raw_req) {
    return {
      "APPVER": this.APPVER,
      "request": CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(raw_req)),
      "timetoken": ""
    };
  }
}
