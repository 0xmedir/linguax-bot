const LANGUAGES = {
  af:"Afrikaans",sq:"Albanian",am:"Amharic",ar:"Arabic",hy:"Armenian",
  az:"Azerbaijani",eu:"Basque",be:"Belarusian",bn:"Bengali",bs:"Bosnian",
  bg:"Bulgarian",ca:"Catalan",ceb:"Cebuano","zh-cn":"Chinese (Simplified)",
  "zh-tw":"Chinese (Traditional)",hr:"Croatian",cs:"Czech",da:"Danish",
  nl:"Dutch",en:"English",eo:"Esperanto",et:"Estonian",fi:"Finnish",
  fr:"French",gl:"Galician",ka:"Georgian",de:"German",el:"Greek",
  gu:"Gujarati",ht:"Haitian Creole",ha:"Hausa",he:"Hebrew",hi:"Hindi",
  hu:"Hungarian",is:"Icelandic",ig:"Igbo",id:"Indonesian",ga:"Irish",
  it:"Italian",ja:"Japanese",jv:"Javanese",kn:"Kannada",kk:"Kazakh",
  km:"Khmer",ko:"Korean",ku:"Kurdish",ky:"Kyrgyz",lo:"Lao",la:"Latin",
  lv:"Latvian",lt:"Lithuanian",mk:"Macedonian",mg:"Malagasy",ms:"Malay",
  ml:"Malayalam",mt:"Maltese",mi:"Maori",mr:"Marathi",mn:"Mongolian",
  my:"Myanmar",ne:"Nepali",no:"Norwegian",ps:"Pashto",fa:"Persian",
  pl:"Polish",pt:"Portuguese",pa:"Punjabi",ro:"Romanian",ru:"Russian",
  sm:"Samoan",sr:"Serbian",st:"Sesotho",sn:"Shona",sd:"Sindhi",
  si:"Sinhala",sk:"Slovak",sl:"Slovenian",so:"Somali",es:"Spanish",
  sw:"Swahili",sv:"Swedish",tl:"Tagalog",tg:"Tajik",ta:"Tamil",
  te:"Telugu",th:"Thai",tr:"Turkish",tk:"Turkmen",uk:"Ukrainian",
  ur:"Urdu",uz:"Uzbek",vi:"Vietnamese",cy:"Welsh",xh:"Xhosa",
  yi:"Yiddish",yo:"Yoruba",zu:"Zulu"
};

function getLangName(code) { return LANGUAGES[code] || code; }
function isValidLang(code) { return Object.prototype.hasOwnProperty.call(LANGUAGES, code); }

module.exports = { LANGUAGES, getLangName, isValidLang };
