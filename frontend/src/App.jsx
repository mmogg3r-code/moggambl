import { useEffect, useMemo, useState } from 'react';

const API = '/api';
const DEPOSIT_ETH_DEFAULT = '0.01';

const slotIcons = {
  '7': '⑦', BAR: '🟥', '🍒': '🍒', '💎': '💎', '👑': '👑',
  '⚡': '⚡', '🐉': '🐉', '🌙': '🌙', '🔔': '🔔', '⭐': '⭐'
};

const initialGrid = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => '⭐'));

export default function App() {
  const [config, setConfig] = useState(null);
  const [player, setPlayer] = useState(null);
  const [slotId, setSlotId] = useState('slot-1');
  const [lineBet, setLineBet] = useState(1);
  const [grid, setGrid] = useState(initialGrid);
  const [message, setMessage] = useState('Welcome to MogGambl');
  const [isSpinning, setSpinning] = useState(false);
  const [win, setWin] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [depositEth, setDepositEth] = useState(DEPOSIT_ETH_DEFAULT);

  const selectedSlot = useMemo(() => config?.slots.find((s) => s.id === slotId), [config, slotId]);

  useEffect(() => {
    (async () => {
      const conf = await fetch(`${API}/config`).then((r) => r.json());
      setConfig(conf);
      const saved = localStorage.getItem('moggambl-player-id');
      const playerResp = await fetch(`${API}/player`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId: saved || undefined })
      }).then((r) => r.json());
      localStorage.setItem('moggambl-player-id', playerResp.id);
      if (playerResp.walletAddress) setWalletAddress(playerResp.walletAddress);
      setPlayer(playerResp);
    })();
  }, []);

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
    if (!window.ethereum) {
      setMessage('MetaMask not detected. Install extension first.');
      return;
    }
    try {
      const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(address);
      const updated = await fetch(`${API}/player`, {
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
    if (!window.ethereum) {
      setMessage('MetaMask not detected.');
      return;
    }
    if (!walletAddress) {
      setMessage('Connect wallet first.');
      return;
    }
    try {
      const weiHex = `0x${BigInt(Math.floor(Number(depositEth) * 1e18)).toString(16)}`;
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: config.depositAddress, value: weiHex }]
      });

      const updated = await fetch(`${API}/deposit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          txHash,
          amountEth: Number(depositEth),
          walletAddress
        })
      }).then((r) => r.json());

      if (updated.error) {
        setMessage(updated.error);
        return;
      }
      setPlayer(updated);
      setMessage(`Deposit confirmed: ${depositEth} ETH`);
      pingSound(540, 0.15);
    } catch {
      setMessage('Deposit transaction rejected or failed.');
    }
  };

  const spin = async () => {
    setSpinning(true);
    setWin(null);
    for (let i = 0; i < 8; i += 1) {
      setGrid(Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => Object.keys(slotIcons)[Math.floor(Math.random() * 10)])));
      pingSound(300 + (i * 40), 0.05);
      await new Promise((r) => setTimeout(r, 90));
    }
    const resp = await fetch(`${API}/spin`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, slotId, lineBet: Number(lineBet) })
    }).then((r) => r.json());

    if (resp.error) {
      setMessage(resp.error);
      setSpinning(false);
      return;
    }

    setGrid(resp.spin.grid);
    setPlayer(resp.player);
    setConfig((old) => ({ ...old, slots: old.slots.map((s) => (s.id === slotId ? { ...s, jackpotPool: resp.spin.jackpotPool } : s)) }));
    setWin(resp.spin);
    setMessage(resp.spin.totalWin > 0 ? `WIN ${resp.spin.totalWin.toFixed(2)} USD` : 'No win this spin');
    if (resp.spin.totalWin > 0) pingSound(840, 0.35);
    setSpinning(false);
  };

  const withdraw = async () => {
    const resp = await fetch(`${API}/withdraw`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, amountUSD: Math.min(50, player.balanceUSD), walletAddress: walletAddress || '0xYourWallet' })
    }).then((r) => r.json());
    setMessage(resp.error || resp.message);
    if (resp.player) setPlayer(resp.player);
  };

  if (!player || !config) return <div className="loading">Loading casino floor...</div>;

  return (
    <div className="app">
      <h1>MogGambl Realistic Slots Floor</h1>
      <p className="legal">Players send ETH to <code>{config.depositAddress}</code> to fund play.</p>
      <div className="dashboard">
        <div>Balance: <b>${player.balanceUSD.toFixed(2)}</b></div>
        <div>Total Wagered: ${player.totalWageredUSD.toFixed(2)}</div>
        <div>Wager Requirement: ${(player.totalDepositedUSD * 20).toFixed(2)}</div>
      </div>

      <div className="controls">
        <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          {config.slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.name}</option>)}
        </select>
        <label>Line Bet (max {config.maxBetPerLine})
          <input type="number" min="0.01" step="0.1" max={config.maxBetPerLine} value={lineBet} onChange={(e) => setLineBet(e.target.value)} />
        </label>
        <button onClick={connectMetaMask}>{walletAddress ? 'Wallet Connected' : 'Connect MetaMask'}</button>
        <label>Deposit ETH
          <input type="number" min="0.001" step="0.001" value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
        </label>
        <button onClick={depositWithMetaMask}>Deposit with MetaMask</button>
        <button className="spin" disabled={isSpinning} onClick={spin}>{isSpinning ? 'Spinning…' : 'SPIN 50 LINES'}</button>
        <button onClick={withdraw}>Request Withdrawal</button>
      </div>

      <div className="slot-cabinet">
        <div className="reels">
          {grid.map((row, ri) => row.map((cell, ci) => (
            <div className={`symbol ${isSpinning ? 'blur' : ''}`} key={`${ri}-${ci}`}>{slotIcons[cell] || cell}</div>
          )))}
        </div>
        <aside>
          <h3>{selectedSlot?.name}</h3>
          <p>Volatility: {selectedSlot?.volatility}x</p>
          <p>Progressive Jackpot: <b>${selectedSlot?.jackpotPool.toFixed(2)}</b></p>
          <p>Top Multiplier: {config.maxMultiplier}x</p>
          <p>Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}</p>
        </aside>
      </div>

      {win && win.totalWin > 0 && (
        <div className="win-popup">
          <h2>🎉 Big Win!</h2>
          <p>{win.multiplier}x · ${win.totalWin.toFixed(2)}</p>
          {win.progressiveWin > 0 && <p>JACKPOT HIT: ${win.progressiveWin.toFixed(2)}</p>}
        </div>
      )}

      <p className="message">{message}</p>
      <section className="slot-grid-list">
        {config.slots.map((s) => (
          <article key={s.id} className={`slot-card ${s.id === slotId ? 'active' : ''}`} onClick={() => setSlotId(s.id)}>
            <h4>{s.name}</h4>
            <span>${s.jackpotPool.toFixed(0)}</span>
          </article>
        ))}
      </section>
    </div>
  );
}
