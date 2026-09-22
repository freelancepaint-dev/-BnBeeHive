# BnBeeHive v0.1

Educational **BNB Chain testnet-only** miner-style prototype.

## Model

BNB -> Honey -> Bees -> more Honey -> Compound or Harvest.

This contract does **not** mine BNB or create external yield. Harvests are funded by BNB already held by the contract. The economic model can lose liquidity and should not be represented as guaranteed ROI.

This is an independent implementation inspired by the general mechanics of classic miner-style contracts. It is not a verbatim copy of Baked Beans source code.

## Quick start

Requires Node.js 18+.

```bash
npm install
npm test
cp .env.example .env
# Put a TESTNET wallet private key in .env. Never use a wallet holding real funds.
npm run deploy:testnet
```

After deployment, the treasury account can initialize/seed the test market by calling:

```solidity
seedMarket(108000000000)
```

and attaching test BNB.

## Core functions

- `hireBees(referrer)` - deposit test BNB and compound purchased Honey into Bees.
- `compoundHoney(referrer)` - reinvest accrued Honey.
- `harvestHoney()` - sell accrued Honey back to the contract pool.
- `myHoney(address)` / `bees(address)` - UI read functions.
- Referral reward: 10% of Honey used during compounding.
- Treasury fee: 3% on hire/harvest.

## Security status

**UNAUDITED. DO NOT DEPLOY WITH REAL FUNDS.**

Before any production consideration, this needs independent smart-contract review, invariant/fuzz testing, economic simulation, frontend review, operational key design, and applicable legal/regulatory review. A miner-style pool does not create yield by itself; participant withdrawals depend on pool liquidity.

## License

The original code in this project is provided under the MIT license. This license applies to this project's code, not to third-party projects or Baked Beans source code.


## Web dashboard

A Vite/React dashboard is included in `web/`.

```bash
cd web
npm install
cp .env.example .env
# Set VITE_CONTRACT_ADDRESS to your deployed BSC testnet contract
npm run dev
```

The dashboard supports wallet connection, BSC testnet switching, Hire Bees, Compound Honey, Harvest Honey, pool/user stats, and referral URLs (`?ref=0x...`).
