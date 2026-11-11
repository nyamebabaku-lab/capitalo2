# Efie Wura Pro — live platform setup

## What runs where
| Piece | Where |
|---|---|
| Live app (sign in / register) | `https://nyamebabaku-lab.github.io/efiewura/` (build `VITE_APP=live`) |
| Demo (sample data, in-browser) | `https://nyamebabaku-lab.github.io/efiewura/demo/` |
| Database | Supabase project `jepkzvunetajsgscoelv`, own schema **`efiewura`** (shared project with MyVoteHub/EduNexa, separate data) |
| Server functions | Edge Functions `efiewura-pay`, `efiewura-webhook`, `efiewura-sms` |

## One-time steps
1. Apply `supabase/migrations/0001_efiewura.sql` then `0002_functions.sql` (`node scripts/sql.mjs <file>`).
2. Add `efiewura` to the API's exposed schemas (Project Settings → API → Exposed schemas).
3. Deploy functions: `npx supabase functions deploy efiewura-pay efiewura-sms --project-ref jepkzvunetajsgscoelv` and `npx supabase functions deploy efiewura-webhook --no-verify-jwt --project-ref jepkzvunetajsgscoelv`.
4. GitHub repo variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public values), then push to `main`.
5. Sign up in the live app with **nyamebabaku@gmail.com** → "Efie Wura Super Admin" to claim the admin account.

## Turning on real money (later)
Set these in Supabase → Edge Functions → Secrets, then switch **Test mode** off in Super Admin → Fees & plans.

| Provider | Secrets | Also |
|---|---|---|
| Paystack | `PAYSTACK_SECRET_KEY` | Webhook URL: `https://jepkzvunetajsgscoelv.supabase.co/functions/v1/efiewura-webhook?p=paystack`. Turn **off** "OTP for transfers" so payouts go out automatically. |
| Hubtel | `HUBTEL_API_ID`, `HUBTEL_API_KEY`, `HUBTEL_POS_SALES_ID` (collections), `HUBTEL_PREPAID_ID` (payouts) | Hubtel only accepts API calls from **whitelisted IP addresses**; Supabase functions have no fixed IP, so Hubtel may need a small fixed-IP relay. Bank payouts on Hubtel are paid manually by Efie Wura. |
| mNotify SMS | `MNOTIFY_API_KEY`, `MNOTIFY_SENDER_ID` (e.g. `EfieWura`, approved by mNotify) | Without a key, SMS are logged as "simulated". Enterprise owners can use their own approved sender ID. |

Each owner chooses Paystack or Hubtel in **Settings → Payments**; rent from their tenants is collected and paid out through that provider.

## Security model (tested: 75 checks, PGlite)
- Row-level security: tenants see only their own tenancy, bills and receipts; staff only their assigned properties and never the wallet or payout accounts; owners only their company.
- Only server functions can mark bills paid, create payments, change wallet balances, approve payouts, change plans or company status, or add a tenant's signature.
- Payments are settled only after Paystack/Hubtel confirm them (signed webhook or status check, amount re-checked).
