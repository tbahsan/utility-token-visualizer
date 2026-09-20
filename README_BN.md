<p align="center">
  <img src="assets/icons/og-cover.png" alt="প্রিপেইড মিটার সহায়ক — কভার" width="100%">
</p>

<h1 align="center">প্রিপেইড মিটার সহায়ক</h1>

<p align="center">
  <b>বাংলাদেশের প্রিপেইড বিদ্যুৎ মিটার ব্যবহারকারীদের জন্য বাংলা-প্রথম, ১০০% অফলাইন হিসাব-সহায়ক।</b><br>
  রিচার্জ ভাঙতি • BERC স্ল্যাব রেট • টোকেন যাচাই • ব্যবহার ট্র্যাকার — সব এক জায়গায়।<br>
  by <a href="https://github.com/tbahsan"><b>tbahsan</b></a>
</p>

<p align="center">
  <a href="https://tbahsan.github.io/utility-token-visualizer/"><img src="https://img.shields.io/badge/Live_Demo-Open-0b6b3a?style=for-the-badge&logo=githubpages&logoColor=white" alt="লাইভ ডেমো"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bengali_First-0b6b3a" alt="Bengali first">
  <img src="https://img.shields.io/badge/100%25_Offline-PWA-blue" alt="Offline PWA">
  <img src="https://img.shields.io/badge/Tracking-None-success" alt="No tracking">
  <img src="https://img.shields.io/badge/Made_by-tbahsan-0b6b3a" alt="Made by tbahsan">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT">
  <img src="https://img.shields.io/badge/Version-1.0-informational" alt="v1.0">
  <img src="https://img.shields.io/github/last-commit/tbahsan/utility-token-visualizer" alt="Last commit">
</p>

<p align="center">
  <a href="README.md">English README</a>
</p>

---

## ফিচার

| ট্যাব | যা পাবেন |
|---|---|
| **রিচার্জ হিসাব** | ৳১০০০ রিচার্জে কত টাকার বিদ্যুৎ? মিটার ভাড়া, ডিমান্ড চার্জ, ৫% ভ্যাট, ০.৫% রিবেট — ভাঙতি টেবিল + রঙিন বার + বাংলা ব্যাখ্যা + পড়ে শোনানো |
| **স্ল্যাব রেট** | BERC আবাসিক (LT-A) স্ল্যাব অনুযায়ী ধাপে ধাপে দাম + গড় রেট |
| **টোকেন চেক** | ২০-সংখ্যার টোকেন যাচাই, `XXXX-XXXX` ফরম্যাট, মিটারে চাপার নিয়ম |
| **ব্যবহার ট্র্যাকার** | রিডিং লগ (শুধু আপনার ডিভাইসে), মাস-শেষ পূর্বাভাস, “ব্যালেন্স চলবে ≈ X দিন”, CSV এক্সপোর্ট |
| **যন্ত্রপাতি** | ফ্যান/ফ্রিজ/এসির মাসিক খরচ + “এসি ২ ঘণ্টা কম চালালে কত বাঁচে” স্লাইডার |
| **গ্যাস ও পানি** | তিতাস ও ওয়াসা সহায়িকা (পূর্ণ ক্যালকুলেটর রোডম্যাপে) |

**সবার জন্য সুবিধা:** বাংলা সংখ্যায় ইনপুট (১০০০), ডার্ক মোড, প্রিন্ট-বান্ধব রসিদ, স্ক্রিন-রিডার সাপোর্ট, ইনস্টলযোগ্য PWA।

## চালানো

**সরাসরি (সহজ):** https://tbahsan.github.io/utility-token-visualizer/

**লোকালি:**

```bash
git clone https://github.com/tbahsan/utility-token-visualizer.git
cd utility-token-visualizer
python3 -m http.server 8000
# → http://localhost:8000
```

> `file://` দিয়ে খুললে JSON লোড হবে না — যেকোনো স্ট্যাটিক সার্ভার দিয়ে চালান।

**ফোনে ইনস্টল:** পেজ খুলে Chrome → *Add to Home Screen* — এরপর ইন্টারনেট ছাড়াই চলবে।

## হিসাবের সূত্র (সম্পূর্ণ স্বচ্ছ)

