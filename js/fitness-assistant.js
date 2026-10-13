(function () {
  'use strict';

  var STORE = {
    profile: 'medicare.fitness.profile',
    plan: 'medicare.fitness.plan',
    reminders: 'medicare.fitness.reminders',
    fired: 'medicare.fitness.fired'
  };
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MEALS = {
    Vegetarian: ['Vegetable poha + green tea', 'Idli + sambar', 'Dal, roti and mixed vegetables', 'Chickpea salad bowl', 'Vegetable khichdi + curd'],
    Vegan: ['Vegetable poha + fruit', 'Tofu scramble + whole-grain toast', 'Dal, roti and mixed vegetables', 'Chickpea salad bowl', 'Tofu and vegetable stir-fry'],
    Eggetarian: ['Masala oats + boiled egg', 'Besan chilla + curd', 'Egg curry, rice and salad', 'Sprout chaat', 'Vegetable khichdi + curd'],
    'Non-vegetarian': ['Boiled eggs + fruit', 'Chicken and whole-grain toast', 'Grilled chicken, rice and salad', 'Fruit + yogurt', 'Grilled fish + vegetables']
  };
  var WORKOUTS = {
    'Lose weight': ['Brisk walk · 30 min', 'Full-body strength · 30 min', 'Yoga and mobility · 25 min', 'Cycling or walk · 30 min', 'Bodyweight circuit · 25 min', 'Easy walk · 20 min', 'Rest and stretch'],
    'Maintain weight': ['Full-body strength · 30 min', 'Brisk walk · 30 min', 'Yoga and mobility · 25 min', 'Bodyweight strength · 30 min', 'Cycling or swim · 30 min', 'Recreational activity · 30 min', 'Rest and stretch'],
    'Gain muscle': ['Upper-body strength · 35 min', 'Lower-body strength · 35 min', 'Easy walk + mobility · 20 min', 'Push workout · 35 min', 'Pull workout · 35 min', 'Legs and core · 35 min', 'Rest and stretch']
  };
  var root;
  var profile = read(STORE.profile, null);
  var reminders = read(STORE.reminders, []);
  var fired = read(STORE.fired, {});
  var timer;

  function read(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage can be unavailable */ }
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function addStyles() {
    if (document.getElementById('fitness-assistant-styles')) return;
    var style = document.createElement('style');
    style.id = 'fitness-assistant-styles';
    style.textContent = [
      '#fitnessAssistant{--fa-blue:var(--primary);--fa-blue-dark:var(--primary-dark);--fa-soft:#e8ecf5;--fa-ink:var(--text);--fa-muted:var(--muted);--fa-line:var(--border);color:var(--fa-ink);font-family:inherit}',
      '#fitnessAssistant *{box-sizing:border-box}',
      '#fitnessAssistant .fa-head{margin-bottom:16px}#fitnessAssistant .fa-head h2{margin:0 0 4px;color:var(--fa-blue-dark)}#fitnessAssistant .fa-head p{margin:0;color:var(--fa-muted);font-size:13px}',
      '#fitnessAssistant .fa-tabs{display:flex;gap:7px;flex-wrap:wrap;padding:7px;margin:14px 0;background:#eff5ff;border-radius:12px}',
      '#fitnessAssistant .fa-tab{flex:1 1 110px;border:0;border-radius:8px;padding:10px 12px;background:transparent;color:var(--fa-muted);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}',
      '#fitnessAssistant .fa-tab.active{background:var(--fa-blue);color:#fff}',
      '#fitnessAssistant .fa-panel{display:none}#fitnessAssistant .fa-panel.active{display:block}',
      '#fitnessAssistant .fa-card{padding:16px;margin-bottom:12px;border:1px solid var(--fa-line);border-radius:12px;background:#fff}',
      '#fitnessAssistant .fa-card h3{margin:0 0 12px;font-size:16px}',
      '#fitnessAssistant .fa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 14px}',
      '#fitnessAssistant .fa-field label{display:block;margin-bottom:5px;font-size:12px;font-weight:700}',
      '#fitnessAssistant .fa-field input,#fitnessAssistant .fa-field select{width:100%;min-height:40px;padding:8px 10px;border:1px solid var(--fa-line);border-radius:8px;background:#fff;font:inherit}',
      '#fitnessAssistant .fa-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
      '#fitnessAssistant .fa-btn{border:0;border-radius:8px;padding:10px 14px;background:var(--fa-blue);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}',
      '#fitnessAssistant .fa-btn:hover{background:var(--fa-blue-dark)}#fitnessAssistant .fa-btn.secondary{background:#e9ecf2;color:var(--fa-ink)}',
      '#fitnessAssistant .fa-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:9px;margin-bottom:12px}',
      '#fitnessAssistant .fa-stat{padding:12px 8px;text-align:center;border:1px solid var(--fa-line);border-radius:10px;background:#f5f9ff}',
      '#fitnessAssistant .fa-stat b{display:block;color:var(--fa-blue-dark);font-size:19px}#fitnessAssistant .fa-stat span{color:var(--fa-muted);font-size:11px}',
      '#fitnessAssistant .fa-list{display:grid;gap:8px}#fitnessAssistant .fa-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:11px 12px;border-left:4px solid var(--fa-blue);border-radius:8px;background:#f5f9ff}',
      '#fitnessAssistant .fa-row small{display:block;margin-top:3px;color:var(--fa-muted)}#fitnessAssistant .fa-empty{padding:18px;text-align:center;color:#94a3b8}',
      '#fitnessAssistant .fa-note{margin-top:10px;padding:10px;border:1px solid #d7ddeb;border-radius:8px;background:#f0f8f5;color:var(--fa-blue-dark);font-size:12px}',
      '#fitnessAssistant .fa-table{width:100%;border-collapse:collapse;font-size:13px}#fitnessAssistant .fa-table td{padding:9px;border-bottom:1px solid var(--fa-line);vertical-align:top}#fitnessAssistant .fa-table tr:last-child td{border:0}',
      '#fitnessAssistant .fa-delete{border:1px solid var(--fa-line);border-radius:7px;padding:5px 8px;background:white;cursor:pointer}',
      '#fitnessAssistant .fa-stepper{display:flex;align-items:center;gap:6px;margin:0 0 18px;padding:12px 8px;border:1px solid var(--fa-line);border-radius:12px;background:#f5f9ff}',
      '#fitnessAssistant .fa-stepper>i{height:2px;flex:1;background:var(--fa-line)}',
      '#fitnessAssistant .fa-step-dot{display:grid;justify-items:center;gap:4px;min-width:44px;color:var(--fa-muted)}',
      '#fitnessAssistant .fa-step-dot span{display:grid;place-items:center;width:28px;height:28px;border:2px solid var(--fa-line);border-radius:50%;background:#fff;font-size:12px;font-weight:800}',
      '#fitnessAssistant .fa-step-dot small{font-size:10px}',
      '#fitnessAssistant .fa-step-dot.active span,#fitnessAssistant .fa-step-dot.done span{border-color:var(--fa-blue);background:var(--fa-blue);color:#fff}',
      '#fitnessAssistant .fa-step-dot.active small,#fitnessAssistant .fa-step-dot.done small{color:var(--fa-blue-dark);font-weight:700}',
      '#fitnessAssistant .fa-step{display:none}#fitnessAssistant .fa-step.active{display:block}',
      '#fitnessAssistant .fa-step-hint{margin:-4px 0 14px;color:var(--fa-muted);font-size:13px}',
      '#fitnessAssistant .fa-step-actions{display:flex;justify-content:space-between;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--fa-line)}',
      '#fitnessAssistant .fa-step-actions .fa-btn{width:auto;min-width:120px;text-align:center}',
      '@media(max-width:560px){#fitnessAssistant .fa-grid{grid-template-columns:1fr}#fitnessAssistant .fa-card{padding:13px}#fitnessAssistant .fa-table{font-size:12px}}'
    ].join('');
    document.head.appendChild(style);
  }
  function shell() {
    var page = root.dataset.page || 'details';
    var content = '';
    if (page === 'wizard') {
      content = '<div class="fa-stepper" aria-label="Wellness setup progress">' +
        '<div class="fa-step-dot" data-progress="details"><span>1</span><small>Details</small></div><i></i>' +
        '<div class="fa-step-dot" data-progress="diet"><span>2</span><small>Diet</small></div><i></i>' +
        '<div class="fa-step-dot" data-progress="fitness"><span>3</span><small>Fitness</small></div><i></i>' +
        '<div class="fa-step-dot" data-progress="reminders"><span>4</span><small>Wellbeing</small></div></div>' +
        '<section class="fa-step active" data-step="details"><div class="fa-card"><h3>Your Details</h3><p class="fa-step-hint">Start here. Your saved details are used to prepare the next steps.</p><form id="faForm" class="fa-grid">' +
        field('name', 'Name', 'text', 'Your name') + field('age', 'Age', 'number', 'Years', '5', '100') +
        field('height', 'Height (cm)', 'number', 'e.g. 170', '90', '230') + field('weight', 'Weight (kg)', 'number', 'e.g. 65', '25', '250') +
        selectField('gender', 'Gender', ['Female', 'Male', 'Other']) + selectField('activity', 'Activity level', ['Sedentary', 'Lightly active', 'Moderately active', 'Very active']) +
        selectField('goal', 'Goal', ['Lose weight', 'Maintain weight', 'Gain muscle']) + selectField('diet', 'Diet preference', ['Vegetarian', 'Vegan', 'Eggetarian', 'Non-vegetarian']) +
        field('allergies', 'Allergies / foods to avoid', 'text', 'e.g. nuts, dairy (optional)') + selectField('condition', 'Health condition', ['None', 'Diabetes', 'High blood pressure', 'High cholesterol', 'PCOS / Thyroid']) +
        '</form><div class="fa-note">General wellbeing information only, not medical advice. Your details are saved on this device.</div><div class="fa-step-actions"><span></span><button class="fa-btn" id="faSaveDetails" type="button">Save &amp; Continue →</button></div></div></section>' +
        '<section class="fa-step" data-step="diet"><div class="fa-card"><h3>Your Daily Target &amp; Meals</h3><div id="faDiet"></div><div class="fa-step-actions"><button class="fa-btn secondary" type="button" data-go="details">← Back</button><button class="fa-btn" type="button" data-go="fitness">Next: Fitness →</button></div></div></section>' +
        '<section class="fa-step" data-step="fitness"><div class="fa-card"><h3>Your Weekly Fitness Plan</h3><div id="faFitness"></div><div class="fa-step-actions"><button class="fa-btn secondary" type="button" data-go="diet">← Back</button><button class="fa-btn" type="button" data-go="reminders">Next: Wellbeing →</button></div></div></section>' +
        '<section class="fa-step" data-step="reminders"><div class="fa-card"><h3>Wellbeing Reminders <span id="faCount"></span></h3><div id="faReminderList" class="fa-list"></div></div>' +
        '<div class="fa-card"><h3>Add a custom reminder</h3><form id="faReminderForm" class="fa-grid"><div class="fa-field"><label for="faReminderTitle">Reminder title</label><input id="faReminderTitle" required maxlength="70" placeholder="e.g. Drink water"></div><div class="fa-field"><label for="faReminderTime">Time</label><input id="faReminderTime" type="time" required></div></form><div class="fa-actions"><button class="fa-btn" id="faReminderSave" type="button">Save reminder</button><button class="fa-btn secondary" id="faNotify" type="button">Enable browser alerts</button></div><div class="fa-note">Keep this page open for scheduled browser alerts. These are separate from medication reminders.</div><div class="fa-step-actions"><button class="fa-btn secondary" type="button" data-go="fitness">← Back</button><a class="fa-btn" href="patient-dashboard.html" style="text-decoration:none;">Finish</a></div></div></section>';
      root.innerHTML = '<div class="fa-head"><p>Complete each step to prepare your personal wellness plan.</p></div>' + content;
      if (profile) {
        Object.keys(profile).forEach(function (key) {
          var input = root.querySelector('[name="' + key + '"]');
          if (input) input.value = profile[key];
        });
      }
      return;
    }
    if (page === 'details') {
      content = '<div class="fa-card"><h3>Your Details</h3><form id="faForm" class="fa-grid">' +
        field('name', 'Name', 'text', 'Your name') + field('age', 'Age', 'number', 'Years', '5', '100') +
        field('height', 'Height (cm)', 'number', 'e.g. 170', '90', '230') + field('weight', 'Weight (kg)', 'number', 'e.g. 65', '25', '250') +
        selectField('gender', 'Gender', ['Female', 'Male', 'Other']) + selectField('activity', 'Activity level', ['Sedentary', 'Lightly active', 'Moderately active', 'Very active']) +
        selectField('goal', 'Goal', ['Lose weight', 'Maintain weight', 'Gain muscle']) + selectField('diet', 'Diet preference', ['Vegetarian', 'Vegan', 'Eggetarian', 'Non-vegetarian']) +
        field('allergies', 'Allergies / foods to avoid', 'text', 'e.g. nuts, dairy (optional)') + selectField('condition', 'Health condition', ['None', 'Diabetes', 'High blood pressure', 'High cholesterol', 'PCOS / Thyroid']) +
        '</form><div class="fa-actions"><button class="fa-btn" id="faGenerate" type="button">Save my details</button></div><div class="fa-note">General wellbeing information only, not medical advice. Your details are saved on this device.</div></div>';
    } else if (page === 'diet') {
      content = '<div class="fa-card"><h3>Your Daily Target &amp; Meals</h3><div id="faDiet"></div></div>';
    } else if (page === 'fitness') {
      content = '<div class="fa-card"><h3>Your Weekly Fitness Plan</h3><div id="faFitness"></div></div>';
    } else if (page === 'reminders') {
      content = '<div class="fa-card"><h3>Wellbeing Reminders <span id="faCount"></span></h3><div id="faReminderList" class="fa-list"></div></div>' +
        '<div class="fa-card"><h3>Add a custom reminder</h3><form id="faReminderForm" class="fa-grid"><div class="fa-field"><label for="faReminderTitle">Reminder title</label><input id="faReminderTitle" required maxlength="70" placeholder="e.g. Drink water"></div><div class="fa-field"><label for="faReminderTime">Time</label><input id="faReminderTime" type="time" required></div></form><div class="fa-actions"><button class="fa-btn" id="faReminderSave" type="button">Save reminder</button><button class="fa-btn secondary" id="faNotify" type="button">Enable browser alerts</button></div><div class="fa-note">Keep this page open for scheduled browser alerts. These are separate from medication reminders.</div></div>';
    }
    root.innerHTML = '<div class="fa-head"><h2>' + ({ details: '📝 Your Details', diet: '🥗 Diet Plan', fitness: '🏃 Fitness Checking', reminders: '⏰ Wellbeing Reminders' }[page] || 'Fitness Checking') + '</h2><p>Fitness Assistant</p></div>' + content;
    if (profile) {
      Object.keys(profile).forEach(function (key) {
        var input = root.querySelector('[name="' + key + '"]');
        if (input) input.value = profile[key];
      });
    }
  }
  function field(name, label, type, placeholder, min, max) {
    return '<div class="fa-field"><label for="fa-' + name + '">' + label + '</label><input id="fa-' + name + '" name="' + name + '" type="' + type + '" placeholder="' + placeholder + '"' + (min ? ' min="' + min + '"' : '') + (max ? ' max="' + max + '"' : '') + (name === 'name' ? ' required maxlength="70"' : name === 'allergies' ? ' maxlength="120"' : ' required') + '></div>';
  }
  function selectField(name, label, options) {
    return '<div class="fa-field"><label for="fa-' + name + '">' + label + '</label><select id="fa-' + name + '" name="' + name + '">' + options.map(function (option) { return '<option>' + option + '</option>'; }).join('') + '</select></div>';
  }
  function makePlan(p) {
    var heightM = Number(p.height) / 100;
    var bmi = Number(p.weight) / (heightM * heightM);
    var base = 10 * Number(p.weight) + 6.25 * Number(p.height) - 5 * Number(p.age) + (p.gender === 'Male' ? 5 : p.gender === 'Female' ? -161 : -78);
    var factor = { Sedentary: 1.2, 'Lightly active': 1.375, 'Moderately active': 1.55, 'Very active': 1.725 }[p.activity] || 1.2;
    var target = Math.round(Math.max(p.gender === 'Female' ? 1200 : 1500, base * factor + (p.goal === 'Lose weight' ? -300 : p.goal === 'Gain muscle' ? 250 : 0)));
    var food = MEALS[p.diet] || MEALS.Vegetarian;
    var allergies = String(p.allergies || '').toLowerCase().split(/[,;/]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var safeFood = food.filter(function (item) { return !allergies.some(function (a) { return a && item.toLowerCase().indexOf(a) !== -1; }); });
    if (!safeFood.length) safeFood = ['Choose a meal that avoids your listed allergens; consult a dietitian if unsure.'];
    var meals = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
    var workout = WORKOUTS[p.goal] || WORKOUTS['Maintain weight'];
    return { bmi: bmi, bmiLabel: bmi < 18.5 ? 'Below 18.5' : bmi < 25 ? '18.5–24.9' : bmi < 30 ? '25–29.9' : '30+', calories: target, meals: meals.map(function (name, i) { return { name: name, food: safeFood[i % safeFood.length] }; }), workout: workout };
  }
  function goToStep(step, addHistory) {
    var steps = ['details', 'diet', 'fitness', 'reminders'];
    if (steps.indexOf(step) === -1) step = 'details';
    if (step !== 'details' && !profile) {
      step = 'details';
      if (root.dataset.page === 'wizard') alert('Complete and save Your Details first.');
    }
    root.querySelectorAll('.fa-step').forEach(function (panel) {
      panel.classList.toggle('active', panel.dataset.step === step);
    });
    var currentIndex = steps.indexOf(step);
    root.querySelectorAll('.fa-step-dot').forEach(function (dot) {
      var dotIndex = steps.indexOf(dot.dataset.progress);
      dot.classList.toggle('active', dotIndex === currentIndex);
      dot.classList.toggle('done', dotIndex < currentIndex);
    });
    if (root.dataset.page === 'wizard' && addHistory && window.location.hash !== '#' + step) {
      window.history.pushState({ fitnessStep: step }, '', '#' + step);
    }
    if (step === 'reminders') checkDue();
  }
  function renderPlan() {
    var diet = root.querySelector('#faDiet');
    var fitness = root.querySelector('#faFitness');
    if (!diet && !fitness) return;
    if (!profile) {
      if (diet) diet.innerHTML = '<div class="fa-empty">No details saved yet. Add details before using this page.</div>';
      if (fitness) fitness.innerHTML = '<div class="fa-empty">No details saved yet. Add details before using this page.</div>';
      return;
    }
    var plan = makePlan(profile);
    save(STORE.plan, plan);
    if (diet) diet.innerHTML = '<div class="fa-stats"><div class="fa-stat"><b>' + plan.calories.toLocaleString() + '</b><span>Estimated kcal/day</span></div><div class="fa-stat"><b>' + plan.bmi.toFixed(1) + '</b><span>BMI estimate</span></div><div class="fa-stat"><b>' + plan.bmiLabel + '</b><span>BMI reference range</span></div></div><table class="fa-table"><tbody>' + plan.meals.map(function (meal) { return '<tr><td><strong>' + meal.name + '</strong></td><td>' + escapeHtml(meal.food) + '</td></tr>'; }).join('') + '</tbody></table><div class="fa-note">Calories and BMI are rough estimates, not a diagnosis or treatment plan. Ask a qualified clinician before making changes, especially if you have a health condition.</div>';
    if (fitness) fitness.innerHTML = '<table class="fa-table"><tbody>' + plan.workout.map(function (workout, i) { return '<tr><td><strong>' + DAYS[i] + '</strong></td><td>' + escapeHtml(workout) + '</td></tr>'; }).join('') + '</tbody></table><div class="fa-note">Choose an intensity that feels safe for you. Stop if you feel pain, dizziness or unusual shortness of breath.</div>';
  }
  function makeDefaultReminders() {
    if (!profile) return;
    var custom = reminders.filter(function (item) { return item.custom; });
    var generated = [
      { title: 'Meal: breakfast', time: '08:00' },
      { title: 'Meal: lunch', time: '13:00' },
      { title: 'Meal: dinner', time: '19:30' },
      { title: 'Drink water', time: '11:00' },
      { title: 'Fitness activity', time: '18:00' }
    ].map(function (item) { return { id: 'fa-' + item.title.replace(/\W/g, '') + '-' + item.time, title: item.title, time: item.time, enabled: true, custom: false }; });
    reminders = generated.concat(custom);
    save(STORE.reminders, reminders);
  }
  function renderReminders() {
    var list = root.querySelector('#faReminderList');
    if (!list) return;
    root.querySelector('#faCount').textContent = reminders.length ? '(' + reminders.length + ')' : '';
    list.innerHTML = reminders.length ? reminders.slice().sort(function (a, b) { return a.time.localeCompare(b.time); }).map(function (item) {
      return '<div class="fa-row"' + (item.enabled ? '' : ' style="opacity:.55"') + '><div><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.time) + ' · ' + (item.custom ? 'Custom' : 'Daily plan') + '</small></div><div class="fa-actions" style="margin:0"><button class="fa-delete" type="button" data-act="toggle" data-id="' + escapeHtml(item.id) + '" aria-label="Toggle reminder">' + (item.enabled ? '🔔' : '🔕') + '</button><button class="fa-delete" type="button" data-act="delete" data-id="' + escapeHtml(item.id) + '" aria-label="Delete reminder">🗑️</button></div></div>';
    }).join('') : '<div class="fa-empty">No reminders yet.</div>';
  }
  function checkDue() {
    var now = new Date();
    var day = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    reminders.forEach(function (item) {
      if (!item.enabled) return;
      var key = day + '|' + item.id + '|' + item.time;
      var parts = item.time.split(':');
      var due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(parts[0]), Number(parts[1]));
      if (!fired[key] && now >= due && now - due < 60000) {
        fired[key] = true;
        save(STORE.fired, fired);
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('Fitness reminder', { body: item.title }); } catch (error) { /* ignore */ }
        }
      }
    });
  }
  function bind() {
    root.addEventListener('click', function (event) {
      var stepButton = event.target.closest('[data-go]');
      if (stepButton && root.dataset.page === 'wizard') {
        goToStep(stepButton.dataset.go, true);
        return;
      }
      if (event.target.id === 'faGenerate' || event.target.id === 'faSaveDetails') {
        var form = root.querySelector('#faForm');
        if (!form.reportValidity()) return;
        profile = Object.fromEntries(new FormData(form).entries());
        profile.age = Number(profile.age); profile.height = Number(profile.height); profile.weight = Number(profile.weight);
        save(STORE.profile, profile); renderPlan(); makeDefaultReminders(); renderReminders();
        if (root.dataset.page === 'wizard') goToStep('diet', true);
        return;
      }
      if (event.target.id === 'faReminderSave') {
        var reminderForm = root.querySelector('#faReminderForm');
        if (!reminderForm.reportValidity()) return;
        reminders.push({ id: 'custom-' + Date.now().toString(36), title: root.querySelector('#faReminderTitle').value.trim(), time: root.querySelector('#faReminderTime').value, enabled: true, custom: true });
        save(STORE.reminders, reminders); reminderForm.reset(); renderReminders(); return;
      }
      if (event.target.id === 'faNotify') {
        if (!('Notification' in window)) { alert('This browser does not support notifications.'); return; }
        Notification.requestPermission().then(function (permission) { alert(permission === 'granted' ? 'Browser alerts enabled.' : 'Browser alerts were not enabled.'); }); return;
      }
      var action = event.target.closest('[data-act]');
      if (action) {
        var id = action.dataset.id;
        if (action.dataset.act === 'delete') reminders = reminders.filter(function (item) { return item.id !== id; });
        else reminders.forEach(function (item) { if (item.id === id) item.enabled = !item.enabled; });
        save(STORE.reminders, reminders); renderReminders();
      }
    });
  }
  function init() {
    root = document.getElementById('fitnessAssistant');
    if (!root) return;
    addStyles(); shell(); bind(); renderPlan(); renderReminders();
    if (profile && !reminders.length) { makeDefaultReminders(); renderReminders(); }
    if (root.dataset.page === 'wizard') {
      goToStep(window.location.hash.slice(1) || 'details', false);
      window.addEventListener('hashchange', function () { goToStep(window.location.hash.slice(1), false); });
      window.addEventListener('popstate', function () { goToStep(window.location.hash.slice(1), false); });
    }
    if (root.dataset.page === 'reminders' || root.dataset.page === 'wizard') { checkDue(); timer = window.setInterval(checkDue, 30000); }
    window.addEventListener('pagehide', function () { if (timer) window.clearInterval(timer); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
