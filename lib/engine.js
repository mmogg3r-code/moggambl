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

const payTable = {
  '7': { 3: 30, 4: 150, 5: 800 },
  BAR: { 3: 20, 4: 80, 5: 400 },
  '💎': { 3: 15, 4: 60, 5: 250 },
  '👑': { 3: 12, 4: 45, 5: 150 },
  '⚡': { 3: 10, 4: 35, 5: 120 },
  '🐉': { 3: 8, 4: 25, 5: 90 },
  '🌙': { 3: 6, 4: 20, 5: 70 },
  '🔔': { 3: 5, 4: 15, 5: 50 },
  '⭐': { 3: 4, 4: 12, 5: 40 },
  '🍒': { 3: 3, 4: 10, 5: 30 }
};

const basePatterns = [
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]
];

export const payLines = Array.from({ length: LINES }, (_, idx) => {
  const pattern = [...basePatterns[idx % basePatterns.length]];
  const shift = Math.floor(idx / basePatterns.length) % 3;
  return pattern.map((r) => (r + shift) % 3);
});

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

function evaluateLines(grid, lineBet, volatility) {
  const winningLines = [];
  let payoutUSD = 0;

  payLines.forEach((line, lineIndex) => {
    const symbols = line.map((row, col) => grid[row][col]);
    const baseSymbol = symbols[0];
    let count = 1;
    for (let i = 1; i < symbols.length; i += 1) {
      if (symbols[i] === baseSymbol) count += 1;
      else break;
    }

    if (count >= 3) {
      const base = payTable[baseSymbol]?.[count] ?? 0;
      const amount = Number((lineBet * base * volatility).toFixed(2));
      payoutUSD += amount;
      winningLines.push({
        lineIndex,
        symbol: baseSymbol,
        count,
        amount,
        positions: line.slice(0, count).map((row, col) => ({ row, col }))
      });
    }
  });

  return { winningLines, payoutUSD: Number(payoutUSD.toFixed(2)) };
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
  const perLineBet = Number(lineBet);
  const bet = perLineBet * LINES;

  if (lineBet <= 0 || lineBet > MAX_BET_PER_LINE) throw new Error(`lineBet must be between 0.01 and ${MAX_BET_PER_LINE}`);
  if (player.balanceUSD < bet) throw new Error('Insufficient balance');

  player.balanceUSD -= bet;
  player.totalWageredUSD += bet;

  const grid = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => weightedRandom()));
  const { winningLines, payoutUSD } = evaluateLines(grid, perLineBet, slot.volatility);
  const multiplier = Math.min(MAX_MULTIPLIER, Number(((payoutUSD || 0) / bet).toFixed(2)));

  slot.jackpotPool = Math.min(MAX_PROGRESSIVE, slot.jackpotPool + (bet * 0.015));
  let progressiveWin = 0;
  if (Math.random() > 0.99995) {
    progressiveWin = slot.jackpotPool;
    slot.jackpotPool = 2500;
  }

  const totalWin = Number((payoutUSD + progressiveWin).toFixed(2));
  player.balanceUSD += totalWin;

  const spinResult = {
    grid,
    winningLines,
    lineBet: perLineBet,
    totalBet: bet,
    multiplier,
    payoutUSD,
    progressiveWin,
    totalWin,
    slotId,
    jackpotPool: slot.jackpotPool,
    ts: Date.now()
  };
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
