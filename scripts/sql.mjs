// Runs SQL on the Supabase project with the CLI login (~/.supabase/access-token).
// Usage: node scripts/sql.mjs file.sql   |   node scripts/sql.mjs -e "select 1"
import { readFileSync } from 'fs';
import { homedir } from 'os';

const REF = process.env.SUPABASE_REF || 'jepkzvunetajsgscoelv';
const token = readFileSync(`${homedir()}/.supabase/access-token`, 'utf8').trim();
const query = process.argv[2] === '-e' ? process.argv[3] : readFileSync(process.argv[2], 'utf8');
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
const t = await r.text();
console.log(r.ok ? t.slice(0, 4000) : `ERROR ${r.status}: ${t}`);
if (!r.ok) process.exit(1);
