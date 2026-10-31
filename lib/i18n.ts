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
  features: "Features", howto: "How to use", crowdmind: "Crowdmind", build: "Build a Convoza", sample: "Try a sample chat",
  theme: "Theme", language: "Language",
  heroA: "WhatsApp messages are messy.", heroB: "Your orders don't have to be.",
  heroSub: "Convoza turns everyday conversations into clean, structured orders. It understands what was added, cancelled, or left unclear.",
  isForEveryone: "is for everyone.", sameMeaning: "Different language. Same meaning. Same convoza.",
  ctaTitle: "Got a messy chat?", ctaSub: "Turn it into a convoza.", ctaBtn: "Build your first Convoza",
  footTag: "From chat to clarity.", footBuilt: "Built with Gemma. Made for everyday chaos.",
};
const hi: Dict = {
  features: "सुविधाएँ", howto: "कैसे इस्तेमाल करें", crowdmind: "Crowdmind", build: "Convoza बनाएँ", sample: "नमूना चैट आज़माएँ",
  theme: "थीम", language: "भाषा",
  heroA: "WhatsApp के मैसेज बिखरे हुए होते हैं।", heroB: "आपके ऑर्डर ऐसे नहीं होने चाहिए।",
  heroSub: "Convoza रोज़ की बातचीत को साफ़ ऑर्डर में बदलता है। यह समझता है कि क्या जुड़ा, क्या रद्द हुआ और क्या साफ़ नहीं है।",
  isForEveryone: "सबके लिए है।", sameMeaning: "भाषा अलग। मतलब वही। Convoza वही।",
  ctaTitle: "चैट उलझी हुई है?", ctaSub: "उसे Convoza में बदलें।", ctaBtn: "अपना पहला Convoza बनाएँ",
  footTag: "चैट से स्पष्टता तक।", footBuilt: "Gemma के साथ बना। रोज़ की गड़बड़ के लिए।",
};
const kn: Dict = {
  features: "ವೈಶಿಷ್ಟ್ಯಗಳು", howto: "ಬಳಸುವುದು ಹೇಗೆ", crowdmind: "Crowdmind", build: "Convoza ರಚಿಸಿ", sample: "ಮಾದರಿ ಚಾಟ್ ಪ್ರಯತ್ನಿಸಿ",
  theme: "ಥೀಮ್", language: "ಭಾಷೆ",
  heroA: "WhatsApp ಸಂದೇಶಗಳು ಗೊಂದಲಮಯ.", heroB: "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳು ಹಾಗಿರಬೇಕಿಲ್ಲ.",
  heroSub: "Convoza ದೈನಂದಿನ ಮಾತುಕತೆಯನ್ನು ಸ್ಪಷ್ಟ ಆರ್ಡರ್ ಆಗಿ ಬದಲಿಸುತ್ತದೆ. ಏನು ಸೇರಿತು, ಏನು ರದ್ದಾಯಿತು, ಏನು ಅಸ್ಪಷ್ಟ ಎಂದು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತದೆ.",
  isForEveryone: "ಎಲ್ಲರಿಗಾಗಿ.", sameMeaning: "ಭಾಷೆ ಬೇರೆ. ಅರ್ಥ ಒಂದೇ. Convoza ಒಂದೇ.",
  ctaTitle: "ಗೊಂದಲದ ಚಾಟ್ ಇದೆಯೇ?", ctaSub: "ಅದನ್ನು Convoza ಆಗಿ ಬದಲಿಸಿ.", ctaBtn: "ನಿಮ್ಮ ಮೊದಲ Convoza ರಚಿಸಿ",
  footTag: "ಚಾಟ್‌ನಿಂದ ಸ್ಪಷ್ಟತೆಗೆ.", footBuilt: "Gemma ಜೊತೆ ರಚಿತ. ದಿನನಿತ್ಯದ ಗೊಂದಲಕ್ಕಾಗಿ.",
};
const gu: Dict = {
  features: "સુવિધાઓ", howto: "કેવી રીતે વાપરવું", crowdmind: "Crowdmind", build: "Convoza બનાવો", sample: "નમૂના ચેટ અજમાવો",
  theme: "થીમ", language: "ભાષા",
  heroA: "WhatsApp મેસેજ અવ્યવસ્થિત હોય છે.", heroB: "તમારા ઓર્ડર એવા હોવા જરૂરી નથી.",
  heroSub: "Convoza રોજની વાતચીતને સ્પષ્ટ ઓર્ડરમાં ફેરવે છે. શું ઉમેરાયું, શું રદ થયું અને શું અસ્પષ્ટ છે તે સમજે છે.",
  isForEveryone: "બધા માટે છે.", sameMeaning: "ભાષા અલગ. અર્થ એ જ. Convoza એ જ.",
  ctaTitle: "ચેટ ગૂંચવાયેલી છે?", ctaSub: "તેને Convoza માં ફેરવો.", ctaBtn: "તમારું પહેલું Convoza બનાવો",
  footTag: "ચેટથી સ્પષ્ટતા સુધી.", footBuilt: "Gemma સાથે બનાવ્યું. રોજની ગૂંચ માટે.",
};
const bn: Dict = {
  features: "বৈশিষ্ট্য", howto: "কীভাবে ব্যবহার করবেন", crowdmind: "Crowdmind", build: "Convoza বানান", sample: "নমুনা চ্যাট চেষ্টা করুন",
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
