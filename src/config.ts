import { PublicKey } from "@solana/web3.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  get tgBotToken() {
    return requireEnv("TG_BOT_TOKEN");
  },
  get tgChatId() {
    return requireEnv("TG_CHAT_ID");
  },
  get solanaRpcUrl() {
    return requireEnv("SOLANA_RPC_URL");
  },
  get solanaWsUrl() {
    return requireEnv("SOLANA_WS_URL");
  },
  get programId() {
    return new PublicKey(
      process.env.PROGRAM_ID || "DwtDoUcKTCfkw2hSLwkYf6HVNFmtoMk7VYBjAJek5ixb"
    );
  },
  get gameUrl() {
    return requireEnv("GAME_URL");
  },
  get kingPostIntervalHours() {
    const val = process.env.KING_POST_INTERVAL_HOURS;
    return val ? parseInt(val, 10) : 24;
  },
  tokenDecimals: 6,
  oneToken: 1_000_000,
};
