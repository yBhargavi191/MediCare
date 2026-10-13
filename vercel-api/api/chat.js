// ===================================================================
// MediCare — AI Assistant chat relay (Vercel serverless, FREE)
// ===================================================================
// Rule-based health-assistant responder for caremate.html.
// No API key, no cost, no external calls.
//
//   POST /api/chat   { "message": "...", "history": [...] }  ->  { "content": "..." }
//   GET  /api/chat   -> status page
//
// CORS is open so the Firebase-hosted site (www) can call this relay.
//
// Rules score their keyword hits, so the most relevant topic wins instead
// of whichever rule happens to be listed first. Keep this rule set in sync
// with js/caremate-chat.js (the in-page engine that runs by default).
// ===================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const EMERGENCY = /(chest pain|chest tightness|pain in .*chest|can'?t breathe|cannot breathe|difficulty breathing|trouble breathing|shortness of breath|breathless|heart attack|cardiac arrest|stroke|face droop|arm weakness|slurred speech|unconscious|unresponsive|passed out|severe bleeding|bleeding heavily|gushing|overdose|suicide|kill myself|want to die|self[- ]?harm|choking|anaphylaxis|severe allergic)/i;

const EMERGENCY_REPLY =
  'If this may be a **medical emergency**, please call **112** now (or **108** for an ambulance in India). Do not wait. \uD83D\uDC99\n\n' +
  'If you can, stay with someone and keep your phone nearby. I am here, but emergency services can help fastest.';

// Weighted keyword rules — the highest total score wins (ties favour the
// rule listed first). Latin words use \b boundaries so "cold" is not found
// inside "cold storage".
const rx = (re, w) => ({ re, w: w || 1 });

