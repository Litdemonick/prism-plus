// ==PrismHubExtension==
// @name         IPTV-ORG
// @description  IPTV sources from iptv-org
// @version      v0.0.1
// @author       vvsolo
// @lang         all
// @license      MIT
// @package      iptv-org
// @type         bangumi
// @icon         https://avatars.githubusercontent.com/u/55937028?s=200&v=4
// @webSite      https://iptv-org.github.io/iptv
// @nsfw         false
// ==/PrismHubExtension==

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __typeError = (msg) => {
  throw TypeError(msg);
};
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
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var _sources, _opts, _defaultGroup, _cache;
export default class extends Extension {
  constructor() {
    super(...arguments);
    //#sources = 'https://cdn.jsdelivr.net/gh/vvsolo/miru-extension-MyIPTV-sources@main/iptv-org.sources.json';
    __privateAdd(this, _sources, { "categories": { "Animation[68]": "animation", "Auto[16]": "auto", "Business[66]": "business", "Classic[55]": "classic", "Comedy[53]": "comedy", "Cooking[23]": "cooking", "Culture[91]": "culture", "Documentary[63]": "documentary", "Education[106]": "education", "Entertainment[390]": "entertainment", "Family[43]": "family", "General[1359]": "general", "Kids[201]": "kids", "Legislative[174]": "legislative", "Lifestyle[81]": "lifestyle", "Movies[295]": "movies", "Music[555]": "music", "News[762]": "news", "Outdoor[43]": "outdoor", "Relax[8]": "relax", "Religious[523]": "religious", "Science[25]": "science", "Series[159]": "series", "Shop[78]": "shop", "Sports[202]": "sports", "Travel[28]": "travel", "Weather[13]": "weather", "XXX[61]": "xxx", "Undefined[5083]": "undefined" }, "languages": { "Afghan Persian[5]": "prs", "Afrikaans[3]": "afr", "Albanian[61]": "sqi", "Alemannic[1]": "gsw", "Amharic[7]": "amh", "Arabic[397]": "ara", "Armenian[11]": "hye", "Assamese[7]": "asm", "Assyrian Neo-Aramaic[1]": "aii", "Aymara[1]": "aym", "Azerbaijani[23]": "aze", "Bashkir[1]": "bak", "Basque[7]": "eus", "Belarusian[3]": "bel", "Bengali[80]": "ben", "Bhojpuri[1]": "bho", "Bosnian[14]": "bos", "Bulgarian[35]": "bul", "Burmese[20]": "mya", "Catalan[53]": "cat", "Central Kurdish[1]": "ckb", "Chhattisgarhi[1]": "hne", "Chinese[147]": "zho", "Croatian[19]": "hrv", "Czech[35]": "ces", "Danish[21]": "dan", "Dhanwar (Nepal)[1]": "dhw", "Dhivehi[3]": "div", "Dholuo[1]": "luo", "Dimili[1]": "zza", "Dutch[201]": "nld", "English[2145]": "eng", "Estonian[9]": "est", "Ewe[1]": "ewe", "Faroese[1]": "fao", "Fataleka[1]": "far", "Filipino[1]": "fil", "Finnish[24]": "fin", "French[447]": "fra", "Galician[15]": "glg", "Galolen[1]": "gal", "Georgian[9]": "kat", "German[291]": "deu", "Gikuyu[2]": "kik", "Goan Konkani[1]": "gom", "Greek[135]": "ell", "Greenlandic[2]": "kal", "Gujarati[10]": "guj", "Haitian[5]": "hat", "Hausa[2]": "hau", "Hebrew[13]": "heb", "Hindi[165]": "hin", "Hungarian[110]": "hun", "Icelandic[5]": "isl", "Indonesian[162]": "ind", "Inuktitut[1]": "iku", "Irish[5]": "gle", "Italian[326]": "ita", "Japanese[101]": "jpn", "Javanese[3]": "jav", "Kannada[18]": "kan", "Kazakh[28]": "kaz", "Khmer[12]": "khm", "Kinyarwanda[3]": "kin", "Kirghiz[12]": "kir", "Konkani (macrolanguage)[2]": "kok", "Korean[118]": "kor", "Kurdish[26]": "kur", "Lahnda[1]": "lah", "Lao[15]": "lao", "Latin[3]": "lat", "Latvian[13]": "lav", "Letzeburgesch[3]": "ltz", "Lithuanian[8]": "lit", "Macedonian[34]": "mkd", "Malay[18]": "msa", "Malayalam[73]": "mal", "Maltese[3]": "mlt", "Mandarin Chinese[5]": "cmn", "Maori[1]": "mri", "Marathi[14]": "mar", "Min Nan Chinese[1]": "nan", "Mongolian[20]": "mon", "Montenegrin[1]": "cnr", "Mycenaean Greek[1]": "gmy", "Nepali[9]": "nep", "Norwegian[8]": "nor", "Norwegian Bokm\xE5l[1]": "nob", "Oriya (macrolanguage)[8]": "ori", "Panjabi[26]": "pan", "Papiamento[9]": "pap", "Parsi-Dari[2]": "prd", "Pashto[18]": "pus", "Persian[143]": "fas", "Polish[69]": "pol", "Portuguese[371]": "por", "Quechua[1]": "que", "Romanian[124]": "ron", "Romany[1]": "rom", "Russian[305]": "rus", "Saint Lucian Creole French[2]": "acf", "Santali[1]": "sat", "Serbian[57]": "srp", "Serbo-Croatian[1]": "hbs", "Sindhi[1]": "snd", "Sinhala[10]": "sin", "Slovak[48]": "slk", "Slovenian[17]": "slv", "Somali[9]": "som", "Spanish[2096]": "spa", "Swahili[17]": "swa", "Swedish[20]": "swe", "Tagalog[14]": "tgl", "Tajik[2]": "tgk", "Tamil[63]": "tam", "Tatar[1]": "tat", "Telugu[30]": "tel", "Tetum[1]": "tet", "Thai[76]": "tha", "Tigrinya[1]": "tir", "Turkish[218]": "tur", "Turkmen[7]": "tuk", "Ukrainian[80]": "ukr", "Urdu[59]": "urd", "Uzbek[18]": "uzb", "Vietnamese[98]": "vie", "Welsh[1]": "cym", "Western Frisian[1]": "fry", "Wolof[4]": "wol", "Yucatec Maya[1]": "yua", "Yue Chinese[9]": "yue", "Undefined[1199]": "undefined" }, "countries": { "\u{1F1E6}\u{1F1EB} Afghanistan[33]": "af", "\u{1F1E6}\u{1F1F1} Albania[30]": "al", "\u{1F1E9}\u{1F1FF} Algeria[60]": "dz", "\u{1F1E6}\u{1F1F8} American Samoa[5]": "as", "\u{1F1E6}\u{1F1E9} Andorra[15]": "ad", "\u{1F1E6}\u{1F1F4} Angola[21]": "ao", "\u{1F1E6}\u{1F1EE} Anguilla[10]": "ai", "\u{1F1E6}\u{1F1EC} Antigua and Barbuda[12]": "ag", "\u{1F1E6}\u{1F1F7} Argentina[329]": "ar", "@Buenos Aires[30]": "ar-b", "@Catamarca[2]": "ar-k", "@Chaco[5]": "ar-h", "@Chubut[4]": "ar-u", "@Ciudad Autonoma de Buenos Aires[2]": "ar-c", "@Cordoba[8]": "ar-x", "@Corrientes[4]": "ar-w", "@Entre Rios[4]": "ar-e", "@Formosa[2]": "ar-p", "@Jujuy[5]": "ar-y", "@La Pampa[4]": "ar-l", "@La Rioja[4]": "ar-f", "@Mendoza[2]": "ar-m", "@Misiones[5]": "ar-n", "@Neuquen[4]": "ar-q", "@Rio Negro[1]": "ar-r", "@Salta[6]": "ar-a", "@San Juan[6]": "ar-j", "@San Luis[1]": "ar-d", "@Santa Cruz[4]": "ar-z", "@Santa Fe[9]": "ar-s", "@Santiago del Estero[1]": "ar-g", "@Tucuman[7]": "ar-t", "\u{1F1E6}\u{1F1F2} Armenia[46]": "am", "\u{1F1E6}\u{1F1FC} Aruba[16]": "aw", "\u{1F1E6}\u{1F1FA} Australia[66]": "au", "\u{1F1E6}\u{1F1F9} Austria[54]": "at", "\u{1F1E6}\u{1F1FF} Azerbaijan[40]": "az", "\u{1F1E7}\u{1F1F8} Bahamas[12]": "bs", "\u{1F1E7}\u{1F1ED} Bahrain[40]": "bh", "\u{1F1E7}\u{1F1E9} Bangladesh[60]": "bd", "\u{1F1E7}\u{1F1E7} Barbados[11]": "bb", "\u{1F1E7}\u{1F1FE} Belarus[36]": "by", "\u{1F1E7}\u{1F1EA} Belgium[56]": "be", "\u{1F1E7}\u{1F1FF} Belize[7]": "bz", "\u{1F1E7}\u{1F1EF} Benin[31]": "bj", "\u{1F1E7}\u{1F1F2} Bermuda[5]": "bm", "\u{1F1E7}\u{1F1F9} Bhutan[9]": "bt", "\u{1F1E7}\u{1F1F4} Bolivia[115]": "bo", "@Cochabamba[1]": "bo-c", "@La Paz[2]": "bo-l", "@Oruro[1]": "bo-o", "@Santa Cruz[2]": "bo-s", "\u{1F1E7}\u{1F1F6} Bonaire[3]": "bq", "\u{1F1E7}\u{1F1E6} Bosnia and Herzegovina[30]": "ba", "\u{1F1E7}\u{1F1FC} Botswana[20]": "bw", "\u{1F1E7}\u{1F1FB} Bouvet Island[3]": "bv", "\u{1F1E7}\u{1F1F7} Brazil[331]": "br", "@Alagoas[3]": "br-al", "@Amazonas[1]": "br-am", "@Bahia[5]": "br-ba", "@Ceara[7]": "br-ce", "@Distrito Federal[1]": "br-df", "@Espirito Santo[4]": "br-es", "@Goias[1]": "br-go", "@Maranhao[1]": "br-ma", "@Mato Grosso[3]": "br-mt", "@Minas Gerais[14]": "br-mg", "@Para[1]": "br-pa", "@Paraiba[5]": "br-pb", "@Parana[7]": "br-pr", "@Pernambuco[1]": "br-pe", "@Rio de Janeiro[10]": "br-rj", "@Rio Grande do Norte[4]": "br-rn", "@Rio Grande do Sul[8]": "br-rs", "@Rondonia[1]": "br-ro", "@Roraima[1]": "br-rr", "@Santa Catarina[9]": "br-sc", "@Sao Paulo[24]": "br-sp", "\u{1F1FB}\u{1F1EC} British Virgin Islands[11]": "vg", "\u{1F1E7}\u{1F1F3} Brunei[24]": "bn", "\u{1F1E7}\u{1F1EC} Bulgaria[42]": "bg", "\u{1F1E7}\u{1F1EB} Burkina Faso[24]": "bf", "\u{1F1E7}\u{1F1EE} Burundi[19]": "bi", "\u{1F1F0}\u{1F1ED} Cambodia[35]": "kh", "\u{1F1E8}\u{1F1F2} Cameroon[48]": "cm", "\u{1F1E8}\u{1F1E6} Canada[155]": "ca", "@Alberta[4]": "ca-ab", "@British Columbia[3]": "ca-bc", "@Manitoba[3]": "ca-mb", "@New Brunswick[3]": "ca-nb", "@Newfoundland and Labrador[2]": "ca-nl", "@Northwest Territories[1]": "ca-nt", "@Nova Scotia[1]": "ca-ns", "@Ontario[5]": "ca-on", "@Prince Edward Island[1]": "ca-pe", "@Quebec[14]": "ca-qc", "@Saskatchewan[2]": "ca-sk", "\u{1F1E8}\u{1F1FB} Cape Verde[20]": "cv", "@Boa Vista[1]": "cv-bv", "@Sal[1]": "cv-sl", "\u{1F1F0}\u{1F1FE} Cayman Islands[10]": "ky", "\u{1F1E8}\u{1F1EB} Central African Republic[19]": "cf", "\u{1F1F9}\u{1F1E9} Chad[20]": "td", "\u{1F1E8}\u{1F1F1} Chile[267]": "cl", "@Biobio[3]": "cl-bi", "@Coquimbo[1]": "cl-co", "@La Araucania[2]": "cl-ar", "@Libertador General Bernardo O'Higgins[3]": "cl-li", "@Los Lagos[1]": "cl-ll", "@Maule[1]": "cl-ml", "@Nuble[3]": "cl-nb", "@Valparaiso[2]": "cl-vs", "\u{1F1E8}\u{1F1F3} China[575]": "cn", "\u{1F1E8}\u{1F1F4} Colombia[183]": "co", "@Antioquia[1]": "co-ant", "@Atlantico[1]": "co-atl", "@Bolivar[1]": "co-bol", "@Caldas[1]": "co-cal", "@Cauca[3]": "co-cau", "@Choco[1]": "co-cho", "@Cundinamarca[1]": "co-cun", "@Huila[2]": "co-hui", "@Magdalena[1]": "co-mag", "@Narino[3]": "co-nar", "@Norte de Santander[2]": "co-nsa", "@Quindio[1]": "co-qui", "@Risaralda[1]": "co-ris", "@San Andres, Providencia y Santa Catalina[1]": "co-sap", "@Tolima[1]": "co-tol", "@Valle del Cauca[5]": "co-vac", "\u{1F1F0}\u{1F1F2} Comoros[48]": "km", "\u{1F1E8}\u{1F1F0} Cook Islands[5]": "ck", "\u{1F1E8}\u{1F1F7} Costa Rica[133]": "cr", "@Puntarenas[1]": "cr-p", "@San Jose[1]": "cr-sj", "\u{1F1ED}\u{1F1F7} Croatia[32]": "hr", "\u{1F1E8}\u{1F1FA} Cuba[68]": "cu", "\u{1F1E8}\u{1F1FC} Curacao[16]": "cw", "\u{1F1E8}\u{1F1FE} Cyprus[42]": "cy", "\u{1F1E8}\u{1F1FF} Czech Republic[44]": "cz", "\u{1F1E8}\u{1F1E9} Democratic Republic of the Congo[46]": "cd", "\u{1F1E9}\u{1F1F0} Denmark[37]": "dk", "\u{1F1E9}\u{1F1EF} Djibouti[53]": "dj", "\u{1F1E9}\u{1F1F2} Dominica[11]": "dm", "\u{1F1E9}\u{1F1F4} Dominican Republic[221]": "do", "@Distrito Nacional (Santo Domingo)[2]": "do-01", "@La Altagracia[2]": "do-11", "@La Vega[3]": "do-13", "@Monsenor Nouel[2]": "do-28", "@Puerto Plata[1]": "do-18", "@San Juan[1]": "do-22", "@Santiago[1]": "do-25", "@Valverde[1]": "do-27", "\u{1F1F9}\u{1F1F1} East Timor[20]": "tl", "\u{1F1EA}\u{1F1E8} Ecuador[122]": "ec", "@Azuay[1]": "ec-a", "@Loja[1]": "ec-l", "@Orellana[1]": "ec-d", "\u{1F1EA}\u{1F1EC} Egypt[86]": "eg", "\u{1F1F8}\u{1F1FB} El Salvador[83]": "sv", "\u{1F1EC}\u{1F1F6} Equatorial Guinea[21]": "gq", "\u{1F1EA}\u{1F1F7} Eritrea[19]": "er", "\u{1F1EA}\u{1F1EA} Estonia[28]": "ee", "\u{1F1EA}\u{1F1F9} Ethiopia[26]": "et", "\u{1F1EB}\u{1F1F0} Falkland Islands[3]": "fk", "\u{1F1EB}\u{1F1F4} Faroe Islands[2]": "fo", "\u{1F1EB}\u{1F1EF} Fiji[7]": "fj", "\u{1F1EB}\u{1F1EE} Finland[41]": "fi", "@Keski-Suomi[1]": "fi-08", "@Pohjanmaa[3]": "fi-12", "\u{1F1EB}\u{1F1F7} France[241]": "fr", "\u{1F1EC}\u{1F1EB} French Guiana[11]": "gf", "\u{1F1F5}\u{1F1EB} French Polynesia[6]": "pf", "\u{1F1F9}\u{1F1EB} French Southern Territories[19]": "tf", "\u{1F1EC}\u{1F1E6} Gabon[21]": "ga", "\u{1F1EC}\u{1F1F2} Gambia[21]": "gm", "\u{1F1EC}\u{1F1EA} Georgia[20]": "ge", "\u{1F1E9}\u{1F1EA} Germany[267]": "de", "\u{1F1EC}\u{1F1ED} Ghana[43]": "gh", "\u{1F1EC}\u{1F1F7} Greece[130]": "gr", "\u{1F1EC}\u{1F1F1} Greenland[8]": "gl", "\u{1F1EC}\u{1F1E9} Grenada[10]": "gd", "\u{1F1EC}\u{1F1F5} Guadeloupe[18]": "gp", "\u{1F1EC}\u{1F1FA} Guam[6]": "gu", "\u{1F1EC}\u{1F1F9} Guatemala[135]": "gt", "@Escuintla[2]": "gt-05", "@Huehuetenango[1]": "gt-13", "@Izabal[1]": "gt-18", "@Quiche[1]": "gt-14", "@Sacatepequez[1]": "gt-03", "@San Marcos[1]": "gt-12", "@Santa Rosa[1]": "gt-06", "@Solola[4]": "gt-07", "@Totonicapan[1]": "gt-08", "\u{1F1EC}\u{1F1EC} Guernsey[1]": "gg", "\u{1F1EC}\u{1F1F3} Guinea[27]": "gn", "\u{1F1EC}\u{1F1FC} Guinea-Bissau[19]": "gw", "\u{1F1EC}\u{1F1FE} Guyana[4]": "gy", "\u{1F1ED}\u{1F1F9} Haiti[47]": "ht", "\u{1F1ED}\u{1F1F3} Honduras[138]": "hn", "\u{1F1ED}\u{1F1F0} Hong Kong[21]": "hk", "\u{1F1ED}\u{1F1FA} Hungary[118]": "hu", "\u{1F1EE}\u{1F1F8} Iceland[15]": "is", "\u{1F1EE}\u{1F1F3} India[441]": "in", "\u{1F1EE}\u{1F1E9} Indonesia[181]": "id", "@Aceh[2]": "id-ac", "@Bali[2]": "id-ba", "@Banten[2]": "id-bt", "@Bengkulu[3]": "id-be", "@Gorontalo[1]": "id-go", "@Jakarta Raya[4]": "id-jk", "@Jambi[4]": "id-ja", "@Jawa Barat[10]": "id-jb", "@Jawa Tengah[6]": "id-jt", "@Jawa Timur[11]": "id-ji", "@Kalimantan Barat[2]": "id-kb", "@Kalimantan Selatan[2]": "id-ks", "@Kalimantan Tengah[1]": "id-kt", "@Kalimantan Timur[2]": "id-ki", "@Kepulauan Bangka Belitung[1]": "id-bb", "@Lampung[3]": "id-la", "@Maluku[1]": "id-ml", "@Maluku Utara[1]": "id-mu", "@Nusa Tenggara Barat[1]": "id-nb", "@Nusa Tenggara Timur[1]": "id-nt", "@Papua[2]": "id-pp", "@Riau[3]": "id-ri", "@Sulawesi Barat[1]": "id-sr", "@Sulawesi Selatan[3]": "id-sn", "@Sulawesi Tengah[1]": "id-st", "@Sulawesi Tenggara[1]": "id-sg", "@Sumatera Barat[2]": "id-sb", "@Sumatera Selatan[2]": "id-ss", "@Yogyakarta[4]": "id-yo", "\u{1F1EE}\u{1F1F7} Iran[137]": "ir", "@Tehran[2]": "ir-23", "\u{1F1EE}\u{1F1F6} Iraq[109]": "iq", "\u{1F1EE}\u{1F1EA} Ireland[24]": "ie", "\u{1F1EE}\u{1F1F1} Israel[24]": "il", "\u{1F1EE}\u{1F1F9} Italy[397]": "it", "\u{1F1E8}\u{1F1EE} Ivory Coast[43]": "ci", "\u{1F1EF}\u{1F1F2} Jamaica[16]": "jm", "\u{1F1EF}\u{1F1F5} Japan[109]": "jp", "@Chiba[2]": "jp-12", "@Gunma[1]": "jp-10", "@Ibaraki[1]": "jp-08", "@Kanagawa[2]": "jp-14", "@Osaka[1]": "jp-27", "@Saitama[2]": "jp-11", "@Tochigi[1]": "jp-09", "@Tokyo[1]": "jp-13", "\u{1F1EF}\u{1F1F4} Jordan[64]": "jo", "\u{1F1F0}\u{1F1FF} Kazakhstan[47]": "kz", "\u{1F1F0}\u{1F1EA} Kenya[63]": "ke", "\u{1F1F0}\u{1F1EE} Kiribati[5]": "ki", "\u{1F1FD}\u{1F1F0} Kosovo[24]": "xk", "\u{1F1F0}\u{1F1FC} Kuwait[40]": "kw", "\u{1F1F0}\u{1F1EC} Kyrgyzstan[24]": "kg", "\u{1F1F1}\u{1F1E6} Laos[44]": "la", "\u{1F1F1}\u{1F1FB} Latvia[32]": "lv", "\u{1F1F1}\u{1F1E7} Lebanon[59]": "lb", "\u{1F1F1}\u{1F1F8} Lesotho[19]": "ls", "\u{1F1F1}\u{1F1F7} Liberia[19]": "lr", "\u{1F1F1}\u{1F1FE} Libya[64]": "ly", "\u{1F1F1}\u{1F1EE} Liechtenstein[14]": "li", "\u{1F1F1}\u{1F1F9} Lithuania[21]": "lt", "\u{1F1F1}\u{1F1FA} Luxembourg[23]": "lu", "\u{1F1F2}\u{1F1F4} Macao[8]": "mo", "\u{1F1F2}\u{1F1EC} Madagascar[21]": "mg", "\u{1F1F2}\u{1F1FC} Malawi[21]": "mw", "\u{1F1F2}\u{1F1FE} Malaysia[44]": "my", "\u{1F1F2}\u{1F1FB} Maldives[11]": "mv", "\u{1F1F2}\u{1F1F1} Mali[20]": "ml", "\u{1F1F2}\u{1F1F9} Malta[13]": "mt", "\u{1F1F2}\u{1F1ED} Marshall Islands[5]": "mh", "\u{1F1F2}\u{1F1F6} Martinique[16]": "mq", "\u{1F1F2}\u{1F1F7} Mauritania[50]": "mr", "\u{1F1F2}\u{1F1FA} Mauritius[20]": "mu", "\u{1F1FE}\u{1F1F9} Mayotte[20]": "yt", "\u{1F1F2}\u{1F1FD} Mexico[286]": "mx", "@Aguascalientes[1]": "mx-agu", "@Baja California[1]": "mx-bcn", "@Chihuahua[4]": "mx-chh", "@Ciudad de Mexico[1]": "mx-cmx", "@Coahuila de Zaragoza[3]": "mx-coa", "@Durango[1]": "mx-dur", "@Guanajuato[1]": "mx-gua", "@Guerrero[1]": "mx-gro", "@Jalisco[1]": "mx-jal", "@Morelos[2]": "mx-mor", "@Nuevo Leon[2]": "mx-nle", "@Puebla[3]": "mx-pue", "@Queretaro[1]": "mx-que", "@Quintana Roo[3]": "mx-roo", "@San Luis Potosi[2]": "mx-slp", "@Sinaloa[1]": "mx-sin", "@Sonora[1]": "mx-son", "@Tamaulipas[3]": "mx-tam", "@Veracruz de Ignacio de la Llave[1]": "mx-ver", "@Yucatan[2]": "mx-yuc", "@Zacatecas[1]": "mx-zac", "\u{1F1EB}\u{1F1F2} Micronesia[5]": "fm", "\u{1F1F2}\u{1F1E9} Moldova[35]": "md", "\u{1F1F2}\u{1F1E8} Monaco[12]": "mc", "\u{1F1F2}\u{1F1F3} Mongolia[27]": "mn", "\u{1F1F2}\u{1F1EA} Montenegro[16]": "me", "@Ulcinj[1]": "me-20", "\u{1F1F2}\u{1F1F8} Montserrat[10]": "ms", "\u{1F1F2}\u{1F1E6} Morocco[67]": "ma", "\u{1F1F2}\u{1F1FF} Mozambique[22]": "mz", "\u{1F1F2}\u{1F1F2} Myanmar (Burma)[40]": "mm", "\u{1F1F3}\u{1F1E6} Namibia[19]": "na", "\u{1F1F3}\u{1F1F7} Nauru[5]": "nr", "\u{1F1F3}\u{1F1F5} Nepal[22]": "np", "\u{1F1F3}\u{1F1F1} Netherlands[199]": "nl", "\u{1F1F3}\u{1F1E8} New Caledonia[5]": "nc", "\u{1F1F3}\u{1F1FF} New Zealand[30]": "nz", "\u{1F1F3}\u{1F1EE} Nicaragua[75]": "ni", "\u{1F1F3}\u{1F1EA} Niger[21]": "ne", "\u{1F1F3}\u{1F1EC} Nigeria[72]": "ng", "\u{1F1F3}\u{1F1FA} Niue[5]": "nu", "\u{1F1F3}\u{1F1EB} Norfolk Island[5]": "nf", "\u{1F1F0}\u{1F1F5} North Korea[7]": "kp", "\u{1F1F2}\u{1F1F0} North Macedonia[46]": "mk", "\u{1F1F2}\u{1F1F5} Northern Mariana Islands[5]": "mp", "\u{1F1F3}\u{1F1F4} Norway[22]": "no", "\u{1F1F4}\u{1F1F2} Oman[42]": "om", "\u{1F1F5}\u{1F1F0} Pakistan[75]": "pk", "@Islamabad[1]": "pk-is", "\u{1F1F5}\u{1F1FC} Palau[5]": "pw", "\u{1F1F5}\u{1F1F8} Palestine[61]": "ps", "\u{1F1F5}\u{1F1E6} Panama[90]": "pa", "\u{1F1F5}\u{1F1EC} Papua New Guinea[5]": "pg", "\u{1F1F5}\u{1F1FE} Paraguay[116]": "py", "@Alto Parana[2]": "py-10", "@Boqueron[1]": "py-19", "@Caaguazu[1]": "py-5", "@Central[1]": "py-11", "@Itapua[1]": "py-7", "@Presidente Hayes[1]": "py-15", "\u{1F1F5}\u{1F1EA} Peru[209]": "pe", "@Amazonas[1]": "pe-ama", "@Ancash[1]": "pe-anc", "@Apurimac[1]": "pe-apu", "@Arequipa[4]": "pe-are", "@Ayacucho[2]": "pe-aya", "@Cusco[1]": "pe-cus", "@Junin[3]": "pe-jun", "@Lima[3]": "pe-lim", "@Loreto[2]": "pe-lor", "@Moquegua[3]": "pe-moq", "@Puno[2]": "pe-pun", "@San Martin[3]": "pe-sam", "\u{1F1F5}\u{1F1ED} Philippines[43]": "ph", "\u{1F1F5}\u{1F1F3} Pitcairn Islands[5]": "pn", "\u{1F1F5}\u{1F1F1} Poland[83]": "pl", "\u{1F1F5}\u{1F1F9} Portugal[61]": "pt", "\u{1F1F5}\u{1F1F7} Puerto Rico[103]": "pr", "\u{1F1F6}\u{1F1E6} Qatar[40]": "qa", "\u{1F1E8}\u{1F1EC} Republic of the Congo[23]": "cg", "@Brazzaville[1]": "cg-bzv", "\u{1F1F7}\u{1F1EA} R\xE9union[20]": "re", "\u{1F1F7}\u{1F1F4} Romania[121]": "ro", "@Gorj[1]": "ro-gj", "\u{1F1F7}\u{1F1FA} Russia[394]": "ru", "\u{1F1F7}\u{1F1FC} Rwanda[31]": "rw", "\u{1F1E7}\u{1F1F1} Saint Barth\xE9lemy[14]": "bl", "\u{1F1F8}\u{1F1ED} Saint Helena[19]": "sh", "\u{1F1F0}\u{1F1F3} Saint Kitts and Nevis[11]": "kn", "\u{1F1F1}\u{1F1E8} Saint Lucia[12]": "lc", "\u{1F1F2}\u{1F1EB} Saint Martin[14]": "mf", "\u{1F1F5}\u{1F1F2} Saint Pierre and Miquelon[5]": "pm", "\u{1F1FB}\u{1F1E8} Saint Vincent and the Grenadines[10]": "vc", "\u{1F1FC}\u{1F1F8} Samoa[5]": "ws", "\u{1F1F8}\u{1F1F2} San Marino[11]": "sm", "\u{1F1F8}\u{1F1F9} S\xE3o Tom\xE9 and Pr\xEDncipe[20]": "st", "\u{1F1F8}\u{1F1E6} Saudi Arabia[83]": "sa", "\u{1F1F8}\u{1F1F3} Senegal[40]": "sn", "\u{1F1F7}\u{1F1F8} Serbia[62]": "rs", "\u{1F1F8}\u{1F1E8} Seychelles[19]": "sc", "\u{1F1F8}\u{1F1F1} Sierra Leone[21]": "sl", "\u{1F1F8}\u{1F1EC} Singapore[28]": "sg", "\u{1F1F8}\u{1F1FD} Sint Maarten[14]": "sx", "\u{1F1F8}\u{1F1F0} Slovakia[65]": "sk", "\u{1F1F8}\u{1F1EE} Slovenia[38]": "si", "\u{1F1F8}\u{1F1E7} Solomon Islands[5]": "sb", "\u{1F1F8}\u{1F1F4} Somalia[57]": "so", "\u{1F1FF}\u{1F1E6} South Africa[52]": "za", "\u{1F1EC}\u{1F1F8} South Georgia and the South Sandwich Islands[3]": "gs", "\u{1F1F0}\u{1F1F7} South Korea[118]": "kr", "@Busan-gwangyeoksi[3]": "kr-26", "@Chungcheongbuk-do[2]": "kr-43", "@Daegu-gwangyeoksi[3]": "kr-27", "@Daejeon-gwangyeoksi[2]": "kr-30", "@Gangwon-do[3]": "kr-42", "@Gwangju-gwangyeoksi[1]": "kr-29", "@Gyeonggi-do[1]": "kr-41", "@Gyeongsangbuk-do[1]": "kr-47", "@Gyeongsangnam-do[1]": "kr-48", "@Jeju-teukbyeoljachido[1]": "kr-49", "@Jeollabuk-do[1]": "kr-45", "@Jeollanam-do[4]": "kr-46", "@Seoul-teukbyeolsi[1]": "kr-11", "@Ulsan-gwangyeoksi[2]": "kr-31", "\u{1F1F8}\u{1F1F8} South Sudan[19]": "ss", "\u{1F1EA}\u{1F1F8} Spain[318]": "es", "@Andalucia[39]": "es-an", "@Aragon[1]": "es-ar", "@Asturias, Principado de[2]": "es-as", "@Canarias[11]": "es-cn", "@Castilla y Leon[1]": "es-cl", "@Castilla-La Mancha[5]": "es-cm", "@Catalunya[38]": "es-ct", "@Ceuta[1]": "es-ce", "@Extremadura[1]": "es-ex", "@Galicia[5]": "es-ga", "@Illes Balears[1]": "es-ib", "@La Rioja[1]": "es-ri", "@Madrid, Comunidad de[5]": "es-md", "@Murcia, Region de[3]": "es-mc", "@Navarra, Comunidad Foral de[1]": "es-nc", "@Pais Vasco[6]": "es-pv", "@Valenciana, Comunidad[15]": "es-vc", "\u{1F1F1}\u{1F1F0} Sri Lanka[21]": "lk", "\u{1F1F8}\u{1F1E9} Sudan[57]": "sd", "\u{1F1F8}\u{1F1F7} Suriname[4]": "sr", "\u{1F1F8}\u{1F1FF} Swaziland[20]": "sz", "\u{1F1F8}\u{1F1EA} Sweden[42]": "se", "\u{1F1E8}\u{1F1ED} Switzerland[73]": "ch", "\u{1F1F8}\u{1F1FE} Syria[47]": "sy", "\u{1F1F9}\u{1F1FC} Taiwan[75]": "tw", "\u{1F1F9}\u{1F1EF} Tajikistan[12]": "tj", "\u{1F1F9}\u{1F1FF} Tanzania[31]": "tz", "\u{1F1F9}\u{1F1ED} Thailand[95]": "th", "\u{1F1F9}\u{1F1EC} Togo[25]": "tg", "\u{1F1F9}\u{1F1F0} Tokelau[5]": "tk", "\u{1F1F9}\u{1F1F4} Tonga[5]": "to", "\u{1F1F9}\u{1F1F9} Trinidad and Tobago[13]": "tt", "\u{1F1F9}\u{1F1F3} Tunisia[62]": "tn", "\u{1F1F9}\u{1F1F7} Turkey[224]": "tr", "\u{1F1F9}\u{1F1F2} Turkmenistan[8]": "tm", "\u{1F1F9}\u{1F1E8} Turks and Caicos Islands[10]": "tc", "\u{1F1F9}\u{1F1FB} Tuvalu[5]": "tv", "\u{1F1FB}\u{1F1EE} U.S. Virgin Islands[10]": "vi", "\u{1F1FA}\u{1F1EC} Uganda[37]": "ug", "\u{1F1FA}\u{1F1E6} Ukraine[101]": "ua", "\u{1F1E6}\u{1F1EA} United Arab Emirates[81]": "ae", "\u{1F1EC}\u{1F1E7} United Kingdom[204]": "uk", "@Wales[2]": "gb-wls", "\u{1F1FA}\u{1F1F8} United States[1719]": "us", "@Alabama[3]": "us-al", "@Alaska[1]": "us-ak", "@Arizona[13]": "us-az", "@Arkansas[5]": "us-ar", "@California[147]": "us-ca", "@Colorado[18]": "us-co", "@Connecticut[19]": "us-ct", "@Delaware[6]": "us-de", "@District of Columbia[5]": "us-dc", "@Florida[46]": "us-fl", "@Georgia[8]": "us-ga", "@Guam[1]": "us-gu", "@Hawaii[5]": "us-hi", "@Idaho[1]": "us-id", "@Illinois[6]": "us-il", "@Indiana[2]": "us-in", "@Iowa[1]": "us-ia", "@Kansas[13]": "us-ks", "@Kentucky[7]": "us-ky", "@Louisiana[4]": "us-la", "@Maine[1]": "us-me", "@Maryland[4]": "us-md", "@Massachusetts[6]": "us-ma", "@Michigan[8]": "us-mi", "@Minnesota[6]": "us-mn", "@Mississippi[3]": "us-ms", "@Missouri[2]": "us-mo", "@Montana[4]": "us-mt", "@Nebraska[3]": "us-ne", "@Nevada[1]": "us-nv", "@New Hampshire[4]": "us-nh", "@New Jersey[2]": "us-nj", "@New Mexico[1]": "us-nm", "@New York[17]": "us-ny", "@North Carolina[6]": "us-nc", "@North Dakota[3]": "us-nd", "@Ohio[6]": "us-oh", "@Oklahoma[3]": "us-ok", "@Pennsylvania[11]": "us-pa", "@South Carolina[1]": "us-sc", "@Tennessee[4]": "us-tn", "@Texas[19]": "us-tx", "@Utah[1]": "us-ut", "@Virginia[2]": "us-va", "@Washington[7]": "us-wa", "@Wisconsin[3]": "us-wi", "\u{1F1FA}\u{1F1FE} Uruguay[74]": "uy", "\u{1F1FA}\u{1F1FF} Uzbekistan[29]": "uz", "\u{1F1FB}\u{1F1FA} Vanuatu[5]": "vu", "\u{1F1FB}\u{1F1E6} Vatican City[17]": "va", "\u{1F1FB}\u{1F1EA} Venezuela[133]": "ve", "@Aragua[2]": "ve-d", "@Lara[1]": "ve-k", "\u{1F1FB}\u{1F1F3} Vietnam[106]": "vn", "\u{1F1FC}\u{1F1EB} Wallis and Futuna[5]": "wf", "\u{1F1EA}\u{1F1ED} Western Sahara[24]": "eh", "\u{1F1FE}\u{1F1EA} Yemen[45]": "ye", "\u{1F1FF}\u{1F1F2} Zambia[20]": "zm", "\u{1F1FF}\u{1F1FC} Zimbabwe[22]": "zw", "\u{1F30D} International[68]": "int" }, "regions": { "Africa[472]": "afr", "Americas[3903]": "amer", "Arab world[397]": "arab", "Asia[3053]": "asia", "Asia-Pacific[1990]": "apac", "Association of Southeast Asian Nations[430]": "asean", "Balkan[664]": "balkan", "Benelux[236]": "benelux", "Caribbean[271]": "carib", "Central America[273]": "cenamer", "Central and Eastern Europe[1146]": "cee", "Central Asia[67]": "cas", "Commonwealth of Independent States[523]": "cis", "Europe[3352]": "eur", "Europe, the Middle East and Africa[4198]": "emea", "European Union[2187]": "eu", "Hispanic America[1714]": "hispam", "Latin America[2028]": "latam", "Latin America and the Caribbean[2059]": "lac", "Maghreb[61]": "maghreb", "Middle East[688]": "mideast", "Middle East and North Africa[739]": "mena", "Nordics[93]": "nord", "North America[2614]": "noram", "Northern America[1866]": "nam", "Northern Europe[128]": "neur", "Oceania[82]": "oce", "South America[1298]": "southam", "South Asia[601]": "sas", "Southeast Asia[443]": "sea", "Southern Europe[1096]": "ser", "Sub-Saharan Africa[380]": "ssa", "West Africa[163]": "wafr", "Western Europe[994]": "wer" } });
    __privateAdd(this, _opts, {
      types: {
        countries: "countries",
        languages: "languages",
        categories: "categories",
        regions: "regions"
      },
      type: "countries",
      source: "/countries/int.m3u"
    });
    __privateAdd(this, _defaultGroup, { "All": "All" });
    __privateAdd(this, _cache, {
      res: {},
      items: [],
      groups: __privateGet(this, _defaultGroup),
      uptime: 0,
      sources: {}
    });
  }
  async load() {
    await this.registerSetting({
      title: "Cache Expire Time",
      key: "Expire",
      type: "radio",
      description: "Set `none` is no cache\nTips: After changing your country, the delay will be refreshed",
      defaultValue: "60",
      options: {
        "none": "0",
        "15 minute": "15",
        "30 minute": "30",
        "1 hour": "60",
        "6 hour": "360",
        "12 hour": "720",
        "1 day": "1440"
      }
    });
    await this.registerSetting({
      title: "Choose Group by \u2192\u2192\u2192",
      description: `First select the group type,
and then select the source in the following corresponding grouping`,
      key: "GroupBy",
      type: "radio",
      defaultValue: __privateGet(this, _opts).type,
      options: __privateGet(this, _opts).types
    });
    for (let v in __privateGet(this, _opts).types) {
      let groups = {};
      for (let k in __privateGet(this, _sources)[v]) {
        if (k.startsWith("@")) {
          groups[`     ${k.slice(1)}`] = `/subdivisions/${__privateGet(this, _sources)[v][k]}.m3u`;
        } else {
          groups[k] = `/${v}/${__privateGet(this, _sources)[v][k]}.m3u`;
        }
      }
      __privateGet(this, _sources)[v] = groups;
      await this.registerSetting({
        title: `\u3000\u3000choose from these ${v}`,
        key: v,
        type: "radio",
        defaultValue: __privateGet(this, _opts).source,
        options: groups
      });
    }
  }
  async req(path) {
    return await this.request(path, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
      }
    });
  }
  async checkExpire() {
    const expire = +await this.getSetting("Expire");
    return expire > 0 && Date.now() - __privateGet(this, _cache).uptime < expire * 60 * 1e3;
  }
  async createFilter(filter) {
    const filt = (filter == null ? void 0 : filter.data) && filter.data[0] || "";
    __privateGet(this, _cache).groups = __privateGet(this, _cache).items.map((v) => v.group && v.group.split(";")).flat().reduce((g, v) => {
      return v ? __spreadProps(__spreadValues({}, g), { [v]: v }) : g;
    }, __privateGet(this, _defaultGroup));
    let title = "";
    const GroupBy = await this.getSetting("GroupBy");
    for (let [name, item] of Object.entries(__privateGet(this, _sources)[GroupBy])) {
      if (item === __privateGet(this, _opts).source) {
        title = `${GroupBy} - ${name.trim()}`;
        break;
      }
    }
    return {
      "data": {
        title,
        max: 1,
        min: 1,
        default: filt || "All",
        options: __privateGet(this, _cache).groups
      }
    };
  }
  async latest(page) {
    if (page > 1) {
      return [];
    }
    const GroupBy = await this.getSetting("GroupBy");
    const baseUrl = await this.getSetting(GroupBy);
    if (!baseUrl) {
      baseUrl = __privateGet(this, _opts).source;
    }
    const md5path = md5(baseUrl);
    if (md5path in __privateGet(this, _cache).res && await this.checkExpire()) {
      return __privateGet(this, _cache).items = __privateGet(this, _cache).res[md5path];
    }
    const res = (await this.req(baseUrl)).replace(/\r?\n/g, "\n").replace(/\n+/g, "\n").trim();
    let title, cover, group;
    let headers = {};
    const vlcopt = {
      "User-Agent": "#EXTVLCOPT:http-user-agent=",
      "Referer": "#EXTVLCOPT:http-referrer="
    };
    const bangumi = [];
    await res.split("\n").forEach(async (item) => {
      var _a, _b;
      if (item.startsWith("#EXTINF:")) {
        title = item.slice(item.lastIndexOf(",") + 1).trim();
        group = ((_a = item.match(/group\-title\="([^"]+)"/)) == null ? void 0 : _a[1]) || "";
        cover = ((_b = item.match(/tvg\-logo\="([^"]+)"/)) == null ? void 0 : _b[1]) || null;
      } else if (item.startsWith("#EXTVLCOPT:")) {
        for (let v in vlcopt) if (item.startsWith(vlcopt[v])) {
          headers[v] = item.slice(vlcopt[v].length);
        }
      } else if (title && ~item.search(/^(?:https?|rs[tcm]p|rsp|mms)/) && !~item.search(/\.mpd/)) {
        bangumi.push({
          title,
          url: item.trim(),
          cover,
          group,
          headers
        });
        title = "";
        headers = {};
      }
    });
    __privateGet(this, _opts).source = baseUrl;
    __privateGet(this, _cache).uptime = Date.now();
    return __privateGet(this, _cache).items = __privateGet(this, _cache).res[md5path] = bangumi;
  }
  async search(kw, page, filter) {
    if (page > 1) {
      return [];
    }
    !~__privateGet(this, _cache).items.length && await this.latest();
    const filt = (filter == null ? void 0 : filter.data) && filter.data[0] || "All";
    const bangumi = __privateGet(this, _cache).items;
    if (filt === "All") {
      return !kw ? bangumi : bangumi.filter((v) => ~v.title.indexOf(kw));
    }
    return bangumi.filter((v) => v.group && ~`;${v.group};`.indexOf(`;${filt};`) && (kw ? ~v.title.indexOf(kw) : true));
  }
  async detail(url) {
    const bangumi = __privateGet(this, _cache).items.find((v) => v.url === url);
    const parseUrls = (item) => {
      const urls = item.url.split("#");
      const l = urls.length;
      return urls.map((v, i) => {
        return {
          name: l > 1 ? `${item.title} [${i + 1}]` : `${item.title}`,
          url: v
        };
      });
    };
    bangumi.episodes = [
      {
        title: bangumi.title,
        urls: parseUrls(bangumi)
      }
    ];
    let groups;
    bangumi.group && bangumi.group.split(";").forEach((g) => {
      groups = __privateGet(this, _cache).items.filter((v) => v.group && ~`;${v.group};`.indexOf(`;${g};`)).map((v) => parseUrls(v)) || [];
      ~groups.length && bangumi.episodes.push({
        title: `[${g}]`,
        urls: groups.flat()
      });
    });
    return bangumi;
  }
  async watch(url) {
    const bangumi = __privateGet(this, _cache).items.find((v) => v.url === url || ~v.url.indexOf(url));
    const item = {
      type: "hls",
      url
    };
    if ("headers" in bangumi && ~Object.keys(bangumi.headers).length) {
      item["headers"] = bangumi.headers;
    }
    return item;
  }
}
_sources = new WeakMap();
_opts = new WeakMap();
_defaultGroup = new WeakMap();
_cache = new WeakMap();
