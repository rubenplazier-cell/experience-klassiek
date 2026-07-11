function currentLang() {
  const l = new URLSearchParams(location.search).get('lang');
  return (typeof translations !== 'undefined' && translations[l]) ? l : 'nl';
}

function withLang(href, lang) {
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return href;
    url.searchParams.set('lang', lang);
    return url.pathname.split('/').pop() + url.search + url.hash;
  } catch (e) {
    return href;
  }
}

function applyLang(lang) {
  if (typeof translations === 'undefined' || !translations[lang]) return;
  const dict = translations[lang];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] === undefined) return;
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) el.setAttribute(attr, dict[key]);
    else el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });

  document.documentElement.lang = lang;

  document.querySelectorAll('#langSwitch button').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
    a.setAttribute('href', withLang(href, lang));
  });

  document.querySelectorAll('form[action]').forEach(f => {
    const action = f.getAttribute('action');
    if (action && action.startsWith('/')) f.setAttribute('action', withLang(action, lang));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
    }));
  }

  document.querySelectorAll('.reveal').forEach(el => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });

  applyLang(currentLang());

  const langSwitch = document.getElementById('langSwitch');
  if (langSwitch) {
    langSwitch.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const lang = btn.dataset.lang;
      const url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
      applyLang(lang);
    });
  }
});
