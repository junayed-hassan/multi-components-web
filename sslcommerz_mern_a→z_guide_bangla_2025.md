# SSLCommerz MERN (React + Node.js) A→Z ইন্টিগ্রেশন গাইড

> এই গাইডে Sandbox দিয়ে শুরু করে Production পর্যন্ত সব ধাপ, ফোল্ডার স্ট্রাকচার, ব্যাকএন্ড (Node/Express) + ফ্রন্টএন্ড (React) কোড, IPN/Webhook, Validation, Refund/Query—সবই দেখানো আছে।

---

## 1) কী কী করবেন (High-level Flow)

**দুই ভাবে** ইন্টিগ্রেট করা যায়:
1. **Hosted/Redirect Checkout** (সবচেয়ে সহজ): আপনার সার্ভার থেকে SSLCOMMERZ-এ সেশন তৈরি ⇒ রেসপন্সে `GatewayPageURL` ⇒ ফ্রন্টএন্ড থেকে ওই URL-এ redirect।
2. **Easy (Popup) Checkout**: আপনার পেইজে SSLCOMMERZ-এর JS embed করে popup দেখাবেন। Backend একই—সার্ভার থেকেই সেশন তৈরি হবে।

> **সিকিউরিটি নোট**: সবসময় **server side** থেকে API কল করুন। `store_id`/`store_passwd` কখনোই React ফ্রন্টএন্ডে এক্সপোজ করবেন না।

---

## 2) প্রি-রেকুইজিটস
- **Sandbox Account** তৈরি করে **store_id** + **store_passwd** নিন।
- Merchant Panel-এ আপনার **success_url**, **fail_url**, **cancel_url**, **IPN/Webhook URL** কনফিগার করে নিন।
- Server-এ **TLS 1.2+** চালু আছে নিশ্চিত করুন।
- **টেস্ট কার্ড** ও **OTP**: VISA `4111111111111111`, Master `5111111111111111`, AMEX `371111111111111` (Exp: `12/25`, CVV: `111`), OTP: `111111` বা `123456`।

---

## 3) প্রজেক্ট স্ট্রাকচার (উদাহরণ)
```
my-app/
├─ backend/
│  ├─ .env
│  ├─ package.json
│  └─ server.js
└─ frontend/
   ├─ package.json
   └─ src/
      ├─ App.jsx
      └─ components/PayButton.jsx
```

---

## 4) Backend (Node.js/Express) সেটআপ

### 4.1 ডিপেন্ডেন্সিজ
```bash
cd backend
npm init -y
npm i express cors dotenv sslcommerz-lts axios
```

> নোট: `axios` এখানে কেবল উদাহরণ/হেল্পার হিসেবে—`sslcommerz-lts`-ই যথেষ্ট।

### 4.2 `.env` উদাহরণ
```
PORT=5000
SSLCZ_STORE_ID=your_sandbox_store_id
SSLCZ_STORE_PASS=your_sandbox_store_password
SSLCZ_IS_LIVE=false
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### 4.3 `server.js` (সম্পূর্ণ উদাহরণ)
```js
// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const SSLCommerzPayment = require('sslcommerz-lts');

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // SSLCOMMERZ success/fail POST form-data এর জন্য

const PORT = process.env.PORT || 5000;
const store_id = process.env.SSLCZ_STORE_ID;
const store_pass = process.env.SSLCZ_STORE_PASS;
const is_live = (process.env.SSLCZ_IS_LIVE === 'true');

// ডেমো ডাটাস্টোর (প্রডাকশনে DB ব্যবহার করুন)
const orders = new Map(); // tran_id -> { amount, currency, status, ... }

// ট্রান্সাকশন আইডি জেনারেটর
const newTranId = () => 'SSLCZ_' + Date.now() + '_' + Math.floor(Math.random()*1e6);

