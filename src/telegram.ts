import { config } from "./config";

export async function sendTelegramMessage(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${config.tgBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.tgChatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "👑 Play Hot Crown", url: config.gameUrl }],
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Telegram API error (${response.status}): ${body}`);
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}
