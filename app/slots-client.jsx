'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const fallbackConfig = {
  game: 'roulette',
  depositAddress: '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89',
  minBetUSD: 1,
  maxBetUSD: 500,
  maxPayoutMultiplier: 35,
  tables: [{ id: 'table-1', name: 'Neon Royale', rounds: 0 }]
};

const fallbackPlayer = {
  id: 'offline-player',
  walletAddress: null,
  balanceUSD: 0,
  totalWageredUSD: 0,
  totalDepositedUSD: 0,
  txHistory: [],
  lastSpin: null
};

const defaultBets = {
  number: '7',
  color: 'red',
  evenOdd: 'even',
  highLow: 'low',
  dozen: '1',
  column: '1'
};

const wheelNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

export default function RouletteClient() {
  const [config, setConfig] = useState(fallbackConfig);
  const [player, setPlayer] = useState(fallbackPlayer);
  const [message, setMessage] = useState('Welcome to MogGambl Roulette');
  const [walletAddress, setWalletAddress] = useState('');
  const [depositEth, setDepositEth] = useState('0.01');
  const [clientSeed, setClientSeed] = useState('player-seed-1');
  const [tableId, setTableId] = useState('table-1');
  const [betType, setBetType] = useState('number');
  const [betValue, setBetValue] = useState(defaultBets.number);
  const [stake, setStake] = useState(5);
  const [turboSpin, setTurboSpin] = useState(false);
  const [autoSpinOn, setAutoSpinOn] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(10);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0);
  const [isSpinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [wheelIndex, setWheelIndex] = useState(0);
  const [recentNumbers, setRecentNumbers] = useState([]);
  const [initError, setInitError] = useState('');

  const selectedTable = useMemo(() => (config.tables || []).find((table) => table.id === tableId), [config.tables, tableId]);

  const safeFetchJson = async (url, options, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...(options || {}), signal: controller.signal });
      if (!res.ok) throw new Error(`${url} failed (${res.status})`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const conf = await safeFetchJson('/api/config');
        setConfig(conf);
        setTableId(conf.tables?.[0]?.id || 'table-1');

        const saved = localStorage.getItem('moggambl-player-id');
        const playerResp = await safeFetchJson('/api/player', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ playerId: saved || undefined })
        });
        localStorage.setItem('moggambl-player-id', playerResp.id);
        setPlayer(playerResp);
        if (playerResp.walletAddress) setWalletAddress(playerResp.walletAddress);
      } catch (error) {
        setInitError(error.message || 'Failed to initialize game');
        setMessage('API failed to load. Running in offline fallback mode.');
      }
    };

    init();
  }, []);

  useEffect(() => {
    setBetValue(defaultBets[betType]);
  }, [betType]);

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
    }, turboSpin ? 120 : 450);

    return () => clearTimeout(timer);
  }, [autoSpinOn, autoSpinsLeft, isSpinning, turboSpin]);

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
    } catch {
      setMessage('Deposit failed or was rejected.');
    }
  };

  const spinOnce = async () => {
    if (!player?.id) return false;
    try {
      setSpinning(true);
      setSpinResult(null);

      const loops = turboSpin ? 14 : 25;
      const delay = turboSpin ? 12 : 32;
      for (let i = 0; i < loops; i += 1) {
        setWheelIndex((idx) => (idx + 1) % wheelNumbers.length);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const resp = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          tableId,
          stake: Number(stake),
          betType,
          betValue,
          clientSeed
        })
      }).then((r) => r.json());

      if (resp.error) {
        setMessage(resp.error);
        return false;
      }

      const number = resp.spin.outcomeNumber;
      const idx = wheelNumbers.indexOf(number);
      if (idx >= 0) setWheelIndex(idx);

      setSpinResult(resp.spin);
      setPlayer(resp.player);
      setRecentNumbers((prev) => [number, ...prev].slice(0, 12));

      if (resp.spin.isWin) {
        setMessage(`WIN! +$${resp.spin.netWinUSD.toFixed(2)} on ${resp.spin.betType}`);
      } else {
        setMessage(`No hit. Ball landed on ${number} ${resp.spin.outcomeColor.toUpperCase()}`);
      }
      return true;
    } catch (error) {
      setMessage(error?.message || 'Spin failed. Please try again.');
      return false;
    } finally {
      setSpinning(false);
    }
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
    try {
      const resp = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, amountUSD: Math.min(100, player.balanceUSD), walletAddress: walletAddress || '0xYourWallet' })
      }).then((r) => r.json());

      setMessage(resp.error || resp.message);
      if (resp.player) setPlayer(resp.player);
    } catch (error) {
      setMessage(error?.message || 'Withdraw request failed');
    }
  };

  const renderBetValueInput = () => {
    if (betType === 'number') {
      return (
        <input
          type="number"
          min="0"
          max="36"
          value={betValue}
          onChange={(e) => setBetValue(e.target.value)}
        />
      );
    }

    const options = {
      color: ['red', 'black'],
      evenOdd: ['even', 'odd'],
      highLow: ['low', 'high'],
      dozen: ['1', '2', '3'],
      column: ['1', '2', '3']
    }[betType];

    return (
      <select value={betValue} onChange={(e) => setBetValue(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  };

  return (
    <main className="app">
      <div className="coin-rain">{Array.from({ length: 12 }).map((_, i) => <span key={i} style={{ '--d': `${(i % 6) * 0.45}s`, '--x': `${(i * 11) % 100}%` }}>🪙</span>)}</div>
      <Image src="/assets/mogambl-logo.svg" alt="Mogambl logo" width={760} height={180} priority className="logo" />
      <h1>Roulette Royale</h1>
      {initError && <p className="message">Startup warning: {initError}</p>}

      <section className="stats">
        <div><strong>Balance:</strong> ${player.balanceUSD.toFixed(2)}</div>
        <div><strong>Wagered:</strong> ${player.totalWageredUSD.toFixed(2)}</div>
        <div><strong>Table:</strong> {selectedTable?.name || 'N/A'}</div>
        <div><strong>Recent:</strong> {recentNumbers.join(', ') || '-'}</div>
      </section>

      <section className="controls">
        <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
          {(config.tables || []).map((table) => <option value={table.id} key={table.id}>{table.name}</option>)}
        </select>

        <select value={betType} onChange={(e) => setBetType(e.target.value)}>
          <option value="number">Straight Number (35:1)</option>
          <option value="color">Color (1:1)</option>
          <option value="evenOdd">Even/Odd (1:1)</option>
          <option value="highLow">High/Low (1:1)</option>
          <option value="dozen">Dozen (2:1)</option>
          <option value="column">Column (2:1)</option>
        </select>

        {renderBetValueInput()}

        <input
          type="number"
          min={config.minBetUSD}
          max={config.maxBetUSD}
          step="1"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="Stake (USD)"
        />

        <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} placeholder="Client seed" />

        <button className="spin" disabled={isSpinning} onClick={spinOnce}>{isSpinning ? 'Spinning…' : 'Spin'}</button>
        <button className={turboSpin ? 'turbo active' : 'turbo'} onClick={() => setTurboSpin((v) => !v)}>Turbo {turboSpin ? 'ON' : 'OFF'}</button>

        <input type="number" min="1" value={autoSpinCount} onChange={(e) => setAutoSpinCount(e.target.value)} placeholder="Auto count" />
        <button onClick={startAutoSpin} disabled={isSpinning || autoSpinOn}>Auto Spin</button>
        <button onClick={stopAutoSpin} disabled={!autoSpinOn}>Stop Auto</button>

        <button onClick={connectMetaMask}>Connect Wallet</button>
        <input value={depositEth} onChange={(e) => setDepositEth(e.target.value)} placeholder="Deposit ETH" />
        <button onClick={depositWithMetaMask}>Deposit</button>
        <button onClick={withdraw}>Withdraw</button>
      </section>

      <section className="roulette-stage">
        <div className="wheel-track" style={{ transform: `translateX(-${wheelIndex * 52}px)` }}>
          {[...wheelNumbers, ...wheelNumbers].map((num, idx) => {
            const color = num === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num) ? 'red' : 'black';
            return <span key={`${num}-${idx}`} className={`wheel-cell ${color}`}>{num}</span>;
          })}
        </div>
        <div className="wheel-pointer">▼</div>
      </section>

      {spinResult && (
        <section className="win-popup">
          <h2>{spinResult.isWin ? '🎉 You Win!' : 'Better luck next spin'}</h2>
          <p><strong>Ball:</strong> {spinResult.outcomeNumber} ({spinResult.outcomeColor})</p>
          <p><strong>Total Bet:</strong> ${spinResult.totalBet.toFixed(2)}</p>
          <p><strong>Payout:</strong> ${spinResult.totalPayoutUSD.toFixed(2)}</p>
          <p><strong>Net:</strong> ${spinResult.netWinUSD.toFixed(2)}</p>
          <p><strong>Fairness Hash:</strong> <code>{spinResult.fairness.serverSeedHash}</code></p>
        </section>
      )}

      <p className="message">{message}{autoSpinOn ? ` · Auto left: ${autoSpinsLeft}` : ''}</p>
    </main>
  );
}