const RULES = [
  {
    id: 'missed',
    link: { url: 'medication-reminders.html', label: 'Open Medication Reminders' },
    reply: 'It happens \u2014 don\'t be hard on yourself. \uD83D\uDC99\n\n**What to do now:**\n- If you remember soon after the missed time, take it.\n- If it is nearly time for the next dose, skip the missed one \u2014 **never double up** unless your doctor said so.\n- Note it down so your caregiver can see.\n\nIf you miss doses often, tell your doctor or pharmacist.',
    match: [rx(/(missed|forgot|skipped)[^.!?]*?(dose|med|tablet|pill|medicine)/i, 4)]
  },
  {
    id: 'meds',
    link: { url: 'medication-reminders.html', label: 'Open Medication Reminders' },
    reply: 'I can help you stay on track with your medicines. \uD83D\uDC8A\n\n**Quick tips:**\n- Take each dose at the same time daily.\n- Use a pill organiser or your MediCare reminders.\n- Tick each dose off after taking it.\n\nWhich medicine and dose are you asking about?',
    match: [
      rx(/\b(remind|reminder|reminders|reminded)\b/i, 2),
      rx(/\b(med|meds|medication|medications|medicine|medicines|tablet|tablets|pill|pills|dose|doses|dosage|prescription|prescriptions)\b/i, 1)
    ]
  },
  {
    id: 'diabetes',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For blood sugar care:\n\n**Food:** regular, balanced meals; limit sugary and refined foods.\n**Movement:** a short walk after meals helps.\n**Monitoring:** follow your testing schedule and keep a log.\n\nNever change insulin or tablet doses without your doctor. **Urgent** if there is very high sugar with vomiting, deep breathing or drowsiness.',
    match: [
      rx(/\b(diabetes|diabetic|glucose)\b/i, 3),
      rx(/\b(blood sugar|sugar level|sugar levels)\b/i, 3),
      rx(/\bsugar\b/i, 1)
    ]
  },
  {
    id: 'bp',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For blood pressure:\n\n**Everyday:** less salt, more vegetables, regular walks, less stress, no tobacco.\n**Monitoring:** check at the same time each day, sit and rest 5 minutes first.\n\nTake BP medicines exactly as prescribed \u2014 do not stop them on your own. **Call 112** for very high BP with headache, chest pain or breathlessness.',
    match: [
      rx(/\b(blood pressure|hypertension|hypotension)\b/i, 3),
      rx(/\bbp\b/i, 3)
    ]
  },
  {
    id: 'fever',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For a mild fever: rest, drink fluids, and wear light clothing. \uD83E\uDD12\n\nParacetamol can help bring down a fever in adults when taken as directed \u2014 follow the packet or your doctor\'s advice.\n\n**See a doctor soon if:** fever lasts more than 3 days, is very high, or comes with severe headache, breathlessness, rash or confusion.',
    match: [
      rx(/\b(fever|feverish)\b/i, 3),
      rx(/\b(my|his|her|body|running a)\s+temperature\b/i, 2),
      rx(/\b(chills?|shivering)\b/i, 2)
    ]
  },
  {
    id: 'cold',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For a common cold or cough: warm fluids, honey in warm water (not for infants under 1), steam inhalation, and rest. \uD83C\uDF75\n\n**See a doctor if:** it lasts over a week, breathing is hard, you cough blood, or there is high fever.',
    match: [
      rx(/\b(cold|cough|coughing)\b/i, 1),
      rx(/\b(sore throat|throat|flu|influenza)\b/i, 2),
      rx(/\b(sneeze|sneezing|sneezes|congestion|runny nose|blocked nose)\b/i, 2)
    ]
  },
  {
    id: 'headache',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'Try a quiet, dark room, hydration, and a cold pack on the forehead. \uD83E\uDDE0\n\nAvoid taking painkillers too often \u2014 that can cause rebound headaches. **Seek urgent care** for a sudden severe "worst-ever" headache, or one with weakness, vision change, fever or neck stiffness.',
    match: [rx(/\b(headache|headaches|migraine|migraines)\b/i, 3)]
  },
  {
    id: 'pain',
    link: { url: 'nearby-hospitals.html', label: 'Find Nearby Hospitals' },
    reply: 'Sorry you are uncomfortable. \uD83D\uDC99\n\nRest the area, and gentle heat or cold can help. Take pain relief only as directed.\n\n**Get medical help** if pain is severe, sudden, or comes with numbness, weakness, or trouble breathing.',
    match: [rx(/\b(pain|painful|pains|ache|aches|aching|hurt|hurts|hurting|sore|soreness)\b/i, 1)]
  },
  {
    id: 'nausea',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'Nausea and vomiting are usually short-lived. \uD83D\uDC99\n\n**Now:** sip water or ORS in small amounts, eat plain food (rice, toast, banana) and rest. Avoid heavy, oily or spicy food.\n\n**See a doctor if:** it lasts over 2 days, you cannot keep fluids down, there is blood, severe pain, or signs of dehydration (very dry mouth, dark urine, dizziness).',
    match: [rx(/\b(nausea|nauseous|nauseated|vomit|vomiting|vomited|throwing up|throw up)\b/i, 3)]
  },
  {
    id: 'diarrhea',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For loose motions: \uD83D\uDCA7\n\n**Important:** replace fluids \u2014 water, ORS, coconut water or rice water, in small sips often.\nEat light: rice, curd, banana, toast. Avoid oily, spicy and milk for a day or two.\n\n**See a doctor if:** blood in stool, high fever, it lasts over 2 days, or signs of dehydration.',
    match: [rx(/\b(diarrhea|diarrhoea|loose motion|loose motions|loose stool|loose stools)\b/i, 3)]
  },
  {
    id: 'acidity',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For acidity, gas or heartburn: \uD83C\uDF75\n\n- Eat smaller, regular meals; avoid very spicy, oily or late-night food.\n- Cut down tea, coffee, alcohol and smoking.\n- Do not lie down for 2-3 hours after eating.\n\n**See a doctor if:** pain is severe, you have trouble swallowing, black stools, or it keeps coming back.',
    match: [rx(/\b(acidity|acid reflux|heartburn|gastric|gastritis|gas|bloating|bloated|indigestion)\b/i, 3)]
  },
  {
    id: 'constipation',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For constipation: \uD83E\uDD57\n\n- More fibre: vegetables, fruit, whole grains, salad.\n- 6-8 glasses of water a day.\n- A short walk after meals, and try to keep a regular toilet time.\n\n**See a doctor** if it lasts over 2 weeks, or with blood, severe pain or weight loss.',
    match: [rx(/\b(constipation|constipated|hard stool|hard stools)\b/i, 3)]
  },
  {
    id: 'allergy',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For skin rashes, itching or allergies: \uD83D\uDC99\n\n- Do not scratch; keep the area clean and cool.\n- Note any new food, medicine, soap or plant that started it.\n- A cool compress or calamine can soothe the itching.\n\n**Get urgent help** if there is swelling of the lips or tongue, trouble breathing, or a sudden rash all over.',
    match: [rx(/\b(allergy|allergies|allergic|rash|rashes|hives|itch|itchy|itching|skin|eczema|pimples?)\b/i, 3)]
  },
  {
    id: 'dizziness',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'Feeling dizzy or light-headed: \uD83D\uDC99\n\n- Sit or lie down right away to avoid a fall.\n- Drink water \u2014 dehydration is a common cause.\n- Stand up slowly, and eat something if you have skipped a meal.\n\n**Seek care** if it is sudden, or with weakness, slurred speech, chest pain or fainting.',
    match: [rx(/\b(dizzy|dizziness|giddy|light[- ]?headed|faint|fainting|fainted)\b/i, 3)]
  },
  {
    id: 'injury',
    link: { url: 'nearby-hospitals.html', label: 'Find Nearby Hospitals' },
    reply: 'For a cut, wound, burn or sprain: \uD83E\uDE79\n\n- Clean a small cut with water; press with a clean cloth if bleeding.\n- For a sprain: rest, ice for 15-20 minutes, and keep it raised.\n- For a burn: cool under running water for 20 minutes; do not apply butter or toothpaste.\n\n**Go to hospital** for deep or large wounds, heavy bleeding, a burn bigger than the palm, a suspected fracture, or a dog/snake bite.',
    match: [rx(/\b(injury|injured|wound|wounds|cut|cuts|bleeding|burn|burns|burned|burnt|scald|scalded|fracture|broken bone|sprain|bruise|accident|fell down|dog bite|snake bite|insect bite)\b/i, 2)]
  },
  {
    id: 'eye',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For eye problems: \uD83D\uDC41\uFE0F\n\n- Rest your eyes; blink often and follow the 20-20-20 rule (every 20 min, look 20 feet away for 20 seconds).\n- Do not rub the eye; rinse with clean water if something went in.\n\n**See a doctor urgently** for sudden vision loss, severe pain, an injury, or a red, painful eye.',
    match: [
      rx(/\b(eye|eyes)\b/i, 4),
      rx(/\b(vision|blurry vision|blurred vision|eye pain|conjunctivitis)\b/i, 3)
    ]
  },
  {
    id: 'ear',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For ear problems: \uD83D\uDC99\n\n- Do not put oil, water or cotton buds inside the ear.\n- For mild pain, a warm compress can help; take pain relief as directed.\n\n**See a doctor** if there is discharge, hearing loss, severe pain, or fever with earache.',
    match: [rx(/\b(ear|ears|earache|hearing|tinnitus)\b/i, 2)]
  },
  {
    id: 'dental',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For tooth or gum problems: \uD83E\uDDB7\n\n- Rinse with warm salt water; brush gently with a soft brush.\n- Avoid very hot, cold or sweet food until it settles.\n\n**See a dentist** for ongoing toothache, swelling of the face, bleeding gums or a loose tooth.',
    match: [rx(/\b(teeth|tooth|toothache|dental|gum|gums|dentist)\b/i, 3)]
  },
  {
    id: 'urinary',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For urine or kidney problems: \uD83D\uDCA7\n\n- Drink plenty of water, and do not hold urine for long.\n\n**See a doctor soon** for burning or pain when passing urine, blood in urine, fever with back pain, or difficulty passing urine.',
    match: [rx(/\b(urine|urinary|urination|urinating|pee|peeing|bladder|kidney stone)\b/i, 3)]
  },
  {
    id: 'menstrual',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For period problems: \uD83D\uDC99\n\n- A warm compress or warm bath eases cramps; light walking helps too.\n- Rest, water and iron-rich food (greens, beans) help.\n\n**See a doctor** if bleeding is very heavy, pain is severe, or periods are very irregular or missed.',
    match: [rx(/\b(period|periods|menstrual|menstruation|pms)\b/i, 3)]
  },
  {
    id: 'pregnancy',
    link: { url: 'appointments.html', label: 'Book an Appointment' },
    reply: 'Take it gently, and congratulations. \uD83D\uDC99\n\n- Keep your regular check-ups and the medicines or vitamins your doctor prescribes.\n- Balanced food, plenty of water, gentle walks and enough rest.\n- Avoid alcohol, smoking, and any medicine not approved by your doctor.\n\n**Contact your clinic urgently** for bleeding, severe pain, swelling, or reduced baby movement.',
    match: [rx(/\b(pregnant|pregnancy|expecting a baby|prenatal)\b/i, 3)]
  },
  {
    id: 'child',
    link: { url: 'appointments.html', label: 'Book an Appointment' },
    reply: 'For your little one: \uD83D\uDC99\n\n- Keep fluids going, and watch for fever, appetite and urine output.\n- Follow the doctor\'s doses exactly \u2014 children\'s doses differ from adults\'.\n\n**See a doctor** for high fever in a young baby, breathing difficulty, unusual drowsiness, or not drinking.',
    match: [rx(/\b(baby|babies|infant|newborn|toddler|child|children|kid|kids|my son|my daughter)\b/i, 1)]
  },
  {
    id: 'vaccine',
    link: { url: 'appointments.html', label: 'Book an Appointment' },
    reply: 'Vaccines protect you and those around you. \uD83D\uDC89\n\n- Keep to the schedule your clinic gives, and keep the card safe.\n- Mild fever or soreness for a day or two is common.\n\n**See a doctor** for severe swelling, breathing trouble or high fever after a shot.',
    match: [rx(/\b(vaccine|vaccines|vaccination|vaccinated|immunization|immunisation|booster|injection)\b/i, 3)]
  },
  {
    id: 'labtest',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'Reading a test report: \uD83E\uDDFE\n\n- One abnormal number is not a diagnosis \u2014 it is read together with your symptoms and history.\n- Keep old reports so the trend can be seen.\n\n**Please show reports to your doctor.** I cannot interpret them for you.',
    match: [rx(/\b(blood test|lab test|test report|test result|test results|report|reports|scan|x-?ray|ecg|mri|ultrasound|urine test|hemoglobin)\b/i, 3)]
  },
  {
    id: 'covid',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'For COVID or a flu-like illness: \uD83E\uDD12\n\n- Rest, drink fluids, and take paracetamol as directed if there is fever.\n- Isolate to protect others, and wear a mask around family.\n\n**Get urgent care** for breathlessness, chest pain, confusion or very low oxygen.',
    match: [rx(/\b(covid|covid-19|corona|coronavirus)\b/i, 3)]
  },
  {
    id: 'weight',
    link: { url: 'diet-plan.html', label: 'Open Diet Plan' },
    reply: 'For a healthy weight: \uD83C\uDF3F\n\n- Half the plate vegetables; whole grains; some protein at each meal.\n- Limit sugary drinks and deep-fried food.\n- Aim for about 30 minutes of movement most days, and steady, gradual change.\n\nAvoid crash diets \u2014 slow and steady lasts. If you have a condition, follow your doctor or dietitian\'s plan.',
    match: [
      rx(/\b(weight loss|lose weight|losing weight|weight gain|gain weight|obesity|obese|overweight|underweight|bmi)\b/i, 3),
      rx(/\bweight\b/i, 2)
    ]
  },
  {
    id: 'habits',
    link: { url: 'health-records.html', label: 'Open Health Records' },
    reply: 'Cutting down smoking or alcohol helps almost every health problem. \uD83D\uDC99\n\n- Set a quit date, and tell someone who can support you.\n- Replace the habit with water, a short walk or chewing gum.\n- Ask your doctor \u2014 patches, gum or counselling can make quitting easier.\n\nYou do not have to do it alone.',
    match: [rx(/\b(smoking|smoke|smoker|smokers|cigarette|cigarettes|tobacco|vaping|vape|alcohol|alcoholic|drinking alcohol|quit drinking|quit smoking)\b/i, 3)]
  },
  {
    id: 'fitness',
    link: { url: 'fitness-plan.html', label: 'Open Fitness Plan' },
    reply: 'Steady beats hard \u2014 small, regular movement wins. \uD83C\uDF3F\n\n**Start with one:**\n- A 15-minute walk after meals\n- Stretch for 2 minutes every hour\n- 4-4-6 breathing: in 4s, hold 4s, out 6s\n\nBuild up gradually, and stop if you feel unwell.',
    match: [rx(/\b(exercise|exercising|workout|workouts|fitness|walk|walking|jog|jogging|running|yoga|steps|gym|active|activity|stretch|stretching)\b/i, 1)]
  },
  {
    id: 'diet',
    link: { url: 'diet-plan.html', label: 'Open Diet Plan' },
    reply: 'Here are gentle, practical food habits. \uD83E\uDD57\n\n**Try to:**\n- Fill half your plate with vegetables\n- Choose whole grains over refined\n- Limit sugary drinks and deep-fried food\n- Keep some protein at each meal\n\nIf you have diabetes or kidney/heart conditions, follow your doctor\'s or dietitian\'s plan.',
    match: [
      rx(/\b(diet|diets|food|foods|meal|meals|nutrition|eat|eating|ate|calorie|calories|salt|cholesterol)\b/i, 1),
      rx(/\bsugar\b/i, 1)
    ]
  },
  {
    id: 'water',
    link: { url: 'diet-plan.html', label: 'Open Diet Plan' },
    reply: 'Hydration helps everything from energy to digestion. \uD83D\uDCA7\n\nAim for **6-8 glasses of water a day**, more in hot weather or with activity. Drink a glass with each meal as an easy habit.',
    match: [rx(/\b(water|hydration|hydrate|hydrated|thirsty)\b/i, 2)]
  },
  {
    id: 'sleep',
    reply: 'Rest is part of treatment too. \uD83C\uDF19\n\n**Tonight:**\n- Same bedtime and wake time daily\n- No screens ~30 minutes before bed\n- Keep the room cool and dark\n- Skip caffeine after the afternoon\n\nIf poor sleep continues for weeks, mention it to your doctor.',
    match: [rx(/\b(sleep|sleeping|insomnia|tired|tiredness|fatigue|rest|resting|nap|napping)\b/i, 2)]
  },
  {
    id: 'stress',
    reply: 'Thank you for sharing that \u2014 it matters. \uD83D\uDC99\n\n**Right now:** slow breathing (4-4-6), a short walk, or a call to someone you trust can ease the moment.\n\nIf sadness, worry or panic is lasting or heavy, please talk to a doctor or a counsellor \u2014 that is a sign of strength, not weakness. If you ever feel unsafe, call **112**.',
    match: [rx(/\b(stress|stressed|stressful|anxious|anxiety|depress|depressed|depression|sad|mental|lonely|panic|panicking|worried|worry)\b/i, 2)]
  },
  {
    id: 'doctor',
    link: { url: 'appointments.html', label: 'Book an Appointment' },
    reply: 'I can help you prepare. \uD83E\uDE7A\n\n**Next step:** book your regular GP or clinic. Before you go, note:\n- Your symptoms and how long you\'ve had them\n- All medicines and doses\n- Any recent test results\n\nWould you like a short note to send them?',
    match: [rx(/\b(doctor|doctors|appointment|appointments|clinic|hospital|consult|consultation|physician|surgeon|specialist|checkup|check-up|gp)\b/i, 2)]
  },
  {
    id: 'thanks',
    reply: 'You\'re most welcome. \uD83D\uDC99 Take care of yourself \u2014 I\'m here whenever you need.',
    match: [rx(/\b(thank|thanks|thank you|thankyou|dhanyavad|shukriya|nandri)\b/i, 3)]
  },
  {
    id: 'about',
    reply: 'I\'m your **AI health companion** on MediCare. \uD83E\uDD16\n\nI can help with medicine reminders, missed doses, fitness, diet, sleep, stress and general health questions. I give general information \u2014 not medical advice \u2014 so please see a doctor for anything serious.',
    match: [rx(/\b(who are you|your name|what can you do|what do you do|help me|how are you|are you a doctor|are you human)\b/i, 1)]
  },
  {
    id: 'greeting',
    reply: 'Hello, good to see you! \uD83D\uDC99 I can help with **medications, reminders, fitness, diet, sleep, stress and general health questions**. What would you like to talk about?',
    match: [rx(/\b(hi|hello|hey|namaste|namaskaram|vanakkam|good (morning|afternoon|evening))\b/i, 1)]
  }
];

