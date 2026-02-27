import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const ETH_DEPOSIT_ADDRESS = '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89';
export const MIN_BET_USD = 1;
export const MAX_BET_USD = 500;
export const MAX_PAYOUT_MULTIPLIER = 35;

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const blackNumbers = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

export const rouletteTables = Array.from({ length: 5 }).map((_, i) => ({
  id: `table-${i + 1}`,
  name: ['Neon Royale', 'Midnight VIP', 'Dragon Gold', 'Scarlet Club', 'High Roller'][i],
  minBetUSD: MIN_BET_USD,
  maxBetUSD: MAX_BET_USD,
  houseEdgePercent: 2.7,
  rounds: 0
}));

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function generateSeed() {
  return randomBytes(32).toString('hex');
}

function createRng({ serverSeed, clientSeed, nonce }) {
  let cursor = 0;
  return () => {
    const digest = hash(`${serverSeed}:${clientSeed}:${nonce}:${cursor}`);
    cursor += 1;
    const int = Number.parseInt(digest.slice(0, 13), 16);
    return int / 0x1fffffffffffff;
  };
}

function getColor(number) {
  if (number === 0) return 'green';
  if (redNumbers.has(number)) return 'red';
  if (blackNumbers.has(number)) return 'black';
  return 'green';
}

function getColumn(number) {
  if (number === 0) return null;
  const mod = number % 3;
  return mod === 1 ? 1 : mod === 2 ? 2 : 3;
}

function getDozen(number) {
  if (number === 0) return null;
  if (number <= 12) return 1;
  if (number <= 24) return 2;
  return 3;
}

function resolveMultiplier(outcomeNumber, betType, betValue) {
  const color = getColor(outcomeNumber);

  if (betType === 'number') {
    return Number(betValue) === outcomeNumber ? 35 : 0;
  }

  if (outcomeNumber === 0) return 0;

  switch (betType) {
    case 'color':
      return String(betValue).toLowerCase() === color ? 1 : 0;
    case 'evenOdd':
      if (betValue === 'even') return outcomeNumber % 2 === 0 ? 1 : 0;
      if (betValue === 'odd') return outcomeNumber % 2 === 1 ? 1 : 0;
      return 0;
    case 'highLow':
      if (betValue === 'low') return outcomeNumber >= 1 && outcomeNumber <= 18 ? 1 : 0;
      if (betValue === 'high') return outcomeNumber >= 19 && outcomeNumber <= 36 ? 1 : 0;
      return 0;
    case 'dozen':
      return Number(betValue) === getDozen(outcomeNumber) ? 2 : 0;
    case 'column':
      return Number(betValue) === getColumn(outcomeNumber) ? 2 : 0;
    default:
      return 0;
  }
}

export function createStore() {
  return {
    players: new Map(),
    usedTxHashes: new Set(),
    tables: structuredClone(rouletteTables),
    fairness: {
      currentServerSeed: generateSeed(),
      nextServerSeed: generateSeed()
    }
  };
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

export function spin(store, { playerId, tableId = 'table-1', stake, betType, betValue, clientSeed = 'mogambl-default' }) {
  const player = getPlayer(store, playerId);
  const table = store.tables.find((entry) => entry.id === tableId) ?? store.tables[0];
  const totalBet = Number(stake);

  if (!Number.isFinite(totalBet) || totalBet < MIN_BET_USD || totalBet > MAX_BET_USD) {
    throw new Error(`stake must be between ${MIN_BET_USD} and ${MAX_BET_USD}`);
  }
  if (!betType) throw new Error('betType is required');
  if (player.balanceUSD < totalBet) throw new Error('Insufficient balance');

  player.balanceUSD -= totalBet;
  player.totalWageredUSD += totalBet;

  const nonce = player.txHistory.filter((entry) => entry.type === 'spin').length;
  const serverSeed = store.fairness.currentServerSeed;
  const rng = createRng({ serverSeed, clientSeed, nonce });

  const outcomeNumber = Math.floor(rng() * 37);
  const outcomeColor = getColor(outcomeNumber);
  const multiplier = resolveMultiplier(outcomeNumber, betType, betValue);
  const profitUSD = Number((totalBet * multiplier).toFixed(2));
  const totalPayoutUSD = Number((multiplier > 0 ? totalBet + profitUSD : 0).toFixed(2));
  const netWinUSD = Number((totalPayoutUSD - totalBet).toFixed(2));
  const isWin = multiplier > 0;

  if (isWin) {
    player.balanceUSD += totalPayoutUSD;
  }

  const fairness = {
    clientSeed,
    nonce,
    serverSeed,
    serverSeedHash: hash(serverSeed),
    nextServerSeedHash: hash(store.fairness.nextServerSeed)
  };

  store.fairness.currentServerSeed = store.fairness.nextServerSeed;
  store.fairness.nextServerSeed = generateSeed();

  table.rounds += 1;

  const spinResult = {
    game: 'roulette',
    tableId: table.id,
    totalBet,
    betType,
    betValue,
    outcomeNumber,
    outcomeColor,
    multiplier,
    isWin,
    profitUSD,
    totalPayoutUSD,
    netWinUSD,
    fairness,
    ts: Date.now()
  };

  player.lastSpin = spinResult;
  player.txHistory.push({ type: 'spin', ...spinResult });

  return { player, spin: spinResult, table };
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
