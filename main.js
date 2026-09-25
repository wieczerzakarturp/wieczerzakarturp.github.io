// All site content and UI strings live in portfolio-data.json.
// Every item can have shared fields at top level and translated fields
// inside "it" / "en"; the language block wins when both are present.

var DATA = null;
var currentLang = (location.search === '?en') ? 'en' : 'it';
var rendered = false;   // true after the first render: later renders skip the fade-in

// ---------- helpers ----------

// escape text coming from the JSON before inserting it into HTML strings
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// shared fields + fields of the current language
function pick(item){
  return Object.assign({}, item, item[currentLang]);
}

function ui(){
  return DATA ? DATA.ui[currentLang] : {};
}

// description: a string, or an array of blocks where a string is a paragraph
// and a nested array is a bullet list
function renderDesc(desc){
  var blocks = Array.isArray(desc) ? desc : [desc];
  return '<div class="modal-desc">' + blocks.map(function(b){
    return Array.isArray(b) ? renderList(b) : '<p class="modal-text">' + esc(b) + '</p>';
  }).join('') + '</div>';
}

function renderList(items){
  return '<ul class="modal-list">' + items.map(function(i){ return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
}

function renderTags(tags){
  return tags.map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join('');
}

// ---------- scroll animations ----------

var scrollObs = new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting){
      var el = entry.target, i = Array.from(el.parentNode.children).indexOf(el);
      setTimeout(function(){ el.classList.add('visible'); }, i * 70);
      scrollObs.unobserve(el);
    }
  });
}, {threshold:0.08});

function animClass(){
  return rendered ? 'anim-item visible' : 'anim-item';
}

function animateIn(container){
  if(rendered) return;
  container.querySelectorAll('.anim-item').forEach(function(el, i){
    if(el.getBoundingClientRect().top < window.innerHeight){
      setTimeout(function(){ el.classList.add('visible'); }, i * 90 + 60);
    } else {
      scrollObs.observe(el);
    }
  });
}

// ---------- sections ----------

function renderStats(){
  var bar = document.querySelector('.stats-bar');
  bar.innerHTML = DATA.stats.map(function(s){
    return '<div class="stat ' + animClass() + '">' +
      '<div class="stat-num">' + esc(s.num) + '</div>' +
      '<div class="stat-label">' + esc(s[currentLang]) + '</div>' +
      '</div>';
  }).join('');
  animateIn(bar);
}

function renderSkills(){
  var grid = document.querySelector('.skills-grid');
  grid.innerHTML = DATA.skills.map(function(item){
    var s = pick(item);
    return '<div class="skill-card ' + animClass() + '">' +
      '<div class="skill-name">' + esc(s.title) + '</div>' +
      '<div class="skill-desc">' + esc(s.card_desc) + '</div>' +
      '<div class="skill-hint">↗</div>' +
      '</div>';
  }).join('');
  grid.querySelectorAll('.skill-card').forEach(function(card, i){
    card.onclick = function(){ openSkillModal(i); };
  });
  animateIn(grid);
}

function renderIPLibrary(){
  var lib = DATA.ip_library;
  document.getElementById('iplibrary-intro').textContent = lib.intro[currentLang];
  document.getElementById('iplibrary-features').innerHTML = lib.features[currentLang].map(function(f){
    return '<span class="iplibrary-feature">' + esc(f) + '</span>';
  }).join('');
  var grid = document.getElementById('iplibrary-grid');
  grid.innerHTML = lib.categories.map(function(cat){
    var c = cat[currentLang];
    return '<div class="iplibrary-card ' + animClass() + '">' +
      '<div class="iplibrary-card-lib">' + esc(cat.lib) + '</div>' +
      '<div class="iplibrary-card-name">' + esc(c.name) + '</div>' +
      '<div class="iplibrary-card-desc">' + esc(c.desc) + '</div>' +
      '</div>';
  }).join('');
  animateIn(grid);
}

function renderProjects(){
  var grid = document.querySelector('.projects-grid');
  grid.innerHTML = DATA.projects.map(function(item){
    var p = pick(item);
    return '<div class="project-card ' + animClass() + '">' +
      '<div class="project-top"></div>' +
      '<div class="project-body">' +
        '<div class="project-tags">' + renderTags(p.tags) + '</div>' +
        '<div class="project-title">' + esc(p.title) + '</div>' +
        '<div class="project-desc">' + esc(p.card_desc) + '</div>' +
      '</div>' +
      '<div class="project-footer"><span class="project-arrow">↗</span></div>' +
      '</div>';
  }).join('');
  grid.querySelectorAll('.project-card').forEach(function(card, i){
    card.onclick = function(){ openModal(i); };
  });
  animateIn(grid);
}

