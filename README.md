# FloatTube — Pop-Out Player & SEO

YouTube videolarını **tarayıcı dışında, her zaman üstte** tutan (Opera'daki gibi pop-out) ve video için **SEO + istatistik panosu** gösteren bir tarayıcı eklentisi.

> Yayın paketi (mağaza metinleri, gizlilik politikası, ekran görüntüsü rehberi, paketleme) `store/` klasöründedir.

> Manifest V3 · Chrome / Edge / Opera (Chromium tabanlı) · Harici API anahtarı **gerekmez**.

## Özellikler

- 📌 **Üstte Tut (Pop-out):** Picture-in-Picture ile video, tüm pencerelerin üstünde yüzen bir oynatıcıya alınır.
- 📊 **SEO & İstatistik panosu** (sürüklenebilir, daraltılabilir kart):
  - Görüntülenme, beğeni, **etkileşim oranı** (beğeni/görüntülenme)
  - Süre, yayın tarihi, kategori, Video ID (kopyalanabilir)
  - **Etiketler/keyword listesi** (chip'ler) + "tümünü kopyala"
  - Başlık uzunluğu, açıklama uzunluğu, etiket sayısı
  - **SEO ipuçları** (başlık/etiket/açıklama için ok/uyarı/hata değerlendirmesi)
- Toolbar popup'ından hızlı kontrol; SPA gezinmede otomatik yenilenir.

## Kurulum (geliştirici modu)

1. Chrome / Edge / Opera'da `chrome://extensions` adresini açın.
2. Sağ üstten **Developer mode**'u açın.
3. **Load unpacked** → bu klasörü (`D:\youtubeextension`) seçin.
4. Bir YouTube videosu açın (`youtube.com/watch?...`). Pano sağ üstte belirir.

## Kullanım

- Sağ üstteki kartı başlığından sürükleyin, `▾` ile daraltın, `✕` ile gizleyin.
- **📌 Üstte Tut** ile videoyu yüzen pencereye alın (tekrar basınca kapanır).
- Toolbar simgesine tıklayıp **Üstte Tut** veya **Panoyu Göster/Gizle** butonlarını da kullanabilirsiniz.

## Veri kaynağı

İstatistikler, sayfanın kendi oynatıcı verisinden (`movie_player.getPlayerResponse()` → `videoDetails` / `microformat`) okunur; etiketler buradan gelir. Beğeni sayısı DOM'dan en iyi çabayla alınır (dil/tema değişikliklerinde boş gelebilir).

## Dosya yapısı

```
manifest.json          # MV3 manifest
src/inject.js          # Sayfa bağlamı köprüsü (oynatıcı verisini okur)
src/content.js         # Pano + PiP mantığı (izole dünya)
src/panel.css          # Pano stilleri
popup/                 # Toolbar popup (html/css/js)
icons/                 # 16/48/128 PNG
```

## Sınırlamalar / yol haritası

- **Firefox** native Document PiP'i desteklemez; mevcut PiP butonu Chromium'da çalışır.
- Beğeni/abone gibi DOM'dan okunan alanlar YouTube arayüz değişikliklerine duyarlıdır.
- Sonraki adımlar: Document PiP ile özel kontrollü oynatıcı, rakip video/etiket karşılaştırması, görüntülenme/saat tahmini, dışa aktarma (CSV).