```
বেস = রিচার্জ − বকেয়া
ভ্যাট     = বেস − বেস/১.০৫        (৫%, ভ্যাট-সহ ধরা হয়)
রিবেট    = ০.৫% × বেস/১.০৫
বিদ্যুৎ বাবদ = বেস/১.০৫ − মিটারভাড়া − ডিমান্ডচার্জ + রিবেট
```

- ডিমান্ড চার্জ ৳৪২/kW • মিটার ভাড়া: সিঙ্গেল ৳৪০ / থ্রি-ফেজ ৳২৫০
- স্ল্যাব **মার্জিনাল (ধাপে ধাপে)** — ফ্ল্যাট রেট নয়
- লাইফলাইন ৳৪.৬৩ **শুধু** মোট ≤ ৫০ ইউনিটে প্রযোজ্য
- শুল্ক: `tariffs/tariffs.json` (কার্যকর ২০২৬-০৬-০১, যাচাই ২০২৬-০৯-২০)

রসিদের সাথে অমিল পেলে [issue খুলুন](https://github.com/tbahsan/utility-token-visualizer/issues) — ব্যক্তিগত তথ্য ঢেকে রসিদের ছবি দিন।

## ফাইল গঠন

```
utility-token-visualizer/
├── index.html            # অ্যাপ (বাংলা-প্রথম)
├── manifest.json, sw.js  # PWA + অফলাইন
├── assets/css|js|icons/  # স্টাইল, লজিক, আইকন
├── i18n/bn.json, en.json # ভাষা (bn ক্যানোনিক্যাল)
├── tariffs/tariffs.json  # শুল্ক হার (কমিউনিটি আপডেটযোগ্য)
├── data/appliances.json  # যন্ত্রপাতির ডিফল্ট
└── .github/workflows/    # JSON + i18n + tariff CI
```

## প্রাইভেসি

- **সার্ভার নেই, ডাটাবেজ নেই, ট্র্যাকিং নেই** — সব হিসাব আপনার ব্রাউজারে।
- রিডিং/সেটিংস শুধু `localStorage`-এ থাকে; চাইলে এক ক্লিকে মুছে ফেলুন।
- কোর ফিচারে কোনো CDN নির্ভরতা নেই — অফলাইনেও পূর্ণ কার্যকর।

## অবদান

শুল্ক বদলালে শুধু `tariffs/tariffs.json` আপডেট + `last_verified` তারিখ দিলেই হয় — কোড জানার দরকার নেই। বিস্তারিত: [CONTRIBUTING_BN.md](CONTRIBUTING_BN.md)।

---

## নির্মাতা

<p align="center">
  <a href="https://github.com/tbahsan"><img src="https://github.com/tbahsan.png" width="110" alt="tbahsan"></a>
</p>

<p align="center">
  <b>tbahsan</b><br>
  ওপেন-সোর্স, বাংলা-প্রথম ওয়েব টুল নির্মাতা — ঢাকা, বাংলাদেশ<br>
  <a href="https://github.com/tbahsan">github.com/tbahsan</a> •
  <a href="https://github.com/tbahsan?tab=repositories">আরও প্রজেক্ট</a> •
  <a href="https://github.com/tbahsan/utility-token-visualizer/issues">বাগ / পরামর্শ</a>
</p>

<p align="center">
  <a href="https://github.com/tbahsan"><img src="https://img.shields.io/github/followers/tbahsan?style=social" alt="Follow tbahsan"></a>
  <a href="https://github.com/tbahsan/utility-token-visualizer"><img src="https://img.shields.io/github/stars/tbahsan/utility-token-visualizer?style=social" alt="Star this repo"></a>
</p>

## সমর্থন

ভালো লাগলে ⭐ **Star** দিন — বন্ধুদের সাথে শেয়ার করুন। প্রতিটি স্টার পরের প্রজেক্টের অনুপ্রেরণা।

## লাইসেন্স

**MIT © 2026 tbahsan** — দেখুন [LICENSE](LICENSE)। ফোর্ক করুন, শিখুন, উন্নত করুন — শুধু মূল নির্মাতার ক্রেডিট রাখুন।

<p align="center"><sub>ঢাকায় যত্নে তৈরি • Made with care in Dhaka, Bangladesh</sub></p>
