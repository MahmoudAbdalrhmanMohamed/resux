export const KEYWORD_RULES = {
  gambling: [
    /casino/i, /betting/i, /sportsbook/i, /slot[\s_-]?machine/i, /jackpot/i,
    /poker[\s_-]?room/i, /roulette/i, /blackjack/i, /baccarat/i, /lottery[\s_-]?draw/i,
    /wagering/i, /prediction[\s_-]?market[\s_-]?bet/i
  ],
  adult: [
    /pornography/i, /escort[\s_-]?service/i, /prostitution/i, /adult[\s_-]?sexual/i,
    /onlyfans/i, /cam[\s_-]?girl/i, /naked[\s_-]?video/i, /strip[\s_-]?club/i,
    /hookup[\s_-]?app/i, /sexual[\s_-]?matching/i, /zina/i
  ],
  riba: [
    /payday[\s_-]?loan/i, /usury/i, /loan[\s_-]?shark/i, /predatory[\s_-]?loan/i,
    /interest[\s_-]?bearing[\s_-]?debt/i, /cash[\s_-]?advance[\s_-]?fee/i,
    /riba[\s_-]?calculator/i, / riba /i
  ],
  phishing: [
    /phishing[\s_-]?kit/i, /fake[\s_-]?login/i, /fake[\s_-]?payment/i, /credential[\s_-]?harvester/i,
    /clone[\s_-]?bank/i, /secure[\s_-]?verify[\s_-]?card/i, /billing[\s_-]?verification[\s_-]?update/i,
    /identity[\s_-]?theft[\s_-]?tool/i
  ],
  malware: [
    /keylogger/i, /ransomware/i, /botnet/i, /ddos[\s_-]?tool/i, /exploit[\s_-]?kit/i,
    /credential[\s_-]?stealer/i, /cookie[\s_-]?stealer/i, /remote[\s_-]?access[\s_-]?trojan/i,
    /session[\s_-]?hijack/i, /backdoor[\s_-]?injector/i
  ],
  violence: [
    /weapons[\s_-]?marketplace/i, /bomb[\s_-]?making/i, /explosives[\s_-]?sales/i,
    /terrorist[\s_-]?recruitment/i, /extremist[\s_-]?propaganda/i, /assassination[\s_-]?market/i,
    /suicide[\s_-]?encouragement/i, /self-harm[\s_-]?promotion/i
  ],
  harassment: [
    /doxxing/i, /stalking[\s_-]?tool/i, /revenge[\s_-]?porn/i, /cyberbullying[\s_-]?bot/i,
    /blackmail[\s_-]?portal/i, /targeted[\s_-]?intimidation/i
  ],
  privacy: [
    /spy[\s_-]?app/i, /unauthorized[\s_-]?tracking/i, /contact[\s_-]?scraper/i,
    /data[\s_-]?broker/i, /covert[\s_-]?telemetry/i, /stealth[\s_-]?surveillance/i
  ]
};
