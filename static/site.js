(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Storage helper (survives unavailable storage) ---------- */
  function readStore(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var value = JSON.parse(raw);
      if (value === null || typeof value !== 'object') return null;
      return value;
    } catch (e) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Contact form (demonstration only) ---------- */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (form && status) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('cf-name');
      var email = document.getElementById('cf-email');
      var message = document.getElementById('cf-message');
      var consent = document.getElementById('cf-consent');

      var missing = [];
      if (!name.value.trim()) missing.push('name');
      if (!email.value.trim()) missing.push('email');
      if (!message.value.trim()) missing.push('message');
      if (!consent.checked) missing.push('consent');

      status.classList.add('show');

      if (missing.length) {
        status.textContent = 'Please complete: ' + missing.join(', ') + '.';
        return;
      }

      status.textContent = 'Message ready. The form is not connected to a mailbox yet — this is a working demonstration. Once the site is published, this will send for real.';
      form.reset();
    });
  }

  /* ---------- People's Voices counter ---------- */
  var counter = document.getElementById('counter');
  var counterNote = document.getElementById('counter-note');
  var addBtn = document.getElementById('add-voice');
  var resetBtn = document.getElementById('reset-voice');

  function renderCounter() {
    if (!counter) return;
    var data = readStore('etb.voices');
    var n = data && typeof data.count === 'number' && data.count >= 0 ? data.count : 0;
    counter.textContent = String(n);
    if (counterNote) {
      counterNote.textContent = n === 1
        ? 'person has added their name so far on this device.'
        : 'people have added their name so far on this device.';
    }
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var data = readStore('etb.voices');
      var n = data && typeof data.count === 'number' && data.count >= 0 ? data.count : 0;
      n += 1;
      if (!writeStore('etb.voices', { count: n })) {
        if (counterNote) {
          counterNote.textContent = 'This browser is blocking local storage, so the count cannot be saved on this device.';
        }
        return;
      }
      renderCounter();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      writeStore('etb.voices', { count: 0 });
      renderCounter();
    });
  }

  renderCounter();

  /* ---------- Poll ---------- */
  var poll = document.getElementById('poll');
  var pollStatus = document.getElementById('poll-status');
  if (poll && pollStatus) {
    poll.addEventListener('submit', function (event) {
      event.preventDefault();
      var checked = poll.querySelector('input[name="answer"]:checked');
      pollStatus.classList.add('show');
      if (!checked) {
        pollStatus.textContent = 'Pick an answer first.';
        return;
      }
      var saved = readStore('etb.poll') || {};
      saved[checked.value] = (typeof saved[checked.value] === 'number' ? saved[checked.value] : 0) + 1;
      writeStore('etb.poll', saved);
      pollStatus.textContent = 'Vote counted on this device. It is not sent anywhere while the site is in testing.';
      poll.reset();
    });
  }
})();
