import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, getPlayer, deposit, spin, withdraw } from '../lib/engine.js';

test('deposit and roulette spin update balances + return fairness metadata', () => {
  const store = createStore();
  const player = getPlayer(store, 'p1');

  deposit(store, { playerId: player.id, txHash: '0xabc', amountEth: 1, walletAddress: '0xwallet', ethUsd: 1000 });
  assert.equal(player.balanceUSD, 1000);

  const result = spin(store, {
    playerId: player.id,
    tableId: 'table-1',
    stake: 10,
    betType: 'color',
    betValue: 'red',
    clientSeed: 'seed-a'
  });

  assert.equal(result.spin.game, 'roulette');
  assert.ok(result.player.totalWageredUSD >= 10);
  assert.ok(result.spin.outcomeNumber >= 0 && result.spin.outcomeNumber <= 36);
  assert.equal(result.spin.fairness.clientSeed, 'seed-a');
  assert.ok(result.spin.fairness.serverSeedHash.length > 10);
});

test('withdraw requires 20x wagering', () => {
  const store = createStore();
  const player = getPlayer(store, 'p2');

  deposit(store, { playerId: player.id, txHash: '0xdef', amountEth: 1, walletAddress: '0xwallet', ethUsd: 100 });
  assert.throws(() => withdraw(store, { playerId: player.id, amountUSD: 1, walletAddress: '0xwallet' }));
});
