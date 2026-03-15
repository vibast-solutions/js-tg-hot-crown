import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { config } from "./config";
import idl from "./idl/hot_crown.json";

export interface GameState {
  admin: PublicKey;
  tokenMint: PublicKey;
  devWalletAta: PublicKey;
  paused: boolean;
  oneToken: bigint;
  phase: { bidding: {} } | { battle: {} };
  candidate: PublicKey;
  nextBidAmount: bigint;
  lastBidAmount: bigint;
  biddingDeadline: bigint;
  thronePot: bigint;
  king: PublicKey;
  battleActive: boolean;
  attackSoldiers: bigint;
  defenseSoldiers: bigint;
  attackPool: bigint;
  defensePool: bigint;
  battleDeadline: bigint;
  bump: number;
}

const NULL_PUBKEY = PublicKey.default;

export function isNullPubkey(key: PublicKey): boolean {
  return key.equals(NULL_PUBKEY);
}

export function isBiddingPhase(
  state: GameState
): state is GameState & { phase: { bidding: {} } } {
  return "bidding" in state.phase;
}

export function isBattlePhase(
  state: GameState
): state is GameState & { phase: { battle: {} } } {
  return "battle" in state.phase;
}

export function formatTokens(rawAmount: bigint): string {
  const whole = rawAmount / BigInt(config.oneToken);
  const frac = rawAmount % BigInt(config.oneToken);
  if (frac === 0n) {
    return whole.toLocaleString();
  }
  const fracStr = frac.toString().padStart(config.tokenDecimals, "0");
  const trimmed = fracStr.replace(/0+$/, "");
  return `${whole.toLocaleString()}.${trimmed}`;
}

export function shortenWallet(pubkey: PublicKey): string {
  const str = pubkey.toBase58();
  return `${str.slice(0, 4)}...${str.slice(-3)}`;
}

export function createProgram(connection: Connection): Program {
  const dummyKeypair = Keypair.generate();
  const dummyWallet = new Wallet(dummyKeypair);
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
  return new Program(idl as any, provider);
}

export async function fetchGameState(
  program: Program
): Promise<GameState | null> {
  const [gameStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_state")],
    config.programId
  );

  try {
    const account = await (program.account as any).gameState.fetch(
      gameStatePda
    );
    return toGameState(account);
  } catch (error) {
    console.error("Failed to fetch GameState:", error);
    return null;
  }
}

function toGameState(raw: any): GameState {
  return {
    admin: raw.admin,
    tokenMint: raw.tokenMint,
    devWalletAta: raw.devWalletAta,
    paused: raw.paused,
    oneToken: BigInt(raw.oneToken.toString()),
    phase: raw.phase,
    candidate: raw.candidate,
    nextBidAmount: BigInt(raw.nextBidAmount.toString()),
    lastBidAmount: BigInt(raw.lastBidAmount.toString()),
    biddingDeadline: BigInt(raw.biddingDeadline.toString()),
    thronePot: BigInt(raw.thronePot.toString()),
    king: raw.king,
    battleActive: raw.battleActive,
    attackSoldiers: BigInt(raw.attackSoldiers.toString()),
    defenseSoldiers: BigInt(raw.defenseSoldiers.toString()),
    attackPool: BigInt(raw.attackPool.toString()),
    defensePool: BigInt(raw.defensePool.toString()),
    battleDeadline: BigInt(raw.battleDeadline.toString()),
    bump: raw.bump,
  };
}
