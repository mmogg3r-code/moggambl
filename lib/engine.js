import { randomUUID } from 'node:crypto';

export const ETH_DEPOSIT_ADDRESS = '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89';
export const LINES = 50;
export const MAX_BET_PER_LINE = 5;
export const MAX_MULTIPLIER = 20000;
export const MAX_PROGRESSIVE = 1_000_000;

const iconWeights = new Map([
  ['7', 0.01], ['BAR', 0.03], ['💎', 0.05], ['👑', 0.08], ['⚡', 0.1],
  ['🐉', 0.12], ['🌙', 0.14], ['🔔', 0.16], ['⭐', 0.14], ['🍒', 0.17]
]);

export const slotCatalog = Array.from({ length: 20 }).map((_, i) => ({
  id: `slot-${i + 1}`,
  name: [
    'Neon Nebula', 'Dragon Vault', 'Arcade Dynasty', 'Celestial Crown', 'Cyber Pharaoh',
    'Mythic Lagoon', 'Inferno Empire', 'Quantum Oasis', 'Emerald Nexus', 'Lunar Mirage',
    'Viking Tempest', 'Shogun Pulse', 'Pirate Reactor', 'Steampunk Forge', 'Aurora Ritual',
    'Phoenix Drift', 'Titan Atlas', 'Samurai Bloom', 'Obsidian Rush', 'Solar Echo'
  ][i],
  volatility: [1.8, 2.4, 2.1, 1.9, 2.8, 2.2, 2.7, 2.6, 2.0, 1.7, 2.5, 2.3, 2.4, 1.9, 2.2, 2.8, 2.9, 2.1, 2.6, 2.0][i],
  jackpotPool: 5000 + (i * 1500)
}));

export function createStore() {
  return { players: new Map(), usedTxHashes: new Set(), slots: structuredClone(slotCatalog) };
}

export function getPlayer(store, playerId = randomUUID()) {
  if (!store.players.has(playerId)) {
    store.players.set(playerId, {
      id: playerId,
      walletAddress: null,
      balanceUSD: 0,
      totalWageredUSD: 0,
      totalDepositedUSD: 0,
      txHistory: [],
      lastSpin: null
    });
  }
  return store.players.get(playerId);
}

function weightedRandom() {
  const r = Math.random();
  let sum = 0;
  for (const [key, weight] of iconWeights.entries()) {
    sum += weight;
    if (r <= sum) return key;
  }
  return '🍒';
}

function payoutForGrid(grid, bet, volatility) {
  let hits = 0;
  for (let r = 0; r < grid.length; r += 1) {
    if (grid[r][0] === grid[r][1] && grid[r][1] === grid[r][2] && grid[r][2] === grid[r][3] && grid[r][3] === grid[r][4]) hits += 5;
    if (grid[r][0] === grid[r][1] && grid[r][1] === grid[r][2]) hits += 2;
  }

  const bonusRoll = Math.random();
  let multiplier = 0;
  if (bonusRoll > 0.9998) multiplier = MAX_MULTIPLIER;
  else if (bonusRoll > 0.9985) multiplier = Math.floor(500 + (Math.random() * 5000));
  else if (hits > 6) multiplier = Math.floor(10 + (hits * volatility * 4));
  else if (hits > 2) multiplier = Math.floor(1 + (hits * volatility));

  multiplier = Math.min(MAX_MULTIPLIER, multiplier);
  return { multiplier, payoutUSD: bet * multiplier };
}

export function deposit(store, { playerId, txHash, amountEth, walletAddress, ethUsd = 3200 }) {
  if (!playerId || !txHash || !amountEth || !walletAddress) throw new Error('playerId, txHash, amountEth, walletAddress are required');
  if (store.usedTxHashes.has(txHash)) throw new Error('Transaction already credited');

  const player = getPlayer(store, playerId);
  const usd = Number(amountEth) * Number(ethUsd);
  player.walletAddress = walletAddress;
  player.balanceUSD += usd;
  player.totalDepositedUSD += usd;
  player.txHistory.push({ type: 'deposit', txHash, amountEth, usd, walletAddress, ts: Date.now() });
  store.usedTxHashes.add(txHash);
  return player;
}

export function spin(store, { playerId, slotId, lineBet }) {
  const player = getPlayer(store, playerId);
  const slot = store.slots.find((s) => s.id === slotId) ?? store.slots[0];
  const bet = Number(lineBet) * LINES;

  if (lineBet <= 0 || lineBet > MAX_BET_PER_LINE) throw new Error(`lineBet must be between 0.01 and ${MAX_BET_PER_LINE}`);
  if (player.balanceUSD < bet) throw new Error('Insufficient balance');

  player.balanceUSD -= bet;
  player.totalWageredUSD += bet;

  const grid = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => weightedRandom()));
  const { multiplier, payoutUSD } = payoutForGrid(grid, bet, slot.volatility);
  slot.jackpotPool = Math.min(MAX_PROGRESSIVE, slot.jackpotPool + (bet * 0.015));

  let progressiveWin = 0;
  if (Math.random() > 0.99995) {
    progressiveWin = slot.jackpotPool;
    slot.jackpotPool = 2500;
  }

  const totalWin = payoutUSD + progressiveWin;
  player.balanceUSD += totalWin;

  const spinResult = { grid, lineBet: Number(lineBet), totalBet: bet, multiplier, payoutUSD, progressiveWin, totalWin, slotId, jackpotPool: slot.jackpotPool, ts: Date.now() };
  player.lastSpin = spinResult;
  player.txHistory.push({ type: 'spin', ...spinResult });

  return { player, spin: spinResult, slot };
}

export function withdraw(store, { playerId, amountUSD, walletAddress }) {
  const player = getPlayer(store, playerId);
  if (!walletAddress || !amountUSD) throw new Error('walletAddress and amountUSD are required');
  if (Number(amountUSD) > player.balanceUSD) throw new Error('Insufficient funds');
  if (player.totalWageredUSD < player.totalDepositedUSD * 20) throw new Error('Withdrawal locked until 20x wagering requirement is met');

  player.balanceUSD -= Number(amountUSD);
  player.txHistory.push({ type: 'withdraw-request', amountUSD, walletAddress, ts: Date.now() });
  return player;
}