const FALLBACK =
  'I\'m not sure I have the right answer for that one. \uD83D\uDC99\n\n' +
  'Could you tell me a bit more? For example, is it about a **medicine**, **diet**, **sleep**, **pain or a symptom**, **fitness**, **stress**, or something else?\n\n' +
  'If it is urgent or getting worse, please see a doctor \u2014 and call **112** in an emergency.';

export default async function handler(request, response) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.setHeader(k, v));
  if (request.method === 'OPTIONS') return response.status(204).end();

  if (request.method === 'GET') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(200).send(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MediCare AI Assistant</title></head>' +
      '<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#e8f5fa;color:#23404f;text-align:center;">' +
      '<div><div style="font-size:52px;">&#129302;</div><h1 style="margin:8px 0;">MediCare AI Assistant</h1>' +
      '<p style="opacity:.8;">Rule-based health companion.<br>Status: <strong>&#9989; Running</strong></p>' +
      '<p style="font-size:13px;opacity:.6;">POST /api/chat &middot; { message }</p></div></body></html>'
    );
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const payload = await readBody(request);
  const message = String(payload.message || '').trim();
  if (!message) return response.status(400).json({ error: 'Missing message' });

  return response.status(200).json(respond(message));
}

function respond(text) {
  if (EMERGENCY.test(text)) {
    return { content: EMERGENCY_REPLY, link: { url: 'emergency-contacts.html', label: 'Open Emergency Contacts' } };
  }

  let best = null;
  let bestScore = 0;
  for (const rule of RULES) {
    let score = 0;
    for (const entry of rule.match) {
      if (entry.re.test(text)) score += entry.w || 1;
    }
    if (score > bestScore) { bestScore = score; best = rule; }
  }

  if (best) {
    return best.link ? { content: best.reply, link: best.link } : { content: best.reply };
  }
  return { content: FALLBACK };
}

// Accepts JSON (what caremate.html sends) plus urlencoded/multipart fallbacks.
async function readBody(request) {
  const body = request.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;

  let raw = '';
  if (typeof body === 'string') {
    raw = body;
  } else if (Buffer.isBuffer(body)) {
    raw = body.toString('utf8');
  } else {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    raw = Buffer.concat(chunks).toString('utf8');
  }

  const type = String(request.headers['content-type'] || '');

  if (type.includes('application/json')) {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }

  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }

  if (type.includes('multipart/form-data')) {
    const out = {};
    const re = /name="([^"]+)"\r?\n\r?\n([\s\S]*?)\r?\n--/g;
    let match;
    while ((match = re.exec(raw))) out[match[1]] = match[2];
    return out;
  }

  try { return JSON.parse(raw); } catch (_) { return {}; }
}
