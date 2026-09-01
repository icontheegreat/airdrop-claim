# Solana Sweep Dashboard

A non-custodial Next.js dashboard for a wallet-approved SOL transfer.

## Requirements

- Node.js 20.9+
- A Solana wallet such as Phantom or Solflare
- A destination public key you control

## Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DESTINATION_WALLET=YOUR_DESTINATION_PUBLIC_KEY
```

Install and run:

```bash
npm install
npm run dev
```

Open:

http://localhost:3001

## Notes

- The default network is Solana devnet.
- No private keys are collected, sent to a server, or stored by this app.
- The connected wallet must explicitly approve the transaction.
- The destination is configured through `NEXT_PUBLIC_DESTINATION_WALLET`.
- For mainnet, use a mainnet RPC only after testing carefully on devnet.