// static texts in index.html: data-i18n sets the text, data-i18n-ph the placeholder
function renderUI(){
  var t = ui();
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var txt = t[el.getAttribute('data-i18n')];
    if(txt === undefined) return;
    if(el.tagName === 'LABEL' && txt.slice(-2) === ' *'){
      el.innerHTML = esc(txt.slice(0, -2)) + ' <span class="req">*</span>';
    } else {
      el.textContent = txt;
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){
    var txt = t[el.getAttribute('data-i18n-ph')];
    if(txt !== undefined) el.placeholder = txt;
  });
}

function renderAll(){
  renderUI();
  renderStats();
  renderSkills();
  renderIPLibrary();
  renderProjects();
  rendered = true;
  // re-render an open modal in the new language
  var so = document.getElementById('skillModalOverlay');
  var mo = document.getElementById('modalOverlay');
  if(so.classList.contains('open')) openSkillModal(parseInt(so.getAttribute('data-open-idx')));
  if(mo.classList.contains('open')) openModal(parseInt(mo.getAttribute('data-open-idx')));
}

function switchLang(){
  currentLang = currentLang === 'it' ? 'en' : 'it';
  // keep the current state and #project so an open modal still closes correctly
  history.replaceState(history.state, '', '?' + currentLang + location.hash);
  renderAll();
}

async function loadData(){
  try {
    // no-cache: the browser revalidates with the server (cheap 304 when unchanged),
    // so a new deploy is visible immediately
    var res = await fetch('portfolio-data.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
    renderAll();
    openFromHash();
    setTimeout(updateActiveNav, 100);
  } catch(e) {
    console.error('Failed to load portfolio-data.json', e);
    showLoadError();
  }
}

// direct link: index.html#foc (or ?en#foc) opens that project
function openFromHash(){
  var id = location.hash.slice(1);
  if(!id) return;
  var idx = DATA.projects.findIndex(function(p){ return p.id === id; });
  if(idx < 0) return;
  // drop the hash from the landing entry: openModal pushes it back, so closing
  // the modal goes back to the clean URL and stays on the site
  history.replaceState(null, '', location.pathname + location.search);
  openModal(idx);
}

// the JSON (and its UI strings) is missing, so this text lives here
function showLoadError(){
  var msg = currentLang === 'en'
    ? 'Content could not be loaded. Please reload the page.'
    : 'Impossibile caricare i contenuti. Ricarica la pagina.';
  document.querySelector('.stats-bar').innerHTML = '<div class="load-error">' + msg + '</div>';
}

// ---------- modals ----------

function showOverlay(o, idx){
  o.setAttribute('data-open-idx', idx);
  o.classList.add('open');
  o.scrollTop = 0;
  var m = o.querySelector('.modal'); if(m) m.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function hideOverlay(o){
  if(!o.classList.contains('open')) return;
  o.classList.remove('open');
  document.body.style.overflow = '';
  if(history.state && history.state.modal) history.back();
}

function openSkillModal(idx){
  var o = document.getElementById('skillModalOverlay');
  // push a history entry only on first open, not when re-rendering on language switch
  if(!o.classList.contains('open')) history.pushState({modal:'skill', idx:idx}, null, null);
  var s = pick(DATA.skills[idx]), t = ui();
  document.getElementById('skillModalTitle').textContent = s.title;
  document.getElementById('skillModalBody').innerHTML =
    '<div><div class="modal-section-label">' + esc(t.lbl_desc) + '</div>' + renderDesc(s.modal_desc) + '</div>' +
    '<div><div class="modal-section-label">' + esc(t.lbl_tools) + '</div>' + renderList(s.tools) + '</div>';
  showOverlay(o, idx);
}
function closeSkillModal(){ hideOverlay(document.getElementById('skillModalOverlay')); }
function closeSkillModalOutside(e){ if(e.target === document.getElementById('skillModalOverlay')) closeSkillModal(); }

function openModal(idx){
  var o = document.getElementById('modalOverlay');
  var p = pick(DATA.projects[idx]), t = ui();
  // the URL gets #<project id>, so the address bar holds a shareable direct link
  if(!o.classList.contains('open')) history.pushState({modal:'project', idx:idx}, null, p.id ? '#' + p.id : null);
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalTags').innerHTML = renderTags(p.tags);
  document.getElementById('modalBody').innerHTML =
    '<div><div class="modal-section-label">' + esc(t.lbl_desc) + '</div>' + renderDesc(p.modal_desc) + '</div>' +
    '<div><div class="modal-section-label">' + esc(t.lbl_specs) + '</div><div class="modal-specs">' +
    p.specs.map(function(s){
      return '<div class="modal-spec"><div class="modal-spec-key">' + esc(s.key) + '</div><div class="modal-spec-val">' + esc(s.val) + '</div></div>';
    }).join('') +
    '</div></div>';
  showOverlay(o, idx);
}
function closeModal(){ hideOverlay(document.getElementById('modalOverlay')); }
function closeModalOutside(e){ if(e.target === document.getElementById('modalOverlay')) closeModal(); }

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){ closeModal(); closeSkillModal(); }
});

