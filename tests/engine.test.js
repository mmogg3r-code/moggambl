import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, getPlayer, deposit, spin, withdraw } from '../lib/engine.js';

test('deposit and spin update balances', () => {
  const store = createStore();
  const player = getPlayer(store, 'p1');
  deposit(store, { playerId: player.id, txHash: '0xabc', amountEth: 1, walletAddress: '0xwallet', ethUsd: 1000 });
  assert.equal(player.balanceUSD, 1000);
  const result = spin(store, { playerId: player.id, slotId: 'slot-1', lineBet: 1 });
  assert.ok(result.player.totalWageredUSD >= 50);
});

test('withdraw requires 20x wagering', () => {
  const store = createStore();
  const player = getPlayer(store, 'p2');
  deposit(store, { playerId: player.id, txHash: '0xdef', amountEth: 1, walletAddress: '0xwallet', ethUsd: 100 });
  assert.throws(() => withdraw(store, { playerId: player.id, amountUSD: 1, walletAddress: '0xwallet' }));
});
