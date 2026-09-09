# 🪙 Altın Günü — Model B (Lisanslı Partner)

Türkiye'deki geleneksel "altın günü / gün yapma" kavramının dijital mobil uygulaması.
Kullanıcılar grup kurar → davet linki paylaşır → arkadaşları katılır → otomatik ödeme yapılır →
sırası gelen üyeye **fiziki altın** kargolanır.

> **Model B mimarisi:** Uygulama **fonu ve altını ASLA kendisi tutmaz.** Ödeme tahsilatı
> lisanslı bir **Ödeme Kuruluşu**, altın alımı ve fiziki teslimat lisanslı bir **dijital altın
> platformu** tarafından yapılır. Biz sadece üstteki **orkestrasyon yazılımıyız.** Bu yaklaşım
> 6493 sayılı Kanun kapsamındaki lisans yükünü partnerlere devreder.

---

## 🚀 Windows'ta Çalıştırma

### Ön koşul: Node.js LTS
[nodejs.org](https://nodejs.org) → LTS → **Windows Installer (.msi)** → kur.
PowerShell script hatası alırsan:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 1) Backend (API sunucusu)
```powershell
cd altin-gunu\backend
npm install
npm start
```
Başarılıysa: `🟡 Altın Günü backend çalışıyor → http://localhost:4000`
Test: tarayıcıda `http://localhost:4000/health`
> Bu pencereyi KAPATMA.

### 2) Mobil (yeni pencerede)
```powershell
cd altin-gunu\mobile
npm install
npx expo start
```
- **Tarayıcıda test (en kolay):** `npx expo start --web`
- **Telefonda:** Expo Go ile QR okut. Önce `mobile\src\api\client.js` içindeki
  `BASE_URL`'i PC'nin yerel IP'siyle değiştir (`ipconfig` → IPv4).

### Sadece iş mantığını görmek istersen (uygulama kurmadan)
```powershell
cd altin-gunu\backend
node simulate.mjs
```

---

## 📁 Yapı
```
altin-gunu/
├── backend/   Node + Express orkestrasyon API
│   └── src/
│       ├── routes/     auth, groups, payments
│       ├── services/   kura (adil kura), paymentProvider, goldProvider, audit
│       ├── middleware/ auth (JWT)
│       └── store/      in-memory (üretimde PostgreSQL)
└── mobile/    React Native (Expo)
    └── src/
        ├── api/        backend istemcisi
        ├── screens/    Login, Otp, Home, CreateGroup, GroupDetail, Join
        ├── components/ UI bileşenleri
        └── theme/      altın/premium tema
```

## 🔐 Güvenlik & Uyum
- Fon tutma yok (lisanslı partnerde) → 6493 SK riski devredilir
- Kart verisi saklanmaz (partnerde tokenize, PCI-DSS)
- KYC/AML (MASAK) altın/ödeme öncesi
- Hash zincirli değiştirilemez denetim defteri
- Çift tahsilat idempotency key ile önlenir

> ⚠️ **Hukuki not:** Lansmandan önce iş modelini 6493/6361 kapsamında bir fintech avukatına
> doğrulatın. Bu depo hukuki tavsiye değildir.
