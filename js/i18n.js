(function () {
  'use strict';
  if (window.MediCareI18n) return;

  var storageKey = 'medicareLanguage';
  var translations = {
    /* shell / sidebar labels */
    'Medical Records': 'వైద్య రికార్డులు',
    'Patients': 'రోగులు',
    'Alert Center': 'అలర్ట్ కేంద్రం',
    'Reports': 'నివేదికలు',
    'Your health space': 'మీ ఆరోగ్య ప్రదేశం',
    'Patient care overview': 'రోగి సంరక్షణ అవలోకనం',
    'Open alerts': 'పెండింగ్ అలర్ట్లు',
    'Upcoming': 'రాబోయే',
    'Administrator': 'నిర్వాహకుడు',
    'Personal health': 'వ్యక్తిగత ఆరోగ్యం',
    'Admin workspace': 'అడ్మిన్ వర్క్‌స్పేస్',
    'Your care': 'మీ సంరక్షణ',
    'Account': 'ఖాతా',
    'Search…': 'వెతకండి…',
    'Dashboard': 'డ్యాష్‌బోర్డ్',
    'Reminders': 'రిమైండర్లు',
    'Alerts': 'అలర్ట్‌లు',
    'Admin View': 'అడ్మిన్ వీక్షణ',
    'Create Account': 'ఖాతా సృష్టించండి',
    'Reset Password': 'పాస్‌వర్డ్ రీసెట్ చేయండి',
    'Patient': 'రోగి',
    'Admin': 'అడ్మిన్',
    'Profile': 'ప్రొఫైల్',
    'Settings': 'సెట్టింగ్‌లు',
    'Log out': 'లాగ్ అవుట్',
    'Logout': 'లాగ్ అవుట్',
    'Back': 'వెనక్కి',
    'Close': 'మూసివేయి',
    'Save': 'సేవ్ చేయండి',
    'Remove': 'తొలగించండి',
    'Delete': 'తొలగించండి',
    'Search': 'వెతకండి',
    'Cancel': 'రద్దు చేయండి',
    'Open': 'తెరవండి',
    'Loading...': 'లోడ్ అవుతోంది...',
    'Loading…': 'లోడ్ అవుతోంది…',
    'Loading medicines…': 'మందులు లోడ్ అవుతున్నాయి…',
    'Patient menu': 'రోగి మెను',
    'Today’s doses and alerts': 'ఈరోజు మోతాదులు మరియు అలర్ట్‌లు',
    "Today's schedule and alerts": 'ఈరోజు షెడ్యూల్ మరియు అలర్ట్‌లు',
    'Connected Monitoring': 'కనెక్టెడ్ మానిటరింగ్',
    'Search health facilities': 'ఆరోగ్య కేంద్రాలను వెతకండి',
    'Fitness & Wellness': 'ఫిట్‌నెస్ మరియు ఆరోగ్యం',
    'Plan a care visit': 'వైద్య సందర్శనను ప్లాన్ చేయండి',
    'Medicines and dose history': 'మందులు మరియు మోతాదుల చరిత్ర',
    'Quick access to people in your care network.': 'మీ సంరక్షణ బృందంలోని వ్యక్తులను త్వరగా సంప్రదించండి.',
    'Good': 'శుభ',
    'Morning': 'ఉదయం',
    'Afternoon': 'మధ్యాహ్నం',
    'Evening': 'సాయంత్రం',
    'YOUR CARE, TODAY': 'ఈరోజు మీ ఆరోగ్యం',
    'A clear view of your care plan, one dose at a time.': 'మీ సంరక్షణ ప్రణాళికను ఒక్కో మోతాదుగా తెలుసుకోండి.',
    'DAILY MEDICATION PROGRESS': 'రోజువారీ మందుల పురోగతి',
    'Your health, in rhythm.': 'మీ ఆరోగ్యం సరైన లయలో.',
    'Your scheduled doses will appear here.': 'మీ షెడ్యూల్ చేసిన మోతాదులు ఇక్కడ కనిపిస్తాయి.',
    'View medication schedule': 'మందుల షెడ్యూల్ చూడండి',
    'Notifications': 'నోటిఫికేషన్‌లు',
    'PROFILE': 'ప్రొఫైల్',
    'Open notification settings': 'నోటిఫికేషన్ సెట్టింగ్‌లు తెరవండి',
    'Emergency contacts': 'అత్యవసర పరిచయాలు',
    'View emergency contacts': 'అత్యవసర పరిచయాలు చూడండి',
    'View your trusted contacts': 'మీ నమ్మకమైన పరిచయాలను చూడండి',
    'Move a little': 'కొంచెం కదలండి',
    'A short walk can support your daily wellbeing. Explore fitness': 'చిన్న నడక రోజువారీ ఆరోగ్యానికి తోడ్పడుతుంది. ఫిట్‌నెస్ చూడండి',
    'Nearby hospitals': 'సమీప ఆసుపత్రులు',
    'Search by place or use your location.': 'ప్రాంతం ద్వారా వెతకండి లేదా మీ స్థానాన్ని ఉపయోగించండి.',
    "Today's medication": 'ఈరోజు మందులు',
    'Your scheduled doses and status': 'మీ షెడ్యూల్ మోతాదులు మరియు స్థితి',
    'Full schedule': 'పూర్తి షెడ్యూల్',
    'Taken': 'తీసుకున్నారు',
    'Missed': 'తప్పిపోయింది',
    'Upcoming': 'తదుపరిది',
    'No medication doses are scheduled for today.': 'ఈరోజు మందుల మోతాదులు షెడ్యూల్ చేయలేదు.',
    'Consistency streak': 'వరుసగా పాటించిన రోజులు',
    'Earn badges by verifying a dose each day': 'ప్రతిరోజూ మోతాదును నిర్ధారించి బ్యాడ్జ్‌లు పొందండి',
    'days streak': 'రోజుల వరుస',
    'day streak': 'రోజు వరుస',
    'Verify a dose today to begin your streak.': 'మీ వరుసను ప్రారంభించడానికి ఈరోజు మోతాదును నిర్ధారించండి.',
    'Wellness plan': 'ఆరోగ్య ప్రణాళిక',
    "Today's saved nutrition plan": 'ఈరోజు సేవ్ చేసిన ఆహార ప్రణాళిక',
    "Today's meal ideas": 'ఈరోజు భోజన సూచనలు',
    'Loading your saved plan…': 'మీ సేవ్ చేసిన ప్రణాళిక లోడ్ అవుతోంది…',
    'Care balance': 'సంరక్షణ బ్యాలెన్స్',
    'Missed-dose adjustments appear here.': 'తప్పిపోయిన మోతాదుల సర్దుబాట్లు ఇక్కడ కనిపిస్తాయి.',
    'Medication Reminders': 'మందుల రిమైండర్లు',
    'Medication alerts': 'మందుల అలర్ట్‌లు',
    'Manage notification permissions and alarm access in Settings.': 'సెట్టింగ్‌లలో నోటిఫికేషన్ అనుమతులు మరియు అలారం యాక్సెస్ నిర్వహించండి.',
    'Open Settings': 'సెట్టింగ్‌లు తెరవండి',
    'Today’s dose progress': 'ఈరోజు మోతాదుల పురోగతి',
    'Taken': 'తీసుకున్నారు',
    'Remaining': 'మిగిలినవి',
    'Missed': 'తప్పిపోయింది',
    'Add medicine': 'మందు జోడించండి',
    'Save medicine': 'మందును సేవ్ చేయండి',
    'Medicine name (e.g. Vitamin D)': 'మందు పేరు (ఉదా. Vitamin D)',
    'Dosage (e.g. 1 tablet)': 'మోతాదు (ఉదా. 1 మాత్ర)',
    'Every day': 'ప్రతిరోజూ',
    'Specific days of the week': 'వారంలోని నిర్దిష్ట రోజులు',
    'Repeat on': 'ఈ రోజుల్లో పునరావృతం',
    'Caregiver contacts': 'సంరక్షకుల పరిచయాలు',
    'Settings': 'సెట్టింగ్‌లు',
    'Manage app and patient preferences': 'యాప్ మరియు రోగి ప్రాధాన్యతలను నిర్వహించండి',
    'Notification & alarm permissions': 'నోటిఫికేషన్ మరియు అలారం అనుమతులు',
    'Medication notifications': 'మందుల నోటిఫికేషన్‌లు',
    'Allow MediCare to notify you when a dose is due.': 'మోతాదు సమయం వచ్చినప్పుడు MediCare మీకు తెలియజేయడానికి అనుమతించండి.',
    'Checking notification permission…': 'నోటిఫికేషన్ అనుమతిని తనిఖీ చేస్తోంది…',
    'Enable alarm access': 'అలారం యాక్సెస్ ప్రారంభించండి',
    'Allow background': 'బ్యాక్‌గ్రౌండ్ అనుమతించండి',
    'Medicine schedule': 'మందుల షెడ్యూల్',
    "Review today's scheduled doses and update your medicines.": 'ఈరోజు మోతాదులను చూసి మీ మందులను నవీకరించండి.',
    'Manage medicines': 'మందులను నిర్వహించండి',
    'Patient profile': 'రోగి ప్రొఫైల్',
    'View your account and caregiver information.': 'మీ ఖాతా మరియు సంరక్షకుల వివరాలను చూడండి.',
    'Open profile': 'ప్రొఫైల్ తెరవండి',
    'Sign out': 'సైన్ అవుట్',
    'Sign out of your patient account on this device.': 'ఈ పరికరంలో మీ రోగి ఖాతా నుండి సైన్ అవుట్ చేయండి.',
    'Some alarm permissions are only available in the installed Android app. Browser notification permission is managed by your browser.': 'కొన్ని అలారం అనుమతులు Android యాప్‌లో మాత్రమే అందుబాటులో ఉంటాయి. బ్రౌజర్ నోటిఫికేషన్ అనుమతిని మీ బ్రౌజర్ నిర్వహిస్తుంది.',
    'Email address': 'ఈమెయిల్ చిరునామా',
    'Password': 'పాస్‌వర్డ్',
    'Full name': 'పూర్తి పేరు',
    'Mobile number': 'మొబైల్ నంబర్',
    'Forgot password?': 'పాస్‌వర్డ్ మర్చిపోయారా?',
    'Log in': 'లాగిన్',
    'Login': 'లాగిన్',
    'New here? Create an account': 'కొత్తవారా? ఖాతా సృష్టించండి',
    'Already have an account? Login': 'ఇప్పటికే ఖాతా ఉందా? లాగిన్ చేయండి',
    'Choose account type': 'ఖాతా రకాన్ని ఎంచుకోండి',
    'Medication support that keeps every dose on track.': 'ప్రతి మోతాదును సమయానికి తీసుకునేందుకు మందుల సహాయం.',
    'Reset your MediCare password': 'మీ MediCare పాస్‌వర్డ్‌ను రీసెట్ చేయండి',
    'Enter your email to receive a secure reset link.': 'సురక్షిత రీసెట్ లింక్ కోసం మీ ఈమెయిల్ నమోదు చేయండి.',
    'Send MediCare reset link': 'MediCare రీసెట్ లింక్ పంపండి',
    'Enter a valid email address.': 'సరైన ఈమెయిల్ చిరునామాను నమోదు చేయండి.',
    'Email and password required.': 'ఈమెయిల్ మరియు పాస్‌వర్డ్ అవసరం.',
    'Use at least 8 characters for your password.': 'పాస్‌వర్డ్‌లో కనీసం 8 అక్షరాలు ఉపయోగించండి.',
    'Please fill all fields.': 'దయచేసి అన్ని వివరాలు నమోదు చేయండి.',
    'Nearby hospitals': 'సమీప ఆసుపత్రులు',
    'Find mapped hospitals near a place you enter or your current location.': 'మీరు నమోదు చేసిన ప్రాంతం లేదా ప్రస్తుత స్థానం సమీపంలోని ఆసుపత్రులను కనుగొనండి.',
    'Search a city, address or postcode, or choose “Use my location” to search nearby. Your device location is only requested when you tap the location button.': 'నగరం, చిరునామా లేదా పోస్టల్ కోడ్‌తో వెతకండి, లేదా సమీపంలో వెతకడానికి “నా స్థానాన్ని ఉపయోగించండి” ఎంచుకోండి. స్థాన బటన్ నొక్కినప్పుడే మీ స్థానం అడుగుతాము.',
    'Use my location': 'నా స్థానాన్ని ఉపయోగించండి',
    'City, address, or postcode': 'నగరం, చిరునామా లేదా పోస్టల్ కోడ్',
    'Search location': 'స్థానం వెతకండి',
    'Hospital results': 'ఆసుపత్రి ఫలితాలు',
    'Search for a location to show nearby hospitals.': 'సమీప ఆసుపత్రులను చూడటానికి ఒక స్థానాన్ని వెతకండి.',
    'Appointments': 'అపాయింట్‌మెంట్‌లు',
    'Health Records': 'ఆరోగ్య రికార్డులు',
    'Emergency Contacts': 'అత్యవసర పరిచయాలు',
    'Your emergency contacts': 'మీ అత్యవసర పరిచయాలు',
    'Add a contact': 'పరిచయాన్ని జోడించండి',
    'Contact name': 'పరిచయం పేరు',
    'Phone number': 'ఫోన్ నంబర్',
    'Call': 'కాల్ చేయండి',
    'Name': 'పేరు',
    'Search by place or location': 'ప్రాంతం లేదా స్థానంతో వెతకండి',
    'Open hospital map': 'ఆసుపత్రుల మ్యాప్ తెరవండి',
    'Start your wellness plan': 'మీ ఆరోగ్య ప్రణాళిక ప్రారంభించండి',
    'Diet Plan': 'ఆహార ప్రణాళిక',
    'Fitness Checking': 'ఫిట్‌నెస్ తనిఖీ',
    'Fitness & Wellness': 'ఫిట్‌నెస్ మరియు ఆరోగ్యం',
    'Your weekly fitness plan': 'మీ వారపు ఫిట్‌నెస్ ప్రణాళిక',
    'Wellbeing Reminders': 'ఆరోగ్య రిమైండర్లు',
    'Add a custom reminder': 'కస్టమ్ రిమైండర్ జోడించండి',
    'Save changes': 'మార్పులను సేవ్ చేయండి',
    'Medication time': 'మందు సమయం',
    'MEDICATION TIME': 'మందు సమయం',
    'Please verify your medication before time runs out': 'సమయం ముగియకముందే మీ మందును నిర్ధారించండి',
    'Verify medication': 'మందును నిర్ధారించండి',
    'I took it — confirm ✓': 'తీసుకున్నాను — నిర్ధారించండి ✓',
    'Back to dashboard': 'డ్యాష్‌బోర్డ్‌కు తిరిగి వెళ్లండి',
    'Medication Verified': 'మందు నిర్ధారించబడింది',
    'DOSE TAKEN ON TIME!': 'మోతాదును సమయానికి తీసుకున్నారు!',
    'REMINDER UNAVAILABLE': 'రిమైండర్ అందుబాటులో లేదు',
    'Your care plan is inactive': 'మీ సంరక్షణ ప్రణాళిక నిలిపివేయబడింది',
    'Your medication activities have been paused. Please contact your administrator if this is unexpected.': 'మీ మందుల కార్యకలాపాలు నిలిపివేయబడ్డాయి. ఇది అనుకోకుండా జరిగితే నిర్వాహకుడిని సంప్రదించండి.',
    'Enter the medicine name and time.': 'మందు పేరు మరియు సమయాన్ని నమోదు చేయండి.',
    'Choose at least one day of the week.': 'వారంలో కనీసం ఒక రోజును ఎంచుకోండి.',
    'Could not save this medicine. Check your connection and try again.': 'ఈ మందును సేవ్ చేయలేకపోయాం. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
    'Your medication schedule is temporarily unavailable.': 'మీ మందుల షెడ్యూల్ తాత్కాలికంగా అందుబాటులో లేదు.',
    'Alerts are off. Allow notifications in your browser settings.': 'అలర్ట్‌లు ఆఫ్‌లో ఉన్నాయి. బ్రౌజర్ సెట్టింగ్‌లలో నోటిఫికేషన్‌లను అనుమతించండి.',
    'Medication alerts are off.': 'మందుల అలర్ట్‌లు ఆఫ్‌లో ఉన్నాయి.',
    'Medication alerts are on.': 'మందుల అలర్ట్‌లు ఆన్‌లో ఉన్నాయి.',
    'This browser does not support alerts.': 'ఈ బ్రౌజర్ అలర్ట్‌లను మద్దతు ఇవ్వదు.',
    'No patients registered yet.': 'ఇంకా రోగులు నమోదు కాలేదు.',
    'Patients': 'రోగులు',
    'Medicines': 'మందులు',
    'Completed': 'పూర్తయినవి',
    'Penalties': 'జరిమానాలు',
    'Archived': 'ఆర్కైవ్ చేయబడింది',
    'Restore patient': 'రోగిని పునరుద్ధరించండి',
    'Archive patient': 'రోగిని ఆర్కైవ్ చేయండి',
    'Remove': 'తొలగించండి',
    'Copy': 'కాపీ చేయండి',
    'Enable notifications': 'నోటిఫికేషన్‌లను ప్రారంభించండి',
    'Enter the patient email first.': 'ముందుగా రోగి ఈమెయిల్ నమోదు చేయండి.',
    'This browser does not support push notifications. Try Chrome.': 'ఈ బ్రౌజర్ పుష్ నోటిఫికేషన్‌లను మద్దతు ఇవ్వదు. Chrome ప్రయత్నించండి.',
    'A dose is due now.': 'ఇప్పుడు మందు తీసుకునే సమయం.',
    'No medicines assigned yet. Please contact your administrator.': 'ఇంకా మందులు కేటాయించలేదు. నిర్వాహకుడిని సంప్రదించండి.',
    'No medicines are scheduled for today.': 'ఈరోజు మందులు షెడ్యూల్ చేయలేదు.',
    'Try again': 'మళ్లీ ప్రయత్నించండి',
    'Taken': 'తీసుకున్నారు',
    'Upcoming': 'తదుపరిది',
    'Missed': 'తప్పిపోయింది',
    'Language': 'భాష',
    'Choose the language used across MediCare.': 'MediCare అంతటా ఉపయోగించే భాషను ఎంచుకోండి.',
    'MediCare — Smart Health Reminders': 'MediCare — ఆరోగ్య రిమైండర్లు',
    'MediCare — Patient Dashboard': 'MediCare — రోగి డ్యాష్‌బోర్డ్',
    'MediCare — Admin Dashboard': 'MediCare — అడ్మిన్ డ్యాష్‌బోర్డ్',
    'MediCare — Medication Reminders': 'MediCare — మందుల రిమైండర్లు',
    'MediCare — Patient Settings': 'MediCare — రోగి సెట్టింగ్‌లు',
    'MediCare — Verify Medication': 'MediCare — మందు నిర్ధారణ',
    'MediCare — Care Taker Alerts': 'MediCare — సంరక్షకుల అలర్ట్‌లు',
    'MediCare — Nearby Hospitals': 'MediCare — సమీప ఆసుపత్రులు',
    'MediCare — Emergency Contacts': 'MediCare — అత్యవసర పరిచయాలు',
    'MediCare — Health Records': 'MediCare — ఆరోగ్య రికార్డులు',
    'MediCare — Appointments': 'MediCare — అపాయింట్‌మెంట్‌లు',
    'MediCare — Patient Profile': 'MediCare — రోగి ప్రొఫైల్'
  };

  var languageOptions = [
    ['en', 'English'], ['as', 'অসমীয়া'], ['bn', 'বাংলা'], ['brx', 'बड़ो'],
    ['doi', 'डोगरी'], ['gu', 'ગુજરાતી'], ['hi', 'हिन्दी'], ['kn', 'ಕನ್ನಡ'],
    ['ks', 'کٲشُر'], ['kok', 'कोंकणी'], ['mai', 'मैथिली'], ['ml', 'മലയാളം'],
    ['mni', 'ꯃꯩꯇꯩꯂꯣꯟ'], ['mr', 'मराठी'], ['ne', 'नेपाली'], ['or', 'ଓଡ଼ିଆ'],
    ['pa', 'ਪੰਜਾਬੀ'], ['sa', 'संस्कृतम्'], ['sat', 'ᱥᱟᱱᱛᱟᱲᱤ'], ['sd', 'سنڌي'],
    ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['ur', 'اردو']
  ];
  var commonKeys = ['Dashboard', 'Notifications', 'Profile', 'Settings', 'Log out', 'Medication Reminders', 'Emergency Contacts', 'Fitness & Wellness', 'Appointments', 'Health Records', 'Nearby hospitals', 'Add medicine', 'Save medicine', 'Cancel', 'Language', 'Log in', 'Create Account', 'Patient', 'Admin', 'Forgot password?', 'New here? Create an account', 'Already have an account? Login', 'Reminders', 'Alerts', 'Reset Password', 'Email address', 'Password'];
  var commonRows = {
    as: ['ডেশ্বব’ৰ্ড', 'জাননীসমূহ', 'প্ৰ’ফাইল', 'ছেটিংছ', 'লগ আউট', 'ঔষধৰ সোঁৱৰনি', 'জৰুৰীকালীন পৰিচয়', 'ফিটনেছ আৰু সুস্থতা', 'এপইণ্টমেণ্ট', 'স্বাস্থ্যৰ ৰেকৰ্ড', 'ওচৰৰ চিকিৎসালয়', 'ঔষধ যোগ কৰক', 'ঔষধ সংৰক্ষণ কৰক', 'বাতিল', 'ভাষা', 'প্ৰৱেশ কৰক', 'একাউণ্ট সৃষ্টি কৰক', 'ৰোগী', 'প্ৰশাসক', 'পাছৱৰ্ড পাহৰিলে?', 'নতুন নেকি? একাউণ্ট সৃষ্টি কৰক', 'ইতিমধ্যে একাউণ্ট আছে? প্ৰৱেশ কৰক', 'সোঁৱৰনি', 'সতৰ্কবাণী', 'পাছৱৰ্ড পুনৰায় ছেট কৰক', 'ইমেইল ঠিকনা', 'পাছৱৰ্ড'],
    bn: ['ড্যাশবোর্ড', 'বিজ্ঞপ্তি', 'প্রোফাইল', 'সেটিংস', 'লগ আউট', 'ওষুধের অনুস্মারক', 'জরুরি যোগাযোগ', 'ফিটনেস ও সুস্থতা', 'অ্যাপয়েন্টমেন্ট', 'স্বাস্থ্য রেকর্ড', 'কাছাকাছি হাসপাতাল', 'ওষুধ যোগ করুন', 'ওষুধ সংরক্ষণ করুন', 'বাতিল', 'ভাষা', 'লগ ইন', 'অ্যাকাউন্ট তৈরি করুন', 'রোগী', 'অ্যাডমিন', 'পাসওয়ার্ড ভুলে গেছেন?', 'নতুন? অ্যাকাউন্ট তৈরি করুন', 'আগে থেকেই অ্যাকাউন্ট আছে? লগ ইন', 'অনুস্মারক', 'সতর্কতা', 'পাসওয়ার্ড রিসেট', 'ইমেল ঠিকানা', 'পাসওয়ার্ড'],
    brx: ['ड्यासबर्ड', 'फारिस्लायथि', 'प्रफाइल', 'सेटिं', 'लग आउट', 'आसामार सावरनाय', 'जरुरी सोमोन्दो', 'फिटनेस आरो जौगानाय', 'अपइन्टमेन्ट', 'सास्थ’ रेकर्ड', 'खाथि हस्पिताल', 'आसामा दाजाबदेर', 'आसामा थिना', 'बातिल', 'राव', 'ल’ग इन', 'एकाउन्ट सोरजि', 'रुग्ण', 'एडमिन', 'पासवर्ड गोबावै?', 'गोदान नामा? एकाउन्ट सोरजि', 'एकाउन्ट दंना? ल’ग इन', 'सावरनाय', 'खबर', 'पासवर्ड फिन सेट', 'इमेल थंखि', 'पासवर्ड'],
    doi: ['डैशबोर्ड', 'सूचनां', 'प्रोफाइल', 'सेटिंगां', 'लॉग आउट', 'दवाइयें दे याद-दिहानियां', 'जरूरी संपर्क', 'फिटनेस ते तंदुरुस्ती', 'मुलाकातां', 'सेहत रिकॉर्ड', 'नेड़े दे अस्पताल', 'दवाई जोड़ो', 'दवाई बचाओ', 'रद्द करो', 'भाशा', 'लॉग इन करो', 'खाता बनाओ', 'मरीज', 'एडमिन', 'पासवर्ड भुल्ली गे?', 'नमां ओ? खाता बनाओ', 'खाता ऐ? लॉग इन करो', 'याद-दिहानियां', 'सूचनां', 'पासवर्ड बदलो', 'ईमेल पता', 'पासवर्ड'],
    gu: ['ડેશબોર્ડ', 'સૂચનાઓ', 'પ્રોફાઇલ', 'સેટિંગ્સ', 'લૉગ આઉટ', 'દવાની યાદ અપાવણીઓ', 'કટોકટી સંપર્કો', 'ફિટનેસ અને સ્વાસ્થ્ય', 'મુલાકાતો', 'આરોગ્ય રેકોર્ડ', 'નજીકની હોસ્પિટલો', 'દવા ઉમેરો', 'દવા સાચવો', 'રદ કરો', 'ભાષા', 'લૉગ ઇન', 'ખાતું બનાવો', 'દર્દી', 'એડમિન', 'પાસવર્ડ ભૂલી ગયા?', 'નવા છો? ખાતું બનાવો', 'ખાતું છે? લૉગ ઇન', 'રીમાઇન્ડર', 'ચેતવણીઓ', 'પાસવર્ડ રીસેટ', 'ઇમેઇલ સરનામું', 'પાસવર્ડ'],
    hi: ['डैशबोर्ड', 'सूचनाएँ', 'प्रोफ़ाइल', 'सेटिंग्स', 'लॉग आउट', 'दवा रिमाइंडर', 'आपातकालीन संपर्क', 'फिटनेस और स्वास्थ्य', 'अपॉइंटमेंट', 'स्वास्थ्य रिकॉर्ड', 'नज़दीकी अस्पताल', 'दवा जोड़ें', 'दवा सहेजें', 'रद्द करें', 'भाषा', 'लॉग इन करें', 'खाता बनाएँ', 'रोगी', 'एडमिन', 'पासवर्ड भूल गए?', 'नए हैं? खाता बनाएँ', 'पहले से खाता है? लॉग इन करें', 'रिमाइंडर', 'अलर्ट', 'पासवर्ड रीसेट करें', 'ईमेल पता', 'पासवर्ड'],
    kn: ['ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'ಅಧಿಸೂಚನೆಗಳು', 'ಪ್ರೊಫೈಲ್', 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', 'ಲಾಗ್ ಔಟ್', 'ಔಷಧಿ ನೆನಪಿಗಳು', 'ತುರ್ತು ಸಂಪರ್ಕಗಳು', 'ಫಿಟ್‌ನೆಸ್ ಮತ್ತು ಕ್ಷೇಮ', 'ನೇಮಕಾತಿಗಳು', 'ಆರೋಗ್ಯ ದಾಖಲೆಗಳು', 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು', 'ಔಷಧಿ ಸೇರಿಸಿ', 'ಔಷಧಿ ಉಳಿಸಿ', 'ರದ್ದುಮಾಡಿ', 'ಭಾಷೆ', 'ಲಾಗಿನ್', 'ಖಾತೆ ರಚಿಸಿ', 'ರೋಗಿ', 'ನಿರ್ವಾಹಕ', 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?', 'ಹೊಸಬರೇ? ಖಾತೆ ರಚಿಸಿ', 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ಲಾಗಿನ್', 'ಜ್ಞಾಪನೆಗಳು', 'ಎಚ್ಚರಿಕೆಗಳು', 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ', 'ಇಮೇಲ್ ವಿಳಾಸ', 'ಪಾಸ್‌ವರ್ಡ್'],
    ks: ['ڈیش بورڈ', 'نوٹفکیشن', 'پروفایل', 'ترتیبات', 'لاگ آؤٹ', 'دواہن ہٕند یاد دہانی', 'ایمرجنسی رابطہ', 'فٹنس تہٕ صحت', 'ملاقات', 'صحت ریکارڈ', 'نزدیٖکی ہسپتال', 'دواہ ژأریو', 'دواہ محفوظ کریو', 'منسوخ', 'زبان', 'لاگ اِن', 'کھاتہ بناوِو', 'مریض', 'ایڈمن', 'پاس ورڈ وُسریو؟', 'نوٚو چھِو؟ کھاتہ بناوِو', 'کھاتہ چھُ؟ لاگ اِن', 'یاد دہانی', 'نوٹفکیشن', 'پاس ورڈ ری سیٹ', 'ای میل پتہ', 'پاس ورڈ'],
    kok: ['डॅशबोर्ड', 'सूचोवण्यो', 'प्रोफायल', 'सेटिंग्स', 'लॉग आउट', 'भुरग्यांचीं औषधां याद', 'आणीबाणी संपर्क', 'फिटनेस आनी आरोग्य', 'भेटी', 'आरोग्य नोंदी', 'लागीं आस्पत्रयो', 'औषध जोडात', 'औषध जतन करात', 'रद्द करात', 'भास', 'लॉग इन', 'खातें तयार करात', 'रोगी', 'प्रशासक', 'पासवर्ड विसरलात?', 'नवे आसात? खातें तयार करात', 'खातें आसा? लॉग इन', 'आठवणी', 'सूचोवण्यो', 'पासवर्ड परत थारायात', 'ईमेल नामो', 'पासवर्ड'],
    mai: ['डैशबोर्ड', 'सूचनासभ', 'प्रोफाइल', 'सेटिंग्स', 'लॉग आउट', 'दवाइ लेल स्मरण', 'आपातकालीन संपर्क', 'फिटनेस आ स्वास्थ्य', 'मुलाकात', 'स्वास्थ्य रिकॉर्ड', 'नजदीकी अस्पताल', 'दवाई जोड़ू', 'दवाई सहेजू', 'रद्द करू', 'भाषा', 'लॉगिन करू', 'खाता बनाउ', 'रोगी', 'व्यवस्थापक', 'पासवर्ड बिसरलहुँ?', 'नव छी? खाता बनाउ', 'पहिने सँ खाता अछि? लॉगिन करू', 'स्मरण', 'सूचना', 'पासवर्ड फेर सेट करू', 'ईमेल पता', 'पासवर्ड'],
    ml: ['ഡാഷ്ബോർഡ്', 'അറിയിപ്പുകൾ', 'പ്രൊഫൈൽ', 'ക്രമീകരണങ്ങൾ', 'ലോഗ് ഔട്ട്', 'മരുന്ന് ഓർമ്മപ്പെടുത്തലുകൾ', 'അടിയന്തര ബന്ധങ്ങൾ', 'ഫിറ്റ്നസും ക്ഷേമവും', 'അപ്പോയിന്റ്മെന്റുകൾ', 'ആരോഗ്യ രേഖകൾ', 'അടുത്തുള്ള ആശുപത്രികൾ', 'മരുന്ന് ചേർക്കുക', 'മരുന്ന് സേവ് ചെയ്യുക', 'റദ്ദാക്കുക', 'ഭാഷ', 'ലോഗിൻ', 'അക്കൗണ്ട് സൃഷ്ടിക്കുക', 'രോഗി', 'അഡ്മിൻ', 'പാസ്‌വേഡ് മറന്നോ?', 'പുതിയ ആളാണോ? അക്കൗണ്ട് സൃഷ്ടിക്കുക', 'അക്കൗണ്ട് ഉണ്ടോ? ലോഗിൻ ചെയ്യുക', 'ഓർമ്മപ്പെടുത്തലുകൾ', 'അറിയിപ്പുകൾ', 'പാസ്‌വേഡ് പുനഃസജ്ജമാക്കുക', 'ഇമെയിൽ വിലാസം', 'പാസ്‌വേഡ്'],
    mni: ['ꯗꯦꯁꯕꯣꯔꯗ', 'ꯄꯥꯎꯖꯦꯜ', 'ꯄ꯭ꯔꯣꯐꯥꯏꯜ', 'ꯁꯦꯇꯤꯡ', 'ꯂꯣꯒ ꯑꯥꯎꯠ', 'ꯃꯁꯤꯡ ꯉꯥꯛꯄꯤ', 'ꯑꯔꯥꯟꯕ ꯄꯥꯎꯖꯦꯜ', 'ꯐꯤꯇꯅꯦꯁ ꯑꯃꯁꯨꯡ ꯐꯖꯕ', 'ꯃꯤꯇꯩꯁꯤꯡ', 'ꯍꯦꯜꯊ ꯔꯦꯀꯣꯔꯗ', 'ꯃꯥꯂꯦꯝꯗ ꯃꯐꯝ', 'ꯃꯁꯤꯡ ꯍꯥꯞꯆꯤꯜ', 'ꯃꯁꯤꯡ ꯊꯝꯃꯣꯏ', 'ꯀꯥꯟꯁꯦꯜ', 'ꯂꯣꯟ', 'ꯂꯣꯒ ꯏꯟ', 'ꯑꯀꯥꯎꯟꯠ ꯁꯦꯝꯒꯠꯄ', 'ꯂꯩꯄꯥꯛꯄ', 'ꯑꯦꯗꯃꯤꯟ', 'ꯄꯥꯁꯋꯥꯔꯗ ꯇꯥꯡꯈ꯭ꯔꯦ?', 'ꯑꯅꯧꯕ ꯅꯠꯇ꯭ꯔꯥ? ꯑꯀꯥꯎꯟꯠ ꯁꯦꯝꯒꯠꯄ', 'ꯑꯀꯥꯎꯟꯠ ꯂꯩꯕ꯭ꯔꯥ? ꯂꯣꯒ ꯏꯟ', 'ꯉꯥꯛꯄ', 'ꯄꯥꯎꯖꯦꯜ', 'ꯄꯥꯁꯋꯥꯔꯗ ꯑꯃꯨꯛ ꯁꯦꯝꯕ', 'ꯏꯃꯦꯜ ꯃꯃꯤꯡ', 'ꯄꯥꯁꯋꯥꯔꯗ'],
    mr: ['डॅशबोर्ड', 'सूचना', 'प्रोफाइल', 'सेटिंग्ज', 'लॉग आउट', 'औषधांच्या आठवणी', 'आपत्कालीन संपर्क', 'फिटनेस आणि आरोग्य', 'भेटी', 'आरोग्य नोंदी', 'जवळची रुग्णालये', 'औषध जोडा', 'औषध जतन करा', 'रद्द करा', 'भाषा', 'लॉग इन करा', 'खाते तयार करा', 'रुग्ण', 'प्रशासक', 'पासवर्ड विसरलात?', 'नवीन आहात? खाते तयार करा', 'आधीच खाते आहे? लॉग इन करा', 'स्मरणपत्रे', 'सूचना', 'पासवर्ड रीसेट करा', 'ईमेल पत्ता', 'पासवर्ड'],
    ne: ['ड्यासबोर्ड', 'सूचनाहरू', 'प्रोफाइल', 'सेटिङहरू', 'लग आउट', 'औषधि सम्झना', 'आपतकालीन सम्पर्क', 'फिटनेस र स्वास्थ्य', 'भेटघाट', 'स्वास्थ्य अभिलेख', 'नजिकका अस्पताल', 'औषधि थप्नुहोस्', 'औषधि सुरक्षित गर्नुहोस्', 'रद्द गर्नुहोस्', 'भाषा', 'लगइन गर्नुहोस्', 'खाता बनाउनुहोस्', 'बिरामी', 'प्रशासक', 'पासवर्ड बिर्सनुभयो?', 'नयाँ हुनुहुन्छ? खाता बनाउनुहोस्', 'खाता छ? लगइन गर्नुहोस्', 'सम्झना', 'सूचनाहरू', 'पासवर्ड रिसेट गर्नुहोस्', 'इमेल ठेगाना', 'पासवर्ड'],
    or: ['ଡ୍ୟାସବୋର୍ଡ', 'ବିଜ୍ଞପ୍ତି', 'ପ୍ରୋଫାଇଲ୍', 'ସେଟିଂସ୍', 'ଲଗ୍ ଆଉଟ୍', 'ଔଷଧ ସ୍ମାରକ', 'ଜରୁରୀକାଳୀନ ଯୋଗାଯୋଗ', 'ଫିଟନେସ୍ ଓ ସୁସ୍ଥତା', 'ନିଯୁକ୍ତି', 'ସ୍ୱାସ୍ଥ୍ୟ ରେକର୍ଡ', 'ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା', 'ଔଷଧ ଯୋଡନ୍ତୁ', 'ଔଷଧ ସଂରକ୍ଷଣ କରନ୍ତୁ', 'ବାତିଲ୍ କରନ୍ତୁ', 'ଭାଷା', 'ଲଗ୍ ଇନ୍ କରନ୍ତୁ', 'ଖାତା ସୃଷ୍ଟି କରନ୍ତୁ', 'ରୋଗୀ', 'ପ୍ରଶାସକ', 'ପାସୱାର୍ଡ ଭୁଲିଗଲେ?', 'ନୂଆ କି? ଖାତା ସୃଷ୍ଟି କରନ୍ତୁ', 'ଖାତା ଅଛି? ଲଗ୍ ଇନ୍ କରନ୍ତୁ', 'ସ୍ମାରକ', 'ବିଜ୍ଞପ୍ତି', 'ପାସୱାର୍ଡ ପୁନଃସେଟ୍', 'ଇମେଲ୍ ଠିକଣା', 'ପାସୱାର୍ଡ'],
    pa: ['ਡੈਸ਼ਬੋਰਡ', 'ਸੂਚਨਾਵਾਂ', 'ਪ੍ਰੋਫ਼ਾਈਲ', 'ਸੈਟਿੰਗਾਂ', 'ਲੌਗ ਆਉਟ', 'ਦਵਾਈ ਯਾਦ-ਦਹਾਨੀਆਂ', 'ਐਮਰਜੈਂਸੀ ਸੰਪਰਕ', 'ਫਿਟਨੈੱਸ ਅਤੇ ਤੰਦਰੁਸਤੀ', 'ਮੁਲਾਕਾਤਾਂ', 'ਸਿਹਤ ਰਿਕਾਰਡ', 'ਨੇੜਲੇ ਹਸਪਤਾਲ', 'ਦਵਾਈ ਸ਼ਾਮਲ ਕਰੋ', 'ਦਵਾਈ ਸੰਭਾਲੋ', 'ਰੱਦ ਕਰੋ', 'ਭਾਸ਼ਾ', 'ਲੌਗ ਇਨ ਕਰੋ', 'ਖਾਤਾ ਬਣਾਓ', 'ਮਰੀਜ਼', 'ਐਡਮਿਨ', 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?', 'ਨਵੇਂ ਹੋ? ਖਾਤਾ ਬਣਾਓ', 'ਖਾਤਾ ਹੈ? ਲੌਗ ਇਨ ਕਰੋ', 'ਯਾਦ-ਦਹਾਨੀਆਂ', 'ਸੂਚਨਾਵਾਂ', 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ', 'ਈਮੇਲ ਪਤਾ', 'ਪਾਸਵਰਡ'],
    sa: ['नियन्त्रणफलकम्', 'सूचनाः', 'परिचयः', 'व्यवस्थाः', 'निर्गमः', 'औषधस्मरणानि', 'आपत्कालीनसम्पर्काः', 'आरोग्यं च स्वास्थ्यं च', 'समागमाः', 'आरोग्यलेखाः', 'समीपस्थानि चिकित्सालयानि', 'औषधं योजयतु', 'औषधं रक्षतु', 'निरस्यतु', 'भाषा', 'प्रविशतु', 'लेखां रचयतु', 'रोगी', 'प्रशासकः', 'गुप्तशब्दं विस्मृतवान्?', 'नूतनः? लेखां रचयतु', 'लेखा अस्ति? प्रविशतु', 'स्मरणानि', 'सूचनाः', 'गुप्तशब्दं पुनः स्थापयतु', 'विद्युत्पत्रसङ्केतः', 'गुप्तशब्दः'],
    sat: ['ᱰᱮᱥᱵᱚᱨᱰ', 'ᱥᱩᱪᱱᱟ', 'ᱯᱨᱚᱯᱷᱟᱭᱤᱞ', 'ᱥᱮᱴᱤᱝ', 'ᱞᱚᱜ ᱟᱣᱩᱴ', 'ᱦᱚᱯᱚᱱ ᱵᱷᱩᱞ ᱥᱩᱢᱩᱝ', 'ᱟᱹᱯᱟᱹᱛᱠᱟᱹᱞᱤᱱ ᱡᱚᱯᱲᱟᱣ', 'ᱯᱷᱤᱴᱱᱮᱥ ᱟᱨ ᱵᱷᱟᱞᱚᱵᱷᱟᱵ', 'ᱵᱷᱮᱴᱜᱷᱟᱴ', 'ᱥᱮᱪᱮᱫ ᱨᱮᱠᱚᱨᱰ', 'ᱥᱟᱢᱟᱝ ᱦᱚᱥᱯᱤᱴᱟᱞ', 'ᱦᱚᱯᱚᱱ ᱥᱮᱞᱮᱫ', 'ᱦᱚᱯᱚᱱ ᱥᱟᱧᱪᱟᱣ', 'ᱵᱟᱹᱛᱤᱞ', 'ᱯᱟᱹᱨᱥᱤ', 'ᱞᱚᱜ ᱤᱱ', 'ᱠᱷᱟᱛᱟ ᱵᱮᱱᱟᱣ', 'ᱵᱤᱢᱟᱨᱤᱡ', 'ᱯᱨᱚᱥᱟᱥᱚᱠ', 'ᱯᱟᱥᱣᱟᱨᱰ ᱵᱷᱩᱞᱟᱹᱠᱟᱱᱟ?', 'ᱱᱟᱶᱟ ᱢᱮᱭᱟ? ᱠᱷᱟᱛᱟ ᱵᱮᱱᱟᱣ', 'ᱠᱷᱟᱛᱟ ᱢᱮᱭᱟ? ᱞᱚᱜ ᱤᱱ', 'ᱥᱩᱢᱩᱝ', 'ᱥᱩᱪᱱᱟ', 'ᱯᱟᱥᱣᱟᱨᱰ ᱫᱚᱦᱲᱟ', 'ᱤᱢᱮᱞ ᱴᱷᱟᱶ', 'ᱯᱟᱥᱣᱟᱨᱰ'],
    sd: ['ڊيش بورڊ', 'اطلاع', 'پروفائل', 'سيٽنگون', 'لاگ آئوٽ', 'دوا جون ياد ڏيارڻيون', 'ايمرجنسي رابطا', 'فٽنيس ۽ صحت', 'ملاقاتون', 'صحت جا رڪارڊ', 'ويجهيون اسپتالون', 'دوا شامل ڪريو', 'دوا محفوظ ڪريو', 'منسوخ', 'ٻولي', 'لاگ ان ڪريو', 'اڪائونٽ ٺاهيو', 'مريض', 'ايڊمن', 'پاسورڊ وسري ويو؟', 'نئون آهيو؟ اڪائونٽ ٺاهيو', 'اڪائونٽ آهي؟ لاگ ان ڪريو', 'ياد ڏيارڻيون', 'اطلاع', 'پاسورڊ ري سيٽ ڪريو', 'اي ميل پتو', 'پاسورڊ'],
    ta: ['டாஷ்போர்டு', 'அறிவிப்புகள்', 'சுயவிவரம்', 'அமைப்புகள்', 'வெளியேறு', 'மருந்து நினைவூட்டல்கள்', 'அவசர தொடர்புகள்', 'உடற்பயிற்சி மற்றும் நலன்', 'சந்திப்புகள்', 'சுகாதார பதிவுகள்', 'அருகிலுள்ள மருத்துவமனைகள்', 'மருந்தைச் சேர்க்கவும்', 'மருந்தைச் சேமிக்கவும்', 'ரத்துசெய்', 'மொழி', 'உள்நுழைய', 'கணக்கை உருவாக்கவும்', 'நோயாளி', 'நிர்வாகி', 'கடவுச்சொல் மறந்துவிட்டதா?', 'புதியவரா? கணக்கை உருவாக்கவும்', 'கணக்கு உள்ளதா? உள்நுழைய', 'நினைவூட்டல்கள்', 'எச்சரிக்கைகள்', 'கடவுச்சொல்லை மீட்டமைக்கவும்', 'மின்னஞ்சல் முகவரி', 'கடவுச்சொல்'],
    te: ['డ్యాష్‌బోర్డ్', 'నోటిఫికేషన్‌లు', 'ప్రొఫైల్', 'సెట్టింగ్‌లు', 'లాగ్ అవుట్', 'మందుల రిమైండర్లు', 'అత్యవసర పరిచయాలు', 'ఫిట్‌నెస్ మరియు ఆరోగ్యం', 'అపాయింట్‌మెంట్‌లు', 'ఆరోగ్య రికార్డులు', 'సమీప ఆసుపత్రులు', 'మందు జోడించండి', 'మందును సేవ్ చేయండి', 'రద్దు చేయండి', 'భాష', 'లాగిన్', 'ఖాతా సృష్టించండి', 'రోగి', 'అడ్మిన్', 'పాస్‌వర్డ్ మర్చిపోయారా?', 'కొత్తవారా? ఖాతా సృష్టించండి', 'ఇప్పటికే ఖాతా ఉందా? లాగిన్ చేయండి', 'రిమైండర్లు', 'అలర్ట్‌లు', 'పాస్‌వర్డ్ రీసెట్ చేయండి', 'ఈమెయిల్ చిరునామా', 'పాస్‌వర్డ్'],
    ur: ['ڈیش بورڈ', 'اطلاعات', 'پروفائل', 'ترتیبات', 'لاگ آؤٹ', 'ادویات کی یاددہانیاں', 'ہنگامی رابطے', 'فٹنس اور صحت', 'ملاقاتیں', 'صحت کے ریکارڈ', 'قریبی ہسپتال', 'دوا شامل کریں', 'دوا محفوظ کریں', 'منسوخ کریں', 'زبان', 'لاگ اِن کریں', 'اکاؤنٹ بنائیں', 'مریض', 'ایڈمن', 'پاس ورڈ بھول گئے؟', 'نئے ہیں؟ اکاؤنٹ بنائیں', 'اکاؤنٹ ہے؟ لاگ اِن کریں', 'یاددہانیاں', 'اطلاعات', 'پاس ورڈ ری سیٹ کریں', 'ای میل پتہ', 'پاس ورڈ']
  };
  var timeRows = {
    as: ['শুভ', 'পুৱা', 'দুপৰীয়া', 'সন্ধিয়া'], bn: ['শুভ', 'সকাল', 'বিকেল', 'সন্ধ্যা'],
    brx: ['सुबुं', 'फुं', 'बिफां', 'बेलासे'], doi: ['शुभ', 'बड्डल', 'दपैहरी', 'संजा'],
    gu: ['શુભ', 'સવાર', 'બપોર', 'સાંજ'], hi: ['शुभ', 'सुबह', 'दोपहर', 'शाम'],
    kn: ['ಶುಭ', 'ಬೆಳಗ್ಗೆ', 'ಮಧ್ಯಾಹ್ನ', 'ಸಂಜೆ'], ks: ['مبارک', 'صبح', 'دۄپہر', 'شام'],
    kok: ['शुभ', 'सकाळीं', 'दनपारां', 'सांजवेळार'], mai: ['शुभ', 'भोर', 'दुपहर', 'साँझ'],
    ml: ['ശുഭ', 'രാവിലെ', 'ഉച്ചയ്ക്ക്', 'വൈകുന്നേരം'], mni: ['ꯌꯥꯝꯅꯥ', 'ꯅꯨꯃꯤꯠ', 'ꯅꯨꯃꯤꯠ ꯇꯨꯡꯗꯥ', 'ꯅꯤꯡꯊꯧ'],
    mr: ['शुभ', 'सकाळ', 'दुपार', 'संध्याकाळ'], ne: ['शुभ', 'बिहान', 'दिउँसो', 'साँझ'],
    or: ['ଶୁଭ', 'ସକାଳ', 'ଅପରାହ୍ନ', 'ସନ୍ଧ୍ୟା'], pa: ['ਸ਼ੁਭ', 'ਸਵੇਰ', 'ਦੁਪਹਿਰ', 'ਸ਼ਾਮ'],
    sa: ['शुभम्', 'प्रातः', 'मध्याह्ने', 'सायम्'], sat: ['ᱵᱷᱟᱞᱚ', 'ᱥᱮᱛᱟᱜ', 'ᱛᱟᱞᱟ ᱥᱮᱛᱟᱜ', 'ᱵᱮᱞᱟ'],
    sd: ['ڀلو', 'صبح', 'منجهند', 'شام'], ta: ['நல்ல', 'காலை', 'பிற்பகல்', 'மாலை'],
    te: ['శుభ', 'ఉదయం', 'మధ్యాహ్నం', 'సాయంత్రం'], ur: ['خوشگوار', 'صبح', 'دوپہر', 'شام']
  };
  var languageCatalogs = Object.fromEntries(Object.entries(commonRows).map(function (entry) {
    return [entry[0], Object.fromEntries(commonKeys.map(function (key, index) { return [key, entry[1][index]]; }))];
  }));
  Object.entries(timeRows).forEach(function (entry) {
    ['Good', 'Morning', 'Afternoon', 'Evening'].forEach(function (key, index) {
      languageCatalogs[entry[0]][key] = entry[1][index];
    });
  });

  /*
   * Lookup tables keyed by lower-cased source text, so small casing
   * differences ("Nearby Hospitals" vs "Nearby hospitals") still match.
   * Telugu additionally falls back to the larger hand-written dictionary.
   */
  var catalogIndex = {};
  Object.keys(languageCatalogs).forEach(function (code) {
    var index = {};
    Object.keys(languageCatalogs[code]).forEach(function (key) {
      index[key.toLowerCase()] = languageCatalogs[code][key];
    });
    catalogIndex[code] = index;
  });
  Object.keys(translations).forEach(function (key) {
    var lower = key.toLowerCase();
    if (!catalogIndex.te[lower]) catalogIndex.te[lower] = translations[key];
  });

  var textState = new WeakMap();
  var attributeState = new WeakMap();
  var currentLanguage = 'en';
  var languageSelects = [];
  var switcherInstalled = false;
  var titleSource = document.title;
  var titleRendered = null;
  var observedAttributes = ['placeholder', 'aria-label', 'aria-labelledby', 'title', 'alt'];

  function normalized(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function translated(value) {
    var selectedCatalog = catalogIndex[currentLanguage];
    var match = selectedCatalog ? selectedCatalog[normalized(value).toLowerCase()] : '';
    return match || value;
  }

  function renderText(node) {
    var value = node.nodeValue;
    var state = textState.get(node);
    if (!state || value !== state.rendered) {
      state = { source: value, rendered: null };
      textState.set(node, state);
    }
    var leading = state.source.match(/^\s*/)[0];
    var trailing = state.source.match(/\s*$/)[0];
    var source = state.source.slice(leading.length, state.source.length - trailing.length || undefined);
    var output = leading + translated(source) + trailing;
    state.rendered = output;
    if (value !== output) node.nodeValue = output;
  }

  function renderAttribute(element, name) {
    var value = element.getAttribute(name);
    if (value === null) return;
    var state = attributeState.get(element) || {};
    if (!state[name] || value !== state[name].rendered) state[name] = { source: value, rendered: null };
    var output = translated(state[name].source);
    state[name].rendered = output;
    attributeState.set(element, state);
    if (value !== output) element.setAttribute(name, output);
  }

  function excluded(node) {
    var parent = node.parentElement;
    return !parent || parent.closest('script,style,textarea,[data-i18n-skip],.notranslate');
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (normalized(root.nodeValue) && !excluded(root)) renderText(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    var element = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
    if (element && element.matches && element.matches('[data-i18n-skip],.notranslate,script,style,textarea')) return;
    if (element && element.querySelectorAll) {
      [element].concat(Array.from(element.querySelectorAll('*'))).forEach(function (item) {
        if (item.matches('script,style,textarea,[data-i18n-skip],.notranslate')) return;
        observedAttributes.forEach(function (name) { renderAttribute(item, name); });
      });
    }
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    var textNode;
    while ((textNode = walker.nextNode())) {
      if (normalized(textNode.nodeValue) && !excluded(textNode)) renderText(textNode);
    }
  }

  function createSelect() {
    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Language');
    languageOptions.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[0];
      option.textContent = item[1];
      select.appendChild(option);
    });
    select.value = currentLanguage;
    select.addEventListener('change', function () { setLanguage(select.value, true); });
    languageSelects.push(select);
    return select;
  }

  function createSwitcher() {
    var label = document.createElement('label');
    label.className = 'language-switcher';
    var icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🌐';
    label.append(icon, createSelect());
    return label;
  }

  /*
   * The switcher is mounted into whichever host the current page provides, in
   * order of preference: a settings list row, an explicit [data-language-slot],
   * or the app sidebar footer. Pages without any host (login, verify) get a
   * floating pill. mountSwitcher() is idempotent and is re-run whenever the
   * shell is injected late (some pages load app-shell.js asynchronously).
   */
  function mountSwitcher() {
    var settingsList = document.querySelector('.settings-list');
    if (settingsList && !settingsList.querySelector('.language-setting-item')) {
      var setting = document.createElement('div');
      setting.className = 'settings-item language-setting-item';
      setting.innerHTML = '<div class="settings-icon" aria-hidden="true">🌐</div><div class="settings-item-copy"><strong>Language</strong><p>Choose the language used across MediCare.</p></div>';
      setting.appendChild(createSwitcher());
      settingsList.insertBefore(setting, settingsList.firstChild);
    }

    var slot = document.querySelector('[data-language-slot]');
    if (slot && !slot.querySelector('.language-switcher')) slot.appendChild(createSwitcher());

    var sidebar = document.querySelector('.app-sidebar');
    if (sidebar && !sidebar.querySelector('.language-switcher')) {
      var block = document.createElement('div');
      block.className = 'app-sidebar-language';
      var blockLabel = document.createElement('span');
      blockLabel.className = 'app-sidebar-language-label';
      blockLabel.textContent = 'Language';
      block.append(blockLabel, createSwitcher());
      sidebar.appendChild(block);
    }

    var floatingSwitcher = document.querySelector('.language-switcher-floating');
    var placedCount = document.querySelectorAll('.language-switcher:not(.language-switcher-floating)').length;
    switcherInstalled = placedCount > 0;
    if (!placedCount && !floatingSwitcher) {
      var fallback = createSwitcher();
      fallback.classList.add('language-switcher-floating');
      document.body.appendChild(fallback);
    } else if (placedCount && floatingSwitcher) {
      floatingSwitcher.remove();
      languageSelects = languageSelects.filter(function (select) { return select.isConnected; });
    }
  }

  function setLanguage(language, persist) {
    currentLanguage = languageOptions.some(function (option) { return option[0] === language; }) ? language : 'en';
    document.documentElement.lang = currentLanguage === 'ks' ? 'ks-Arab' : currentLanguage === 'sd' ? 'sd-Arab' : currentLanguage === 'ur' ? 'ur' : currentLanguage;
    document.documentElement.dir = ['ks', 'sd', 'ur'].includes(currentLanguage) ? 'rtl' : 'ltr';
    languageSelects.forEach(function (select) { select.value = currentLanguage; });
    if (persist) {
      try { localStorage.setItem(storageKey, currentLanguage); } catch (error) {}
    }
    var titleOutput = translated(titleSource);
    if (titleRendered === null || document.title !== titleRendered) titleSource = document.title;
    titleOutput = translated(titleSource);
    titleRendered = titleOutput;
    document.title = titleOutput;
    translateTree(document.body);
    window.dispatchEvent(new CustomEvent('medicare:languagechange', { detail: { language: currentLanguage } }));
  }

  function init() {
    if (window.MediCareI18n) return;
    window.MediCareI18n = { setLanguage: setLanguage, getLanguage: function () { return currentLanguage; }, mount: mountSwitcher };
    mountSwitcher();
    try { currentLanguage = localStorage.getItem(storageKey) || 'en'; } catch (error) {}
    setLanguage(currentLanguage, false);
    var observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') translateTree(record.target);
        else if (record.type === 'attributes') renderAttribute(record.target, record.attributeName);
        else record.addedNodes.forEach(function (node) {
          translateTree(node);
          if (!switcherInstalled && node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.app-sidebar,.settings-list,[data-language-slot]') ||
              node.querySelector('.app-sidebar,.settings-list,[data-language-slot]'))) mountSwitcher();
        });
      });
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: observedAttributes
    });
  }

  window.addEventListener('storage', function (event) {
    if (event.key === storageKey) setLanguage(event.newValue, false);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();