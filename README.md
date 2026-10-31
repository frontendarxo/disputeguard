# DisputeGuard

[![CI](https://github.com/frontendarxo/disputeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/frontendarxo/disputeguard/actions/workflows/ci.yml)

**AI agent that protects small businesses' money in PayPal disputes.**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). Runs on the PayPal **sandbox** only.

> Status: early development. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and roadmap.

## Getting started

Requirements: Node.js 20.12+ and a PayPal Developer account with a Sandbox REST app.

```bash
npm install
cp .env.example .env.local   # then paste your Sandbox Client ID and Secret
npm run check:paypal          # verifies credentials and lists sandbox disputes
npm run dev                   # http://localhost:3000
npm test                      # policy engine and UI helper tests
```

## License

[MIT](LICENSE)
