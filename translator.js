const https = require("https");
const querystring = require("querystring");

function translate(text, { from, to = "en" } = {}) {
  return new Promise((resolve, reject) => {
    const params = querystring.stringify({
      tl: to,
      sl: from || "auto",
      q: text
    });
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=ld&dj=1&${params}`;

    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(raw);
          const translated = (data.sentences || []).map((s) => s.trans || "").join("");
          const detectedLang = data.src || from || "?";
          resolve({ text: translated, from: { language: { iso: detectedLang } } });
        } catch (e) {
          reject(new Error("Parse error: " + e.message));
        }
      });
    }).on("error", reject);
  });
}

module.exports = { translate };
