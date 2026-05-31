import os
import json
import logging
from deep_translator import GoogleTranslator
from telegram import Update, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    InlineQueryHandler,
    ContextTypes,
    filters,
)
from telegram.constants import ParseMode
from telegram.helpers import escape_markdown

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

# ---------- Language data ----------
_SUPPORTED_LANGS = None
def get_supported_langs():
    global _SUPPORTED_LANGS
    if _SUPPORTED_LANGS is None:
        _SUPPORTED_LANGS = GoogleTranslator().get_supported_languages(as_dict=True)
        _SUPPORTED_LANGS = {v: k for k, v in _SUPPORTED_LANGS.items()}
    return _SUPPORTED_LANGS

# ---------- User preferences ----------
DATA_FILE = "user_prefs.json"
def load_prefs():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {}
def save_prefs(prefs):
    with open(DATA_FILE, "w") as f:
        json.dump(prefs, f, indent=2)

user_prefs = load_prefs()

def get_user_source(user_id: int) -> str:
    return user_prefs.get(str(user_id), {}).get("source", "auto")
def get_user_target(user_id: int) -> str:
    return user_prefs.get(str(user_id), {}).get("target", "en")
def set_user_source(user_id: int, source: str):
    uid = str(user_id)
    if uid not in user_prefs:
        user_prefs[uid] = {}
    user_prefs[uid]["source"] = source
    save_prefs(user_prefs)
def set_user_target(user_id: int, target: str):
    uid = str(user_id)
    if uid not in user_prefs:
        user_prefs[uid] = {}
    user_prefs[uid]["target"] = target
    save_prefs(user_prefs)

# ---------- Translation helper ----------
async def translate_text(text: str, source: str, target: str) -> str:
    try:
        return GoogleTranslator(source=source, target=target).translate(text)
    except Exception as e:
        return f"Translation error: {str(e)}"

# ---------- Handlers ----------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    uid = user.id
    source = get_user_source(uid)
    target = get_user_target(uid)
    await update.message.reply_text(
        f"*Hello {escape_markdown(user.first_name)}!* 👋\n\n"
        "I'm a translation bot with **inline mode**.\n\n"
        "*Commands:*\n"
        "• `/set_source <code>` – e.g., `/set_source en` (or `auto` for auto‑detect)\n"
        "• `/set_target <code>` – e.g., `/set_target am` (Amharic)\n"
        "• `/langcodes` – see supported languages\n\n"
        "*How to use inline mode:*\n"
        "In any chat, type `@YourBotName en am Hello world` – instantly translates.\n"
        "If you omit source/target, your default settings are used.\n\n"
        f"*Your current settings:*\n"
        f"Source: `{source}`\n"
        f"Target: `{target}`",
        parse_mode=ParseMode.MARKDOWN_V2
    )

async def set_source_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if not args:
        await update.message.reply_text("Usage: `/set_source <code>`\nExample: `/set_source auto` or `/set_source en`")
        return
    code = args[0].lower()
    if code == "auto" or code in get_supported_langs():
        set_user_source(update.effective_user.id, code)
        await update.message.reply_text(f"✅ Source language set to `{code}`.")
    else:
        await update.message.reply_text(f"❌ Invalid code. Use `/langcodes` to see all.")

async def set_target_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if not args:
        await update.message.reply_text("Usage: `/set_target <code>`\nExample: `/set_target am`")
        return
    code = args[0].lower()
    if code in get_supported_langs():
        set_user_target(update.effective_user.id, code)
        await update.message.reply_text(f"✅ Target language set to `{code}`.")
    else:
        await update.message.reply_text(f"❌ Invalid code.")

async def langcodes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    langs = get_supported_langs()
    text = "Supported language codes (first 50):\n" + ", ".join(list(langs.keys())[:50])
    await update.message.reply_text(text)

async def normal_translation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    source = get_user_source(uid)
    target = get_user_target(uid)
    text = update.message.text
    if not text:
        return
    translated = await translate_text(text, source, target)
    await update.message.reply_text(
        f"🔄 *Translation* (from `{source}` to `{target}`):\n\n{translated}",
        parse_mode=ParseMode.MARKDOWN_V2
    )

# ---------- Inline mode ----------
async def inline_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.inline_query.query.strip()
    user_id = update.inline_query.from_user.id
    if not query:
        # Show help
        results = [InlineQueryResultArticle(
            id="help",
            title="How to use inline mode",
            input_message_content=InputTextMessageContent(
                "Usage:\n"
                "• `@bot en am Hello` – translate English to Amharic\n"
                "• `@bot Hello` – use your default settings\n"
                "Set defaults with /set_source and /set_target"
            ),
            description="Learn inline translation"
        )]
        await update.inline_query.answer(results, cache_time=0)
        return

    parts = query.split(maxsplit=2)
    source = get_user_source(user_id)
    target = get_user_target(user_id)

    # Check if user gave source+target+text
    if len(parts) >= 3 and parts[0] in get_supported_langs() and parts[1] in get_supported_langs():
        source = parts[0]
        target = parts[1]
        text = parts[2]
    else:
        text = query

    translated = await translate_text(text, source, target)
    results = [InlineQueryResultArticle(
        id="1",
        title=translated[:60],
        description=f"From {source} → {target}",
        input_message_content=InputTextMessageContent(translated)
    )]
    await update.inline_query.answer(results, cache_time=0)

# ---------- Main ----------
def main():
    token = os.environ.get("BOT_TOKEN")
    if not token:
        raise ValueError("Set BOT_TOKEN environment variable")
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("set_source", set_source_command))
    app.add_handler(CommandHandler("set_target", set_target_command))
    app.add_handler(CommandHandler("langcodes", langcodes))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, normal_translation))
    app.add_handler(InlineQueryHandler(inline_query))
    print("🤖 Bot running. Inline mode enabled.")
    app.run_polling()

if __name__ == "__main__":
    main()
