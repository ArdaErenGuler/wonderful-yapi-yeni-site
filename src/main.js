import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHero } from './hero.js';
import { initProcess } from './process.js';
import { initViewer } from './viewer.js';
import { initMap } from './map.js';

gsap.registerPlugin(ScrollTrigger);

const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (rm) document.documentElement.classList.add('rm');

// Her 3D bölüm bağımsız; biri başarısız olursa sayfa yine çalışır.
[['hero', initHero], ['process', initProcess], ['viewer', initViewer], ['map', initMap]].forEach(([name, fn]) => {
  try { fn(rm); } catch (e) {
    console.warn(`3D bölüm yüklenemedi: ${name}`, e);
    document.documentElement.classList.add('no-webgl');
  }
});

// Gösterim animasyonları
if (!rm) {
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.fromTo(el, { y: 28, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

// Sayaçlar
document.querySelectorAll('[data-count]').forEach((el) => {
  const end = Number(el.dataset.count);
  const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
  if (rm) { el.textContent = fmt(end); return; }
  const o = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v)) }),
  });
});

// Mobil menü
const nav = document.getElementById('nav');
document.getElementById('menuBtn').addEventListener('click', (e) => {
  const open = nav.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));

// Ön değerlendirme hesaplayıcı
const form = document.getElementById('calc');
const out = document.getElementById('calcOut');
const WA = '905365143836';
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  const yil = Number(f.yil);
  const notlar = [];
  if (yil && yil <= 2000) notlar.push('Yapı 2000 öncesi; güncel deprem yönetmeliği öncesinde yapılmış olabilir. Riskli yapı tespiti değerlendirmesi öncelikli olarak önerilir.');
  else if (yil && yil <= 2018) notlar.push('2000–2018 arası yapılar için mevcut durum ve zemin koşullarına göre tespit değerlendirmesi önerilir.');
  else if (yil) notlar.push('Yapı yaşı nispeten yeni; yine de zemin ve proje durumu için yerinde keşif yapılabilir.');
  if (f.tur === 'gecekondu') notlar.push('Müstakil/gecekondu türü yapılarda tapu ve mevcut hak durumunun ayrıca incelenmesi gerekir.');
  if (Number(f.kat) >= 5) notlar.push('Kat sayısı yüksek; statik inceleme kapsamı ve malik sayısı süreç planını etkiler.');
  notlar.push('Bu bölüm bilgilendirme amaçlıdır; resmi sonuç niteliği taşımaz. Kesin değerlendirme için ekibimiz yerinde keşif yapar.');
  const msg = `Merhaba, kentsel dönüşüm ön değerlendirmesi istiyorum.\nİlçe: ${f.ilce}\nYapı türü: ${f.tur === 'gecekondu' ? 'Müstakil / gecekondu' : 'Apartman'}\nYapı yılı: ${f.yil || '-'}\nKat: ${f.kat || '-'}\nAda/Parsel: ${f.ada || '-'}\nAd Soyad: ${f.ad}`;
  out.hidden = false;
  out.innerHTML = `<h4>Ön değerlendirme</h4><ul>${notlar.map((n) => `<li>${n}</li>`).join('')}</ul>
    <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(msg)}">Bilgileri WhatsApp ile gönder</a>
    <p class="fine">Bilgiler bu sayfadan sunucuya gönderilmez; yalnızca WhatsApp'ı açtığınızda mesaj metni olarak taşınır.</p>`;
  out.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'nearest' });
});
