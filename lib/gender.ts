const maleNames = new Set(`
abdurrahman abdullah abidin adem adnan agah ahmet akif akın alaattin ali alican alparslan alp anıl arda arif asım atakan atilla aydın ayhan aykut aziz
baran barış batuhan bayram bedirhan berk berke berkay bilal bora burak bülent can caner celal
burhan cafer cem cengiz cihan cüneyt çağatay çağdaş çağlar davut doğan doğukan emin emir emirhan emrah emre
enes engin ercan erdem eren ergün erhan erkan erol ertan ertuğrul eyüp faruk fatih ferdi ferhat fevzi fikret
furkan gökhan göktuğ hakan hakkı halil hamza harun hasan haydar hüseyin ibrahim idris ihsan ilhan ilker ilyas isa ismail izzet
kaan kadir kamil kemal kerem koray kubilay levent mahir mahmut mehmet melih mert mete metin
muharrem murat musa mustafa muzaffer naci naim namık nazım necati nedim nejat nihat nuri nusret oğuz oğuzhan oktay onur orhan osman ömer önder
özgür polat ramazan rasim rauf recep rıdvan rıza sabri sait salih samet sami sarp savaş selçuk sercan serdar serhat serkan seyfettin sinan
soner süleyman şaban şahin şevket şükrü taha tahir talha taner tarık tayfun teoman tolga tunahan tuncay
turan uğur umut ümit veli volkan yakup yasin yavuz yiğit yunus yusuf zafer zeki zekeriya ziya muhammed
adam alexander andrew anthony benjamin charles christopher daniel david edward george henry
james john joseph mark martin matthew michael nicholas oliver paul peter richard robert samuel
steven thomas victor william
`.trim().split(/\s+/));

const femaleNames = new Set(`
ada adile afife alev aslı aslıhan asuman atiye ayça ayfer ayla aylin aynur aysel ayşe ayten azra bahar başak bedriye behice behiye belgin berrak
berrin betül beyza büşra burcu cansu ceren ceyda ceylan damla defne demet deniz derya didem
dilara dilek ebru ece ecrin eda elif elvan emel emine esin esma esra eylül ezgi fadime fatma feride feriha
feyza filiz funda gamze gizem gökçe gönül gözde gül gülcan gülçin gülay gülden güler gülizar gülşah gülsüm hacer hamide hande
hanife hatice havva hayriye hazal hilal huriye hülya ırmak ilayda ilkay inci ipek jale kadriye kevser kıymet
kiraz kübra lale leman leyla makbule mediha melek melike melis meliha merve meryem mihriban mine muazzez münevver münire naime naz nazan
nazlı necla neriman nermin neslihan neşe nevin nezahat nihan nil nilay nisa nur nuray nurcan nurgül nuriye özge özlem pakize pelin perihan
pınar rabia raziye remziye reyhan rüya saadet sabahat saime saliha sedef selin selma sema sena serap sevda sevgi sevil sevim sibel simay sıla
songül su sude sultan sümeyye şebnem şerife şevval tuana tuğba tülay yağmur yasemin yelda yeşim
yonca zeliha zehra zeynep zümra
alice amanda amy anna barbara carol charlotte elizabeth emily emma helen isabella jennifer
jessica julia karen laura linda lisa maria mary natalie olivia patricia rachel rebecca sarah
sophia susan victoria
`.trim().split(/\s+/));

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü\s-]/g, " ").trim();
}

export function inferGender(name: string): "male" | "female" | undefined {
  const tokens = normalize(name).split(/[\s-]+/).filter(Boolean);
  for (const token of tokens.slice(0, 3)) {
    if (maleNames.has(token)) return "male";
    if (femaleNames.has(token)) return "female";
  }
  return undefined;
}
