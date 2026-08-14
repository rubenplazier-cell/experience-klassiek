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

function initAgendaModal() {
  const items = document.querySelectorAll('.agenda-item[data-date]');
  if (!items.length) return;

  const modal = document.createElement('div');
  modal.className = 'agenda-modal';
  modal.innerHTML = `
    <div class="agenda-modal-inner" role="dialog" aria-modal="true">
      <button type="button" class="agenda-modal-close" aria-label="Sluiten">&times;</button>
      <div class="agenda-modal-date"></div>
      <h3 class="agenda-modal-venue"></h3>
      <div class="agenda-modal-section">
        <h4 data-i18n="agenda_modal_address_label">Locatie</h4>
        <p class="agenda-modal-address"></p>
      </div>
      <div class="agenda-modal-section">
        <h4 data-i18n="agenda_modal_time_label">Tijd</h4>
        <p class="agenda-modal-time"></p>
      </div>
      <div class="agenda-modal-section">
        <h4 data-i18n="agenda_modal_program_label">Programma</h4>
        <p class="agenda-modal-program"></p>
      </div>
      <div class="agenda-modal-section agenda-modal-access-section">
        <h4 data-i18n="agenda_modal_access_label">Bereikbaarheid</h4>
        <p class="agenda-modal-access"></p>
      </div>
      <a href="#" class="btn btn-solid agenda-modal-tickets" data-i18n="agenda_tickets_cta">Koop tickets →</a>
    </div>
  `;
  document.body.appendChild(modal);

  const modalDate = modal.querySelector('.agenda-modal-date');
  const modalVenue = modal.querySelector('.agenda-modal-venue');
  const modalAddress = modal.querySelector('.agenda-modal-address');
  const modalTime = modal.querySelector('.agenda-modal-time');
  const modalProgram = modal.querySelector('.agenda-modal-program');
  const modalAccess = modal.querySelector('.agenda-modal-access');
  const modalAccessSection = modal.querySelector('.agenda-modal-access-section');
  const modalTickets = modal.querySelector('.agenda-modal-tickets');

  function open(item) {
    const day = item.querySelector('.agenda-date .day');
    const month = item.querySelector('.agenda-date .month');
    const venue = item.querySelector('.agenda-info h3');
    const ticketLink = item.querySelector('a.btn');
    const detail = item.querySelector('[data-agenda-detail]');
    const paras = detail ? detail.querySelectorAll('p') : [];
    modalDate.textContent = day && month ? `${day.textContent} ${month.textContent}` : '';
    modalVenue.textContent = venue ? venue.textContent : '';
    modalAddress.innerHTML = paras[0] ? paras[0].innerHTML : '';
    modalTime.textContent = paras[1] ? paras[1].textContent : '';
    // Programs are set as markup so a multi-work listing keeps its line breaks.
    modalProgram.innerHTML = paras[2] ? paras[2].innerHTML : '';
    // Fourth paragraph is optional: only concerts with travel details show this section.
    modalAccess.innerHTML = paras[3] ? paras[3].innerHTML : '';
    modalAccessSection.hidden = !paras[3];
    if (ticketLink) modalTickets.setAttribute('href', ticketLink.getAttribute('href'));
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  items.forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      open(item);
    });
    item.addEventListener('keydown', e => {
      if (e.target.closest('a')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(item);
      }
    });
  });
  modal.querySelector('.agenda-modal-close').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => {
    if (modal.classList.contains('open') && e.key === 'Escape') close();
  });

  applyLang(currentLang());
}

function initAgendaFilter() {
  const bar = document.getElementById('agendaFilter');
  if (!bar) return;
  const items = Array.from(document.querySelectorAll('.agenda-item[data-venue]'));
  const empty = document.getElementById('agendaEmpty');
  const buttons = Array.from(bar.querySelectorAll('.agenda-filter-btn'));

  function apply(venue) {
    let shown = 0;
    items.forEach(item => {
      const match = venue === 'all' || item.dataset.venue === venue;
      item.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    buttons.forEach(b => b.classList.toggle('active', b.dataset.venue === venue));
  }

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.agenda-filter-btn');
    if (btn) apply(btn.dataset.venue);
  });
}

function initCaptchaGuard() {
  const box = document.querySelector('.form-captcha');
  if (!box) return;
  const form = box.closest('form');
  if (!form) return;

  function solved() {
    const field = form.querySelector('[name="g-recaptcha-response"]');
    // No field means Netlify has not injected the widget (e.g. local preview): let it through.
    return !field || !!field.value;
  }

  form.addEventListener('submit', e => {
    if (solved()) return;
    e.preventDefault();
    box.classList.add('invalid');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Clear the error state once they tick the box.
  box.addEventListener('click', () => {
    if (solved()) box.classList.remove('invalid');
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

  initAgendaModal();
  initAgendaFilter();
  initCaptchaGuard();

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
