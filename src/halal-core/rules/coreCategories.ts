export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export const BLOCKED_CATEGORIES: CategoryDefinition[] = [
  {
    id: "haram_business",
    name: "Haram Business",
    description: "Gambling, betting, casinos, lottery, dating/zina apps, alcohol, tobacco, vape, usury (riba), payday loans.",
    keywords: [
      "casino", "gambling", "betting", "poker", "slot-machine", "lottery", "roulette", "blackjack",
      "hookup", "escort", "zina", "adult-dating", "tinder-clone", "onlyfans-clone", "pornography", "adult-video",
      "alcohol", "liquor", "winery", "beer", "brewery", "vape", "vaporizer", "tobacco", "cigarettes",
      "payday-loan", "usury", "riba", "loan-shark", "predatory-lending", "interest-bearing", "cash-advance"
    ]
  },
  {
    id: "illegal_criminal",
    name: "Illegal and Criminal Systems",
    description: "Fraud, scams, phishing, fake login/payment pages, card stealing, counterfeits, money laundering, sanctions evasion.",
    keywords: [
      "phishing", "card-stealer", "cc-grabber", "fake-login", "fake-payment", "bank-verification", "identity-theft",
      "fake-document", "passport-generator", "money-laundering", "sanctions-evasion", "tax-evasion", "counterfeit-goods",
      "stolen-card", "carding", "dumps", "cvv-shop"
    ]
  },
  {
    id: "cyber_abuse",
    name: "Cyber Abuse and Malware",
    description: "Malware, spyware, ransomware, keyloggers, DDoS tools, backdoors, cookie/session stealers, account takeover.",
    keywords: [
      "malware", "ransomware", "spyware", "keylogger", "backdoor", "botnet", "ddos-tool", "exploit-kit", "stealer",
      "credential-stealer", "session-hijacking", "cookie-stealing", "phishing-kit", "account-takeover", "dark-pattern-harvesting"
    ]
  },
  {
    id: "violence_harm",
    name: "Violence and Physical Harm",
    description: "Weapons sales, explosives, bomb-making content, terrorism, extremist recruitment, self-harm, child exploitation, human trafficking.",
    keywords: [
      "weapons-sales", "guns-marketplace", "bombs", "explosives", "bomb-making", "assassination", "hitman",
      "terrorism", "extremist-recruitment", "jihadi-propaganda", "isis-support", "suicide-encouragement", "self-harm",
      "eating-disorder", "pro-ana", "human-trafficking", "organ-trade", "child-exploitation"
    ]
  },
  {
    id: "hate_harassment",
    name: "Hate, Harassment, and Abuse",
    description: "Hate speech, doxxing, stalking, blackmail, revenge abuse, non-consensual image sharing, automated bullying.",
    keywords: [
      "hate-speech", "white-supremacy", "antisemitism", "islamophobia", "doxxing", "stalking-tool", "spy-app",
      "blackmail", "sextortion", "revenge-porn", "bullying-automation", "harassment-campaign", "targeted-intimidation"
    ]
  },
  {
    id: "sexual_harm",
    name: "Sexual Harm and Child Safety",
    description: "CSAM, sexual exploitation, grooming, deepfake sexual abuse, sexual blackmail, adult platforms.",
    keywords: [
      "csam", "child-exploitation", "grooming-tool", "deepfake-porn", "sex-service", "prostitution", "escort-agency"
    ]
  },
  {
    id: "deception_manipulation",
    name: "Deception, Manipulation, and Dark Patterns",
    description: "Fake reviews/followers, deepfake fraud, voice cloning, subscription traps, checkout traps.",
    keywords: [
      "fake-reviews", "fake-followers", "click-farm", "engagement-generator", "voice-cloning-deception",
      "deepfake-fraud", "political-manipulation", "subscription-trap", "hidden-charges", "dark-pattern-checkout"
    ]
  },
  {
    id: "privacy_abuse",
    name: "Privacy Abuse",
    description: "Spy apps, location tracking without consent, contact scraping, data broker services, hidden telemetry.",
    keywords: [
      "spyware", "unauthorized-tracking", "location-tracking", "contact-scraping", "data-broker", "hidden-telemetry",
      "unauthorized-face-recognition", "biometric-collection", "surveillance-system"
    ]
  },
  {
    id: "financial_harm",
    name: "Financial Harm",
    description: "Ponzi/pyramid schemes, rug pulls, pump-and-dump, fake crypto platforms, donation fraud, payment fraud.",
    keywords: [
      "ponzi", "pyramid-scheme", "rug-pull", "crypto-scam", "pump-and-dump", "fake-trading-bot", "charity-fraud",
      "donation-scam", "payment-fraud", "predatory-loans"
    ]
  },
  {
    id: "health_safety_harm",
    name: "Health and Safety Harm",
    description: "Fake medicines, dangerous medical misinformation, unlicensed diagnosis, promotion of self-medication/steroids/diet harm.",
    keywords: [
      "fake-medicine", "medical-misinformation", "unlicensed-diagnosis", "steroid-abuse", "anabolic-steroids",
      "diet-harm", "pro-mia", "eating-disorder-promotion", "anti-vax-misinformation"
    ]
  },
  {
    id: "environmental_harm",
    name: "Environmental and Animal Harm",
    description: "Illegal wildlife trade, animal cruelty platforms, illegal logging, toxic waste dumping.",
    keywords: [
      "wildlife-trade", "ivory-sales", "animal-cruelty", "illegal-logging", "toxic-waste-dumping"
    ]
  },
  {
    id: "general_harm",
    name: "Other Serious Harm",
    description: "Any other clearly harmful, dangerous, or illegal systems.",
    keywords: [
      "illegal-activity", "systemic-abuse", "public-harm"
    ]
  }
];
