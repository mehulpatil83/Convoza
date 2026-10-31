export type Lang = "en" | "hi" | "kn" | "gu" | "bn";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "bn", label: "বাংলা" },
];

/** The brand word in each script, used by the rotating hero headline. */
export const BRAND_SCRIPTS = ["Convoza", "कॉन्वोज़ा", "ಕಾನ್ವೋಜಾ", "કોન્વોઝા", "কনভোজা"];

type Dict = Record<string, string>;

const en: Dict = {
  howto: "How it works", about: "About", tag: "Group Orders. Sorted!", heroSub2: "Turn messy WhatsApp chats into perfect group orders — automatically.", startOrder: "Start Convoza", getStarted: "Start Convoza", stripSmart: "Smart AI", stripSmartSub: "Understands context", stripGroup: "Group Friendly", stripGroupSub: "Perfect for any group", stripClear: "No Confusion", stripClearSub: "Clear orders, clear payments", stripDrama: "No Drama", stripDramaSub: "Just organised orders",
  features: "Features", crowdmind: "Crowdmind", build: "Build a Convoza", sample: "Try a sample chat",
  theme: "Theme", language: "Language",
  heroA: "WhatsApp messages are messy.", heroB: "Your orders don't have to be.",
  heroSub: "Convoza turns everyday conversations into clean, structured orders. It understands what was added, cancelled, or left unclear.",
  isForEveryone: "is for everyone.", sameMeaning: "Different language. Same meaning. Same convoza.",
  ctaTitle: "Got a messy chat?", ctaSub: "Turn it into a convoza.", ctaBtn: "Build your first Convoza",
  footTag: "From chat to clarity.", footBuilt: "Built with Gemma. Made for everyday chaos.",
};
const hi: Dict = {
  howto: "कैसे काम करता है", about: "हमारे बारे में", tag: "ग्रुप ऑर्डर, सीधे सुलझे!", heroSub2: "बिखरी WhatsApp चैट को परफ़ेक्ट ग्रुप ऑर्डर में बदलें — अपने आप।", startOrder: "Convoza शुरू करें", getStarted: "Convoza शुरू करें", stripSmart: "स्मार्ट AI", stripSmartSub: "संदर्भ समझता है", stripGroup: "ग्रुप के अनुकूल", stripGroupSub: "हर ग्रुप के लिए बढ़िया", stripClear: "कोई उलझन नहीं", stripClearSub: "साफ़ ऑर्डर, साफ़ भुगतान", stripDrama: "कोई झंझट नहीं", stripDramaSub: "बस सुलझे हुए ऑर्डर",
  features: "सुविधाएँ", crowdmind: "Crowdmind", build: "Convoza बनाएँ", sample: "नमूना चैट आज़माएँ",
  theme: "थीम", language: "भाषा",
  heroA: "WhatsApp के मैसेज बिखरे हुए होते हैं।", heroB: "आपके ऑर्डर ऐसे नहीं होने चाहिए।",
  heroSub: "Convoza रोज़ की बातचीत को साफ़ ऑर्डर में बदलता है। यह समझता है कि क्या जुड़ा, क्या रद्द हुआ और क्या साफ़ नहीं है।",
  isForEveryone: "सबके लिए है।", sameMeaning: "भाषा अलग। मतलब वही। Convoza वही।",
  ctaTitle: "चैट उलझी हुई है?", ctaSub: "उसे Convoza में बदलें।", ctaBtn: "अपना पहला Convoza बनाएँ",
  footTag: "चैट से स्पष्टता तक।", footBuilt: "Gemma के साथ बना। रोज़ की गड़बड़ के लिए।",
};
const kn: Dict = {
  howto: "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ", about: "ನಮ್ಮ ಬಗ್ಗೆ", tag: "ಗುಂಪು ಆರ್ಡರ್, ಸುಲಭ!", heroSub2: "ಗೊಂದಲದ WhatsApp ಚಾಟ್‌ಗಳನ್ನು ಸರಿಯಾದ ಗುಂಪು ಆರ್ಡರ್‌ಗಳಾಗಿ ಬದಲಿಸಿ — ತಾನಾಗಿಯೇ.", startOrder: "ಆರ್ಡರ್ ಆರಂಭಿಸಿ", getStarted: "ಆರಂಭಿಸಿ", stripSmart: "ಸ್ಮಾರ್ಟ್ AI", stripSmartSub: "ಸಂದರ್ಭ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತದೆ", stripGroup: "ಗುಂಪಿಗೆ ಸ್ನೇಹಿ", stripGroupSub: "ಯಾವುದೇ ಗುಂಪಿಗೆ ಸೂಕ್ತ", stripClear: "ಗೊಂದಲವಿಲ್ಲ", stripClearSub: "ಸ್ಪಷ್ಟ ಆರ್ಡರ್, ಸ್ಪಷ್ಟ ಪಾವತಿ", stripDrama: "ತಕರಾರಿಲ್ಲ", stripDramaSub: "ವ್ಯವಸ್ಥಿತ ಆರ್ಡರ್‌ಗಳು ಮಾತ್ರ",
  features: "ವೈಶಿಷ್ಟ್ಯಗಳು", crowdmind: "Crowdmind", build: "Convoza ರಚಿಸಿ", sample: "ಮಾದರಿ ಚಾಟ್ ಪ್ರಯತ್ನಿಸಿ",
  theme: "ಥೀಮ್", language: "ಭಾಷೆ",
  heroA: "WhatsApp ಸಂದೇಶಗಳು ಗೊಂದಲಮಯ.", heroB: "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳು ಹಾಗಿರಬೇಕಿಲ್ಲ.",
  heroSub: "Convoza ದೈನಂದಿನ ಮಾತುಕತೆಯನ್ನು ಸ್ಪಷ್ಟ ಆರ್ಡರ್ ಆಗಿ ಬದಲಿಸುತ್ತದೆ. ಏನು ಸೇರಿತು, ಏನು ರದ್ದಾಯಿತು, ಏನು ಅಸ್ಪಷ್ಟ ಎಂದು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತದೆ.",
  isForEveryone: "ಎಲ್ಲರಿಗಾಗಿ.", sameMeaning: "ಭಾಷೆ ಬೇರೆ. ಅರ್ಥ ಒಂದೇ. Convoza ಒಂದೇ.",
  ctaTitle: "ಗೊಂದಲದ ಚಾಟ್ ಇದೆಯೇ?", ctaSub: "ಅದನ್ನು Convoza ಆಗಿ ಬದಲಿಸಿ.", ctaBtn: "ನಿಮ್ಮ ಮೊದಲ Convoza ರಚಿಸಿ",
  footTag: "ಚಾಟ್‌ನಿಂದ ಸ್ಪಷ್ಟತೆಗೆ.", footBuilt: "Gemma ಜೊತೆ ರಚಿತ. ದಿನನಿತ್ಯದ ಗೊಂದಲಕ್ಕಾಗಿ.",
};
const gu: Dict = {
  howto: "કેવી રીતે કામ કરે છે", about: "અમારા વિશે", tag: "ગ્રુપ ઓર્ડર, સીધા ગોઠવાયેલા!", heroSub2: "અવ્યવસ્થિત WhatsApp ચેટને પરફેક્ટ ગ્રુપ ઓર્ડરમાં ફેરવો — આપોઆપ.", startOrder: "ઓર્ડર શરૂ કરો", getStarted: "શરૂ કરો", stripSmart: "સ્માર્ટ AI", stripSmartSub: "સંદર્ભ સમજે છે", stripGroup: "ગ્રુપ માટે અનુકૂળ", stripGroupSub: "કોઈપણ ગ્રુપ માટે યોગ્ય", stripClear: "કોઈ ગૂંચવણ નહીં", stripClearSub: "સ્પષ્ટ ઓર્ડર, સ્પષ્ટ ચુકવણી", stripDrama: "કોઈ ઝંઝટ નહીં", stripDramaSub: "બસ ગોઠવાયેલા ઓર્ડર",
  features: "સુવિધાઓ", crowdmind: "Crowdmind", build: "Convoza બનાવો", sample: "નમૂના ચેટ અજમાવો",
  theme: "થીમ", language: "ભાષા",
  heroA: "WhatsApp મેસેજ અવ્યવસ્થિત હોય છે.", heroB: "તમારા ઓર્ડર એવા હોવા જરૂરી નથી.",
  heroSub: "Convoza રોજની વાતચીતને સ્પષ્ટ ઓર્ડરમાં ફેરવે છે. શું ઉમેરાયું, શું રદ થયું અને શું અસ્પષ્ટ છે તે સમજે છે.",
  isForEveryone: "બધા માટે છે.", sameMeaning: "ભાષા અલગ. અર્થ એ જ. Convoza એ જ.",
  ctaTitle: "ચેટ ગૂંચવાયેલી છે?", ctaSub: "તેને Convoza માં ફેરવો.", ctaBtn: "તમારું પહેલું Convoza બનાવો",
  footTag: "ચેટથી સ્પષ્ટતા સુધી.", footBuilt: "Gemma સાથે બનાવ્યું. રોજની ગૂંચ માટે.",
};
const bn: Dict = {
  howto: "কীভাবে কাজ করে", about: "আমাদের সম্পর্কে", tag: "গ্রুপ অর্ডার, একদম গোছানো!", heroSub2: "এলোমেলো WhatsApp চ্যাটকে নিখুঁত গ্রুপ অর্ডারে বদলে দিন — নিজে থেকেই।", startOrder: "অর্ডার শুরু করুন", getStarted: "শুরু করুন", stripSmart: "স্মার্ট AI", stripSmartSub: "প্রসঙ্গ বোঝে", stripGroup: "গ্রুপ-বান্ধব", stripGroupSub: "যেকোনো গ্রুপের জন্য", stripClear: "কোনো ধোঁয়াশা নেই", stripClearSub: "পরিষ্কার অর্ডার, পরিষ্কার পেমেন্ট", stripDrama: "কোনো ঝামেলা নেই", stripDramaSub: "শুধু গোছানো অর্ডার",
  features: "বৈশিষ্ট্য", crowdmind: "Crowdmind", build: "Convoza বানান", sample: "নমুনা চ্যাট চেষ্টা করুন",
  theme: "থিম", language: "ভাষা",
  heroA: "WhatsApp মেসেজ এলোমেলো হয়।", heroB: "আপনার অর্ডার তেমন হতে হবে না।",
  heroSub: "Convoza প্রতিদিনের কথোপকথনকে পরিষ্কার অর্ডারে বদলে দেয়। কী যোগ হলো, কী বাতিল হলো, কী অস্পষ্ট, সে বোঝে।",
  isForEveryone: "সবার জন্য।", sameMeaning: "ভাষা আলাদা। মানে একই। Convoza একই।",
  ctaTitle: "চ্যাট এলোমেলো?", ctaSub: "এটাকে Convoza বানিয়ে ফেলুন।", ctaBtn: "আপনার প্রথম Convoza বানান",
  footTag: "চ্যাট থেকে স্পষ্টতায়।", footBuilt: "Gemma দিয়ে তৈরি। প্রতিদিনের হট্টগোলের জন্য।",
};

export const DICTS: Record<Lang, Dict> = { en, hi, kn, gu, bn };

export function translate(lang: Lang, key: string): string {
  return DICTS[lang][key] ?? en[key] ?? key;
}
