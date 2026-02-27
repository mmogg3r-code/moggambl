import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(cors());
app.use(express.json());

const ETH_DEPOSIT_ADDRESS = '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89';
const LINES = 50;
const MAX_BET_PER_LINE = 5;
const MAX_MULTIPLIER = 20000;
const MAX_PROGRESSIVE = 1_000_000;

const players = new Map();
const usedTxHashes = new Set();

const iconWeights = new Map([
  ['7', 0.01],
  ['BAR', 0.03],
  ['💎', 0.05],
  ['👑', 0.08],
  ['⚡', 0.1],
  ['🐉', 0.12],
  ['🌙', 0.14],
  ['🔔', 0.16],
  ['⭐', 0.14],
  ['🍒', 0.17]
]);

const slotCatalog = Array.from({ length: 20 }).map((_, i) => ({
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

function weightedRandom() {
  const r = Math.random();
  let sum = 0;
  for (const [key, weight] of iconWeights.entries()) {
    sum += weight;
    if (r <= sum) return key;
  }
  return '🍒';
}

function getPlayer(playerId) {
  if (!players.has(playerId)) {
    players.set(playerId, {
      id: playerId,
      walletAddress: null,
      balanceUSD: 0,
      totalWageredUSD: 0,
      totalDepositedUSD: 0,
      txHistory: [],
      lastSpin: null
    });
  }
  return players.get(playerId);
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

app.get('/api/config', (_req, res) => {
  res.json({
    depositAddress: ETH_DEPOSIT_ADDRESS,
    lines: LINES,
    maxBetPerLine: MAX_BET_PER_LINE,
    maxMultiplier: MAX_MULTIPLIER,
    maxProgressive: MAX_PROGRESSIVE,
    slots: slotCatalog
  });
});

app.post('/api/player', (req, res) => {
  const playerId = req.body?.playerId ?? randomUUID();
  const player = getPlayer(playerId);
  if (req.body?.walletAddress) player.walletAddress = req.body.walletAddress;
  res.json(player);
});

app.post('/api/deposit', (req, res) => {
  const {
    playerId, txHash, amountEth, walletAddress, ethUsd = 3200
  } = req.body ?? {};

  if (!playerId || !txHash || !amountEth || !walletAddress) {
    return res.status(400).json({ error: 'playerId, txHash, amountEth, walletAddress are required' });
  }

  if (usedTxHashes.has(txHash)) {
    return res.status(400).json({ error: 'Transaction already credited' });
  }

  const player = getPlayer(playerId);
  const usd = Number(amountEth) * Number(ethUsd);
  player.walletAddress = walletAddress;
  player.balanceUSD += usd;
  player.totalDepositedUSD += usd;
  player.txHistory.push({ type: 'deposit', txHash, amountEth, usd, walletAddress, ts: Date.now() });
  usedTxHashes.add(txHash);
  return res.json(player);
});

app.post('/api/spin', (req, res) => {
  const { playerId, slotId, lineBet } = req.body ?? {};
  const player = getPlayer(playerId);
  const slot = slotCatalog.find((s) => s.id === slotId) ?? slotCatalog[0];
  const bet = Number(lineBet) * LINES;

  if (lineBet <= 0 || lineBet > MAX_BET_PER_LINE) return res.status(400).json({ error: `lineBet must be between 0.01 and ${MAX_BET_PER_LINE}` });
  if (player.balanceUSD < bet) return res.status(400).json({ error: 'Insufficient balance' });

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

  const spin = {
    grid,
    lineBet: Number(lineBet),
    totalBet: bet,
    multiplier,
    payoutUSD,
    progressiveWin,
    totalWin,
    slotId,
    jackpotPool: slot.jackpotPool,
    ts: Date.now()
  };

  player.lastSpin = spin;
  player.txHistory.push({ type: 'spin', ...spin });

  res.json({ player, spin, slot });
});

app.post('/api/withdraw', (req, res) => {
  const { playerId, amountUSD, walletAddress } = req.body ?? {};
  const player = getPlayer(playerId);
  if (!walletAddress || !amountUSD) return res.status(400).json({ error: 'walletAddress and amountUSD are required' });
  if (Number(amountUSD) > player.balanceUSD) return res.status(400).json({ error: 'Insufficient funds' });
  if (player.totalWageredUSD < player.totalDepositedUSD * 20) return res.status(400).json({ error: 'Withdrawal locked until 20x wagering requirement is met' });

  player.balanceUSD -= Number(amountUSD);
  player.txHistory.push({ type: 'withdraw-request', amountUSD, walletAddress, ts: Date.now() });
  res.json({ ok: true, message: 'Withdrawal request submitted for manual settlement.', player });
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const staticDir = resolve(repoRoot, 'frontend', 'dist');
if (existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')));
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Slots backend listening on ${port}`));
