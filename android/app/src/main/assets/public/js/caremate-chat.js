/* ===================================================================
 * MediCare - AI Assistant rule engine (browser, FREE)
 * ===================================================================
 * This is the same rule set the /api/chat relay uses (see
 * vercel-api/api/chat.js), but it runs inside the page. That way typed
 * chat works on the deployed site, in the offline PWA and in the Android
 * build - with no server, no API key and no cost.
 *
 *   window.MediCareChat.respond('I missed my dose')
 *     -> { content: '...', contentEn: '...', link: { url, label } }
 *
 *   window.MediCareChat.respond('నా మందు మర్చిపోయాను', 'te')
 *     -> the reply comes back in Telugu
 *
 * Matching understands English plus Telugu / Hindi / Tamil / Kannada /
 * Malayalam / Marathi / Bengali keywords, so a question spoken or typed in
 * any of those scripts reaches the right topic. `lang` selects the language
 * of the *answer*; `contentEn` is always the English wording, which the page
 * speaks when the device has no text-to-speech voice for that language.
 *
 * Rules score their keyword hits, so the most relevant topic wins instead
 * of whichever rule happens to be listed first. Keep this rule set in sync
 * with vercel-api/api/chat.js.
 * =================================================================== */
(function (global) {
  'use strict'

  var EMERGENCY = /(chest pain|chest tightness|pain in .*chest|can'?t breathe|cannot breathe|difficulty breathing|trouble breathing|shortness of breath|breathless|heart attack|cardiac arrest|stroke|face droop|arm weakness|slurred speech|unconscious|unresponsive|passed out|severe bleeding|bleeding heavily|gushing|overdose|suicide|kill myself|want to die|self[- ]?harm|choking|anaphylaxis|severe allergic|ఛాతీ నొప్పి|ఛాతి నొప్పి|గుండెపోటు|ఊపిరి|శ్వాస ఆడటం లేదు|పక్షవాతం|రక్తస్రావం|ఆత్మహత్య|सीने में दर्द|हार्ट अटैक|सांस नहीं|बेहोश|खून बह|आत्महत्या|மார்பு வலி|மாரடைப்பு|மூச்சு விட|மயக்கம்|ಎದೆ ನೋವು|ಹೃದಯಾಘಾತ|ಉಸಿರು|ಪ್ರಜ್ಞೆ|ರಕ್ತಸ್ರಾವ|ഹൃദയാഘാതം|നെഞ്ചുവേദന|ശ്വാസം|ബോധം|രക്തസ്രാവം|छातीत दुखणे|हृदयविकार|श्वास|बेशुद्ध|रक्तस्राव|বুকে ব্যথা|হার্ট অ্যাটাক|শ্বাস|অচেতন|রক্তক্ষরণ)/i;

  var EMERGENCY_REPLY =
    'If this may be a **medical emergency**, please call **112** now (or **108** for an ambulance in India). Do not wait. 💙\n\n' +
    'If you can, stay with someone and keep your phone nearby. I am here, but emergency services can help fastest.';

  // Weighted keyword rules - the highest total score wins (ties favour the
  // rule listed first). Latin words use \b boundaries so "cold" is not found
  // inside "cold storage"; Indic keywords are plain substrings because
  // JavaScript \b does not work across those scripts.
  function rx(pattern, w) { return { re: pattern, w: w || 1 }; }
  function kw(text, w) { return { s: text, w: w || 1 }; }

  var RULES = [
    {
      id: 'missed',
      link: { url: 'medication-reminders.html', label: 'Open Medication Reminders' },
      reply: 'It happens - don\'t be hard on yourself. 💙\n\n**What to do now:**\n- If you remember soon after the missed time, take it.\n- If it is nearly time for the next dose, skip the missed one - **never double up** unless your doctor said so.\n- Note it down so your caregiver can see.\n\nIf you miss doses often, tell your doctor or pharmacist.',
      match: [
        rx(/(missed|forgot|skipped)[^.!?]*?(dose|med|tablet|pill|medicine)/i, 4),
        kw('మర్చిపోయాను', 2), kw('మిస్ అయ్యాను', 2),
        kw('भूल गया', 2), kw('भूल गई', 2), kw('मिस कर दिया', 2),
        kw('மறந்துவிட்டேன்', 2), kw('ಮರೆತು', 2), kw('ತಪ್ಪಿಹೋಗ', 2),
        kw('മറന്നു', 2), kw('വിട്ടുപോയി', 2), kw('विसरलो', 2), kw('चुकले', 2),
        kw('ভুলে গেছি', 2), kw('বাদ পড়ে', 2)
      ]
    },
    {
      id: 'meds',
      link: { url: 'medication-reminders.html', label: 'Open Medication Reminders' },
      reply: 'I can help you stay on track with your medicines. 💊\n\n**Quick tips:**\n- Take each dose at the same time daily.\n- Use a pill organiser or your MediCare reminders.\n- Tick each dose off after taking it.\n\nWhich medicine and dose are you asking about?',
      match: [
        rx(/\b(remind|reminder|reminders|reminded)\b/i, 2),
        rx(/\b(med|meds|medication|medications|medicine|medicines|tablet|tablets|pill|pills|dose|doses|dosage|prescription|prescriptions)\b/i, 1),
        kw('మందు', 2), kw('మందులు', 2), kw('మాత్ర', 2), kw('ఔషధ', 2), kw('రిమైండర్', 2),
        kw('डोस', 2), kw('दवा', 2), kw('दवाई', 2), kw('गोली', 2), kw('याद दिला', 2),
        kw('மருந்து', 2), kw('மாத்திரை', 2), kw('நினைவூட்டு', 2),
        kw('ಮಾತ್ರೆ', 2), kw('ಔಷಧ', 2), kw('ಜ್ಞಾಪನೆ', 2),
        kw('മരുന്ന്', 2), kw('ഗുളിക', 2), kw('ഓർമ്മ', 2),
        kw('गोळी', 2), kw('औषध', 2), kw('आठवण', 2),
        kw('ওষুধ', 2), kw('ট্যাবলেট', 2), kw('মনে করিয়ে', 2)
      ]
    },
    {
      id: 'diabetes',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For blood sugar care:\n\n**Food:** regular, balanced meals; limit sugary and refined foods.\n**Movement:** a short walk after meals helps.\n**Monitoring:** follow your testing schedule and keep a log.\n\nNever change insulin or tablet doses without your doctor. **Urgent** if there is very high sugar with vomiting, deep breathing or drowsiness.',
      match: [
        rx(/\b(diabetes|diabetic|glucose)\b/i, 3),
        rx(/\b(blood sugar|sugar level|sugar levels)\b/i, 3),
        rx(/\bsugar\b/i, 1),
        kw('మధుమేహ', 3), kw('షుగర్', 3), kw('मधुमेह', 3), kw('शुगर', 3),
        kw('நீரிழிவு', 3), kw('ಮಧುಮೇಹ', 3), kw('പ്രമേഹം', 3),
        kw('मधुमेह', 3), kw('ডায়াবেটিস', 3), kw('মধুমেহ', 3)
      ]
    },
    {
      id: 'bp',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For blood pressure:\n\n**Everyday:** less salt, more vegetables, regular walks, less stress, no tobacco.\n**Monitoring:** check at the same time each day, sit and rest 5 minutes first.\n\nTake BP medicines exactly as prescribed - do not stop them on your own. **Call 112** for very high BP with headache, chest pain or breathlessness.',
      match: [
        rx(/\b(blood pressure|hypertension|hypotension)\b/i, 3),
        rx(/\bbp\b/i, 3),
        kw('రక్తపోటు', 3), kw('బీపీ', 3), kw('रक्तचाप', 3), kw('बीपी', 3),
        kw('இரத்த அழுத்தம்', 3), kw('ರಕ್ತದೊತ್ತಡ', 3), kw('രക്തസമ്മർദ്ദം', 3),
        kw('रक्तदाब', 3), kw('রক্তচাপ', 3)
      ]
    },
    {
      id: 'fever',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For a mild fever: rest, drink fluids, and wear light clothing. 🤒\n\nParacetamol can help bring down a fever in adults when taken as directed - follow the packet or your doctor\'s advice.\n\n**See a doctor soon if:** fever lasts more than 3 days, is very high, or comes with severe headache, breathlessness, rash or confusion.',
      match: [
        rx(/\b(fever|feverish)\b/i, 3),
        rx(/\b(my|his|her|body|running a)\s+temperature\b/i, 2),
        rx(/\b(chills?|shivering)\b/i, 2),
        kw('జ్వరం', 3), kw('వణుకు', 2), kw('बुखार', 3), kw('ज्वर', 3),
        kw('காய்ச்சல்', 3), kw('நடுக்கம்', 2), kw('ಜ್ವರ', 3),
        kw('പനി', 3), kw('ताप', 3), kw('জ্বর', 3)
      ]
    },
    {
      id: 'cold',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For a common cold or cough: warm fluids, honey in warm water (not for infants under 1), steam inhalation, and rest. 🍵\n\n**See a doctor if:** it lasts over a week, breathing is hard, you cough blood, or there is high fever.',
      match: [
        rx(/\b(cold|cough|coughing)\b/i, 1),
        rx(/\b(sore throat|throat|flu|influenza)\b/i, 2),
        rx(/\b(sneeze|sneezing|sneezes|congestion|runny nose|blocked nose)\b/i, 2),
        kw('దగ్గు', 2), kw('జలుబు', 2), kw('గొంతు', 2),
        kw('खांसी', 2), kw('जुकाम', 2), kw('सर्दी', 2), kw('गला', 2),
        kw('இருமல்', 2), kw('சளி', 2), kw('தொண்டை', 2),
        kw('ಕೆಮ್ಮು', 2), kw('ಸೀನು', 2), kw('ಗಂಟಲು', 2),
        kw('ചുമ', 2), kw('ജലദോഷം', 2), kw('തൊണ്ട', 2),
        kw('खोकला', 2), kw('घसा', 2), kw('কাশি', 2), kw('সর্দি', 2), kw('গলা', 2)
      ]
    },
    {
      id: 'headache',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'Try a quiet, dark room, hydration, and a cold pack on the forehead. 🧠\n\nAvoid taking painkillers too often - that can cause rebound headaches. **Seek urgent care** for a sudden severe "worst-ever" headache, or one with weakness, vision change, fever or neck stiffness.',
      match: [
        rx(/\b(headache|headaches|migraine|migraines)\b/i, 3),
        kw('తలనొప్పి', 3), kw('माइग्रेन', 3), kw('सिरदर्द', 3),
        kw('தலைவலி', 3), kw('ತಲೆನೋವು', 3), kw('തലവേദന', 3),
        kw('डोकेदुखी', 3), kw('মাথাব্যথা', 3)
      ]
    },
    {
      id: 'pain',
      link: { url: 'nearby-hospitals.html', label: 'Find Nearby Hospitals' },
      reply: 'Sorry you are uncomfortable. 💙\n\nRest the area, and gentle heat or cold can help. Take pain relief only as directed.\n\n**Get medical help** if pain is severe, sudden, or comes with numbness, weakness, or trouble breathing.',
      match: [
        rx(/\b(pain|painful|pains|ache|aches|aching|hurt|hurts|hurting|sore|soreness)\b/i, 1),
        kw('నొప్పి', 2), kw('నెప్పి', 2), kw('दर्द', 2), kw('வலி', 2),
        kw('ನೋವು', 2), kw('വേദന', 2), kw('वेदना', 2), kw('दुखणे', 2), kw('ব্যথা', 2)
      ]
    },
    {
      id: 'nausea',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'Nausea and vomiting are usually short-lived. 💙\n\n**Now:** sip water or ORS in small amounts, eat plain food (rice, toast, banana) and rest. Avoid heavy, oily or spicy food.\n\n**See a doctor if:** it lasts over 2 days, you cannot keep fluids down, there is blood, severe pain, or signs of dehydration (very dry mouth, dark urine, dizziness).',
      match: [
        rx(/\b(nausea|nauseous|nauseated|vomit|vomiting|vomited|throwing up|throw up)\b/i, 3),
        kw('వాంతి', 3), kw('వికారం', 2), kw('उल्टी', 3), kw('जी मिचलाना', 3),
        kw('வாந்தி', 3), kw('ವಾಂತಿ', 3), kw('ഛർദ്ദി', 3), kw('उलटी', 3), kw('বমি', 3)
      ]
    },
    {
      id: 'diarrhea',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For loose motions: 💧\n\n**Important:** replace fluids - water, ORS, coconut water or rice water, in small sips often.\nEat light: rice, curd, banana, toast. Avoid oily, spicy and milk for a day or two.\n\n**See a doctor if:** blood in stool, high fever, it lasts over 2 days, or signs of dehydration.',
      match: [
        rx(/\b(diarrhea|diarrhoea|loose motion|loose motions|loose stool|loose stools)\b/i, 3),
        kw('విరేచనాలు', 3), kw('दस्त', 3), kw('வயிற்றுப்போக்கு', 3),
        kw('ಅತಿಸಾರ', 3), kw('വയറിളக்கம்', 3), kw('जुलाब', 3), kw('পাতলা পায়খানা', 3)
      ]
    },
    {
      id: 'acidity',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For acidity, gas or heartburn: 🍵\n\n- Eat smaller, regular meals; avoid very spicy, oily or late-night food.\n- Cut down tea, coffee, alcohol and smoking.\n- Do not lie down for 2-3 hours after eating.\n\n**See a doctor if:** pain is severe, you have trouble swallowing, black stools, or it keeps coming back.',
      match: [
        rx(/\b(acidity|acid reflux|heartburn|gastric|gastritis|gas|bloating|bloated|indigestion)\b/i, 3),
        kw('గ్యాస్', 3), kw('ఎసిడిటీ', 3), kw('కడుపు ఉబ్బరం', 2),
        kw('एसिडिटी', 3), kw('गैस', 3), kw('बदहज़मी', 3), kw('जलन', 2),
        kw('ಅಸಿಡಿಟಿ', 3), kw('ಗ್ಯಾಸ್', 3), kw('ഗ്യാസ്', 3), kw('आम्लपित्त', 3), kw('গ্যাস', 3)
      ]
    },
    {
      id: 'constipation',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For constipation: 🥗\n\n- More fibre: vegetables, fruit, whole grains, salad.\n- 6-8 glasses of water a day.\n- A short walk after meals, and try to keep a regular toilet time.\n\n**See a doctor** if it lasts over 2 weeks, or with blood, severe pain or weight loss.',
      match: [
        rx(/\b(constipation|constipated|hard stool|hard stools)\b/i, 3),
        kw('మలబద్ధకం', 3), kw('कब्ज', 3), kw('मलबद्ध', 3),
        kw('மலச்சிக்கல்', 3), kw('ಮಲಬದ್ಧತೆ', 3), kw('മലബന്ധം', 3),
        kw('बद्धकोष्ठता', 3), kw('কোষ্ঠকাঠিন্য', 3)
      ]
    },
    {
      id: 'allergy',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For skin rashes, itching or allergies: 💙\n\n- Do not scratch; keep the area clean and cool.\n- Note any new food, medicine, soap or plant that started it.\n- A cool compress or calamine can soothe the itching.\n\n**Get urgent help** if there is swelling of the lips or tongue, trouble breathing, or a sudden rash all over.',
      match: [
        rx(/\b(allergy|allergies|allergic|rash|rashes|hives|itch|itchy|itching|skin|eczema|pimples?)\b/i, 3),
        kw('దద్దుర్లు', 3), kw('దురద', 3), kw('చర్మం', 2),
        kw('एलर्जी', 3), kw('खुजली', 3), kw('त्वचा', 2), kw('दाने', 2),
        kw('ஒவ்வாமை', 3), kw('அரிப்பு', 3), kw('ಅಲರ್ಜಿ', 3),
        kw('ചൊറിച്ചിൽ', 3), kw('अलर्जी', 3), kw('खाज', 3),
        kw('এলার্জি', 3), kw('চুলকানি', 3)
      ]
    },
    {
      id: 'dizziness',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'Feeling dizzy or light-headed: 💙\n\n- Sit or lie down right away to avoid a fall.\n- Drink water - dehydration is a common cause.\n- Stand up slowly, and eat something if you have skipped a meal.\n\n**Seek care** if it is sudden, or with weakness, slurred speech, chest pain or fainting.',
      match: [
        rx(/\b(dizzy|dizziness|giddy|light[- ]?headed|faint|fainting|fainted)\b/i, 3),
        kw('కళ్ళు తిరగడం', 3), kw('తల తిరగడం', 3), kw('चक्कर', 3),
        kw('மயக்கம்', 3), kw('ತಲೆ ಸುತ್ತು', 3), kw('തലകറക്കം', 3),
        kw('चक्कर येणे', 3), kw('মাথা ঘোরা', 3)
      ]
    },
    {
      id: 'injury',
      link: { url: 'nearby-hospitals.html', label: 'Find Nearby Hospitals' },
      reply: 'For a cut, wound, burn or sprain: 🩹\n\n- Clean a small cut with water; press with a clean cloth if bleeding.\n- For a sprain: rest, ice for 15-20 minutes, and keep it raised.\n- For a burn: cool under running water for 20 minutes; do not apply butter or toothpaste.\n\n**Go to hospital** for deep or large wounds, heavy bleeding, a burn bigger than the palm, a suspected fracture, or a dog/snake bite.',
      match: [
        rx(/\b(injury|injured|wound|wounds|cut|cuts|bleeding|burn|burns|burned|burnt|scald|scalded|fracture|broken bone|sprain|bruise|accident|fell down|dog bite|snake bite|insect bite)\b/i, 2),
        kw('గాయం', 2), kw('కాలిన', 2), kw('ఎముక', 2),
        kw('चोट', 2), kw('घाव', 2), kw('मोच', 2), kw('फ्रैक्चर', 2),
        kw('காயம்', 2), kw('ಗಾಯ', 2), kw('മുറിവ്', 2), kw('জখম', 2), kw('जखम', 2), kw('আঘাত', 2)
      ]
    },
    {
      id: 'eye',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For eye problems: 👁️\n\n- Rest your eyes; blink often and follow the 20-20-20 rule (every 20 min, look 20 feet away for 20 seconds).\n- Do not rub the eye; rinse with clean water if something went in.\n\n**See a doctor urgently** for sudden vision loss, severe pain, an injury, or a red, painful eye.',
      match: [
        rx(/\b(eye|eyes)\b/i, 4),
        rx(/\b(vision|blurry vision|blurred vision|eye pain|conjunctivitis)\b/i, 3),
        kw('కళ్ళు', 2), kw('కంటి', 2), kw('आँख', 2), kw('आंख', 2),
        kw('கண்', 2), kw('ಕಣ್ಣು', 2), kw('കണ്ണ്', 2), kw('ডোলে', 2), kw('চোখ', 2)
      ]
    },
    {
      id: 'ear',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For ear problems: 💙\n\n- Do not put oil, water or cotton buds inside the ear.\n- For mild pain, a warm compress can help; take pain relief as directed.\n\n**See a doctor** if there is discharge, hearing loss, severe pain, or fever with earache.',
      match: [
        rx(/\b(ear|ears|earache|hearing|tinnitus)\b/i, 2),
        kw('చెవి', 2), kw('कान', 2), kw('காது', 2), kw('ಕಿವಿ', 2), kw('ചെവി', 2), kw('কান', 2)
      ]
    },
    {
      id: 'dental',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For tooth or gum problems: 🦷\n\n- Rinse with warm salt water; brush gently with a soft brush.\n- Avoid very hot, cold or sweet food until it settles.\n\n**See a dentist** for ongoing toothache, swelling of the face, bleeding gums or a loose tooth.',
      match: [
        rx(/\b(teeth|tooth|toothache|dental|gum|gums|dentist)\b/i, 3),
        kw('పళ్ళు', 3), kw('దంత', 3), kw('दांत', 3), kw('दात', 3),
        kw('பல்', 3), kw('ಹಲ್ಲು', 3), kw('പല്ല്', 3), kw('দাঁত', 3)
      ]
    },
    {
      id: 'urinary',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For urine or kidney problems: 💧\n\n- Drink plenty of water, and do not hold urine for long.\n\n**See a doctor soon** for burning or pain when passing urine, blood in urine, fever with back pain, or difficulty passing urine.',
      match: [
        rx(/\b(urine|urinary|urination|urinating|pee|peeing|bladder|kidney stone)\b/i, 3),
        kw('మూత్రం', 3), kw('मूत्र', 3), kw('पेशाब', 3), kw('சிறுநீர்', 3),
        kw('ಮೂತ್ರ', 3), kw('മൂത്രം', 3), kw('लघवी', 3), kw('প্রস্রাব', 3)
      ]
    },
    {
      id: 'menstrual',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For period problems: 💙\n\n- A warm compress or warm bath eases cramps; light walking helps too.\n- Rest, water and iron-rich food (greens, beans) help.\n\n**See a doctor** if bleeding is very heavy, pain is severe, or periods are very irregular or missed.',
      match: [
        rx(/\b(period|periods|menstrual|menstruation|pms)\b/i, 3),
        kw('పీరియడ్స్', 3), kw('రుతుస్రావం', 3), kw('माहवारी', 3), kw('पीरियड्स', 3),
        kw('மாதவிடாய்', 3), kw('ಮುಟ್ಟು', 3), kw('ആർത്തവം', 3), kw('पाळी', 3), kw('মাসিক', 3)
      ]
    },
    {
      id: 'pregnancy',
      link: { url: 'appointments.html', label: 'Book an Appointment' },
      reply: 'Take it gently, and congratulations. 💙\n\n- Keep your regular check-ups and the medicines or vitamins your doctor prescribes.\n- Balanced food, plenty of water, gentle walks and enough rest.\n- Avoid alcohol, smoking, and any medicine not approved by your doctor.\n\n**Contact your clinic urgently** for bleeding, severe pain, swelling, or reduced baby movement.',
      match: [
        rx(/\b(pregnant|pregnancy|expecting a baby|prenatal)\b/i, 3),
        kw('గర్భం', 3), kw('गर्भावस्था', 3), kw('கர்ப்பம்', 3),
        kw('ಗರ್ಭಿಣಿ', 3), kw('ഗർഭം', 3), kw('गर्भारपण', 3), kw('গর্ভাবস্থা', 3)
      ]
    },
    {
      id: 'child',
      link: { url: 'appointments.html', label: 'Book an Appointment' },
      reply: 'For your little one: 💙\n\n- Keep fluids going, and watch for fever, appetite and urine output.\n- Follow the doctor\'s doses exactly - children\'s doses differ from adults\'.\n\n**See a doctor** for high fever in a young baby, breathing difficulty, unusual drowsiness, or not drinking.',
      match: [
        rx(/\b(baby|babies|infant|newborn|toddler|child|children|kid|kids|my son|my daughter)\b/i, 1),
        kw('శిశువు', 1), kw('పిల్లలు', 1), kw('बच्चा', 1), kw('बच्चे', 1), kw('शिशु', 1),
        kw('குழந்தை', 1), kw('ಮಗು', 1), kw('കുട്ടി', 1), kw('बाळ', 1), kw('শিশু', 1)
      ]
    },
    {
      id: 'vaccine',
      link: { url: 'appointments.html', label: 'Book an Appointment' },
      reply: 'Vaccines protect you and those around you. 💉\n\n- Keep to the schedule your clinic gives, and keep the card safe.\n- Mild fever or soreness for a day or two is common.\n\n**See a doctor** for severe swelling, breathing trouble or high fever after a shot.',
      match: [
        rx(/\b(vaccine|vaccines|vaccination|vaccinated|immunization|immunisation|booster|injection)\b/i, 3),
        kw('టీకా', 3), kw('वैक्सीन', 3), kw('टीका', 3), kw('தடுப்பூசி', 3),
        kw('ಲಸಿಕೆ', 3), kw('കുത്തിവയ്പ്പ്', 3), kw('लस', 3), kw('টিকা', 3)
      ]
    },
    {
      id: 'labtest',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'Reading a test report: 🧾\n\n- One abnormal number is not a diagnosis - it is read together with your symptoms and history.\n- Keep old reports so the trend can be seen.\n\n**Please show reports to your doctor.** I cannot interpret them for you.',
      match: [
        rx(/\b(blood test|lab test|test report|test result|test results|report|reports|scan|x-?ray|ecg|mri|ultrasound|urine test|hemoglobin)\b/i, 3),
        kw('పరీక్ష', 2), kw('రిపోర్ట్', 3), kw('रिपोर्ट', 3), kw('जांच', 2),
        kw('பரிசோதனை', 2), kw('ರಿಪೋರ್ಟ್', 3), kw('റിപ്പോർട്ട്', 3),
        kw('रिपोर्ट', 3), kw('রিপোর্ট', 3)
      ]
    },
    {
      id: 'covid',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'For COVID or a flu-like illness: 🤒\n\n- Rest, drink fluids, and take paracetamol as directed if there is fever.\n- Isolate to protect others, and wear a mask around family.\n\n**Get urgent care** for breathlessness, chest pain, confusion or very low oxygen.',
      match: [
        rx(/\b(covid|covid-19|corona|coronavirus)\b/i, 3),
        kw('కోవిడ్', 3), kw('कोविड', 3), kw('कोरोना', 3), kw('கோவிட்', 3),
        kw('ಕೋವಿಡ್', 3), kw('കോവിഡ്', 3), kw('কোভিড', 3)
      ]
    },
    {
      id: 'weight',
      link: { url: 'diet-plan.html', label: 'Open Diet Plan' },
      reply: 'For a healthy weight: 🌿\n\n- Half the plate vegetables; whole grains; some protein at each meal.\n- Limit sugary drinks and deep-fried food.\n- Aim for about 30 minutes of movement most days, and steady, gradual change.\n\nAvoid crash diets - slow and steady lasts. If you have a condition, follow your doctor or dietitian\'s plan.',
      match: [
        rx(/\b(weight loss|lose weight|losing weight|weight gain|gain weight|obesity|obese|overweight|underweight|bmi)\b/i, 3),
        rx(/\bweight\b/i, 2),
        kw('బరువు', 2), kw('वजन', 2), kw('मोटापा', 3), kw('எடை', 2),
        kw('ತೂಕ', 2), kw('ഭാരം', 2), kw('ওজন', 2)
      ]
    },
    {
      id: 'habits',
      link: { url: 'health-records.html', label: 'Open Health Records' },
      reply: 'Cutting down smoking or alcohol helps almost every health problem. 💙\n\n- Set a quit date, and tell someone who can support you.\n- Replace the habit with water, a short walk or chewing gum.\n- Ask your doctor - patches, gum or counselling can make quitting easier.\n\nYou do not have to do it alone.',
      match: [
        rx(/\b(smoking|smoke|smoker|smokers|cigarette|cigarettes|tobacco|vaping|vape|alcohol|alcoholic|drinking alcohol|quit drinking|quit smoking)\b/i, 3),
        kw('మద్యం', 3), kw('పొగాకు', 3), kw('ధూమపానం', 3),
        kw('शराब', 3), kw('धूम्रपान', 3), kw('सिगरेट', 3),
        kw('மது', 3), kw('புகைபிடித்தல்', 3), kw('ಮದ್ಯ', 3), kw('ಧೂಮಪಾನ', 3),
        kw('മദ്യം', 3), kw('പുകവലി', 3), kw('दारू', 3), kw('মদ', 3), kw('ধূমপান', 3)
      ]
    },
    {
      id: 'fitness',
      link: { url: 'fitness-plan.html', label: 'Open Fitness Plan' },
      reply: 'Steady beats hard - small, regular movement wins. 🌿\n\n**Start with one:**\n- A 15-minute walk after meals\n- Stretch for 2 minutes every hour\n- 4-4-6 breathing: in 4s, hold 4s, out 6s\n\nBuild up gradually, and stop if you feel unwell.',
      match: [
        rx(/\b(exercise|exercising|workout|workouts|fitness|walk|walking|jog|jogging|running|yoga|steps|gym|active|activity|stretch|stretching)\b/i, 1),
        kw('వ్యాయామ', 2), kw('నడక', 2), kw('యోగా', 2), kw('వాకింగ్', 2),
        kw('व्यायाम', 2), kw('योग', 2), kw('टहल', 2), kw('सैर', 2),
        kw('உடற்பயிற்சி', 2), kw('நடை', 2), kw('யோகா', 2),
        kw('ವ್ಯಾಯಾಮ', 2), kw('ನಡಿಗೆ', 2), kw('ಯೋಗ', 2),
        kw('വ്യായാമം', 2), kw('നടത്തം', 2), kw('യോഗ', 2),
        kw('चालणे', 2), kw('ব্যায়াম', 2), kw('হাঁটা', 2), kw('যোগ', 2)
      ]
    },
    {
      id: 'diet',
      link: { url: 'diet-plan.html', label: 'Open Diet Plan' },
      reply: 'Here are gentle, practical food habits. 🥗\n\n**Try to:**\n- Fill half your plate with vegetables\n- Choose whole grains over refined\n- Limit sugary drinks and deep-fried food\n- Keep some protein at each meal\n\nIf you have diabetes or kidney/heart conditions, follow your doctor\'s or dietitian\'s plan.',
      match: [
        rx(/\b(diet|diets|food|foods|meal|meals|nutrition|eat|eating|ate|calorie|calories|salt|cholesterol)\b/i, 1),
        rx(/\bsugar\b/i, 1),
        kw('ఆహార', 2), kw('తిండి', 2), kw('భోజన', 2), kw('డైట్', 2), kw('చక్కెర', 2), kw('ఉప్పు', 2),
        kw('खाना', 2), kw('भोजन', 2), kw('आहार', 2), kw('डाइट', 2), kw('चीनी', 2), kw('नमक', 2),
        kw('உணவு', 2), kw('சாப்பாடு', 2), kw('சர்க்கரை', 2), kw('உப்பு', 2),
        kw('ಆಹಾರ', 2), kw('ಊಟ', 2), kw('ಸಕ್ಕರೆ', 2), kw('ಉಪ್ಪು', 2),
        kw('ആഹാരം', 2), kw('ഭക്ഷണം', 2), kw('പഞ്ചസാര', 2), kw('ഉപ്പ്', 2),
        kw('जेवण', 2), kw('साखर', 2), kw('मीठ', 2),
        kw('খাবার', 2), kw('খাদ্য', 2), kw('চিনি', 2), kw('লবণ', 2)
      ]
    },
    {
      id: 'water',
      link: { url: 'diet-plan.html', label: 'Open Diet Plan' },
      reply: 'Hydration helps everything from energy to digestion. 💧\n\nAim for **6-8 glasses of water a day**, more in hot weather or with activity. Drink a glass with each meal as an easy habit.',
      match: [
        rx(/\b(water|hydration|hydrate|hydrated|thirsty)\b/i, 2),
        kw('నీళ్ల', 2), kw('నీరు', 2), kw('దాహం', 2),
        kw('पानी', 2), kw('प्यास', 2), kw('தண்ணீர்', 2), kw('நீர்', 2),
        kw('ನೀರು', 2), kw('ಬಾಯಾರಿಕೆ', 2), kw('വെള്ളം', 2), kw('ദാഹം', 2),
        kw('पाणी', 2), kw('तहान', 2), kw('জল', 2), kw('তেষ্টা', 2)
      ]
    },
    {
      id: 'sleep',
      reply: 'Rest is part of treatment too. 🌙\n\n**Tonight:**\n- Same bedtime and wake time daily\n- No screens ~30 minutes before bed\n- Keep the room cool and dark\n- Skip caffeine after the afternoon\n\nIf poor sleep continues for weeks, mention it to your doctor.',
      match: [
        rx(/\b(sleep|sleeping|insomnia|tired|tiredness|fatigue|rest|resting|nap|napping)\b/i, 2),
        kw('నిద్ర', 2), kw('అలసట', 2), kw('नींद', 2), kw('थका', 2), kw('आराम', 2),
        kw('தூக்கம்', 2), kw('சோர்வு', 2), kw('ನಿದ್ರೆ', 2), kw('ಆಯಾಸ', 2),
        kw('ഉറക്കം', 2), kw('ക്ഷീണം', 2), kw('झोप', 2), kw('थकवा', 2),
        kw('ঘুম', 2), kw('ক্লান্তি', 2)
      ]
    },
    {
      id: 'stress',
      reply: 'Thank you for sharing that - it matters. 💙\n\n**Right now:** slow breathing (4-4-6), a short walk, or a call to someone you trust can ease the moment.\n\nIf sadness, worry or panic is lasting or heavy, please talk to a doctor or a counsellor - that is a sign of strength, not weakness. If you ever feel unsafe, call **112**.',
      match: [
        rx(/\b(stress|stressed|stressful|anxious|anxiety|depress|depressed|depression|sad|mental|lonely|panic|panicking|worried|worry)\b/i, 2),
        kw('టెన్షన్', 2), kw('ఆందోళన', 2), kw('మానసిక', 2), kw('ఒంటరి', 2), kw('విచార', 2),
        kw('चिंता', 2), kw('तनाव', 2), kw('अकेल', 2), kw('दुख', 2),
        kw('கவலை', 2), kw('தனிமை', 2), kw('ಚಿಂತೆ', 2), kw('ಒತ್ತಡ', 2), kw('ಮಾನಸಿಕ', 2),
        kw('വിഷമം', 2), kw('സമ്മർദ്ദം', 2), kw('മാനസിക', 2),
        kw('काळजी', 2), kw('तणाव', 2), kw('मानसिक', 2),
        kw('দুশ্চিন্তা', 2), kw('চাপ', 2), kw('মানসিক', 2)
      ]
    },
    {
      id: 'doctor',
      link: { url: 'appointments.html', label: 'Book an Appointment' },
      reply: 'I can help you prepare. 🩺\n\n**Next step:** book your regular GP or clinic. Before you go, note:\n- Your symptoms and how long you\'ve had them\n- All medicines and doses\n- Any recent test results\n\nWould you like a short note to send them?',
      match: [
        rx(/\b(doctor|doctors|appointment|appointments|clinic|hospital|consult|consultation|physician|surgeon|specialist|checkup|check-up|gp)\b/i, 2),
        kw('డాక్టర', 2), kw('వైద్య', 2), kw('ఆసుపత్రి', 2), kw('అపాయింట్మెంట్', 2),
        kw('डॉक्टर', 2), kw('अस्पताल', 2), kw('क्लिनिक', 2), kw('मरीज़', 2),
        kw('மருத்துவ', 2), kw('டாக்டர்', 2), kw('மருத்துவமனை', 2),
        kw('ವೈದ್ಯ', 2), kw('ಆಸ್ಪತ್ರೆ', 2), kw('ಡಾಕ್ಟರ್', 2),
        kw('ഡോക്ടർ', 2), kw('ആശുപത്രി', 2), kw('रुग्णालय', 2),
        kw('डाक्टर', 2), kw('হাসপাতাল', 2)
      ]
    },
    {
      id: 'thanks',
      reply: 'You\'re most welcome. 💙 Take care of yourself - I\'m here whenever you need.',
      match: [
        rx(/\b(thank|thanks|thank you|thankyou|dhanyavad|shukriya|nandri)\b/i, 3),
        kw('ధన్యవాద', 3), kw('థాంక్స్', 3), kw('థాంక్యూ', 3),
        kw('धन्यवाद', 3), kw('शुक्रिया', 3), kw('நன்றி', 3),
        kw('ಧನ್ಯವಾದ', 3), kw('നന്ദി', 3), kw('ধন্যবাদ', 3)
      ]
    },
    {
      id: 'about',
      reply: 'I\'m your **AI health companion** on MediCare. 🤖\n\nI can help with medicine reminders, missed doses, fitness, diet, sleep, stress and general health questions. I give general information - not medical advice - so please see a doctor for anything serious.',
      match: [
        rx(/\b(who are you|your name|what can you do|what do you do|help me|how are you|are you a doctor|are you human)\b/i, 1),
        kw('నువ్వు ఎవరు', 3), kw('నీ పేరు', 3), kw('मदद', 2), kw('सहायता', 2),
        kw('யார் நீ', 3), kw('ನೀವು ಯಾರು', 3), kw('നിങ്ങൾ ആരാണ്', 3),
        kw('तुम्ही कोण', 3), kw('তুমি কে', 3)
      ]
    },
    {
      id: 'greeting',
      reply: 'Hello, good to see you! 💙 I can help with **medications, reminders, fitness, diet, sleep, stress and general health questions**. What would you like to talk about?',
      match: [
        rx(/\b(hi|hello|hey|namaste|namaskaram|vanakkam|good (morning|afternoon|evening))\b/i, 1),
        kw('నమస్కారం', 1), kw('హలో', 1), kw('హాయ్', 1),
        kw('नमस्ते', 1), kw('नमस्कार', 1), kw('வணக்கம்', 1),
        kw('ನಮಸ್ಕಾರ', 1), kw('ಹಲೋ', 1), kw('നമസ്കാരം', 1), kw('ഹലോ', 1),
        kw('हॅलो', 1), kw('নমস্কার', 1), kw('হ্যালো', 1)
      ]
    }
  ];

  var FALLBACK =
    'I\'m not sure I have the right answer for that one. 💙\n\nCould you tell me a bit more? For example, is it about a **medicine**, **diet**, **sleep**, **pain or a symptom**, **fitness**, **stress**, or something else?\n\nIf it is urgent or getting worse, please see a doctor - and call **112** in an emergency.';

  /* ── Localized answers ───────────────────────────────────────────────
   * Keyed by rule id, plus 'fallback' and 'emergency'. English lives in
   * RULES/FALLBACK/EMERGENCY_REPLY, so 'en' is not repeated here. */
  var SAY = {
    te: {
      greeting: 'నమస్కారం! 💙 నేను మందులు, రిమైండర్లు, మిస్ అయిన డోసులు, ఫిట్‌నెస్, ఆహారం, నిద్ర, ఒత్తిడి గురించి సహాయం చేయగలను. ఏమి మాట్లాడాలనుకుంటున్నారు?',
      missed: 'జరిగిపోతుంది — మీపై కఠినంగా ఉండకండి. 💙\n\n**ఇప్పుడు ఏమి చేయాలి:** గుర్తు వచ్చిన వెంటనే, ఎక్కువ ఆలస్యం కాకపోతే తీసుకోండి. తర్వాతి డోసు దగ్గరపడితే మిస్ అయినది వదిలేయండి — **డబుల్ చేయకండి**.\n\nతరచూ మిస్ అవుతుంటే డాక్టర్‌కు చెప్పండి.',
      meds: 'మందుల విషయంలో సహాయం చేస్తాను. 💊\n\nరోజూ ఒకే సమయానికి తీసుకోండి, తీసుకున్నాక టిక్ చేయండి.\n\nఏ మందు, ఎంత మోతాదు?',
      fitness: 'కొద్దిగా కానీ క్రమంగా చేయడమే మంచిది. 🌿\n\nభోజనం తర్వాత 15 నిమిషాల నడక · ప్రతి గంటకు 2 నిమిషాల స్ట్రెచ్ · 4‑4‑6 శ్వాస.',
      diet: 'సులభమైన ఆహార అలవాట్లు. 🥗\n\nసగం ప్లేటు కూరగాయలు · తృణధాన్యాలు · తక్కువ చక్కెర/వేయించినవి · ప్రతి భోజనంలో కొంత ప్రోటీన్.\n\nషుగర్/గుండె సమస్యలు ఉంటే డాక్టర్ చెప్పినట్లు చేయండి.',
      water: 'నీరు తగినంత తాగడం మంచిది. 💧\n\nరోజుకు **6-8 గ్లాసులు**, ఎండలో లేదా వ్యాయామంతో ఎక్కువ. ప్రతి భోజనంతో ఒక గ్లాసు.',
      sleep: 'విశ్రాంతి కూడా చికిత్సలో భాగం. 🌙\n\nఒకే సమయానికి నిద్ర/లేవడం · పడుకునే ముందు 30 నిమిషాలు స్క్రీన్ వద్దు · గది చల్లగా, చీకటిగా.',
      stress: 'పంచుకున్నందుకు ధన్యవాదాలు — ఇది ముఖ్యం. 💙\n\nప్రశాంతంగా శ్వాస (4‑4‑6), కొద్దిగా నడక, నమ్మకమైన వారికి కాల్ చేయండి.\n\nఎక్కువ కాలం ఉంటే డాక్టర్/కౌన్సెలర్‌ను కలవండి. అత్యవసరమైతే **112**.',
      fever: 'తేలికపాటి జ్వరానికి: విశ్రాంతి, ద్రవాలు, తేలిక దుస్తులు. 🤒\n\n**వెంటనే డాక్టర్‌ను కలవండి:** 3 రోజులకు మించి, చాలా ఎక్కువ, లేదా తీవ్ర తలనొప్పి/ఆయాసం ఉంటే.',
      cold: 'జలుబు/దగ్గుకు: వేడి ద్రవాలు, తేనె కలిపిన వేడి నీరు, ఆవిరి పట్టడం, విశ్రాంతి. 🍵\n\n**డాక్టర్‌ను కలవండి:** వారం మించి, శ్వాస ఇబ్బంది, రక్తం కలిసిన దగ్గు ఉంటే.',
      headache: 'నిశ్శబ్దమైన చీకటి గది, నీరు, నుదుటిపై చల్లని కాపడం ప్రయత్నించండి. 🧠\n\nనొప్పి మాత్రలు ఎక్కువగా వద్దు. అకస్మాత్తుగా తీవ్రమైతే వెంటనే వైద్యం తీసుకోండి.',
      bp: 'రక్తపోటు కోసం:\n\n**రోజూ:** ఉప్పు తగ్గించండి, కూరగాయలు, నడక, ఒత్తిడి తగ్గించండి.\n**పర్యవేక్షణ:** రోజూ ఒకే సమయానికి కొలవండి.\n\nమందులు డాక్టర్ చెప్పినట్లు; మీ స్వంతంగా ఆపకండి. తీవ్ర లక్షణాలతో **112**.',
      diabetes: 'షుగర్ నిర్వహణ:\n\n**ఆహారం:** క్రమమైన సమతుల్య భోజనం, తక్కువ చక్కెర.\n**కదలిక:** భోజనం తర్వాత నడక.\n**పర్యవేక్షణ:** పరీక్షలు క్రమంగా చేయించుకోండి.\n\nఇన్సులిన్/మాత్రలు డాక్టర్ చెప్పకుండా మార్చకండి.',
      doctor: 'సిద్ధమవ్వడానికి సహాయం చేస్తాను. 🩺\n\n**తదుపరి:** మీ GP/క్లినిక్‌కు అపాయింట్‌మెంట్ తీసుకోండి. లక్షణాలు, ఎంతకాలం, మందుల జాబితా రాసుకోండి.',
      pain: 'ఇబ్బందిగా ఉంది కదా. 💙\n\nవిశ్రాంతి ఇవ్వండి; వెచ్చని లేదా చల్లని కాపడం సహాయపడవచ్చు. మాత్రలు సూచన ప్రకారం మాత్రమే.\n\nతీవ్రంగా లేదా అకస్మాత్తుగా ఉంటే వైద్యం తీసుకోండి.',
      thanks: 'మీకు స్వాగతం. 💙 జాగ్రత్తగా ఉండండి — అవసరమైనప్పుడు నేను ఇక్కడ ఉన్నాను.',
      about: 'నేను MediCare లో మీ **AI ఆరోగ్య సహచరుడు**. 🤖\n\nమందులు, రిమైండర్లు, మిస్ అయిన డోసులు, ఫిట్‌నెస్, ఆహారం, నిద్ర, ఒత్తిడి గురించి సహాయం చేస్తాను. ఇది సాధారణ సమాచారం మాత్రమే — తీవ్ర సమస్యలకు డాక్టర్‌ను కలవండి.',
      fallback: 'నేను మీ కోసం ఇక్కడ ఉన్నాను. 💙 **మందులు, రిమైండర్లు, మిస్ అయిన డోసులు, ఫిట్‌నెస్, ఆహారం, నిద్ర, ఒత్తిడి** గురించి సహాయం చేయగలను.\n\nఉదా: "నా మందు మర్చిపోయాను", "నిద్ర మంచిగా రావాలి", "షుగర్‌కు ఏమి తినాలి?".\n\nఅత్యవసరమైతే వెంటనే **112**.',
      emergency: 'ఇది **అత్యవసర వైద్య పరిస్థితి** కావచ్చు — ఇప్పుడే **112**కు కాల్ చేయండి (అంబులెన్స్‌కు **108**). ఆగకండి. 💙\n\nవీలైతే ఎవరైనా దగ్గర ఉండండి, ఫోన్ దగ్గర ఉంచుకోండి.'
    },

    hi: {
      greeting: 'नमस्ते! 💙 मैं दवाओं, रिमाइंडर, छूटी हुई खुराक, फिटनेस, खान-पान, नींद और तनाव में मदद कर सकता हूँ। किस बारे में बात करें?',
      missed: 'ऐसा हो जाता है — खुद को कोसें नहीं। 💙\n\n**अब क्या करें:** थोड़ी ही देर हुई हो तो ले लें। अगली खुराक का समय पास हो तो छूटी हुई छोड़ दें — **दोहरी खुराक कभी न लें**।\n\nबार-बार छूटे तो डॉक्टर को बताएँ।',
      meds: 'दवाओं में मदद कर सकता हूँ। 💊\n\nहर दिन एक ही समय पर लें और लेने के बाद टिक करें।\n\nकौन-सी दवा और कितनी खुराक?',
      fitness: 'थोड़ा पर नियमित चलना सबसे अच्छा है। 🌿\n\nखाने के बाद 15 मिनट टहलें · हर घंटे 2 मिनट स्ट्रेच · 4‑4‑6 श्वास।',
      diet: 'आसान आहार आदतें। 🥗\n\nआधी प्लेट सब्ज़ियाँ · साबुत अनाज · कम चीनी/तला हुआ · हर भोजन में थोड़ा प्रोटीन।\n\nडायबिटीज़/हृदय रोग में डॉक्टर की सलाह मानें।',
      water: 'पानी पर्याप्त पिएँ। 💧\n\nरोज़ **6-8 गिलास**, गर्मी या व्यायाम में ज़्यादा। हर भोजन के साथ एक गिलास।',
      sleep: 'आराम भी इलाज का हिस्सा है। 🌙\n\nएक ही समय पर सोना-जागना · सोने से 30 मिनट पहले स्क्रीन बंद · कमरा ठंडा और अंधेरा।',
      stress: 'साझा करने के लिए धन्यवाद — यह मायने रखता है। 💙\n\nधीमी साँस (4‑4‑6), थोड़ी सैर, किसी अपने से बात करें।\n\nलंबे समय तक रहे तो डॉक्टर/काउंसलर से मिलें। मुश्किल में **112**।',
      fever: 'हल्के बुखार में: आराम, तरल पदार्थ, हल्के कपड़े। 🤒\n\n**जल्दी डॉक्टर से मिलें:** 3 दिन से ज़्यादा, बहुत तेज़, या तेज़ सिरदर्द/साँस की तकलीफ़ के साथ।',
      cold: 'सर्दी-खाँसी में: गर्म तरल, शहद वाला गर्म पानी, भाप, आराम। 🍵\n\n**डॉक्टर से मिलें:** एक हफ़्ते से ज़्यादा, साँस लेने में दिक्कत, खून वाली खाँसी।',
      headache: 'शांत, अंधेरे कमरे में आराम, पानी, माथे पर ठंडी पट्टी आज़माएँ। 🧠\n\nदर्द निवारक बार-बार न लें। अचानक बहुत तेज़ दर्द हो तो तुरंत इलाज लें।',
      bp: 'ब्लड प्रेशर के लिए:\n\n**रोज़:** कम नमक, सब्ज़ियाँ, टहलना, कम तनाव।\n**निगरानी:** रोज़ एक ही समय पर नापें।\n\nदवा डॉक्टर के कहे अनुसार; खुद बंद न करें। गंभीर लक्षणों में **112**।',
      diabetes: 'शुगर की देखभाल:\n\n**खाना:** नियमित संतुलित भोजन, कम चीनी।\n**चलना:** खाने के बाद टहलें।\n**निगरानी:** जाँच का शेड्यूल अपनाएँ।\n\nइंसुलिन/गोली डॉक्टर के बिना न बदलें।',
      doctor: 'तैयारी में मदद करता हूँ। 🩺\n\n**अगला कदम:** अपने GP/क्लिनिक में अपॉइंटमेंट लें। लक्षण, अवधि और दवाओं की सूची लिख लें।',
      pain: 'तकलीफ़ के लिए खेद है। 💙\n\nआराम दें; गर्म या ठंडी सिकाई मदद कर सकती है। दर्द निवारक निर्देश अनुसार ही।\n\nतेज़/अचानक दर्द हो तो इलाज लें।',
      thanks: 'आपका स्वागत है। 💙 अपना ध्यान रखें — जब चाहें मैं यहाँ हूँ।',
      about: 'मैं MediCare पर आपका **AI स्वास्थ्य साथी** हूँ। 🤖\n\nदवा, रिमाइंडर, छूटी खुराक, फिटनेस, आहार, नींद और तनाव में मदद करता हूँ। यह सामान्य जानकारी है — गंभीर समस्या में डॉक्टर से मिलें।',
      fallback: 'मैं आपके लिए यहाँ हूँ। 💙 **दवाएँ, रिमाइंडर, छूटी खुराक, फिटनेस, आहार, नींद, तनाव** में मदद कर सकता हूँ।\n\nजैसे: "मैंने अपनी दवा भूल गया", "अच्छी नींद के टिप्स", "शुगर में क्या खाऊँ?"\n\nआपात स्थिति में **112**।',
      emergency: 'अगर यह **मेडिकल इमरजेंसी** हो सकती है, तो अभी **112** पर कॉल करें (एम्बुलेंस के लिए **108**)। इंतज़ार न करें। 💙\n\nमुमकिन हो तो किसी के साथ रहें और फ़ोन पास रखें।'
    },

    ta: {
      greeting: 'வணக்கம்! 💙 மருந்துகள், நினைவூட்டல்கள், தவறிய டோஸ், உடற்பயிற்சி, உணவு, தூக்கம், மன அழுத்தம் பற்றி உதவ முடியும். எதைப் பற்றி பேசலாம்?',
      missed: 'நடக்கும் — உங்களை கடிந்து கொள்ள வேண்டாம். 💙\n\n**இப்போது:** சிறிது தாமதம் மட்டுமே என்றால் எடுத்துக் கொள்ளுங்கள். அடுத்த டோஸ் நெருங்கினால் தவறியதை விடுங்கள் — **இரட்டிப்பு வேண்டாம்**.\n\nஅடிக்கடி தவறினால் மருத்துவரிடம் சொல்லுங்கள்.',
      meds: 'மருந்துகளில் உதவுகிறேன். 💊\n\nஒவ்வொரு நாளும் ஒரே நேரத்தில் எடுத்து, எடுத்த பின் டிக் செய்யுங்கள்.\n\nஎந்த மருந்து, எவ்வளவு?',
      fitness: 'சிறிது ஆனால் தொடர்ந்து செய்வதே சிறந்தது. 🌿\n\nஉணவுக்குப் பின் 15 நிமிட நடை · ஒவ்வொரு மணி நேரமும் 2 நிமிட நீட்சி · 4‑4‑6 மூச்சு.',
      diet: 'எளிய உணவுப் பழக்கங்கள். 🥗\n\nபாதி தட்டு காய்கறிகள் · முழு தானியங்கள் · குறைந்த சர்க்கரை/பொரித்தவை · ஒவ்வொரு உணவிலும் புரதம்.\n\nநீரிழிவு/இதய நோய் இருந்தால் மருத்துவர் படி.',
      water: 'நீர் போதுமான அளவு குடியுங்கள். 💧\n\nநாளுக்கு **6-8 டம்ளர்**, வெயில்/உடற்பயிற்சியில் அதிகம். ஒவ்வொரு உணவுடன் ஒரு டம்ளர்.',
      sleep: 'ஓய்வும் சிகிச்சையின் பகுதி. 🌙\n\nஒரே நேரத்தில் தூங்க/எழ · தூங்கும் முன் 30 நிமிடம் திரை வேண்டாம் · அறை குளிர்ச்சி, இருள்.',
      stress: 'பகிர்ந்ததற்கு நன்றி — இது முக்கியம். 💙\n\nமெதுவான மூச்சு (4‑4‑6), சிறு நடை, நம்பகமான ஒருவரிடம் பேச்சு.\n\nநீண்ட காலம் இருந்தால் மருத்துவர்/ஆலோசகர். அவசரம் என்றால் **112**.',
      fever: 'லேசான காய்ச்சலுக்கு: ஓய்வு, திரவம், இலகுவான உடை. 🤒\n\n**விரைவில் மருத்துவர்:** 3 நாட்களுக்கு மேல், மிக அதிகம், அல்லது கடும் தலைவலி/மூச்சுத் திணறல்.',
      cold: 'சளி/இருமலுக்கு: சூடான திரவம், தேன் கலந்த சூடு நீர், நீராவி, ஓய்வு. 🍵\n\n**மருத்துவர்:** ஒரு வாரத்திற்கு மேல், மூச்சு சிரமம், ரத்த இருமல்.',
      headache: 'அமைதியான இருண்ட அறை, நீர், நெற்றியில் குளிர் ஒத்தடம். 🧠\n\nவலி நிவாரணிகளை அடிக்கடி வேண்டாம். திடீர் கடும் வலி என்றால் உடனே சிகிச்சை.',
      bp: 'இரத்த அழுத்தத்திற்கு:\n\n**தினமும்:** உப்பு குறைவு, காய்கறிகள், நடை, குறைந்த மன அழுத்தம்.\n**கண்காணிப்பு:** தினமும் ஒரே நேரத்தில் அளவிடுங்கள்.\n\nமருந்தை மருத்துவர் படி; தாமே நிறுத்த வேண்டாம். கடும் அறிகுறியில் **112**.',
      diabetes: 'சர்க்கரை பராமரிப்பு:\n\n**உணவு:** ஒழுங்கான சமச்சீர் உணவு, குறைந்த சர்க்கரை.\n**நடை:** உணவுக்குப் பின் நடை.\n**கண்காணிப்பு:** பரிசோதனை அட்டவணை.\n\nஇன்சுலின்/மாத்திரையை மருத்துவர் இல்லாமல் மாற்ற வேண்டாம்.',
      doctor: 'தயாராக உதவுகிறேன். 🩺\n\n**அடுத்து:** உங்கள் GP/கிளினிக்கில் நேரம் பதிவு செய்யுங்கள். அறிகுறிகள், காலம், மருந்துப் பட்டியல் எழுதி வையுங்கள்.',
      pain: 'அசௌகரியத்திற்கு வருந்துகிறேன். 💙\n\nஓய்வு; வெப்ப/குளிர் ஒத்தடம் உதவலாம். வலி நிவாரணி அறிவுறுத்தல் படி மட்டும்.\n\nகடும்/திடீர் வலி என்றால் சிகிச்சை.',
      thanks: 'மிக்க நன்றி. 💙 உங்களை கவனமாக பார்த்துக் கொள்ளுங்கள் — தேவைப்படும்போது நான் இங்கே.',
      about: 'நான் MediCare-இல் உங்கள் **AI சுகாதார துணை**. 🤖\n\nமருந்து, நினைவூட்டல், தவறிய டோஸ், உடற்பயிற்சி, உணவு, தூக்கம், மன அழுத்தம் உதவுகிறேன். இது பொதுத் தகவல் — கடும் பிரச்சினைக்கு மருத்துவரை பாருங்கள்.',
      fallback: 'நான் உங்களுக்காக இங்கே. 💙 **மருந்து, நினைவூட்டல், தவறிய டோஸ், உடற்பயிற்சி, உணவு, தூக்கம், மன அழுத்தம்** உதவ முடியும்.\n\nஎடுத்துக்காட்டு: "என் மருந்தை மறந்துவிட்டேன்", "நல்ல தூக்கம்", "சர்க்கரைக்கு என்ன சாப்பிடலாம்?".\n\nஅவசரம் என்றால் **112**.',
      emergency: 'இது **மருத்துவ அவசரம்** ஆக இருக்கலாம் என்றால், இப்போதே **112** அழையுங்கள் (ஆம்புலன்ஸுக்கு **108**). காத்திருக்க வேண்டாம். 💙\n\nமுடிந்தால் ஒருவருடன் இருங்கள், போனை அருகில் வைத்திருங்கள்.'
    },

    kn: {
      greeting: 'ನಮಸ್ಕಾರ! 💙 ಔಷಧ, ಜ್ಞಾಪನೆ, ತಪ್ಪಿದ ಡೋಸ್, ಫಿಟ್‌ನೆಸ್, ಆಹಾರ, ನಿದ್ರೆ, ಒತ್ತಡ ಬಗ್ಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಯಾವುದರ ಬಗ್ಗೆ ಮಾತನಾಡೋಣ?',
      missed: 'ಆಗುತ್ತದೆ — ನಿಮ್ಮನ್ನು ಕಠಿಣವಾಗಿ ನೋಡಿಕೊಳ್ಳಬೇಡಿ. 💙\n\n**ಈಗ:** ಸ್ವಲ್ಪ ತಡವಾದರೆ ತೆಗೆದುಕೊಳ್ಳಿ. ಮುಂದಿನ ಡೋಸ್ ಹತ್ತಿರವಾದರೆ ತಪ್ಪಿದ್ದನ್ನು ಬಿಡಿ — **ಡಬಲ್ ಮಾಡಬೇಡಿ**.\n\nಪದೇ ಪದೇ ತಪ್ಪಿದರೆ ವೈದ್ಯರಿಗೆ ಹೇಳಿ.',
      meds: 'ಔಷಧದಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. 💊\n\nಪ್ರತಿದಿನ ಒಂದೇ ಸಮಯಕ್ಕೆ ತೆಗೆದುಕೊಂಡು, ನಂತರ ಟಿಕ್ ಮಾಡಿ.\n\nಯಾವ ಔಷಧ, ಎಷ್ಟು?',
      fitness: 'ಸ್ವಲ್ಪ ಆದರೆ ನಿಯಮಿತವಾಗಿ ಮಾಡುವುದೇ ಉತ್ತಮ. 🌿\n\nಊಟದ ನಂತರ 15 ನಿಮಿಷ ನಡಿಗೆ · ಪ್ರತಿ ಗಂಟೆಗೆ 2 ನಿಮಿಷ ಸ್ಟ್ರೆಚ್ · 4‑4‑6 ಉಸಿರಾಟ.',
      diet: 'ಸರಳ ಆಹಾರ ಅಭ್ಯಾಸಗಳು. 🥗\n\nಅರ್ಧ ಪ್ಲೇಟ್ ತರಕಾರಿ · ಇಡೀ ಧಾನ್ಯ · ಕಡಿಮೆ ಸಕ್ಕರೆ/ಕರಿದ · ಪ್ರತಿ ಊಟಕ್ಕೆ ಸ್ವಲ್ಪ ಪ್ರೋಟೀನ್.\n\nಮಧುಮೇಹ/ಹೃದಯ ಸಮಸ್ಯೆ ಇದ್ದರೆ ವೈದ್ಯರ ಮಾತನ್ನು ಪಾಲಿಸಿ.',
      water: 'ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ. 💧\n\nದಿನಕ್ಕೆ **6-8 ಗ್ಲಾಸ್**, ಬಿಸಿಲು/ವ್ಯಾಯಾಮದಲ್ಲಿ ಹೆಚ್ಚು. ಪ್ರತಿ ಊಟದೊಂದಿಗೆ ಒಂದು ಗ್ಲಾಸ್.',
      sleep: 'ವಿಶ್ರಾಂತಿಯೂ ಚಿಕಿತ್ಸೆಯ ಭಾಗ. 🌙\n\nಒಂದೇ ಸಮಯಕ್ಕೆ ಮಲಗುವುದು/ಏಳುವುದು · ಮಲಗುವ ಮೊದಲು 30 ನಿಮಿಷ ಪರದೆ ಬೇಡ · ಕೊಠಡಿ ತಂಪು, ಕತ್ತಲೆ.',
      stress: 'ಹಂಚಿಕೊಂಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ — ಇದು ಮುಖ್ಯ. 💙\n\nನಿಧಾನ ಉಸಿರಾಟ (4‑4‑6), ಸ್ವಲ್ಪ ನಡಿಗೆ, ನಂಬಿಕೆಯ ವ್ಯಕ್ತಿಯೊಂದಿಗೆ ಮಾತು.\n\nದೀರ್ಘಕಾಲ ಇದ್ದರೆ ವೈದ್ಯ/ಸಲಹೆಗಾರರನ್ನು ಭೇಟಿಯಾಗಿ. ತುರ್ತಾದರೆ **112**.',
      fever: 'ಸೌಮ್ಯ ಜ್ವರಕ್ಕೆ: ವಿಶ್ರಾಂತಿ, ದ್ರವ, ಹಗುರ ಬಟ್ಟೆ. 🤒\n\n**ಬೇಗ ವೈದ್ಯರನ್ನು ಭೇಟಿಯಾಗಿ:** 3 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚು, ತುಂಬಾ ಜಾಸ್ತಿ, ಅಥವಾ ತೀವ್ರ ತಲೆನೋವು/ಉಸಿರಾಟ ತೊಂದರೆ.',
      cold: 'ಸೀನು/ಕೆಮ್ಮಿಗೆ: ಬಿಸಿ ದ್ರವ, ಜೇನು ಬೆರೆಸಿದ ಬಿಸಿ ನೀರು, ಆವಿ, ವಿಶ್ರಾಂತಿ. 🍵\n\n**ವೈದ್ಯರು:** ಒಂದು ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು, ಉಸಿರಾಟ ಕಷ್ಟ, ರಕ್ತ ಕೆಮ್ಮು.',
      headache: 'ಶಾಂತ, ಕತ್ತಲೆ ಕೊಠಡಿ, ನೀರು, ಹಣೆಯ ಮೇಲೆ ತಣ್ಣನೆ ಒತ್ತಡ. 🧠\n\nನೋವು ನಿವಾರಕವನ್ನು ಪದೇ ಪದೇ ಬೇಡ. ಹಠಾತ್ ತೀವ್ರ ನೋವಾದರೆ ತಕ್ಷಣ ಚಿಕಿತ್ಸೆ.',
      bp: 'ರಕ್ತದೊತ್ತಡಕ್ಕೆ:\n\n**ಪ್ರತಿದಿನ:** ಉಪ್ಪು ಕಡಿಮೆ, ತರಕಾರಿ, ನಡಿಗೆ, ಒತ್ತಡ ಕಡಿಮೆ.\n**ಮೇಲ್ವಿಚಾರಣೆ:** ಪ್ರತಿದಿನ ಒಂದೇ ಸಮಯಕ್ಕೆ ಅಳೆಯಿರಿ.\n\nಔಷಧವನ್ನು ವೈದ್ಯರಂತೆ ತೆಗೆದುಕೊಳ್ಳಿ; ತಾವೇ ನಿಲ್ಲಿಸಬೇಡಿ. ತೀವ್ರ ಲಕ್ಷಣಗಳಲ್ಲಿ **112**.',
      diabetes: 'ಸಕ್ಕರೆ ಆರೈಕೆ:\n\n**ಆಹಾರ:** ಕ್ರಮಬದ್ಧ ಸಮತೋಲಿತ ಊಟ, ಕಡಿಮೆ ಸಕ್ಕರೆ.\n**ನಡಿಗೆ:** ಊಟದ ನಂತರ ನಡಿಗೆ.\n**ಮೇಲ್ವಿಚಾರಣೆ:** ಪರೀಕ್ಷೆ ವೇಳಾಪಟ್ಟಿ.\n\nಇನ್ಸುಲಿನ್/ಮಾತ್ರೆಯನ್ನು ವೈದ್ಯರಿಲ್ಲದೆ ಬದಲಾಯಿಸಬೇಡಿ.',
      doctor: 'ಸಿದ್ಧರಾಗಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. 🩺\n\n**ಮುಂದೆ:** ನಿಮ್ಮ GP/ಕ್ಲಿನಿಕ್‌ಗೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಪಡೆಯಿರಿ. ಲಕ್ಷಣ, ಅವಧಿ, ಔಷಧ ಪಟ್ಟಿ ಬರೆದಿಡಿ.',
      pain: 'ಅಸ್ವಸ್ಥತೆಗೆ ಕ್ಷಮಿಸಿ. 💙\n\nವಿಶ್ರಾಂತಿ ನೀಡಿ; ಬಿಸಿ/ತಣ್ಣನೆ ಒತ್ತಡ ಸಹಾಯ ಆಗಬಹುದು. ನೋವು ನಿವಾರಕ ಸೂಚನೆ ಪ್ರಕಾರ ಮಾತ್ರ.\n\nತೀವ್ರ/ಹಠಾತ್ ನೋವಾದರೆ ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.',
      thanks: 'ಸ್ವಾಗತ. 💙 ನಿಮ್ಮ ಆರೈಕೆ ಮಾಡಿಕೊಳ್ಳಿ — ಬೇಕಾದಾಗ ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.',
      about: 'ನಾನು MediCare ನಲ್ಲಿ ನಿಮ್ಮ **AI ಆರೋಗ್ಯ ಸಂಗಾತಿ**. 🤖\n\nಔಷಧ, ಜ್ಞಾಪನೆ, ತಪ್ಪಿದ ಡೋಸ್, ಫಿಟ್‌ನೆಸ್, ಆಹಾರ, ನಿದ್ರೆ, ಒತ್ತಡ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಇದು ಸಾಮಾನ್ಯ ಮಾಹಿತಿ — ಗಂಭೀರ ಸಮಸ್ಯೆಗೆ ವೈದ್ಯರನ್ನು ಭೇಟಿಯಾಗಿ.',
      fallback: 'ನಾನು ನಿಮಗಾಗಿ ಇಲ್ಲಿದ್ದೇನೆ. 💙 **ಔಷಧ, ಜ್ಞಾಪನೆ, ತಪ್ಪಿದ ಡೋಸ್, ಫಿಟ್‌ನೆಸ್, ಆಹಾರ, ನಿದ್ರೆ, ಒತ್ತಡ** ಬಗ್ಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.\n\nಉದಾ: "ನನ್ನ ಔಷಧ ಮರೆತೆ", "ಒಳ್ಳೆಯ ನಿದ್ರೆ", "ಸಕ್ಕರೆಗೆ ಏನು ತಿನ್ನಲಿ?".\n\nತುರ್ತಾದರೆ **112**.',
      emergency: 'ಇದು **ವೈದ್ಯಕೀಯ ತುರ್ತು** ಆಗಿದ್ದರೆ, ಈಗಲೇ **112** ಗೆ ಕರೆ ಮಾಡಿ (ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ **108**). ಕಾಯಬೇಡಿ. 💙\n\nಸಾಧ್ಯವಾದರೆ ಯಾರೊಂದಿಗಾದರೂ ಇರಿ, ಫೋನ್ ಹತ್ತಿರ ಇಟ್ಟುಕೊಳ್ಳಿ.'
    },

    ml: {
      greeting: 'നമസ്കാരം! 💙 മരുന്ന്, ഓർമ്മപ്പെടുത്തൽ, വിട്ടുപോയ ഡോസ്, ഫിറ്റ്നസ്, ആഹാരം, ഉറക്കം, സമ്മർദ്ദം എന്നിവയിൽ സഹായിക്കാം. എന്തിനെക്കുറിച്ച് സംസാരിക്കാം?',
      missed: 'സംഭവിക്കും — നിങ്ങളെ കുറ്റപ്പെടുത്തരുത്. 💙\n\n**ഇപ്പോൾ:** കുറച്ച് വൈകിയെങ്കിൽ കഴിക്കാം. അടുത്ത ഡോസ് അടുത്തെങ്കിൽ വിട്ടത് ഒഴിവാക്കുക — **ഇരട്ടി വേണ്ട**.\n\nപലപ്പോഴും വിട്ടാൽ ഡോക്ടറെ അറിയിക്കുക.',
      meds: 'മരുന്നിൽ സഹായിക്കാം. 💊\n\nഎല്ലാ ദിവസവും ഒരേ സമയത്ത് കഴിച്ച്, കഴിച്ച ശേഷം ടിക്ക് ചെയ്യുക.\n\nഏത് മരുന്ന്, എത്ര?',
      fitness: 'കുറച്ച് എങ്കിലും സ്ഥിരമായി ചെയ്യുന്നതാണ് നല്ലത്. 🌿\n\nഭക്ഷണത്തിന് ശേഷം 15 മിനിറ്റ് നടത്തം · ഓരോ മണിക്കൂറും 2 മിനിറ്റ് സ്ട്രെച്ച് · 4‑4‑6 ശ്വാസം.',
      diet: 'എളുപ്പമുള്ള ഭക്ഷണ ശീലങ്ങൾ. 🥗\n\nപകുതി പ്ലേറ്റ് പച്ചക്കറി · മുഴുവൻ ധാന്യം · കുറഞ്ഞ പഞ്ചസാര/വറുത്തത് · ഓരോ ഭക്ഷണത്തിലും പ്രോട്ടീൻ.\n\nപ്രമേഹം/ഹൃദയ രോഗമുണ്ടെങ്കിൽ ഡോക്ടറുടെ നിർദ്ദേശം പാലിക്കുക.',
      water: 'ആവശ്യത്തിന് വെള്ളം കുടിക്കുക. 💧\n\nദിവസം **6-8 ഗ്ലാസ്**, വെയിലിൽ/വ്യായാമത്തിൽ കൂടുതൽ. ഓരോ ഭക്ഷണത്തിനൊപ്പം ഒരു ഗ്ലാസ്.',
      sleep: 'വിശ്രമവും ചികിത്സയുടെ ഭാഗമാണ്. 🌙\n\nഒരേ സമയത്ത് ഉറങ്ങുക/എഴുന്നേൽക്കുക · ഉറങ്ങുന്നതിന് 30 മിനിറ്റ് മുൻപ് സ്ക്രീൻ വേണ്ട · മുറി തണുപ്പും ഇരുട്ടും.',
      stress: 'പങ്കുവെച്ചതിന് നന്ദി — ഇത് പ്രധാനമാണ്. 💙\n\nപതിയെ ശ്വസിക്കുക (4‑4‑6), ചെറിയ നടത്തം, വിശ്വസ്തരോട് സംസാരിക്കുക.\n\nദീർഘകാലമായാൽ ഡോക്ടർ/കൗൺസലർ. അടിയന്തരമെങ്കിൽ **112**.',
      fever: 'നേരിയ പനിക്ക്: വിശ്രമം, ദ്രാവകം, ഭാരം കുറഞ്ഞ വസ്ത്രം. 🤒\n\n**വേഗം ഡോക്ടറെ കാണുക:** 3 ദിവസത്തിൽ കൂടുതൽ, വളരെ കൂടുതൽ, അല്ലെങ്കിൽ കടുത്ത തലവേദന/ശ്വാസതടസ്സം.',
      cold: 'ജലദോഷം/ചുമയ്ക്ക്: ചൂടുള്ള ദ്രാവകം, തേൻ കലർന്ന ചൂടുവെള്ളം, ആവി, വിശ്രമം. 🍵\n\n**ഡോക്ടർ:** ഒരാഴ്ചയിൽ കൂടുതൽ, ശ്വാസതടസ്സം, രക്തം കലർന്ന ചുമ.',
      headache: 'ശാന്തവും ഇരുണ്ടതുമായ മുറി, വെള്ളം, നെറ്റിയിൽ തണുപ്പ്. 🧠\n\nവേദനസംഹാരി പലപ്പോഴും വേണ്ട. പെട്ടെന്ന് കടുത്ത വേദനയെങ്കിൽ ഉടൻ ചികിത്സ.',
      bp: 'രക്തസമ്മർദ്ദത്തിന്:\n\n**ദിവസവും:** ഉപ്പ് കുറയ്ക്കുക, പച്ചക്കറി, നടത്തം, സമ്മർദ്ദം കുറയ്ക്കുക.\n**നിരീക്ഷണം:** ദിവസവും ഒരേ സമയത്ത് അളക്കുക.\n\nമരുന്ന് ഡോക്ടറുടെ വിധി പ്രകാരം; സ്വയം നിർത്തരുത്. കടുത്ത ലക്ഷണങ്ങളിൽ **112**.',
      diabetes: 'പ്രമേഹ പരിചരണം:\n\n**ആഹാരം:** ക്രമമായ സമീകൃത ഭക്ഷണം, കുറഞ്ഞ പഞ്ചസാര.\n**നടത്തം:** ഭക്ഷണത്തിന് ശേഷം നടക്കുക.\n**നിരീക്ഷണം:** പരിശോധന ഷെഡ്യൂൾ.\n\nഇൻസുലിൻ/ഗുളിക ഡോക്ടറില്ലാതെ മാറ്റരുത്.',
      doctor: 'തയ്യാറെടുക്കാൻ സഹായിക്കാം. 🩺\n\n**അടുത്തത്:** നിങ്ങളുടെ GP/ക്ലിനിക്കിൽ അപ്പോയിന്റ്മെന്റ്. ലക്ഷണങ്ങൾ, ദൈർഘ്യം, മരുന്നുകളുടെ പട്ടിക എഴുതിവെക്കുക.',
      pain: 'അസ്വസ്ഥതയിൽ ഖേദിക്കുന്നു. 💙\n\nവിശ്രമം നൽകുക; ചൂടോ തണുപ്പോ സഹായിക്കാം. വേദനസംഹാരി നിർദ്ദേശപ്രകാരം മാത്രം.\n\nകടുത്തതോ പെട്ടെന്നുള്ളതോ ആണെങ്കിൽ ചികിത്സ തേടുക.',
      thanks: 'സ്വാഗതം. 💙 നിങ്ങളെ നോക്കിക്കൊള്ളുക — ആവശ്യമുള്ളപ്പോൾ ഞാൻ ഇവിടെയുണ്ട്.',
      about: 'ഞാൻ MediCare-ൽ നിങ്ങളുടെ **AI ആരോഗ്യ സഹായി**യാണ്. 🤖\n\nമരുന്ന്, ഓർമ്മപ്പെടുത്തൽ, വിട്ടുപോയ ഡോസ്, ഫിറ്റ്നസ്, ആഹാരം, ഉറക്കം, സമ്മർദ്ദം എന്നിവയിൽ സഹായിക്കാം. ഇത് പൊതുവിവരം മാത്രം — ഗുരുതരമായാൽ ഡോക്ടറെ കാണുക.',
      fallback: 'ഞാൻ നിങ്ങൾക്കായി ഇവിടെയുണ്ട്. 💙 **മരുന്ന്, ഓർമ്മപ്പെടുത്തൽ, വിട്ടുപോയ ഡോസ്, ഫിറ്റ്നസ്, ആഹാരം, ഉറക്കം, സമ്മർദ്ദം** സഹായിക്കാം.\n\nഉദാ: "മരുന്ന് മറന്നു", "നല്ല ഉറക്കം", "പ്രമേഹത്തിന് എന്ത് കഴിക്കണം?".\n\nഅടിയന്തരമെങ്കിൽ **112**.',
      emergency: 'ഇത് **വൈദ്യ അടിയന്തരാവസ്ഥ** ആണെങ്കിൽ, ഇപ്പോൾ തന്നെ **112** വിളിക്കുക (ആംബുലൻസിന് **108**). കാത്തിരിക്കരുത്. 💙\n\nകഴിയുമെങ്കിൽ ഒരാളൊപ്പം ഇരിക്കുക, ഫോൺ അടുത്ത് സൂക്ഷിക്കുക.'
    },

    mr: {
      greeting: 'नमस्कार! 💙 औषधे, स्मरणपत्रे, चुकलेला डोस, फिटनेस, आहार, झोप, तणाव याबद्दल मदत करू शकतो. कशाबद्दल बोलायचे?',
      missed: 'असे होते — स्वतःला दोष देऊ नका. 💙\n\n**आता:** थोडा उशीर झाला असेल तर घ्या. पुढचा डोस जवळ असेल तर चुकलेला सोडा — **दोन डोस घेऊ नका**.\n\nवारंवार चुकत असेल तर डॉक्टरांना सांगा.',
      meds: 'औषधांमध्ये मदत करतो. 💊\n\nरोज एकाच वेळी घ्या आणि घेतल्यावर टिक करा.\n\nकोणते औषध, किती मात्रा?',
      fitness: 'थोडे पण नियमित करणेच उत्तम. 🌿\n\nजेवणानंतर 15 मिनिटे चालणे · दर तासाला 2 मिनिटे स्ट्रेच · 4‑4‑6 श्वास.',
      diet: 'सोप्या आहार सवयी. 🥗\n\nअर्धी ताटात भाज्या · अखंड धान्य · कमी साखर/तळलेले · प्रत्येक जेवणात थोडा प्रोटीन.\n\nमधुमेह/हृदयरोग असल्यास डॉक्टरांचा सल्ला पाळा.',
      water: 'पुरेसे पाणी प्या. 💧\n\nदिवसाला **6-8 ग्लास**, उन्हात/व्यायामात जास्त. प्रत्येक जेवणासोबत एक ग्लास.',
      sleep: 'आरामही उपचाराचा भाग आहे. 🌙\n\nएकाच वेळी झोपणे/उठणे · झोपण्यापूर्वी 30 मिनिटे स्क्रीन नको · खोली थंड, अंधारी.',
      stress: 'सांगितल्याबद्दल धन्यवाद — हे महत्त्वाचे आहे. 💙\n\nसावकाश श्वास (4‑4‑6), थोडे चालणे, विश्वासू व्यक्तीशी बोलणे.\n\nदीर्घकाळ असेल तर डॉक्टर/समुपदेशक. तातडी असेल तर **112**.',
      fever: 'सौम्य तापासाठी: आराम, द्रव, हलके कपडे. 🤒\n\n**लवकर डॉक्टरांना भेटा:** 3 दिवसांपेक्षा जास्त, खूप जास्त, किंवा तीव्र डोकेदुखी/श्वास त्रास.',
      cold: 'सर्दी/खोकल्यासाठी: गरम द्रव, मध घातलेले गरम पाणी, वाफ, आराम. 🍵\n\n**डॉक्टर:** आठवड्यापेक्षा जास्त, श्वास घेण्यास त्रास, रक्तयुक्त खोकला.',
      headache: 'शांत, अंधाऱ्या खोलीत आराम, पाणी, कपाळावर थंड पट्टी. 🧠\n\nवेदनाशामक वारंवार घेऊ नका. अचानक तीव्र वेदना असल्यास तातडीने उपचार.',
      bp: 'रक्तदाबासाठी:\n\n**रोज:** मीठ कमी, भाज्या, चालणे, तणाव कमी.\n**निरीक्षण:** रोज एकाच वेळी मोजा.\n\nऔषध डॉक्टरांनी सांगितल्याप्रमाणे; स्वतः बंद करू नका. तीव्र लक्षणांसह **112**.',
      diabetes: 'मधुमेह काळजी:\n\n**आहार:** नियमित संतुलित जेवण, कमी साखर.\n**चालणे:** जेवणानंतर चाला.\n**निरीक्षण:** तपासणी वेळापत्रक.\n\nइन्सुलिन/गोळी डॉक्टरांशिवाय बदलू नका.',
      doctor: 'तयारीत मदत करतो. 🩺\n\n**पुढे:** तुमच्या GP/क्लिनिकमध्ये अपॉइंटमेंट घ्या. लक्षणे, कालावधी, औषधांची यादी लिहा.',
      pain: 'त्रासाबद्दल वाईट वाटते. 💙\n\nआराम द्या; गरम/थंड शेक सहाय्यक ठरू शकते. वेदनाशामक सूचनेनुसारच.\n\nतीव्र/अचानक वेदना असल्यास उपचार घ्या.',
      thanks: 'स्वागत आहे. 💙 स्वतःची काळजी घ्या — गरज असेल तेव्हा मी येथे आहे.',
      about: 'मी MediCare वर तुमचा **AI आरोग्य साथीदार** आहे. 🤖\n\nऔषध, स्मरणपत्र, चुकलेला डोस, फिटनेस, आहार, झोप, तणाव यात मदत करतो. ही सामान्य माहिती आहे — गंभीर समस्येसाठी डॉक्टरांना भेटा.',
      fallback: 'मी तुमच्यासाठी येथे आहे. 💙 **औषध, स्मरणपत्र, चुकलेला डोस, फिटनेस, आहार, झोप, तणाव** यात मदत करू शकतो.\n\nउदा: "माझे औषध विसरलो", "चांगली झोप", "मधुमेहात काय खावे?".\n\nआपत्कालीन असल्यास **112**.',
      emergency: 'हे **वैद्यकीय आपत्काल** असू शकत असेल, तर आत्ताच **112** वर कॉल करा (रुग्णवाहिकेसाठी **108**). थांबू नका. 💙\n\nशक्य असल्यास कोणासोबत तरी राहा आणि फोन जवळ ठेवा.'
    },

    bn: {
      greeting: 'নমস্কার! 💙 ওষুধ, রিমাইন্ডার, বাদ পড়া ডোজ, ফিটনেস, খাবার, ঘুম, মানসিক চাপ নিয়ে সাহায্য করতে পারি। কী নিয়ে কথা বলবেন?',
      missed: 'হয়ে যায় — নিজেকে দোষ দেবেন না। 💙\n\n**এখন:** একটু দেরি হলে নিয়ে নিন। পরের ডোজ কাছাকাছি হলে বাদ পড়াটাই ছেড়ে দিন — **দুইবার নেবেন না**।\n\nবারবার বাদ পড়লে ডাক্তারকে বলুন।',
      meds: 'ওষুধে সাহায্য করি। 💊\n\nপ্রতিদিন একই সময়ে নিন, নেওয়ার পর টিক করুন।\n\nকোন ওষুধ, কতটা?',
      fitness: 'অল্প কিন্তু নিয়মিত করাই ভালো। 🌿\n\nখাবারের পর ১৫ মিনিট হাঁটা · প্রতি ঘণ্টায় ২ মিনিট স্ট্রেচ · 4‑4‑6 শ্বাস।',
      diet: 'সহজ খাদ্যাভ্যাস। 🥗\n\nঅর্ধেক প্লেট সবজি · আস্ত শস্য · কম চিনি/ভাজা · প্রতিবার খাবারে প্রোটিন।\n\nডায়াবেটিস/হৃদরোগ থাকলে ডাক্তারের পরামর্শ মানুন।',
      water: 'পর্যাপ্ত জল খান। 💧\n\nদিনে **6-8 গ্লাস**, রোদে/ব্যায়ামে বেশি। প্রতিবার খাবারের সঙ্গে এক গ্লাস।',
      sleep: 'বিশ্রামও চিকিৎসার অংশ। 🌙\n\nএকই সময়ে ঘুম/ওঠা · ঘুমের ৩০ মিনিট আগে স্ক্রিন নয় · ঘর ঠান্ডা ও অন্ধকার।',
      stress: 'শেয়ার করার জন্য ধন্যবাদ — এটা গুরুত্বপূর্ণ। 💙\n\nধীরে শ্বাস (4‑4‑6), একটু হাঁটা, বিশ্বস্ত কারও সঙ্গে কথা।\n\nদীর্ঘদিন চললে ডাক্তার/কাউন্সেলরের সঙ্গে দেখা করুন। জরুরি হলে **112**।',
      fever: 'হালকা জ্বরে: বিশ্রাম, তরল, হালকা পোশাক। 🤒\n\n**দ্রুত ডাক্তার দেখান:** ৩ দিনের বেশি, খুব বেশি, বা তীব্র মাথাব্যথা/শ্বাসকষ্ট।',
      cold: 'সর্দি/কাশিতে: গরম তরল, মধু-মেশানো গরম জল, বাষ্প, বিশ্রাম। 🍵\n\n**ডাক্তার:** এক সপ্তাহের বেশি, শ্বাসকষ্ট, রক্তমিশ্রিত কাশি।',
      headache: 'শান্ত, অন্ধকার ঘরে বিশ্রাম, জল, কপালে ঠান্ডা সেঁক। 🧠\n\nব্যথানাশক বেশি নেবেন না। হঠাৎ তীব্র ব্যথা হলে সঙ্গে সঙ্গে চিকিৎসা।',
      bp: 'রক্তচাপের জন্য:\n\n**প্রতিদিন:** কম লবণ, সবজি, হাঁটা, কম চাপ।\n**পর্যবেক্ষণ:** প্রতিদিন একই সময়ে মাপুন।\n\nওষুধ ডাক্তারের নির্দেশে; নিজে বন্ধ করবেন না। তীব্র লক্ষণে **112**।',
      diabetes: 'ডায়াবেটিস যত্ন:\n\n**খাবার:** নিয়মিত সুষম খাবার, কম চিনি।\n**হাঁটা:** খাবারের পর হাঁটুন।\n**পর্যবেক্ষণ:** পরীক্ষার রুটিন মানুন।\n\nইনসুলিন/ট্যাবলেট ডাক্তার ছাড়া বদলাবেন না।',
      doctor: 'প্রস্তুতি নিতে সাহায্য করি। 🩺\n\n**পরের ধাপ:** আপনার GP/ক্লিনিকে অ্যাপয়েন্টমেন্ট নিন। লক্ষণ, সময়কাল, ওষুধের তালিকা লিখে নিন।',
      pain: 'অস্বস্তির জন্য দুঃখিত। 💙\n\nবিশ্রাম দিন; গরম/ঠান্ডা সেঁক কাজে দিতে পারে। ব্যথানাশক নির্দেশমতো।\n\nতীব্র/হঠাৎ ব্যথা হলে চিকিৎসা নিন।',
      thanks: 'স্বাগতম। 💙 নিজের যত্ন নিন — দরকার হলে আমি এখানে আছি।',
      about: 'আমি MediCare-এ আপনার **AI স্বাস্থ্য সঙ্গী**। 🤖\n\nওষুধ, রিমাইন্ডার, বাদ পড়া ডোজ, ফিটনেস, খাবার, ঘুম, মানসিক চাপে সাহায্য করি। এটি সাধারণ তথ্য — গুরুতর সমস্যায় ডাক্তার দেখান।',
      fallback: 'আমি আপনার জন্য এখানে আছি। 💙 **ওষুধ, রিমাইন্ডার, বাদ পড়া ডোজ, ফিটনেস, খাবার, ঘুম, মানসিক চাপ** নিয়ে সাহায্য করতে পারি।\n\nযেমন: "ওষুধ ভুলে গেছি", "ভালো ঘুমের টিপস", "ডায়াবেটিসে কী খাব?"\n\nজরুরি হলে **112**।',
      emergency: 'এটি **চিকিৎসা জরুরি অবস্থা** হলে, এখনই **112**-এ কল করুন (অ্যাম্বুলেন্সের জন্য **108**)। দেরি করবেন না। 💙\n\nসম্ভব হলে কারও সঙ্গে থাকুন, ফোন কাছে রাখুন।'
    }
  };

  /* Localized link-button labels, keyed by the target page url. */
  var LINK_TEXT = {
    te: {
      'medication-reminders.html': 'మందుల రిమైండర్లు తెరవండి',
      'fitness-plan.html': 'ఫిట్‌నెస్ ప్లాన్ తెరవండి',
      'diet-plan.html': 'డైట్ ప్లాన్ తెరవండి',
      'health-records.html': 'ఆరోగ్య రికార్డులు తెరవండి',
      'appointments.html': 'అపాయింట్‌మెంట్ బుక్ చేయండి',
      'nearby-hospitals.html': 'దగ్గరి ఆసుపత్రులు',
      'emergency-contacts.html': 'అత్యవసర నంబర్లు తెరవండి'
    },
    hi: {
      'medication-reminders.html': 'दवा रिमाइंडर खोलें',
      'fitness-plan.html': 'फिटनेस प्लान खोलें',
      'diet-plan.html': 'डाइट प्लान खोलें',
      'health-records.html': 'हेल्थ रिकॉर्ड खोलें',
      'appointments.html': 'अपॉइंटमेंट बुक करें',
      'nearby-hospitals.html': 'आसपास के अस्पताल',
      'emergency-contacts.html': 'आपातकालीन संपर्क खोलें'
    },
    ta: {
      'medication-reminders.html': 'மருந்து நினைவூட்டல் திற',
      'fitness-plan.html': 'உடற்பயிற்சி திட்டம் திற',
      'diet-plan.html': 'உணவுத் திட்டம் திற',
      'health-records.html': 'சுகாதார பதிவுகள் திற',
      'appointments.html': 'அப்பாயின்ட்மென்ட் பதிவு',
      'nearby-hospitals.html': 'அருகிலுள்ள மருத்துவமனை',
      'emergency-contacts.html': 'அவசர தொடர்புகள் திற'
    },
    kn: {
      'medication-reminders.html': 'ಔಷಧ ಜ್ಞಾಪನೆಗಳನ್ನು ತೆರೆಯಿರಿ',
      'fitness-plan.html': 'ಫಿಟ್‌ನೆಸ್ ಪ್ಲಾನ್ ತೆರೆಯಿರಿ',
      'diet-plan.html': 'ಆಹಾರ ಪ್ಲಾನ್ ತೆರೆಯಿರಿ',
      'health-records.html': 'ಆರೋಗ್ಯ ದಾಖಲೆಗಳನ್ನು ತೆರೆಯಿರಿ',
      'appointments.html': 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಕಾಯ್ದಿರಿಸಿ',
      'nearby-hospitals.html': 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು',
      'emergency-contacts.html': 'ತುರ್ತು ಸಂಪರ್ಕಗಳನ್ನು ತೆರೆಯಿರಿ'
    },
    ml: {
      'medication-reminders.html': 'മരുന്ന് ഓർമ്മപ്പെടുത്തലുകൾ തുറക്കുക',
      'fitness-plan.html': 'ഫിറ്റ്നസ് പ്ലാൻ തുറക്കുക',
      'diet-plan.html': 'ഡയറ്റ് പ്ലാൻ തുറക്കുക',
      'health-records.html': 'ആരോഗ്യ രേഖകൾ തുറക്കുക',
      'appointments.html': 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക',
      'nearby-hospitals.html': 'അടുത്തുള്ള ആശുപത്രികൾ',
      'emergency-contacts.html': 'അടിയന്തര കോൺടാക്റ്റുകൾ തുറക്കുക'
    },
    mr: {
      'medication-reminders.html': 'औषध स्मरणपत्रे उघडा',
      'fitness-plan.html': 'फिटनेस प्लॅन उघडा',
      'diet-plan.html': 'आहार प्लॅन उघडा',
      'health-records.html': 'आरोग्य नोंदी उघडा',
      'appointments.html': 'अपॉइंटमेंट बुक करा',
      'nearby-hospitals.html': 'जवळची रुग्णालये',
      'emergency-contacts.html': 'आपत्कालीन संपर्क उघडा'
    },
    bn: {
      'medication-reminders.html': 'ওষুধ রিমাইন্ডার খুলুন',
      'fitness-plan.html': 'ফিটনেস প্ল্যান খুলুন',
      'diet-plan.html': 'ডায়েট প্ল্যান খুলুন',
      'health-records.html': 'স্বাস্থ্য রেকর্ড খুলুন',
      'appointments.html': 'অ্যাপয়েন্টমেন্ট বুক করুন',
      'nearby-hospitals.html': 'কাছের হাসপাতাল',
      'emergency-contacts.html': 'জরুরি যোগাযোগ খুলুন'
    }
  };

  /* Extra localised wording for the newer topics. `localized()` checks this
   * table first, so it also overrides the older fallback text below. */
  var EXTRA_SAY = {
    te: {
      nausea: 'వాంతి/వికారం సాధారణంగా కొద్దిసేపే ఉంటుంది. 💙\n\n**ఇప్పుడు:** కొద్దికొద్దిగా నీరు లేదా ORS తాగండి, మెత్తని ఆహారం (అన్నం, టోస్ట్, అరటి) తినండి, విశ్రాంతి తీసుకోండి. వేయించిన/కారమైనవి వద్దు.\n\n**వెంటనే డాక్టర్‌ను కలవండి:** 2 రోజులకు మించి, ద్రవాలు దిగకపోతే, రక్తం, తీవ్ర నొప్పి, లేదా నిర్జలీకరణ లక్షణాలుంటే.',
      diarrhea: 'విరేచనాలకు: 💧\n\n**ముఖ్యం:** ద్రవాలు భర్తీ చేయండి — నీరు, ORS, కొబ్బరి నీరు లేదా అన్నం నీరు, కొద్దికొద్దిగా తరచుగా.\nతేలిక ఆహారం: అన్నం, పెరుగు, అరటి, టోస్ట్. ఒకటి-రెండు రోజులు నూనె, కారం, పాలు వద్దు.\n\n**డాక్టర్‌ను కలవండి:** మలంలో రక్తం, ఎక్కువ జ్వరం, 2 రోజులకు మించి ఉంటే.',
      acidity: 'ఎసిడిటీ, గ్యాస్ లేదా గుండెల్లో మంటకు: 🍵\n\n- కొద్దికొద్దిగా క్రమంగా తినండి; మసాలా, నూనె, రాత్రి ఆహారం తగ్గించండి.\n- టీ, కాఫీ, మద్యం, ధూమపానం తగ్గించండి.\n- తిన్న తర్వాత 2-3 గంటలు పడుకోకండి.\n\n**డాక్టర్‌ను కలవండి:** తీవ్ర నొప్పి, మింగడంలో ఇబ్బంది, నల్ల మలం ఉంటే.',
      constipation: 'మలబద్ధకానికి: 🥗\n\n- ఎక్కువ పీచు: కూరగాయలు, పండ్లు, తృణధాన్యాలు, సలాడ్.\n- రోజుకు 6-8 గ్లాసుల నీరు.\n- భోజనం తర్వాత కొద్దిగా నడక, ప్రతిరోజూ ఒకే సమయానికి మలవిసర్జన.\n\n**డాక్టర్‌ను కలవండి:** 2 వారాలకు మించి, రక్తం, తీవ్ర నొప్పి ఉంటే.',
      allergy: 'చర్మంపై దద్దుర్లు, దురద లేదా అలర్జీకి: 💙\n\n- గోకవద్దు; ఆ ప్రాంతాన్ని శుభ్రంగా, చల్లగా ఉంచండి.\n- కొత్త ఆహారం, మందు, సబ్బు లేదా మొక్క వల్ల వచ్చిందా గమనించండి.\n- చల్లని కాపడం లేదా క్యాలమైన్ దురదను తగ్గిస్తుంది.\n\n**వెంటనే సహాయం తీసుకోండి:** పెదవులు/నాలుక వాచితే, శ్వాస ఇబ్బంది, అకస్మాత్తుగా దద్దుర్లు వస్తే.',
      dizziness: 'తల తిరగడం లేదా కళ్ళు తిరగడం: 💙\n\n- పడిపోకుండా వెంటనే కూర్చోండి లేదా పడుకోండి.\n- నీరు తాగండి — నిర్జలీకరణ సాధారణ కారణం.\n- నెమ్మదిగా లేవండి; భోజనం మానేసి ఉంటే ఏదైనా తినండి.\n\n**వైద్యం తీసుకోండి:** అకస్మాత్తుగా, బలహీనత, మాట కలవరం, ఛాతీ నొప్పి ఉంటే.',
      injury: 'కోత, గాయం, కాలిన గాయం లేదా మెలికపడటానికి: 🩹\n\n- చిన్న కోతను నీటితో కడగండి; రక్తం వస్తే శుభ్రమైన గుడ్డతో నొక్కండి.\n- మెలికకు: విశ్రాంతి, 15-20 నిమిషాలు మంచు, పైకి ఎత్తుగా ఉంచండి.\n- కాలిన గాయాన్ని 20 నిమిషాలు ప్రవహించే నీటిలో చల్లార్చండి; వెన్న/టూత్‌పేస్ట్ రాసుకోకండి.\n\n**ఆసుపత్రికి వెళ్లండి:** లోతైన/పెద్ద గాయాలు, ఎక్కువ రక్తస్రావం, అరచేతి కంటే పెద్ద కాలిన గాయం, ఎముక విరిగినట్లు, కుక్క/పాము కాటు.',
      weight: 'ఆరోగ్యకరమైన బరువు కోసం: 🌿\n\n- సగం ప్లేటు కూరగాయలు; తృణధాన్యాలు; ప్రతి భోజనంలో కొంత ప్రోటీన్.\n- చక్కెర పానీయాలు, వేయించినవి తగ్గించండి.\n- రోజులో 30 నిమిషాల కదలిక, నెమ్మదిగా స్థిరమైన మార్పు.\n\nతీవ్రమైన డైట్లు వద్దు — నెమ్మదిగా చేసేదే నిలిచి ఉంటుంది. సమస్య ఉంటే డాక్టర్ చెప్పినట్లు చేయండి.',
      habits: 'ధూమపానం లేదా మద్యం తగ్గించడం దాదాపు అన్ని ఆరోగ్య సమస్యలకు సహాయం చేస్తుంది. 💙\n\n- మానేయడానికి ఒక తేదీ పెట్టుకోండి, మద్దతిచ్చే వారికి చెప్పండి.\n- ఆ అలవాటును నీరు, కొద్దిగా నడక లేదా చూయింగ్ గమ్‌తో భర్తీ చేయండి.\n- డాక్టర్‌ను అడగండి — ప్యాచ్‌లు, గమ్ లేదా కౌన్సెలింగ్ సహాయపడతాయి.\n\nఒంటరిగా చేయాల్సిన అవసరం లేదు.',
      eye: 'కళ్ళ సమస్యలకు: 👁️\n\n- కళ్ళకు విశ్రాంతి ఇవ్వండి; తరచుగా మెల్లగా మూయండి, 20-20-20 నియమం పాటించండి.\n- కళ్ళు రుద్దకండి; ఏదైనా పడితే శుభ్రమైన నీటితో కడగండి.\n\n**వెంటనే డాక్టర్‌ను కలవండి:** అకస్మాత్తుగా చూపు పోతే, తీవ్ర నొప్పి, గాయం లేదా ఎర్రగా నొప్పిగా ఉంటే.',
      ear: 'చెవి సమస్యలకు: 💙\n\n- చెవిలో నూనె, నీరు లేదా కాటన్ బడ్ పెట్టవద్దు.\n- తేలిక నొప్పికి వెచ్చని కాపడం సహాయపడవచ్చు; నొప్పి మాత్ర సూచన ప్రకారం.\n\n**డాక్టర్‌ను కలవండి:** చెవి నుండి స్రావం, వినికిడి తగ్గితే, తీవ్ర నొప్పి లేదా జ్వరం ఉంటే.',
      dental: 'పళ్ళు లేదా చిగుళ్ళ సమస్యలకు: 🦷\n\n- వెచ్చని ఉప్పు నీటితో పుక్కిలించండి; మెత్తని బ్రష్‌తో మెల్లగా తోమండి.\n- తగ్గేవరకు చాలా వేడి, చల్లని, తీపి ఆహారం వద్దు.\n\n**దంతవైద్యుడిని కలవండి:** నొప్పి కొనసాగితే, ముఖం వాచితే, చిగుళ్ళ నుండి రక్తం లేదా పన్ను ఊడితే.',
      urinary: 'మూత్రం లేదా మూత్రపిండాల సమస్యలకు: 💧\n\n- ఎక్కువ నీరు తాగండి, ఎక్కువసేపు మూత్రాన్ని ఆపుకోకండి.\n\n**త్వరగా డాక్టర్‌ను కలవండి:** మూత్రం వెళ్లేటప్పుడు మంట/నొప్పి, మూత୍ରంలో రక్తం, నడుము నొప్పితో జ్వరం, లేదా మూత్రం పోకపోతే.',
      menstrual: 'పీరియడ్స్ సమస్యలకు: 💙\n\n- వెచ్చని కాపడం లేదా వెచ్చని స్నానం నొప్పిని తగ్గిస్తుంది; కొద్దిగా నడక కూడా.\n- విశ్రాంతి, నీరు, ఇనుము ఎక్కువ ఉన్న ఆహారం (ఆకుకూరలు, పప్పులు) సహాయపడతాయి.\n\n**డాక్టర్‌ను కలవండి:** ఎక్కువ రక్తస్రావం, తీవ్ర నొప్పి, లేదా పీరియడ్స్ క్రమంగా లేకపోతే.',
      pregnancy: 'జాగ్రత్తగా ఉండండి, అభినందనలు. 💙\n\n- క్రమమైన చెకప్‌లు, డాక్టర్ ఇచ్చిన మందులు/విటమిన్లు.\n- సమతుల్య ఆహారం, నీరు, కొద్దిగా నడక, తగినంత విశ్రాంతి.\n- మద్యం, ధూమపానం, డాక్టర్ అనుమతించని మందులు వద్దు.\n\n**వెంటనే క్లినిక్‌ను సంప్రదించండి:** రక్తస్రావం, తీవ్ర నొప్పి, వాపు, లేదా శిశువు కదలిక తగ్గితే.',
      child: 'మీ చిన్నారి కోసం: 💙\n\n- ద్రవాలు అందిస్తూ ఉండండి; జ్వరం, ఆకలి, మూత్రం గమనించండి.\n- డాక్టర్ చెప్పిన మోతాదు సరిగ్గా ఇవ్వండి — పిల్లల మోతాదు పెద్దలది కాదు.\n\n**డాక్టర్‌ను కలవండి:** చిన్న శిశువుకు ఎక్కువ జ్వరం, శ్వాస ఇబ్బంది, అసాధారణ నిద్ర లేదా పాలు/నీరు తాగకపోతే.',
      vaccine: 'టీకాలు మీకూ, చుట్టూ ఉన్నవారికీ రక్షణ. 💉\n\n- క్లినిక్ ఇచ్చిన షెడ్యూల్ ప్రకారం వేయించుకోండి; కార్డు భద్రంగా ఉంచండి.\n- ఒకటి-రెండు రోజులు తేలిక జ్వరం లేదా నొప్పి సాధారణం.\n\n**డాక్టర్‌ను కలవండి:** ఎక్కువ వాపు, శ్వాస ఇబ్బంది లేదా ఎక్కువ జ్వరం ఉంటే.',
      labtest: 'పరీక్ష రిపోర్ట్ చదవడం: 🧾\n\n- ఒక అసాధారణ సంఖ్య ఒక్కటే నిర్ధారణ కాదు — మీ లక్షణాలు, చరిత్రతో కలిపి చూస్తారు.\n- పాత రిపోర్టులు ఉంచుకోండి, మార్పు తెలుస్తుంది.\n\n**రిపోర్టులు డాక్టర్‌కు చూపించండి.** నేను వాటిని విశ్లేషించలేను.',
      covid: 'కోవిడ్ లేదా ఫ్లూ లాంటి అనారోగ్యానికి: 🤒\n\n- విశ్రాంతి, ద్రవాలు; జ్వరం ఉంటే పారాసిటమాల్ సూచన ప్రకారం.\n- ఇతరులను కాపాడటానికి దూరంగా ఉండండి; కుటుంబంతో మాస్క్ ధరించండి.\n\n**వెంటనే వైద్యం:** శ్వాస ఇబ్బంది, ఛాతీ నొప్పి, గందరగోళం లేదా ఆక్సిజన్ తగ్గితే.',
      fallback: 'ఆ ప్రశ్నకు సరైన సమాధానం నాకు ఖచ్చితంగా తెలియదు. 💙\n\nకొంచెం వివరంగా చెప్పగలరా? ఉదా: **మందు**, **ఆహారం**, **నిద్ర**, **నొప్పి లేదా ఏదైనా లక్షణం**, **ఫిట్‌నెస్**, **ఒత్తిడి** — ఏ విషయం?\n\nఅత్యవసరమైతే లేదా ఎక్కువవుతుంటే డాక్టర్‌ను కలవండి — అత్యవసరంలో **112**.'
    },
    hi: {
      nausea: 'जी मिचलाना और उल्टी आमतौर पर जल्दी ठीक हो जाती है। 💙\n\n**अब:** थोड़ा-थोड़ा पानी या ORS पिएँ, हल्का खाना (चावल, टोस्ट, केला) खाएँ और आराम करें। तला, तीखा न खाएँ।\n\n**डॉक्टर से मिलें:** 2 दिन से ज़्यादा, तरल न रुके, खून, तेज़ दर्द, या पानी की कमी के लक्षण हों।',
      diarrhea: 'दस्त के लिए: 💧\n\n**ज़रूरी:** तरल भरें - पानी, ORS, नारियल पानी, चावल का पानी, थोड़ा-थोड़ा बार-बार।\nहल्का खाएँ: चावल, दही, केला, टोस्ट। एक-दो दिन तेल, मसाला और दूध से बचें।\n\n**डॉक्टर से मिलें:** मल में खून, तेज़ बुखार, 2 दिन से ज़्यादा।',
      acidity: 'एसिडिटी, गैस या सीने में जलन के लिए: 🍵\n\n- थोड़ा-थोड़ा नियमित खाएँ; तीखा, तैलीय या देर रात का खाना कम करें।\n- चाय, कॉफी, शराब और धूम्रपान घटाएँ।\n- खाने के 2-3 घंटे तक न लेटें।\n\n**डॉक्टर से मिलें:** तेज़ दर्द, निगलने में दिक्कत, काला मल हों।',
      constipation: 'कब्ज़ के लिए: 🥗\n\n- ज़्यादा फाइबर: सब्ज़ियाँ, फल, साबुत अनाज, सलाद।\n- दिन में 6-8 गिलास पानी।\n- खाने के बाद थोड़ी सैर, और रोज़ एक ही समय पर शौच की आदत।\n\n**डॉक्टर से मिलें:** 2 हफ़्ते से ज़्यादा, खून या तेज़ दर्द हों।',
      allergy: 'त्वचा पर दाने, खुजली या एलर्जी के लिए: 💙\n\n- खुजाएँ नहीं; जगह साफ़ और ठंडी रखें।\n- देखें कि नया खाना, दवा, साबुन या पौधा कारण हो सकता है।\n- ठंडी पट्टी या कैलामाइन खुजली शांत करती है।\n\n**तुरंत मदद लें:** होंठ/जीभ में सूजन, साँस की तकलीफ़ या अचानक पूरे शरीर पर दाने हों।',
      dizziness: 'चक्कर या सिर हल्का लगना: 💙\n\n- गिरने से बचने के लिए तुरंत बैठें या लेटें।\n- पानी पिएँ - पानी की कमी आम कारण है।\n- धीरे-धीरे उठें; खाना छूटा हो तो कुछ खाएँ।\n\n**इलाज लें:** अचानक हो, या कमज़ोरी, बोलने में दिक्कत, सीने में दर्द के साथ हो।',
      injury: 'कट, घाव, जलन या मोच के लिए: 🩹\n\n- छोटा कट पानी से धोएँ; खून बह रहा हो तो साफ़ कपड़े से दबाएँ।\n- मोच: आराम, 15-20 मिनट बर्फ़, और ऊँचा रखें।\n- जलन: 20 मिनट बहते पानी में ठंडा करें; मक्खन या टूथपेस्ट न लगाएँ।\n\n**अस्पताल जाएँ:** गहरे/बड़े घाव, ज़्यादा खून, हथेली से बड़ी जलन, टूटी हड्डी, कुत्ते/साँप का काटना।',
      weight: 'स्वस्थ वज़न के लिए: 🌿\n\n- आधी प्लेट सब्ज़ियाँ; साबुत अनाज; हर भोजन में थोड़ा प्रोटीन।\n- मीठे पेय और तला हुआ कम करें।\n- ज़्यादातर दिन 30 मिनट गतिविधि, और धीमा, स्थिर बदलाव।\n\nक्रैश डाइट न करें - धीमा और स्थिर बदलाव टिकता है। बीमारी हो तो डॉक्टर की सलाह मानें।',
      habits: 'धूम्रपान या शराब घटाना लगभग हर स्वास्थ्य समस्या में मदद करता है। 💙\n\n- छोड़ने की तारीख़ तय करें, और किसी सहयोगी को बताएँ।\n- आदत को पानी, छोटी सैर या चुइंग गम से बदलें।\n- डॉक्टर से पूछें - पैच, गम या काउंसलिंग मदद करते हैं।\n\nअकेले करने की ज़रूरत नहीं।',
      eye: 'आँख की समस्याओं के लिए: 👁️\n\n- आँखों को आराम दें; 20-20-20 नियम अपनाएँ।\n- आँख मलें नहीं; कुछ गिरा हो तो साफ़ पानी से धोएँ।\n\n**तुरंत डॉक्टर से मिलें:** अचानक दिखना बंद हो, तेज़ दर्द, चोट, या आँख लाल और दर्दभरी हो।',
      ear: 'कान की समस्याओं के लिए: 💙\n\n- कान में तेल, पानी या कॉटन बड न डालें।\n- हल्के दर्द में गर्म सिकाई मदद कर सकती है; दर्द निवारक निर्देश अनुसार।\n\n**डॉक्टर से मिलें:** स्राव, सुनने में कमी, तेज़ दर्द या बुखार के साथ कान दर्द।',
      dental: 'दाँत या मसूड़ों की समस्या के लिए: 🦷\n\n- गर्म नमक पानी से कुल्ला करें; मुलायम ब्रश से धीरे ब्रश करें।\n- ठीक होने तक बहुत गर्म, ठंडा या मीठा न खाएँ।\n\n**दंत चिकित्सक से मिलें:** दर्द बना रहे, चेहरे में सूजन, मसूड़ों से खून या दाँत हिल रहा हो।',
      urinary: 'पेशाब या किडनी की समस्या के लिए: 💧\n\n- खूब पानी पिएँ, और पेशाब ज़्यादा देर न रोकें।\n\n**जल्दी डॉक्टर से मिलें:** पेशाब में जलन/दर्द, पेशाब में खून, कमर दर्द के साथ बुखार, या पेशाब न आना।',
      menstrual: 'माहवारी की समस्या के लिए: 💙\n\n- गर्म सिकाई या गर्म स्नान ऐंठन कम करता है; हल्की सैर भी मदद करती है।\n- आराम, पानी और आयरन वाला खाना (हरी सब्ज़ियाँ, दालें) मदद करते हैं।\n\n**डॉक्टर से मिलें:** बहुत ज़्यादा रक्तस्राव, तेज़ दर्द, या माहवारी बहुत अनियमित/बंद हो।',
      pregnancy: 'सँभलकर रहें, और बधाई। 💙\n\n- नियमित जाँच और डॉक्टर की दवाएँ/विटामिन।\n- संतुलित खाना, पानी, हल्की सैर और पर्याप्त आराम।\n- शराब, धूम्रपान और डॉक्टर से बिना पूछी दवा न लें।\n\n**तुरंत क्लिनिक से संपर्क करें:** रक्तस्राव, तेज़ दर्द, सूजन, या शिशु की हलचल कम हो।',
      child: 'आपके नन्हे के लिए: 💙\n\n- तरल देते रहें; बुखार, भूख और पेशाब पर ध्यान दें।\n- डॉक्टर की खुराक ठीक से दें - बच्चों की खुराक बड़ों से अलग होती है।\n\n**डॉक्टर से मिलें:** छोटे बच्चे में तेज़ बुखार, साँस की दिक्कत, असामान्य नींद या पीना बंद हो।',
      vaccine: 'टीके आपकी और आसपास के लोगों की सुरक्षा हैं। 💉\n\n- क्लिनिक का शेड्यूल अपनाएँ; कार्ड सँभालकर रखें।\n- एक-दो दिन हल्का बुखार या दर्द आम है।\n\n**डॉक्टर से मिलें:** ज़्यादा सूजन, साँस की दिक्कत या तेज़ बुखार हों।',
      labtest: 'रिपोर्ट पढ़ना: 🧾\n\n- एक असामान्य संख्या अकेले निदान नहीं है - लक्षण और इतिहास के साथ देखा जाता है।\n- पुरानी रिपोर्ट रखें, बदलाव दिखता है।\n\n**रिपोर्ट डॉक्टर को दिखाएँ।** मैं उनकी व्याख्या नहीं कर सकता।',
      covid: 'कोविड या फ्लू जैसी बीमारी के लिए: 🤒\n\n- आराम, तरल; बुखार हो तो पैरासिटामोल निर्देश अनुसार।\n- दूसरों की रक्षा के लिए अलग रहें; परिवार में मास्क पहनें।\n\n**तुरंत इलाज:** साँस की तकलीफ़, सीने में दर्द, भ्रम या ऑक्सीजन कम हो।',
      fallback: 'उस सवाल का सही जवाब मुझे पक्का नहीं पता। 💙\n\nज़रा और बताइए? जैसे **दवा**, **खाना**, **नींद**, **दर्द या कोई लक्षण**, **फिटनेस**, **तनाव** - किस बारे में?\n\nअगर ज़रूरी हो या बढ़ रहा हो तो डॉक्टर से मिलें - आपात स्थिति में **112**।'
    }
  };

  function localized(code, id) {
    return (EXTRA_SAY[code] && EXTRA_SAY[code][id]) || (SAY[code] && SAY[code][id]) || null;
  }

  function localizedLink(link, code) {
    if (!link) return undefined;
    var table = LINK_TEXT[code];
    return { url: link.url, label: (table && table[link.url]) || link.label };
  }

  function respond(text, lang) {
    var message = String(text == null ? '' : text).trim();
    var code = SAY[lang] ? lang : 'en';
    if (!message) {
      return { content: localized(code, 'fallback') || FALLBACK, contentEn: FALLBACK };
    }

    if (EMERGENCY.test(message)) {
      var emergencyLink = { url: 'emergency-contacts.html', label: 'Open Emergency Contacts' };
      return {
        content: localized(code, 'emergency') || EMERGENCY_REPLY,
        contentEn: EMERGENCY_REPLY,
        link: localizedLink(emergencyLink, code)
      };
    }

    function hit(entry) {
      if (typeof entry === 'string') return message.indexOf(entry) !== -1;
      if (entry.s != null) return message.indexOf(entry.s) !== -1;
      return entry.re.test(message);
    }

    var best = null;
    var bestScore = 0;
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      var score = 0;
      for (var j = 0; j < rule.match.length; j++) {
        var entry = rule.match[j];
        if (hit(entry)) score += (entry && entry.w) || 1;
      }
      if (score > bestScore) { bestScore = score; best = rule; }
    }

    if (best) {
      var out = { content: localized(code, best.id) || best.reply, contentEn: best.reply };
      if (best.link) out.link = localizedLink(best.link, code);
      return out;
    }

    return { content: localized(code, 'fallback') || FALLBACK, contentEn: FALLBACK };
  }

  global.MediCareChat = { respond: respond, rules: RULES, fallback: FALLBACK, say: SAY };
})(typeof window !== 'undefined' ? window : this);