// 1) Checkout Session তৈরি
app.post('/api/payments/init', async (req, res) => {
  try {
    const {
      amount = 100,
      currency = 'BDT',
      cus_name = 'John Doe',
      cus_email = 'john@example.com',
      cus_phone = '01700000000',
      address = 'Dhaka',
      product_name = 'Sample Product',
      product_category = 'General',
      product_profile = 'general',
    } = req.body || {};

    const tran_id = newTranId();

    // আপনার সার্ভারের রিটার্ন URL গুলো
    const success_url = `${process.env.BASE_URL}/api/payments/success`;
    const fail_url    = `${process.env.BASE_URL}/api/payments/fail`;
    const cancel_url  = `${process.env.BASE_URL}/api/payments/cancel`;
    const ipn_url     = `${process.env.BASE_URL}/api/payments/ipn`;

    // অর্ডার স্টেটাস Pending হিসেবে রাখুন
    orders.set(tran_id, { status: 'PENDING', amount, currency, cus_email, product_name });

    const data = {
      total_amount: amount,
      currency,
      tran_id,
      success_url,
      fail_url,
      cancel_url,
      ipn_url,
      shipping_method: 'NO',
      product_name,
      product_category,
      product_profile,
      cus_name,
      cus_email,
      cus_add1: address,
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone,
    };

    const sslcz = new SSLCommerzPayment(store_id, store_pass, is_live);
    const apiResponse = await sslcz.init(data);

    if (!apiResponse || !apiResponse.GatewayPageURL) {
      return res.status(500).json({ message: 'Failed to create SSLCommerz session', apiResponse });
    }

    return res.json({
      tran_id,
      url: apiResponse.GatewayPageURL, // এই URL-এ রিডাইরেক্ট করবেন
      sessionkey: apiResponse.sessionkey, // প্রয়োজন হলে লগ/স্টোর করুন
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Init error', error: err?.message });
  }
});

// 2) Success Redirect (SSLCOMMERZ থেকে আপনার সার্ভারে POST)
app.post('/api/payments/success', async (req, res) => {
  try {
    const { val_id, tran_id, amount, currency, status } = req.body || {};

    // প্রথমে server-side Validation API কল করুন
    const sslcz = new SSLCommerzPayment(store_id, store_pass, is_live);
    const validation = await sslcz.validate({ val_id });

    /**
     * validation.status: 'VALID' | 'VALIDATED'
     * validation.amount, validation.currency, validation.tran_id
     */
    if (validation && (validation.status === 'VALID' || validation.status === 'VALIDATED')) {
      const order = orders.get(validation.tran_id);
      if (order && Number(order.amount) === Number(validation.amount) && order.currency === validation.currency) {
        order.status = 'PAID';
        orders.set(validation.tran_id, order);

        // Success হলে ফ্রন্টএন্ডের success পেইজে রিডাইরেক্ট করুন
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tran_id=${validation.tran_id}`);
      }
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?tran_id=${tran_id || ''}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
  }
});

// 3) Fail Redirect
app.post('/api/payments/fail', (req, res) => {
  const { tran_id } = req.body || {};
  const order = orders.get(tran_id);
  if (order) { order.status = 'FAILED'; orders.set(tran_id, order); }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?tran_id=${tran_id || ''}`);
});

// 4) Cancel Redirect
app.post('/api/payments/cancel', (req, res) => {
  const { tran_id } = req.body || {};
  const order = orders.get(tran_id);
  if (order) { order.status = 'CANCELLED'; orders.set(tran_id, order); }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled?tran_id=${tran_id || ''}`);
});

// 5) IPN/Webhook (Server-to-Server)
app.post('/api/payments/ipn', async (req, res) => {
  try {
    const { val_id, tran_id } = req.body || {};

    if (!val_id || !tran_id) {
      return res.status(400).send('Missing val_id or tran_id');
    }

    const sslcz = new SSLCommerzPayment(store_id, store_pass, is_live);
    const validation = await sslcz.validate({ val_id });

    if (validation && (validation.status === 'VALID' || validation.status === 'VALIDATED')) {
      const order = orders.get(validation.tran_id);
      if (order && Number(order.amount) === Number(validation.amount) && order.currency === validation.currency) {
        order.status = 'PAID';
        orders.set(validation.tran_id, order);
        return res.status(200).send('IPN OK');
      }
    }

    return res.status(400).send('IPN Validation Failed');
  } catch (e) {
    console.error('IPN Error:', e);
    return res.status(500).send('IPN Error');
  }
});

// (Optional) Refund API
app.post('/api/payments/refund', async (req, res) => {
  try {
    const { bank_tran_id, refund_amount = 0, refund_remarks = '', refe_id = '' } = req.body || {};
    const sslcz = new SSLCommerzPayment(store_id, store_pass, is_live);
    const r = await sslcz.initiateRefund({ bank_tran_id, refund_amount, refund_remarks, refe_id });
    return res.json(r);
  } catch (e) {
    return res.status(500).json({ message: 'refund error', error: e?.message });
  }
});

// (Optional) Query Transaction Status
app.get('/api/payments/query/:tran_id', async (req, res) => {
  try {
    const sslcz = new SSLCommerzPayment(store_id, store_pass, is_live);
    const data = await sslcz.transactionQueryByTransactionId({ tran_id: req.params.tran_id });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: 'query error', error: e?.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**ব্যাখ্যা (গুরুত্বপূর্ণ পয়েন্ট):**
- `init` রুট থেকে `GatewayPageURL` ফেরত আসে—ফ্রন্টএন্ড এই URL-এ redirect করবে।
- **Success/Fail/Cancel** রুটগুলোতে SSLCOMMERZ `POST` করে।
- **সবচেয়ে জরুরি**: success বা IPN-এ **Validation API** দিয়ে `val_id` যাচাই করা। তারপরেই DB আপডেট করবেন।
- `orders` এখানে ইন-মেমরি; প্রডাকশনে ডাটাবেজ নিন।

---

## 5) Frontend (React) — দুইটা অপশন

### 5.1 Hosted/Redirect (সবচেয়ে সহজ)

**PayButton.jsx**
```jsx
// frontend/src/components/PayButton.jsx
import { useState } from 'react';

export default function PayButton() {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          currency: 'BDT',
          cus_name: 'John Doe',
          cus_email: 'john@example.com',
          cus_phone: '01700000000',
          address: 'Dhaka',
          product_name: 'Demo Item',
          product_category: 'General',
        }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url; // GatewayPageURL এ নিয়ে যায়
      } else {
        alert('Failed to create payment session');
      }
    } catch (e) {
      console.error(e);
      alert('Error while initiating payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={loading} className="px-4 py-2 rounded bg-black text-white">
      {loading ? 'Processing…' : 'Pay with SSLCOMMERZ'}
    </button>
  );
}
```

**App.jsx (রাউটিং উদাহরণ)**
```jsx
import { BrowserRouter, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import PayButton from './components/PayButton';

function Success() {
  const [sp] = useSearchParams();
  const tran_id = sp.get('tran_id');
  return <div>Payment Success ✅ Tran ID: {tran_id}</div>;
}
function Failed() {
  const [sp] = useSearchParams();
  const tran_id = sp.get('tran_id');
  return <div>Payment Failed ❌ Tran ID: {tran_id}</div>;
}
function Cancelled() {
  const [sp] = useSearchParams();
  const tran_id = sp.get('tran_id');
  return <div>Payment Cancelled ⚠️ Tran ID: {tran_id}</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 24 }}>
        <h1>SSLCOMMERZ Demo</h1>
        <PayButton />
        <p><Link to="/payment/success">Success</Link> | <Link to="/payment/failed">Failed</Link> | <Link to="/payment/cancelled">Cancelled</Link></p>
        <Routes>
          <Route path="/payment/success" element={<Success />} />
          <Route path="/payment/failed" element={<Failed />} />
          <Route path="/payment/cancelled" element={<Cancelled />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

### 5.2 Easy (Popup) Checkout (অপশনাল)
- `index.html`-এর `<body>` এর শেষে (বা React-এ `useEffect` দিয়ে) **sandbox** এ হলে `https://sandbox.sslcommerz.com/embed.min.js` লোড করুন।
- একটি বাটন দিন যেটির `id="sslczPayBtn"` এবং অ্যাট্রিবিউট `endpoint` = আপনার backend `/api/payments/init` রুট।

**React উদাহরণ (সিম্পল):**
```jsx
import { useEffect } from 'react';

export default function PopupPay() {
  useEffect(() => {
    // embed স্ক্রিপ্ট লোড (sandbox)
    const s = document.createElement('script');
    s.src = 'https://sandbox.sslcommerz.com/embed.min.js?' + Math.random().toString(36).slice(2);
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, []);

  const postdata = {
    // চাইলে এখানে কাস্টম ডাটা পাঠাতে পারেন (backend req.body থেকে রিড করবেন)
    amount: 100,
    cus_name: 'John Doe',
    cus_email: 'john@example.com',
  };

  return (
    <button
      id="sslczPayBtn"
      className="px-4 py-2 rounded bg-indigo-600 text-white"
      // embed.min.js এই অ্যাট্রিবিউটগুলো পড়ে backend-এ পোস্ট ট্রিগার করে
      token=""
      postdata={JSON.stringify(postdata)}
      order=""
      endpoint="http://localhost:5000/api/payments/init"
    >
      Pay Now (Popup)
    </button>
  );
}
```

> **টিপ**: Popup কাজ না করলে Hosted/Redirect পদ্ধতি ব্যবহার করুন—SPA-তে সবচেয়ে স্টেবল।

---

## 6) Sandbox → Live সুইচ করার চেকলিস্ট
- `.env` এ `SSLCZ_IS_LIVE=true` করুন (LTS প্যাকেজে এটাই যথেষ্ট)।
- Merchant Panel-এ **allowed domain/URL** ও **IPN URL** লাইভ ডোমেইনে আপডেট করুন।
- **HTTPS** বাধ্যতামূলক; TLS 1.2+ নিশ্চিত করুন।
- **Unique `tran_id`** নিশ্চিত করুন; idempotency guard দিন।
- Success/Fail/Cancel পেইজগুলোতে **ক্যাশিং বন্ধ** রাখুন (no-store)।

---

## 7) Refund / Transaction Query (Optional)
- **Refund**: `POST /api/payments/refund` এ `bank_tran_id` + `refund_amount` পাঠান।
- **Query**: `GET /api/payments/query/:tran_id` দিয়ে ট্রান্সাকশনের স্টেটাস টানতে পারেন।

---

## 8) ট্রাবলশুটিং
- **419/CSRF বা 405 মেথড নট অ্যালাউড**: Success/Fail/Cancel রুটগুলো `POST` হিসেবে গ্রহণ করছেন কিনা দেখুন; `express.urlencoded` যুক্ত আছে কিনা দেখুন।
- **CORS সমস্যা**: Backend-এ `cors({ origin: FRONTEND_URL })` কনফিগার ঠিক করুন।
- **Popup কাজ করছে না**: Script ঠিকমতো লোড হচ্ছে কিনা, `endpoint` বৈধ কিনা; না হলে Hosted flow ব্যবহার করুন।
- **IPN আসছে না**: Merchant Panel-এ IPN URL সেট/এনেবল আছে কিনা দেখুন; প্রোডাকশনে ফায়ারওয়াল IP allowlist করতে হতে পারে।
- **TLS Error**: সার্ভারে TLS 1.2 সাপোর্ট নিশ্চিত করুন।

---

## 9) সিকিউরিটি বেস্ট প্র্যাকটিস
- Amount, Currency, `tran_id`—**server-side** এ নিজের ডাটাবেজের সঙ্গে **Validation API** রেসপন্স ম্যাচ করুন।
- ফ্রন্টএন্ডের amount/price কখনোই ট্রাস্ট করবেন না।
- Credentials শুধুই সার্ভারে `.env` এ রাখুন; রোল/পারমিশন অনুসারে Refund/Query প্রোটেক্ট করুন।
- লগ রাখুন (`tran_id`, `sessionkey`, `bank_tran_id`).

---

## 10) দ্রুত টেস্ট স্টেপস (লোকাল)
1. Backend চালু করুন: `node backend/server.js` (PORT 5000)
2. Frontend চালু করুন (Vite হলে): `npm run dev` (5173)
3. React বাটনে ক্লিক ⇒ GatewayPageURL-এ redirect ⇒ Sandbox কার্ড দিয়ে পেমেন্ট কমপ্লিট ⇒ Success পেইজ।
4. একই সাথে IPN রুটে server-to-server কল আসছে কিনা লগে দেখুন।

---

## 11) নোটস
- প্রয়োজন হলে **Link/Invoice** পেমেন্টও করা যায় (একটা লিংক জেনারেট করে পাঠানোর মেকানিজম)।
- EMI, Multi-card control, BIN allowlist এর মতো অ্যাডভান্সড প্যারামিটারও আছে—প্রয়োজনে যোগ করুন।

---

### শেষ কথা
এই গাইড ফলো করলে MERN প্রজেক্টে SSLCommerz **end-to-end** ইম্প্লিমেন্ট করতে পারবেন। আপনি চাইলে এই কোড ব্লকগুলো সরাসরি কপি করে আপনার প্রজেক্টে এডাপ্ট করতে পারেন। কোনো ধাপে আটকে গেলে আমাকে সেই ধাপ/এরর লগসহ বলুন—আমি সমাধানটা সাজিয়ে দেব।

