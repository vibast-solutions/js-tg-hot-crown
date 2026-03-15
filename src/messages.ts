import { PublicKey } from "@solana/web3.js";
import {
  GameState,
  formatTokens,
  shortenWallet,
  isNullPubkey,
  isBiddingPhase,
} from "./game-state";
import { randomPunchline } from "./punchlines";

export function bidPlacedMessage(
  bidder: PublicKey,
  bidAmount: bigint,
  state: GameState
): string {
  const punchline = randomPunchline("bidPlaced");
  return [
    `🏰 <b>Throne Bid!</b>`,
    ``,
    `<code>${shortenWallet(bidder)}</code> bids <b>${formatTokens(bidAmount)} HCRN</b> for the throne!`,
    `Throne Pot: ${formatTokens(state.thronePot)} HCRN`,
    `Next bid: ${state.nextBidAmount} HCRN`,
    `⏱ Timer reset — 3 minutes to outbid!`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function kingElectedMessage(
  king: PublicKey,
  potClaimed: bigint
): string {
  const punchline = randomPunchline("kingElected");
  return [
    `👑 <b>New King Crowned!</b>`,
    ``,
    `<code>${shortenWallet(king)}</code> claims the throne!`,
    `Pot Claimed: <b>${formatTokens(potClaimed)} HCRN</b>`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function battleStartedMessage(
  attacker: PublicKey,
  soldiers: bigint
): string {
  const punchline = randomPunchline("battleStarted");
  return [
    `⚔️ <b>Battle Begins!</b>`,
    ``,
    `<code>${shortenWallet(attacker)}</code> launches an attack with <b>${soldiers} soldier${soldiers > 1n ? "s" : ""}</b>!`,
    `⏱ The king has 3 minutes to rally defenders.`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function attackMessage(
  attacker: PublicKey,
  soldiers: bigint,
  state: GameState
): string {
  const punchline = randomPunchline("attack");
  return [
    `⚔️ <b>Attack!</b>`,
    ``,
    `<code>${shortenWallet(attacker)}</code> sends <b>${soldiers} soldier${soldiers > 1n ? "s" : ""}</b> to attack!`,
    `Attack: ${state.attackSoldiers} ⚔️ vs Defense: ${state.defenseSoldiers} 🛡️`,
    `⏱ Timer reset — 3 minutes.`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function defenseMessage(
  defender: PublicKey,
  soldiers: bigint,
  state: GameState
): string {
  const punchline = randomPunchline("defense");
  return [
    `🛡️ <b>Defense!</b>`,
    ``,
    `<code>${shortenWallet(defender)}</code> sends <b>${soldiers} soldier${soldiers > 1n ? "s" : ""}</b> to defend the king!`,
    `Attack: ${state.attackSoldiers} ⚔️ vs Defense: ${state.defenseSoldiers} 🛡️`,
    `⏱ Timer reset — 3 minutes.`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function kingSurvivesMessage(
  king: PublicKey,
  attackSoldiers: bigint,
  defenseSoldiers: bigint,
  kingPayout: bigint,
  totalBurned: bigint
): string {
  const punchline = randomPunchline("kingSurvives");
  return [
    `🛡️ <b>The King Survives!</b>`,
    ``,
    `King: <code>${shortenWallet(king)}</code>`,
    `Attack: ${attackSoldiers} ⚔️ vs Defense: ${defenseSoldiers} 🛡️`,
    `King Payout: <b>${formatTokens(kingPayout)} HCRN</b>`,
    `Burned: ${formatTokens(totalBurned)} HCRN 🔥`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function kingStatusMessage(state: GameState): string {
  const hasKing = !isNullPubkey(state.king);
  const punchline = randomPunchline(hasKing ? "kingStatus" : "noKing");

  if (hasKing) {
    const phase = isBiddingPhase(state) ? "Bidding" : "Battle";
    const lines = [
      `👑 <b>Throne Status Report</b>`,
      ``,
      `King: <code>${state.king.toBase58()}</code>`,
      `Phase: ${phase}`,
    ];

    if (isBiddingPhase(state)) {
      lines.push(`Next Bid: ${state.nextBidAmount} HCRN`);
      if (state.thronePot > 0n) {
        lines.push(`Throne Pot: ${formatTokens(state.thronePot)} HCRN`);
      }
    } else if (state.attackSoldiers === 0n) {
      lines.push(`Status: Peace ☮️`);
    } else {
      lines.push(`Attack: ${state.attackSoldiers} ⚔️ vs Defense: ${state.defenseSoldiers} 🛡️`);
    }

    lines.push(``, `<i>${punchline}</i>`);
    return lines.join("\n");
  }

  return [
    `🪑 <b>Throne Status Report</b>`,
    ``,
    `The throne is <b>empty</b>. No king reigns.`,
    `Starting bid: ${state.nextBidAmount} HCRN`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}

export function kingDefeatedMessage(
  formerKing: PublicKey,
  attackSoldiers: bigint,
  defenseSoldiers: bigint,
  totalBurned: bigint
): string {
  const punchline = randomPunchline("kingDefeated");
  return [
    `💀 <b>The King Has Fallen!</b>`,
    ``,
    `Former King: <code>${shortenWallet(formerKing)}</code>`,
    `Attack: ${attackSoldiers} ⚔️ vs Defense: ${defenseSoldiers} 🛡️`,
    `Total Burned: <b>${formatTokens(totalBurned)} HCRN</b> 🔥`,
    ``,
    `The throne is empty. Bidding starts at 1 HCRN!`,
    ``,
    `<i>${punchline}</i>`,
  ].join("\n");
}
