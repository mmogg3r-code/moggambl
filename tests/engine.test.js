import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, getPlayer, deposit, spin, withdraw } from '../lib/engine.js';

test('deposit and spin update balances + return line wins structure', () => {
  const store = createStore();
  const player = getPlayer(store, 'p1');
  deposit(store, { playerId: player.id, txHash: '0xabc', amountEth: 1, walletAddress: '0xwallet', ethUsd: 1000 });
  assert.equal(player.balanceUSD, 1000);
  const result = spin(store, { playerId: player.id, slotId: 'slot-1', lineBet: 1, clientSeed: 'seed-a' });
  assert.ok(result.player.totalWageredUSD >= 50);
  assert.ok(Array.isArray(result.spin.winningLines));
  assert.equal(result.spin.fairness.clientSeed, 'seed-a');
  assert.ok(result.spin.fairness.serverSeedHash.length > 10);
});

test('withdraw requires 20x wagering', () => {
  const store = createStore();
  const player = getPlayer(store, 'p2');
  deposit(store, { playerId: player.id, txHash: '0xdef', amountEth: 1, walletAddress: '0xwallet', ethUsd: 100 });
  assert.throws(() => withdraw(store, { playerId: player.id, amountUSD: 1, walletAddress: '0xwallet' }));
});
