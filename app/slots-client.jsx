'use client';

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
const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const quickStakes = [1, 5, 10, 25, 50, 100];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskWallet(walletAddress) {
  if (!walletAddress) return 'Not connected';
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export default function RouletteClient() {
  const [config, setConfig] = useState(fallbackConfig);
  const [player, setPlayer] = useState(fallbackPlayer);
  const [message, setMessage] = useState('Welcome to MogGambl Roulette · pick a bet and spin');
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
    }, turboSpin ? 120 : 500);

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

      const loops = turboSpin ? 18 : 32;
      const delay = turboSpin ? 14 : 30;
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
        setMessage(`🎉 Win +$${formatCurrency(resp.spin.netWinUSD)} | Payout $${formatCurrency(resp.spin.totalPayoutUSD)}`);
      } else {
        setMessage(`No hit · landed on ${number} ${resp.spin.outcomeColor.toUpperCase()}`);
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
          aria-label="Bet number"
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
      <select value={betValue} onChange={(e) => setBetValue(e.target.value)} aria-label="Bet option">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  };

  return (
    <main className="app">
      <div className="ambient-gradient" />
      <div className="coin-rain">{Array.from({ length: 20 }).map((_, i) => <span key={i} style={{ '--d': `${(i % 8) * 0.42}s`, '--x': `${(i * 7.5) % 100}%`, '--s': `${0.8 + ((i % 4) * 0.2)}` }}>🪙</span>)}</div>

      <header className="hero glass-card">
        <img src="/assets/mogambl-logo.svg" alt="Mogambl logo" className="logo" />
        <p className="hero-subtitle">Immersive roulette with provably fair spins, turbo mode and auto spin.</p>
      </header>

      {initError && <p className="message warning">Startup warning: {initError}</p>}

      <section className="stats">
        <div className="glass-card metric"><span>Balance</span><strong>${formatCurrency(player.balanceUSD)}</strong></div>
        <div className="glass-card metric"><span>Total Wagered</span><strong>${formatCurrency(player.totalWageredUSD)}</strong></div>
        <div className="glass-card metric"><span>Active Table</span><strong>{selectedTable?.name || 'N/A'}</strong></div>
        <div className="glass-card metric"><span>Wallet</span><strong>{maskWallet(walletAddress || player.walletAddress)}</strong></div>
      </section>

      <section className="game-layout">
        <div className="left-panel glass-card">
          <h2>Place your bet</h2>
          <div className="controls-grid">
            <label>Table
              <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                {(config.tables || []).map((table) => <option value={table.id} key={table.id}>{table.name}</option>)}
              </select>
            </label>

            <label>Bet Type
              <select value={betType} onChange={(e) => setBetType(e.target.value)}>
                <option value="number">Straight Number (35:1)</option>
                <option value="color">Color (1:1)</option>
                <option value="evenOdd">Even/Odd (1:1)</option>
                <option value="highLow">High/Low (1:1)</option>
                <option value="dozen">Dozen (2:1)</option>
                <option value="column">Column (2:1)</option>
              </select>
            </label>

            <label>Bet Value
              {renderBetValueInput()}
            </label>

            <label>Stake (USD)
              <input
                type="number"
                min={config.minBetUSD}
                max={config.maxBetUSD}
                step="1"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </label>

            <label>Client Seed
              <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
            </label>

            <div className="quick-stakes">
              {quickStakes.map((amount) => (
                <button key={amount} type="button" className={Number(stake) === amount ? 'chip active' : 'chip'} onClick={() => setStake(amount)}>
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          <div className="action-row">
            <button className="spin primary" disabled={isSpinning} onClick={spinOnce}>{isSpinning ? 'Spinning…' : 'Spin'}</button>
            <button className={turboSpin ? 'turbo active' : 'turbo'} onClick={() => setTurboSpin((v) => !v)}>Turbo {turboSpin ? 'ON' : 'OFF'}</button>
          </div>

          <div className="action-row small">
            <input type="number" min="1" value={autoSpinCount} onChange={(e) => setAutoSpinCount(e.target.value)} placeholder="Auto count" />
            <button onClick={startAutoSpin} disabled={isSpinning || autoSpinOn}>Auto Spin</button>
            <button onClick={stopAutoSpin} disabled={!autoSpinOn}>Stop</button>
          </div>

          <div className="action-row small">
            <button onClick={connectMetaMask}>Connect Wallet</button>
            <input value={depositEth} onChange={(e) => setDepositEth(e.target.value)} placeholder="Deposit ETH" />
            <button onClick={depositWithMetaMask}>Deposit</button>
            <button onClick={withdraw}>Withdraw</button>
          </div>
        </div>

        <div className="right-panel">
          <section className={spinResult?.isWin ? 'roulette-stage celebrate' : 'roulette-stage'}>
            <div className="wheel-track" style={{ transform: `translateX(-${wheelIndex * 52}px)` }}>
              {[...wheelNumbers, ...wheelNumbers].map((num, idx) => {
                const color = num === 0 ? 'green' : redNumbers.has(num) ? 'red' : 'black';
                return <span key={`${num}-${idx}`} className={`wheel-cell ${color}`}>{num}</span>;
              })}
            </div>
            <div className="wheel-pointer">▼</div>
          </section>

          <section className="history glass-card">
            <h3>Recent Numbers</h3>
            <div className="history-row">
              {recentNumbers.length === 0 && <span className="muted">No rounds yet</span>}
              {recentNumbers.map((num, idx) => {
                const color = num === 0 ? 'green' : redNumbers.has(num) ? 'red' : 'black';
                return <span key={`${num}-${idx}`} className={`history-chip ${color}`}>{num}</span>;
              })}
            </div>
          </section>

          {spinResult && (
            <section className={spinResult.isWin ? 'win-popup win' : 'win-popup lose'}>
              <h2>{spinResult.isWin ? '🎉 Big hit!' : 'Try the next round'}</h2>
              <div className="summary-grid">
                <p><strong>Ball:</strong> {spinResult.outcomeNumber} ({spinResult.outcomeColor})</p>
                <p><strong>Bet:</strong> {spinResult.betType} · {spinResult.betValue}</p>
                <p><strong>Total Bet:</strong> ${formatCurrency(spinResult.totalBet)}</p>
                <p><strong>Payout:</strong> ${formatCurrency(spinResult.totalPayoutUSD)}</p>
                <p><strong>Net:</strong> ${formatCurrency(spinResult.netWinUSD)}</p>
                <p><strong>Fairness Hash:</strong> <code>{spinResult.fairness.serverSeedHash.slice(0, 18)}...</code></p>
              </div>
            </section>
          )}
        </div>
      </section>

      <p className="message">{message}{autoSpinOn ? ` · Auto left: ${autoSpinsLeft}` : ''}</p>
    </main>
  );
}
