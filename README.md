# Wonderful Yapı – yeni site

Vite + GSAP (+ three.js harita). Siyah-altın, sinematik tasarım:

- **Giriş:** kaydırdıkça eski bina toz bulutu içinde yeni binaya dönüşür (fareyle 3D derinlik).
- **Altı adımda dönüşüm:** kaydırmaya bağlı oynayan yıkım → inşaat videosu.
- **Önce / sonra:** sürüklenebilir karşılaştırma (temsili görseller).
- Harita, ön değerlendirme formu, referanslar.

Görseller ve video Google Flow ile üretildi (`public/flow/`). Gerçek proje fotoğrafları geldiğinde
`src/viewer.js` içindeki `PAIRS` yollarını değiştirmek yeterli.

```
npm install
npm run dev      # http://localhost:5173  (hareketi azalt açık cihazda test: ?motion=1)
npm run build
```

`main` dalına her gönderimde GitHub Actions siteyi derleyip `gh-pages` dalına yayınlar.
