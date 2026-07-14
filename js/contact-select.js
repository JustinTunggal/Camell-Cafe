/* ── CUSTOM SELECT ── */
(function() {
  var sel = document.getElementById('guestSelect');
  if (!sel) return;
  var trigger = sel.querySelector('.cc-select__trigger');
  var label   = document.getElementById('guestLabel');
  var options = sel.querySelectorAll('.cc-select__option');
  var hidden  = document.getElementById('fGuests');

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    sel.classList.toggle('open');
  });

  options.forEach(function(opt) {
    opt.addEventListener('click', function(e) {
      e.stopPropagation();
      options.forEach(function(o) { o.classList.remove('cc-select__option--active'); });
      var val = opt.getAttribute('data-value');
      if (val === '') {
        label.textContent = 'Pilih estimasi tamu';
        hidden.value = '';
        sel.classList.remove('selected');
      } else {
        opt.classList.add('cc-select__option--active');
        label.textContent = opt.textContent.replace('✓ ', '');
        hidden.value = val;
        sel.classList.add('selected');
      }
      sel.classList.remove('open');
    });
  });

  document.addEventListener('click', function() { sel.classList.remove('open'); });
})();

/* ── CUSTOM DATE PICKER ── */
(function() {
  var picker   = document.getElementById('ccDatepicker');
  if (!picker) return;
  var trigger  = document.getElementById('dpTrigger');
  var panel    = document.getElementById('dpPanel');
  var grid     = document.getElementById('dpGrid');
  var monthYr  = document.getElementById('dpMonthYear');
  var selFull  = document.getElementById('dpSelectedFull');
  var dispVal  = document.getElementById('dpDisplayValue');
  var hidden   = document.getElementById('fEventDate');
  var btnPrev  = document.getElementById('dpPrev');
  var btnNext  = document.getElementById('dpNext');
  var btnClear = document.getElementById('dpClear');
  var btnToday = document.getElementById('dpToday');

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  var today    = new Date();
  var curYear  = today.getFullYear();
  var curMonth = today.getMonth();
  var selected = null; // Date object or null

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function renderCalendar() {
    var first = new Date(curYear, curMonth, 1);
    var startDay = first.getDay();
    var daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    var daysInPrev  = new Date(curYear, curMonth, 0).getDate();

    monthYr.textContent = MONTHS[curMonth] + ' ' + curYear;
    grid.innerHTML = '';

    // Prev month overflow
    for (var i = startDay - 1; i >= 0; i--) {
      var d = daysInPrev - i;
      grid.appendChild(makeDay(d, curMonth - 1, true));
    }
    // Current month
    for (var d2 = 1; d2 <= daysInMonth; d2++) {
      grid.appendChild(makeDay(d2, curMonth, false));
    }
    // Next month fill
    var total = startDay + daysInMonth;
    var remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (var d3 = 1; d3 <= remainder; d3++) {
      grid.appendChild(makeDay(d3, curMonth + 1, true));
    }
  }

  function makeDay(day, monthOffset, other) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = day;
    btn.className = 'dp-day';

    var yr = curYear;
    var mo = monthOffset;
    // normalize
    var dateObj = new Date(yr, mo, day);
    var isToday = dateObj.getFullYear() === today.getFullYear() &&
                  dateObj.getMonth()    === today.getMonth() &&
                  dateObj.getDate()     === today.getDate();
    var isSel   = selected &&
                  dateObj.getFullYear() === selected.getFullYear() &&
                  dateObj.getMonth()    === selected.getMonth() &&
                  dateObj.getDate()     === selected.getDate();

    if (other)   btn.classList.add('dp-day--other-month');
    if (isToday) btn.classList.add('dp-day--today');
    if (isSel)   btn.classList.add('dp-day--selected');

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      selected = new Date(dateObj);
      updateSelected();
      renderCalendar();
    });
    return btn;
  }

  function updateSelected() {
    if (!selected) {
      selFull.textContent = '—';
      dispVal.textContent = 'Pilih tanggal event';
      hidden.value = '';
      picker.classList.remove('has-value');
    } else {
      var dayName = DAYS_SHORT[selected.getDay()];
      var monName = MONTHS[selected.getMonth()].substring(0, 3);
      var dayNum  = selected.getDate();
      selFull.textContent = dayName + ', ' + monName + ' ' + dayNum;
      var iso = selected.getFullYear() + '-' + pad(selected.getMonth() + 1) + '-' + pad(selected.getDate());
      hidden.value = iso;
      dispVal.textContent = dayName + ', ' + monName + ' ' + dayNum + ' ' + selected.getFullYear();
      picker.classList.add('has-value');
    }
  }

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    picker.classList.toggle('open');
    if (picker.classList.contains('open')) renderCalendar();
  });

  btnPrev.addEventListener('click', function(e) {
    e.stopPropagation();
    curMonth--;
    if (curMonth < 0) { curMonth = 11; curYear--; }
    renderCalendar();
  });
  btnNext.addEventListener('click', function(e) {
    e.stopPropagation();
    curMonth++;
    if (curMonth > 11) { curMonth = 0; curYear++; }
    renderCalendar();
  });
  btnClear.addEventListener('click', function(e) {
    e.stopPropagation();
    selected = null;
    curYear  = today.getFullYear();
    curMonth = today.getMonth();
    updateSelected();
    renderCalendar();
    picker.classList.remove('open');
  });
  btnToday.addEventListener('click', function(e) {
    e.stopPropagation();
    selected = new Date(today);
    curYear  = today.getFullYear();
    curMonth = today.getMonth();
    updateSelected();
    renderCalendar();
    picker.classList.remove('open');
  });

  document.addEventListener('click', function() { picker.classList.remove('open'); });
  panel.addEventListener('click', function(e) { e.stopPropagation(); });

  // init
  updateSelected();
  renderCalendar();
})();
