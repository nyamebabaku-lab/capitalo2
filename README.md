# Capital O2 Estates & Hostel — hostel & estates app

Tenants pay rent by MoMo or card, get receipts, sign their tenancy and report repairs; the owner and staff manage properties, tenancies, rent, repairs, expenses, SMS and reports. Independent single-company edition of Efie Wura Pro: rent goes straight into Capital O2's own Paystack or Hubtel account (no platform fee or wallet).

- **Live app:** https://nyamebabaku-lab.github.io/capitalo2/ · **Demo:** https://nyamebabaku-lab.github.io/capitalo2/demo/
- **Android:** `CapitalO2-Hostel.apk` (students & tenants) and `CapitalO2-Estates.apk` (owner + staff) from the latest GitHub release.
- **Hostel features:** rooms let per bed (each student has their own tenancy and bills), billing per semester (4 months), per academic year (whole stay), monthly, quarterly or yearly.
- **Database:** Supabase project `jepkzvunetajsgscoelv`, schema `capitalo2` (`supabase/migrations`). Functions `capitalo2-pay`, `capitalo2-webhook`, `capitalo2-sms`.
- **Secrets** (Supabase → Edge Functions): `CAPITALO2_PAYSTACK_SECRET_KEY` or `CAPITALO2_HUBTEL_API_ID` / `CAPITALO2_HUBTEL_API_KEY` / `CAPITALO2_HUBTEL_POS_SALES_ID`; SMS `CAPITALO2_MNOTIFY_API_KEY` / `CAPITALO2_MNOTIFY_SENDER_ID`. Paystack webhook: `https://jepkzvunetajsgscoelv.supabase.co/functions/v1/capitalo2-webhook?p=paystack`.
- **First-time set-up:** sign up with the reserved email in the Manager app → "First-time set-up". Hand over later in Staff → crown button.

```bash
npm install
npm run dev        # live app (needs .env.local)
npm run dev:demo   # demo with Capital O2 sample data
```
