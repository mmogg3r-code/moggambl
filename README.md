# MogGambl Next.js (Deployment-Fixed)

This project is a pure **Next.js full-stack app** (App Router + API routes).

## Root cause of your current failure

Your log shows Next build finishing successfully, then Hostinger reports:

`ERROR: No output directory found after build`

That usually means Hostinger is checking for the wrong artifact path. With Next.js default build, the output directory is:

`.next`

The previous config used a custom `distDir`, which can conflict with platform expectations.

## Fix applied in code

- Removed custom `distDir` override from `next.config.mjs`.
- Switched runtime start command back to standard Next startup:
  - `next start -p $PORT`

This ensures build output is generated in `.next`, which most Next-compatible hosts detect automatically.

## Local
```bash
npm install
npm run dev
```

## Production
```bash
npm install
npm run build
npm start
```

## Hostinger redeploy steps

1. Pull/upload latest code.
2. Configure commands:
   - Install: `npm install`
   - Build: `npm run build`
   - Start: `npm start`
3. Output Directory setting:
   - Use `.next` **or leave empty if Hostinger auto-detects Next.js**.
4. Environment:
   - `NODE_ENV=production`
   - `PORT` from Hostinger (or set one if required)
5. Clear previous build cache/artifacts and redeploy.

If Hostinger asks for a startup file instead of command, prefer command mode. If forced, use Next binary startup from npm scripts rather than custom server entry.

## Security note
Deposit crediting is demo-oriented and currently trusts client-submitted tx hashes.
For real-money operation, verify on-chain receipts server-side before crediting.