window.addEventListener('popstate', function(){
  var pm = document.getElementById('modalOverlay');
  var sm = document.getElementById('skillModalOverlay');
  if(pm.classList.contains('open')) closeModal();
  else if(sm.classList.contains('open')) closeSkillModal();
  // the entry we came back to may carry the old ?lang if it was switched while a modal was open
  var urlOk = location.search === '?' + currentLang || (currentLang === 'it' && location.search === '');
  if(!urlOk) history.replaceState(history.state, '', '?' + currentLang + location.hash);
});

// ---------- navigation ----------

function smoothScrollTo(selector, e){
  if(e) e.preventDefault();
  var target = document.querySelector(selector);
  if(!target) return;
  var start = window.scrollY, end = target.getBoundingClientRect().top + start - 80;
  var duration = 630, startTime = null;
  function ease(t){ return t < 0.5 ? 2*t*t : 1 - (Math.pow(-2*t + 2, 2) / 2); }
  function step(ts){
    if(!startTime) startTime = ts;
    var p = Math.min((ts - startTime) / duration, 1);
    window.scrollTo(0, start + (end - start) * ease(p));
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateActiveNav(){
  var winH = window.innerHeight;
  var docH = document.documentElement.scrollHeight;
  var current = null;
  if(window.scrollY + winH >= docH - 40){
    current = 'contact';
  } else {
    ['skills','iplibrary','projects','contact'].forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.getBoundingClientRect().top <= winH * 0.5) current = id;
    });
  }
  document.querySelectorAll('.nav-links a').forEach(function(a){
    a.classList.toggle('nav-active', a.getAttribute('href').replace('#','') === current);
  });
}
window.addEventListener('scroll', updateActiveNav, {passive:true});

// ---------- theme ----------

function setTheme(light){
  document.body.classList.toggle('light', light);
  document.getElementById('theme-btn').textContent = light ? 'DARK' : 'LIGHT';
}

// an explicit choice is saved and wins over the system setting from then on
function toggleTheme(){
  var toLight = !document.body.classList.contains('light');
  setTheme(toLight);
  try { localStorage.setItem('theme', toLight ? 'light' : 'dark'); } catch(e) {}
}

function savedTheme(){
  try { return localStorage.getItem('theme'); } catch(e) { return null; }
}

// ---------- contact form ----------

var pageLoadedAt = Date.now();
var FORM_FIELDS = ['form-nome','form-azienda','form-email','form-messaggio'];

// show a temporary message on the send button, then restore it
function flashBtn(btn, text, ms, ok){
  btn.textContent = text;
  if(ok){ btn.style.background = 'var(--accent)'; btn.style.color = 'var(--bg)'; btn.style.borderColor = 'var(--accent)'; }
  else  { btn.style.borderColor = '#e05252'; btn.style.color = '#e05252'; }
  setTimeout(function(){
    btn.textContent = ui().btn_send;
    btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    btn.disabled = false;
  }, ms);
}

function clearForm(){
  FORM_FIELDS.forEach(function(id){ document.getElementById(id).value = ''; });
}

function inviaMailto(e){
  e.preventDefault();
  var btn = e.target, t = ui();
  var nome = document.getElementById('form-nome').value.trim();
  var azienda = document.getElementById('form-azienda').value.trim();
  var email = document.getElementById('form-email').value.trim();
  var messaggio = document.getElementById('form-messaggio').value.trim();

  // anti-spam: bots fill the hidden field or submit within seconds of loading;
  // pretend success so they get no hint, but send nothing
  var honeypot = document.getElementById('form-website').value;
  if(honeypot || Date.now() - pageLoadedAt < 3000){
    clearForm();
    flashBtn(btn, t.form_sent, 3000, true);
    return;
  }

  if(!nome || !email || !messaggio){ flashBtn(btn, t.form_missing, 2500); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ flashBtn(btn, t.form_bad_email, 2500); return; }

  btn.textContent = t.form_sending;
  btn.disabled = true;
  emailjs.send('service_3q0h5db', 'template_j7883ln', {name:nome, company:azienda || '—', email:email, message:messaggio})
  .then(function(){
    clearForm();
    flashBtn(btn, t.form_sent, 3000, true);
  }, function(err){
    flashBtn(btn, t.form_error + (err.text || err.status || '?'), 4000);
  });
}

// ---------- startup ----------

// theme: saved choice if any, otherwise follow the operating system setting
(function(){
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  var saved = savedTheme();
  setTheme(saved ? saved === 'light' : mq.matches);
  mq.addEventListener('change', function(e){ if(!savedTheme()) setTheme(e.matches); });
})();

// static section headers
document.querySelectorAll('.anim-item').forEach(function(el){ scrollObs.observe(el); });

// build email at runtime to avoid scrapers
(function(){
  var e = 'w.arturp' + '@' + 'gmail.com';
  document.getElementById('email-link').href = 'mailto:' + e;
  document.getElementById('email-text').textContent = e;
})();

window.addEventListener('load', function(){
  emailjs.init('kpcS4_EBMmxvlnJGD');
  loadData();
});
