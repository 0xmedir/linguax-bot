const TelegramBot = require("node-telegram-bot-api");
const { translate } = require("./translator");
const { getLangName, isValidLang, LANGUAGES } = require("./languages");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error("Set BOT_TOKEN first!"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
const userSettings = {};

function getSettings(chatId) {
  if (!userSettings[chatId]) userSettings[chatId] = { from: "auto", to: "en" };
  return userSettings[chatId];
}

function buildLangKeyboard(page, settingKey) {
  const entries = [["auto", "🌐 Auto Detect"], ...Object.entries(LANGUAGES)];
  const pageSize = 18;
  const start = page * pageSize;
  const slice = entries.slice(start, start + pageSize);
  const rows = [];
  for (let i = 0; i < slice.length; i += 3) {
    rows.push(slice.slice(i, i + 3).map(([code, name]) => ({
      text: name,
      callback_data: "set_" + settingKey + "_" + code
    })));
  }
  const nav = [];
  if (page > 0) nav.push({ text: "⬅️ Prev", callback_data: "page_" + settingKey + "_" + (page - 1) });
  if (start + pageSize < entries.length) nav.push({ text: "Next ➡️", callback_data: "page_" + settingKey + "_" + (page + 1) });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "🔙 Back", callback_data: "main_menu" }]);
  return { inline_keyboard: rows };
}

function mainMenuKeyboard(chatId) {
  const s = getSettings(chatId);
  const fromLabel = s.from === "auto" ? "🌐 Auto Detect" : getLangName(s.from);
  const toLabel = getLangName(s.to);
  return {
    inline_keyboard: [
      [{ text: "📥 From: " + fromLabel, callback_data: "pick_from_0" }],
      [{ text: "📤 To: " + toLabel, callback_data: "pick_to_0" }],
      [{ text: "🔄 Swap Languages", callback_data: "swap_langs" }],
      [{ text: "❓ Help", callback_data: "help" }],
    ]
  };
}

bot.onText(/\/start/, function(msg) {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "there";
  const welcome = "🌐 *Hey " + name + ", the world just got smaller.*\n\n"
    + "No dictionaries. No app switching. No copy-pasting.\n\n"
    + "Just *type* — and I'll handle the rest in 90+ languages, instantly.\n\n"
    + "━━━━━━━━━━━━━━━\n"
    + "🗣 *Traveler?* I've got you.\n"
    + "💼 *Business?* Covered.\n"
    + "❤️ *Texting someone special?* Say it right.\n"
    + "━━━━━━━━━━━━━━━\n\n"
    + "Tap below to set your languages and start 👇";
  bot.sendMessage(chatId, welcome, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard(chatId) });
});

bot.onText(/\/menu/, function(msg) {
  const chatId = msg.chat.id;
  const s = getSettings(chatId);
  const fromLabel = s.from === "auto" ? "🌐 Auto Detect" : getLangName(s.from);
  bot.sendMessage(chatId,
    "⚙️ *Language Settings*\n\n📥 From: *" + fromLabel + "*\n📤 To: *" + getLangName(s.to) + "*\n\nTap to change:",
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard(chatId) }
  );
});

bot.on("callback_query", function(query) {
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;
  const data = query.data;
  const s = getSettings(chatId);

  if (data === "main_menu") {
    const fromLabel = s.from === "auto" ? "🌐 Auto Detect" : getLangName(s.from);
    return bot.editMessageText(
      "⚙️ *Language Settings*\n\n📥 From: *" + fromLabel + "*\n📤 To: *" + getLangName(s.to) + "*\n\nTap to change:",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: mainMenuKeyboard(chatId) }
    );
  }

  if (data === "help") {
    return bot.editMessageText(
      "❓ *Help*\n\n• Set *From* language (or Auto Detect)\n• Set *To* language\n• Send any text to translate\n• Use 🔄 Swap to reverse languages\n\n/start — restart\n/menu — open settings",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] } }
    );
  }

  if (data === "swap_langs") {
    if (s.from === "auto") {
      bot.answerCallbackQuery(query.id, { text: "Cannot swap — From is Auto Detect" });
    } else {
      const tmp = s.from; s.from = s.to; s.to = tmp;
      bot.answerCallbackQuery(query.id, { text: "🔄 Swapped!" });
    }
    const fromLabel = s.from === "auto" ? "🌐 Auto Detect" : getLangName(s.from);
    return bot.editMessageText(
      "⚙️ *Language Settings*\n\n📥 From: *" + fromLabel + "*\n📤 To: *" + getLangName(s.to) + "*\n\nTap to change:",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: mainMenuKeyboard(chatId) }
    );
  }

  const pickFrom = data.match(/^pick_from_(\d+)$/);
  const pickTo = data.match(/^pick_to_(\d+)$/);
  if (pickFrom || pickTo) {
    const key = pickFrom ? "from" : "to";
    const page = parseInt((pickFrom || pickTo)[1]);
    return bot.editMessageText(
      "🌐 *Choose " + (key === "from" ? "Source" : "Target") + " Language* — Page " + (page + 1) + ":",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: buildLangKeyboard(page, key) }
    );
  }

  const pageMatch = data.match(/^page_(from|to)_(\d+)$/);
  if (pageMatch) {
    const key = pageMatch[1];
    const page = parseInt(pageMatch[2]);
    return bot.editMessageText(
      "🌐 *Choose " + (key === "from" ? "Source" : "Target") + " Language* — Page " + (page + 1) + ":",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: buildLangKeyboard(page, key) }
    );
  }

  const setMatch = data.match(/^set_(from|to)_(.+)$/);
  if (setMatch) {
    const key = setMatch[1];
    const code = setMatch[2];
    s[key] = code;
    const label = code === "auto" ? "🌐 Auto Detect" : getLangName(code);
    bot.answerCallbackQuery(query.id, { text: "✅ " + (key === "from" ? "Source" : "Target") + " set to " + label });
    const fromLabel = s.from === "auto" ? "🌐 Auto Detect" : getLangName(s.from);
    return bot.editMessageText(
      "⚙️ *Language Settings*\n\n📥 From: *" + fromLabel + "*\n📤 To: *" + getLangName(s.to) + "*\n\nTap to change:",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: mainMenuKeyboard(chatId) }
    );
  }

  bot.answerCallbackQuery(query.id);
});

bot.on("message", function(msg) {
  if (!msg.text) return;
  if (msg.text.startsWith("/")) return;
  if (msg.from && msg.from.is_bot) return;

  const chatId = msg.chat.id;
  const s = getSettings(chatId);

  bot.sendMessage(chatId, "⏳ Translating...").then(function(thinking) {
    translate(msg.text, { from: s.from === "auto" ? undefined : s.from, to: s.to }).then(function(result) {
      const detectedCode = result.from.language.iso;
      bot.editMessageText(
        "🌐 *" + getLangName(detectedCode) + " → " + getLangName(s.to) + "*\n\n" + result.text,
        { chat_id: chatId, message_id: thinking.message_id, parse_mode: "Markdown" }
      );
    }).catch(function() {
      bot.editMessageText("⚠️ Translation failed. Please try again.", { chat_id: chatId, message_id: thinking.message_id });
    });
  });
});

console.log("🤖 LinguaX running...");
