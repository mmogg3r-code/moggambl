'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const slotIcons = {
  '7': '7️⃣', BAR: '🟥', '🍒': '🍒', '💎': '💎', '👑': '👑',
  '⚡': '⚡', '🐉': '🐉', '🌙': '🌙', '🔔': '🔔', '⭐': '⭐'
};

const initialGrid = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => '⭐'));
const cellW = 100;
const cellH = 112;
const gap = 8;

function formatCounter(base, idx) {
  const value = Math.floor((base * 173 + (idx + 1) * 918273) % 999999999);
  return value.toLocaleString('en-US');
}


const fallbackSlots = Array.from({ length: 20 }).map((_, i) => ({
  id: `slot-${i + 1}`,
  name: `Slot ${i + 1}`,
  volatility: 2,
  jackpotPool: 5000 + (i * 1000)
}));

const fallbackConfig = {
  depositAddress: '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89',
  lines: 50,
  maxBetPerLine: 5,
  maxMultiplier: 20000,
  slots: fallbackSlots
};

export default function Page() {
  const [config, setConfig] = useState(null);
  const [player, setPlayer] = useState(null);
  const [slotId, setSlotId] = useState('slot-1');
  const [lineBet, setLineBet] = useState(1);
  const [grid, setGrid] = useState(initialGrid);
  const [message, setMessage] = useState('Welcome to MogGambl NEXT GEN');
  const [isSpinning, setSpinning] = useState(false);
  const [win, setWin] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [depositEth, setDepositEth] = useState('0.01');
  const [clientSeed, setClientSeed] = useState('player-seed-1');
  const [turboSpin, setTurboSpin] = useState(false);
  const [autoSpinOn, setAutoSpinOn] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(10);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0);
  const [initError, setInitError] = useState('');

  const selectedSlot = useMemo(() => (config?.slots || []).find((s) => s.id === slotId), [config, slotId]);

  const safeFetchJson = async (url, options) => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`${url} failed (${res.status})`);
    return res.json();
  };

  const initGame = async () => {
    try {
      setInitError('');
      const conf = await safeFetchJson('/api/config');
      setConfig(conf);
      const saved = localStorage.getItem('moggambl-player-id');
      const playerResp = await safeFetchJson('/api/player', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId: saved || undefined })
      });
      localStorage.setItem('moggambl-player-id', playerResp.id);
      if (playerResp.walletAddress) setWalletAddress(playerResp.walletAddress);
      setPlayer(playerResp);
    } catch (error) {
      setInitError(error.message || 'Failed to initialize game');
      setMessage('API failed to load. Running in offline fallback mode.');
      setConfig(fallbackConfig);
      setPlayer((prev) => prev || {
        id: 'offline-player', walletAddress: null, balanceUSD: 0, totalWageredUSD: 0, totalDepositedUSD: 0, txHistory: [], lastSpin: null
      });
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (!autoSpinOn || isSpinning || autoSpinsLeft <= 0) return;
    const timer = setTimeout(async () => {
      const ok = await spinOnce();
      setAutoSpinsLeft((left) => {
        const next = left - 1;
        if (next <= 0 || !ok) {
          setAutoSpinOn(false);
          return 0;
        }
        return next;
      });
    }, turboSpin ? 80 : 350);
    return () => clearTimeout(timer);
  }, [autoSpinOn, autoSpinsLeft, isSpinning, turboSpin]);

  const pingSound = (hz = 440, duration = 0.1) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const c = new Ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.frequency.value = hz;
    o.type = 'triangle';
    g.gain.value = 0.03;
    o.start();
    o.stop(c.currentTime + duration);
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) return setMessage('MetaMask not detected.');
    try {
      const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(address);
      const updated = await fetch('/api/player', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, walletAddress: address })
      }).then((r) => r.json());
      setPlayer(updated);
      setMessage(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch {
      setMessage('MetaMask connection rejected.');
    }
  };

  const depositWithMetaMask = async () => {
    if (!window.ethereum || !walletAddress) return setMessage('Connect wallet first.');
    try {
      const weiHex = `0x${BigInt(Math.floor(Number(depositEth) * 1e18)).toString(16)}`;
      const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: config.depositAddress, value: weiHex }] });
      const updated = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, txHash, amountEth: Number(depositEth), walletAddress })
      }).then((r) => r.json());
      if (updated.error) return setMessage(updated.error);
      setPlayer(updated);
      setMessage(`Deposit confirmed: ${depositEth} ETH`);
      pingSound(540, 0.2);
    } catch {
      setMessage('Deposit failed or was rejected.');
    }
  };

  const spinOnce = async () => {
    if (!player) return false;
    setSpinning(true);
    setWin(null);

    const loopCount = turboSpin ? 4 : 10;
    const loopDelay = turboSpin ? 20 : 75;

    for (let i = 0; i < loopCount; i += 1) {
      setGrid(Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => Object.keys(slotIcons)[Math.floor(Math.random() * 10)])));
      pingSound(320 + (i * 30), turboSpin ? 0.03 : 0.05);
      await new Promise((r) => setTimeout(r, loopDelay));
    }

    const resp = await fetch('/api/spin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, slotId, lineBet: Number(lineBet), clientSeed })
    }).then((r) => r.json());

    if (resp.error) {
      setMessage(resp.error);
      setSpinning(false);
      return false;
    }

    setGrid(resp.spin.grid);
    setPlayer(resp.player);
    setConfig((old) => ({ ...old, slots: old.slots.map((s) => (s.id === slotId ? { ...s, jackpotPool: resp.spin.jackpotPool } : s)) }));
    setWin(resp.spin);
    setMessage(resp.spin.totalWin > 0 ? `WIN $${resp.spin.totalWin.toFixed(2)} (${resp.spin.winningLines.length} line hits)` : 'No win this spin');
    if (resp.spin.totalWin > 0) pingSound(880, 0.3);
    setSpinning(false);
    return true;
  };

  const spin = async () => {
    await spinOnce();
  };

  const startAutoSpin = () => {
    const count = Number(autoSpinCount);
    if (!Number.isFinite(count) || count <= 0) {
      setMessage('Auto spin count must be greater than 0');
      return;
    }
    setAutoSpinsLeft(count);
    setAutoSpinOn(true);
    setMessage(`Auto spin started (${count} spins)`);
  };

  const stopAutoSpin = () => {
    setAutoSpinOn(false);
    setAutoSpinsLeft(0);
    setMessage('Auto spin stopped');
  };

  const withdraw = async () => {
    const resp = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, amountUSD: Math.min(100, player.balanceUSD), walletAddress: walletAddress || '0xYourWallet' })
    }).then((r) => r.json());

    setMessage(resp.error || resp.message);
    if (resp.player) setPlayer(resp.player);
  };

  if (!config || !player) return <main className="loading">Loading upgraded casino... {initError ? `(${initError})` : ''}</main>;

  return (
    <main className="app">
      <div className="coins coins-left">💰 💰 💰</div>
      <div className="coins coins-right">💰 💰 💰</div>
      <div className="coin-rain">{Array.from({ length: 10 }).map((_, i) => <span key={i} style={{ '--d': `${(i % 5) * 0.5}s`, '--x': `${(i * 19) % 100}%` }}>🪙</span>)}</div>

      <Image src="/assets/mogambl-logo.svg" alt="Mogambl logo" width={760} height={180} priority className="logo" />

      {initError && <p className="message">Startup warning: {initError}</p>}

      <section className="stats">
        <div><strong>Balance:</strong> ${player.balanceUSD.toFixed(2)}</div>
        <div><strong>Wagered:</strong> ${player.totalWageredUSD.toFixed(2)}</div>
        <div><strong>Requirement:</strong> ${(player.totalDepositedUSD * 20).toFixed(2)}</div>
      </section>

      <section className="controls">
        <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          {(config.slots || []).map((slot) => <option key={slot.id} value={slot.id}>{slot.name}</option>)}
        </select>
        <input type="number" min="0.01" max={config.maxBetPerLine} step="0.1" value={lineBet} onChange={(e) => setLineBet(e.target.value)} />
        <button onClick={connectMetaMask}>{walletAddress ? 'MetaMask Connected' : 'Connect MetaMask'}</button>
        <input type="number" min="0.001" step="0.001" value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
        <button onClick={depositWithMetaMask}>Deposit ETH</button>
        <input type="text" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} placeholder="Client seed" />
        <button className="spin" onClick={spin} disabled={isSpinning || autoSpinOn}>{isSpinning ? 'SPINNING...' : 'SPIN 50 LINES'}</button>
        <button className={`turbo ${turboSpin ? 'active' : ''}`} onClick={() => setTurboSpin((v) => !v)}>{turboSpin ? 'TURBO ON' : 'TURBO OFF'}</button>
        <input type="number" min="1" max="1000" value={autoSpinCount} onChange={(e) => setAutoSpinCount(e.target.value)} placeholder="Auto spins" />
        <button onClick={startAutoSpin} disabled={autoSpinOn || isSpinning}>START AUTO</button>
        <button onClick={stopAutoSpin} disabled={!autoSpinOn}>STOP AUTO</button>
        <button onClick={withdraw}>Request Withdrawal</button>
      </section>

      {autoSpinOn && <p className="message">Auto spinning... {autoSpinsLeft} left</p>}

      <section className="machine">
        <div className="jackpot-strip">
          {grid[0].map((cell, idx) => <span key={`strip-${idx}`}>{slotIcons[cell]} {formatCounter(selectedSlot?.jackpotPool ?? 0, idx)}</span>)}
        </div>
        <div className="reels-wrap">
          <div className="reels">
            {grid.map((row, ri) => row.map((cell, ci) => <div key={`${ri}-${ci}`} className={`symbol ${isSpinning ? 'blur' : ''}`}>{slotIcons[cell]}</div>))}
          </div>
          {!!win?.winningLines?.length && (
            <svg className="line-overlay" width={532} height={352} viewBox="0 0 532 352">
              {win.winningLines.slice(0, 8).map((line, i) => {
                const pts = line.positions.map((p) => `${p.col * (cellW + gap) + (cellW / 2)},${p.row * (cellH + gap) + (cellH / 2)}`).join(' ');
                return <polyline key={line.lineIndex} points={pts} className="payline" style={{ animationDelay: `${i * 0.08}s` }} />;
              })}
            </svg>
          )}
        </div>
      </section>

      <aside className="cabinet-info">
        <p><b>Slot:</b> {selectedSlot?.name}</p>
        <p><b>Volatility:</b> {selectedSlot?.volatility}x</p>
        <p><b>Progressive:</b> ${(selectedSlot?.jackpotPool ?? 0).toFixed(2)}</p>
        <p><b>Top Multiplier:</b> {config.maxMultiplier}x</p>
        <p><b>Deposit Address:</b> <code>{config.depositAddress}</code></p>
      </aside>

      {win?.totalWin > 0 && (
        <div className="win-popup">
          <h3>🎉 Big Win!</h3>
          <p className="celebrate">🎊 You won <b>${win.totalWin.toFixed(2)}</b>!</p>
          <p>Total Bet: <b>${win.totalBet.toFixed(2)}</b> | Base Win: <b>${win.payoutUSD.toFixed(2)}</b></p>
          <ul>
            {win.winningLines.slice(0, 6).map((line) => (
              <li key={`line-${line.lineIndex}`}>Line {line.lineIndex + 1}: {line.symbol} x{line.count} = ${line.amount.toFixed(2)}</li>
            ))}
          </ul>
          {win.progressiveWin > 0 && <p>Progressive Hit: ${win.progressiveWin.toFixed(2)}</p>}
          <p><small>Fairness · seed hash: {win.fairness?.serverSeedHash?.slice(0, 18) || 'n/a'}... · nonce: {win.fairness?.nonce ?? 'n/a'}</small></p>
        </div>
      )}

      {win && (
        <section className="last-spin-summary">
          <div>Last Total Bet: <b>${win.totalBet.toFixed(2)}</b></div>
          <div>Last Win: <b>${win.totalWin.toFixed(2)}</b></div>
        </section>
      )}

      <p className="message">{message}</p>
      <section className="slot-grid-list">
        {(config.slots || []).map((s) => (
          <article key={s.id} className={`slot-card ${s.id === slotId ? 'active' : ''}`} onClick={() => setSlotId(s.id)}>
            <h4>{s.name}</h4>
            <span>${s.jackpotPool.toFixed(0)}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
