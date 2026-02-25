# PDP Finder — Vercel Deployment Guide

## Folder Structure
```
pdp-vercel/
├── api/
│   ├── fetch.js      ← Main proxy (Bright Data)
│   ├── test.js       ← Test BD connection
│   └── status.js     ← Check config status
├── public/
│   └── index.html    ← Tool UI
├── package.json
├── vercel.json
└── README.md
```

---

## Deploy Steps

### Step 1 — GitHub pe upload karo
1. GitHub.com → New Repository → `pdp-finder`
2. Is poore `pdp-vercel` folder ko upload karo
   (ya `git clone` karke push karo)

### Step 2 — Vercel pe deploy karo
1. vercel.com → Login → **"Add New Project"**
2. GitHub repo select karo → **Deploy**
3. Bas! Deploy ho jayega automatically

### Step 3 — Bright Data credentials set karo
1. Vercel Dashboard → Tumhara Project → **Settings**
2. Left mein **"Environment Variables"** click karo
3. Yeh 4 variables add karo:

| Name      | Value                                      |
|-----------|--------------------------------------------|
| `BD_USER` | `brd-customer-XXXXX-zone-XXXXX`            |
| `BD_PASS` | `your-zone-password`                       |
| `BD_HOST` | `brd.superproxy.io`                        |
| `BD_PORT` | `22225`                                    |

4. **Save** karo
5. **Deployments → Redeploy** karo (env vars apply hone ke liye)

### Step 4 — Test karo
- Tumhara tool URL: `https://your-project.vercel.app`
- Bright Data panel mein **"⚡ Test"** dabao
- Green `✓ Connected! BD IP: x.x.x.x` dikhega

---

## Credentials kahan milenge
Bright Data Console → Proxies & Scraping → **Your Zone** → **Access Parameters**

Username format: `brd-customer-[CUSTOMER_ID]-zone-[ZONE_NAME]`

---

## Local Development (optional)
```bash
npm i -g vercel
vercel dev
```
Ya `server.js` alag se bhi chal sakta hai:
```bash
node server.js
```
