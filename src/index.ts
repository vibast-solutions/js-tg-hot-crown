import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { config } from "./config";
import {
  GameState,
  fetchGameState,
  createProgram,
  isBiddingPhase,
  isBattlePhase,
  isNullPubkey,
} from "./game-state";
import { sendTelegramMessage } from "./telegram";
import {
  bidPlacedMessage,
  kingElectedMessage,
  battleStartedMessage,
  attackMessage,
  defenseMessage,
  kingSurvivesMessage,
  kingDefeatedMessage,
  kingStatusMessage,
} from "./messages";

let previousState: GameState | null = null;
let program: Program;
let connection: Connection;
let lastSignature: string | null = null;

function detectInstruction(logs: string[]): string | null {
  for (const log of logs) {
    if (log.includes("Instruction: PlaceThroneBid")) return "PlaceThroneBid";
    if (log.includes("Instruction: FinalizeKingElection"))
      return "FinalizeKingElection";
    if (log.includes("Instruction: Attack")) return "Attack";
    if (log.includes("Instruction: Defend")) return "Defend";
    if (log.includes("Instruction: FinalizeBattle")) return "FinalizeBattle";
  }
  return null;
}

async function getSignerFromSignature(
  signature: string
): Promise<PublicKey | null> {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx?.transaction.message) {
      const accountKeys = tx.transaction.message.getAccountKeys();
      return accountKeys.get(0) ?? null;
    }
  } catch (error) {
    console.error("Failed to get signer from tx:", error);
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getNextPostTime(): Date {
  const intervalMs = config.kingPostIntervalHours * 60 * 60 * 1000;
  const now = Date.now();
  const next = Math.ceil(now / intervalMs) * intervalMs;
  return new Date(next);
}

async function postKingStatus(): Promise<void> {
  try {
    const state = await fetchGameState(program);
    if (!state) {
      console.error("Failed to fetch game state for king status post");
      return;
    }
    const message = kingStatusMessage(state);
    console.log(`[${new Date().toISOString()}] Posting king status`);
    await sendTelegramMessage(message);
  } catch (error) {
    console.error("King status post failed:", error);
  }
}

function scheduleKingStatusPost(): void {
  const next = getNextPostTime();
  const delayMs = next.getTime() - Date.now();
  console.log(`King status post every ${config.kingPostIntervalHours}h (next: ${next.toISOString()})`);

  setTimeout(async () => {
    await postKingStatus();
    // After first aligned post, repeat on fixed interval
    setInterval(postKingStatus, config.kingPostIntervalHours * 60 * 60 * 1000);
  }, delayMs);
}

async function handleEvent(
  instruction: string,
  signature: string
): Promise<void> {
  // Wait for state to settle — log subscription fires before account state is queryable
  await sleep(2000);
  const newState = await fetchGameState(program);
  if (!newState) {
    console.error("Failed to fetch game state after event");
    return;
  }

  const prev = previousState;
  let message: string | null = null;

  switch (instruction) {
    case "PlaceThroneBid": {
      const signer = await getSignerFromSignature(signature);
      if (signer) {
        const bidAmount = prev
          ? prev.nextBidAmount * prev.oneToken
          : newState.lastBidAmount * newState.oneToken;
        message = bidPlacedMessage(signer, bidAmount, newState);
      }
      break;
    }

    case "FinalizeKingElection": {
      const potClaimed = prev ? prev.thronePot : 0n;
      message = kingElectedMessage(newState.king, potClaimed);
      break;
    }

    case "Attack": {
      const signer = await getSignerFromSignature(signature);
      if (signer && prev) {
        const soldiersDelta = newState.attackSoldiers - prev.attackSoldiers;
        const wasBattleActive = prev.battleActive;

        if (!wasBattleActive) {
          message = battleStartedMessage(signer, soldiersDelta);
        } else {
          message = attackMessage(signer, soldiersDelta, newState);
        }
      }
      break;
    }

    case "Defend": {
      const signer = await getSignerFromSignature(signature);
      if (signer && prev) {
        const soldiersDelta = newState.defenseSoldiers - prev.defenseSoldiers;
        message = defenseMessage(signer, soldiersDelta, newState);
      }
      break;
    }

    case "FinalizeBattle": {
      if (prev) {
        const attackSoldiers = prev.attackSoldiers;
        const defenseSoldiers = prev.defenseSoldiers;
        const attackPool = prev.attackPool;
        const defensePool = prev.defensePool;

        if (isBattlePhase(newState) || !isNullPubkey(newState.king)) {
          // King survived (still in battle phase or king still set)
          // Actually if king survived, phase stays Battle and king stays
          // King payout = 50% of defense pool
          const kingPayout = defensePool / 2n;
          const burned = defensePool - kingPayout + attackPool;
          message = kingSurvivesMessage(
            prev.king,
            attackSoldiers,
            defenseSoldiers,
            kingPayout,
            burned
          );
        } else {
          // King defeated — phase changed to Bidding, king is null
          const totalBurned = attackPool + defensePool;
          message = kingDefeatedMessage(
            prev.king,
            attackSoldiers,
            defenseSoldiers,
            totalBurned
          );
        }
      }
      break;
    }
  }

  previousState = newState;

  if (message) {
    console.log(`[${new Date().toISOString()}] Sending: ${instruction}`);
    await sendTelegramMessage(message);
  }
}

function subscribe(): void {
  console.log(`Subscribing to program logs: ${config.programId.toBase58()}`);

  connection.onLogs(
    config.programId,
    async (logInfo) => {
      if (logInfo.err) return;

      // Deduplicate
      if (logInfo.signature === lastSignature) return;
      lastSignature = logInfo.signature;

      const instruction = detectInstruction(logInfo.logs);
      if (!instruction) return;

      console.log(
        `[${new Date().toISOString()}] Detected: ${instruction} (${logInfo.signature.slice(0, 12)}...)`
      );

      try {
        await handleEvent(instruction, logInfo.signature);
      } catch (error) {
        console.error(`Error handling ${instruction}:`, error);
      }
    },
    "confirmed"
  );
}

async function main(): Promise<void> {
  console.log("Hot Crown Telegram Bot starting...");

  connection = new Connection(config.solanaRpcUrl, {
    wsEndpoint: config.solanaWsUrl,
    commitment: "confirmed",
  });

  program = createProgram(connection);

  // Load initial state
  previousState = await fetchGameState(program);
  if (previousState) {
    const phase = isBiddingPhase(previousState) ? "Bidding" : "Battle";
    console.log(`Initial state loaded. Phase: ${phase}`);
  } else {
    console.warn("Could not load initial state — will start tracking on first event");
  }

  subscribe();

  // Periodic king status post at fixed UTC hours
  scheduleKingStatusPost();

  // Keep alive + reconnect on WebSocket drop
  setInterval(async () => {
    try {
      await connection.getSlot();
    } catch {
      console.warn("RPC health check failed — reconnecting...");
      connection = new Connection(config.solanaRpcUrl, {
        wsEndpoint: config.solanaWsUrl,
        commitment: "confirmed",
      });
      program = createProgram(connection);
      subscribe();
    }
  }, 30_000);

  console.log("Listening for game events...");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
