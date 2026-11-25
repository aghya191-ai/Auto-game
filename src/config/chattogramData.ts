import type {
  AreaConfig,
  CngColorOption,
  CngStickerOption,
  DeathReason,
  DriverRankTier,
  MissionMetric,
  RadioClipKind,
  WeatherCondition,
} from '../types/game';

export const AREAS: AreaConfig[] = [
  {
    id: 'sadarghat',
    name: 'সদরঘাট',
    tagline: 'কর্ণফুলীর হাওয়া, জ্যাম দিয়ে যাত্রা শুরু!',
    length: 420,
    skyColor: '#bed9e6',
    fogColor: '#d7e6ee',
    accentColor: '#0284c7',
    buildingPalette: ['#d6cfc7', '#b6ada4', '#e8ccb3', '#c8d6df'],
    buildingStyle: 'port',
    trafficMultiplier: 0.95,
    shopNames: ['কর্ণফুলী সাম্পান স্টোর', 'জাহাজী শুঁটকি ভান্ডার', 'বন্দর চা-নাস্তা ঘর'],
  },
  {
    id: 'andarkilla',
    name: 'আন্দরকিল্লা',
    tagline: 'বইয়ের দোকান আর পুরান গলির হর্ন উৎসব',
    length: 440,
    skyColor: '#c3dce8',
    fogColor: '#dbe8ef',
    accentColor: '#d97706',
    buildingPalette: ['#dfd0b8', '#c97b63', '#d6d3d1', '#d9a594'],
    buildingStyle: 'oldtown',
    trafficMultiplier: 1.05,
    shopNames: ['বিদ্যাসাগর বই ঘর', 'চাঁটগাঁ অফসেট প্রেস', 'মোঘল বিরিয়ানি প্যালেস'],
  },
  {
    id: 'newmarket',
    name: 'নিউমার্কেট মোড়',
    tagline: 'মোড় ঘুরলেই হকার আর বাসের চাপ!',
    length: 460,
    skyColor: '#c5dfe8',
    fogColor: '#ddebf0',
    accentColor: '#0d9488',
    buildingPalette: ['#e2d9c2', '#bfd4c8', '#d4d8dd', '#e3c7c2'],
    buildingStyle: 'market',
    trafficMultiplier: 1.12,
    shopNames: ['রংধনু বিপণী বিতান', 'নিউমার্কেট জুতা মহল', 'হকার্স ফ্যাশন হাউস'],
  },
  {
    id: 'chawkbazar',
    name: 'চকবাজার',
    tagline: 'মেজবানি গন্ধ আর অটোরিকশার ঠেলাঠেলি',
    length: 460,
    skyColor: '#d6dce2',
    fogColor: '#e6eaee',
    accentColor: '#ea580c',
    buildingPalette: ['#d9bca3', '#e2d2b5', '#c88d7c', '#d6d3d1'],
    buildingStyle: 'oldtown',
    trafficMultiplier: 1.18,
    shopNames: ['হাজী মেজবান ভোজ', 'সাফল্য কোচিং একাডেমি', 'চকবাজার মশলা ভান্ডার'],
  },
  {
    id: 'probortok',
    name: 'প্রবর্তক মোড়',
    tagline: 'চট্টগ্রামের সবচেয়ে বাঁকা-চোরা মোড় সামলে!',
    length: 470,
    skyColor: '#c2dde4',
    fogColor: '#d8eaef',
    accentColor: '#16a34a',
    buildingPalette: ['#d4dce2', '#c3ccd4', '#c5d8cc', '#e5dec9'],
    buildingStyle: 'modern',
    trafficMultiplier: 1.22,
    shopNames: ['হিলভিউ ফার্মেসি', 'প্রবর্তক কফি লাউঞ্জ', 'সবুজ বাংলা ডায়াগনস্টিক'],
  },
  {
    id: 'muradpur',
    name: 'মুরাদপুর',
    tagline: 'ফ্লাইওভারের নিচে পিলার আর বাসের লড়াই',
    length: 490,
    skyColor: '#cfdbe2',
    fogColor: '#e2e8ec',
    accentColor: '#ca8a04',
    buildingPalette: ['#d6d3d1', '#dfd3b6', '#cbd5df', '#dbb99b'],
    buildingStyle: 'market',
    trafficMultiplier: 1.28,
    shopNames: ['মুরাদপুর স্টিল হাউস', 'রহমানিয়া সিঙ্গারা ঘর', 'ফ্লাইওভার টেলিকম'],
    hasFlyover: true,
  },
  {
    id: 'duinogate',
    name: '২নং গেইট',
    tagline: 'রেললাইন, পুলিশ বক্স আর অচেনা শর্টকাট',
    length: 500,
    skyColor: '#c2d8e8',
    fogColor: '#d9e7f1',
    accentColor: '#4f46e5',
    buildingPalette: ['#cbd5e1', '#d6dff0', '#e1c9cd', '#e3dcb8'],
    buildingStyle: 'modern',
    trafficMultiplier: 1.35,
    shopNames: ['বিপ্লব উদ্যান স্টোর', 'বায়েজিদ অটো পার্টস', 'চাঁটগাঁ ভুনা খিচুড়ি'],
    hasFlyover: true,
  },
  {
    id: 'gecmor',
    name: 'জিএসি মোড়',
    tagline: 'রঙিন লাইট, ভিআইপি জ্যাম ও ঝাঁঝালো হর্ন',
    length: 510,
    skyColor: '#c8dce8',
    fogColor: '#dde9f0',
    accentColor: '#db2777',
    buildingPalette: ['#dfd0e4', '#d4dce9', '#cbd5e1', '#e4d6b5'],
    buildingStyle: 'modern',
    trafficMultiplier: 1.4,
    shopNames: ['জিএসি স্কয়ার মল', 'সেন্ট্রাল কনভেনশন', 'পতেঙ্গা এক্সপ্রেস ক্যাফে'],
  },
  {
    id: 'alankar',
    name: 'অলংকার',
    tagline: 'দূরপাল্লার বাসের গর্জন—চোখ কান খোলা রাখো!',
    length: 530,
    skyColor: '#d0dbe2',
    fogColor: '#e3e9ed',
    accentColor: '#dc2626',
    buildingPalette: ['#d6b8b8', '#dcc4ae', '#d6d3d1', '#cbd5e1'],
    buildingStyle: 'highway',
    trafficMultiplier: 1.48,
    shopNames: ['আল-মদিনা বাস কাউন্টার', 'সাগরিকা টায়ার ওয়ার্কস', 'হাইওয়ে রাত্রি ধাবা'],
  },
  {
    id: 'akkhan',
    name: 'একেখান',
    tagline: 'ঢাকা-চট্টগ্রাম হাইওয়ে ট্রাকের সুনামি',
    length: 540,
    skyColor: '#cdd9e1',
    fogColor: '#e1e8ed',
    accentColor: '#be123c',
    buildingPalette: ['#e2ded9', '#ddc2c8', '#dfc5af', '#cbd5e1'],
    buildingStyle: 'highway',
    trafficMultiplier: 1.54,
    shopNames: ['মা-বাবার দোয়া গ্যারেজ', 'হাইওয়ে পেট্রোল মার্ট', 'পাহাড়তলী ফল ভান্ডার'],
  },
  {
    id: 'bahaddarhat',
    name: 'বহদ্দারহাট',
    tagline: 'ফ্লাইওভারের শেষ প্রান্ত—এবার আবার সদরঘাট লুপ!',
    length: 560,
    skyColor: '#c5d7e6',
    fogColor: '#dce6ef',
    accentColor: '#7c3aed',
    buildingPalette: ['#d3cde2', '#e2d4b4', '#cbd5e1', '#dec0c0'],
    buildingStyle: 'highway',
    trafficMultiplier: 1.62,
    shopNames: ['কাপ্তাই বাস টার্মিনাল', 'কালুরঘাট হার্ডওয়্যার', 'স্বপ্ননীড় মিষ্টান্ন ভান্ডার'],
    hasFlyover: true,
  },
];

export const BILLBOARD_ADS: { title: string; subtitle: string; bg: string; fg: string }[] = [
  {
    title: 'বাম্পার অফার! ১ কিনলে ১ ফ্রি',
    subtitle: 'চাঁটগাঁ মেজবানি মশলা — আসল ঝাল, নো ভেজাল',
    bg: '#b91c1c',
    fg: '#fef08a',
  },
  {
    title: 'নতুন ফ্ল্যাট বুকিং চলছে!',
    subtitle: 'কর্ণফুলী ভিউ টাওয়ার — লিফট, গ্যাস ও হর্ন ফ্রি',
    bg: '#1e3a8a',
    fg: '#ffffff',
  },
  {
    title: 'হর্ন কম বাজান, গ্যাস বাঁচান',
    subtitle: 'জনস্বার্থে: চট্টগ্রাম সিএনজি মালিক সমিতি',
    bg: '#065f46',
    fg: '#fef9c3',
  },
  {
    title: '৩০ দিনে ইংরেজি শিখুন!',
    subtitle: 'গ্যারান্টিসহ কোচিং — চকবাজার মেইন রোড',
    bg: '#7c2d12',
    fg: '#fed7aa',
  },
  {
    title: 'ডিজিটাল চা-সিঙ্গারা কর্নার',
    subtitle: 'গোলমরিচ ছাড়া গরম চা — সারাদিন খোলা',
    bg: '#4c1d95',
    fg: '#f5d0fe',
  },
];

export const WALL_POSTERS: { text: string; bg: string; fg: string }[] = [
  { text: 'টিউশনি চাই (ক্লাস ১-১০)', bg: '#fef08a', fg: '#1c1917' },
  { text: 'রং মিস্ত্রি ও প্লাম্বার', bg: '#fecaca', fg: '#7f1d1d' },
  { text: 'হাতে লেখা সুন্দর করুন', bg: '#bfdbfe', fg: '#1e3a8a' },
  { text: 'বাসা ভাড়া দেওয়া হবে', bg: '#bbf7d0', fg: '#14532d' },
  { text: 'জরুরি রক্তের প্রয়োজন', bg: '#fee2e2', fg: '#991b1b' },
];

export const CNG_COLORS: CngColorOption[] = [
  { id: 'chittagong_green', name: 'ক্লাসিক চট্টগ্রাম সবুজ', hex: '#16a34a', price: 0 },
  { id: 'shorshe_gold', name: 'সর্ষে হলুদ স্পেশাল', hex: '#eab308', price: 300 },
  { id: 'karnaphuli_blue', name: 'কর্ণফুলী নীল', hex: '#0284c7', price: 500 },
  { id: 'mejban_red', name: 'মেজবানি লাল', hex: '#dc2626', price: 750 },
  { id: 'patenga_teal', name: 'পতেঙ্গা টিল', hex: '#0d9488', price: 950 },
  { id: 'royal_purple', name: 'ভিআইপি বেগুনি', hex: '#7c3aed', price: 1400 },
];

export const CNG_STICKERS: CngStickerOption[] = [
  {
    id: 'mayer_doa',
    name: 'মায়ের দোয়া',
    text: 'মায়ের দোয়া',
    bgHex: '#fef08a',
    textHex: '#991b1b',
    price: 0,
  },
  {
    id: 'no_horn',
    name: 'হর্ন দেবেন না',
    text: 'হর্ন দেবেন না!',
    bgHex: '#dc2626',
    textHex: '#ffffff',
    price: 250,
  },
  {
    id: 'no_tension',
    name: 'নো টেনশন ভাই',
    text: 'নো টেনশন ভাই',
    bgHex: '#0284c7',
    textHex: '#fef08a',
    price: 450,
  },
  {
    id: 'dhonnobad',
    name: 'আগে যান ধন্যবাদ',
    text: 'আগে যান ধন্যবাদ',
    bgHex: '#15803d',
    textHex: '#ffffff',
    price: 650,
  },
  {
    id: 'chatgaiya_power',
    name: 'চাঁটগাঁইয়া পাওয়ার',
    text: 'চাঁটগাঁইয়া পাওয়ার',
    bgHex: '#111827',
    textHex: '#f59e0b',
    price: 1000,
  },
];

export interface MissionTemplate {
  id: string;
  title: string;
  metric: MissionMetric;
  target: number;
  reward: number;
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'm_dist_1200', title: 'একটানা ১২০০ মিটার সিএনজি চালাও', metric: 'distance', target: 1200, reward: 220 },
  { id: 'm_dist_2500', title: 'সড়কে ২৫০০ মিটার অতিক্রম করো', metric: 'distance', target: 2500, reward: 380 },
  { id: 'm_areas_4', title: '৪টি নতুন এলাকা পার হও', metric: 'areas', target: 4, reward: 250 },
  { id: 'm_areas_8', title: '৮টি এলাকার সাইনবোর্ড দেখো', metric: 'areas', target: 8, reward: 450 },
  { id: 'm_horns_12', title: 'রাস্তায় ১২ বার হর্ন বাজাও', metric: 'horns', target: 12, reward: 150 },
  { id: 'm_gas_2', title: 'হলুদ জোনে ২ বার গ্যাস ভরো', metric: 'gas_refills', target: 2, reward: 240 },
  { id: 'm_bribe_1', title: 'গোলাপি জোনে ১ বার চা-পানি দাও', metric: 'bribes', target: 1, reward: 260 },
  { id: 'm_boost_8', title: 'মোট ৮ সেকেন্ড বুস্ট ব্যবহার করো', metric: 'boost_time', target: 8, reward: 200 },
  { id: 'm_near_5', title: '৫ বার গাড়ির গা ঘেঁষে বেরিয়ে যাও', metric: 'near_misses', target: 5, reward: 300 },
  { id: 'm_pass_2', title: '২ জন যাত্রীকে গন্তব্যে নামিয়ে দাও', metric: 'passengers', target: 2, reward: 320 },
  { id: 'm_sig_2', title: 'লাল বাতিতে ২ বার নিয়ম মেনে থামো', metric: 'signal_stops', target: 2, reward: 260 },
];

export const SATIRE_HEADLINES: Record<
  DeathReason,
  { headline: string; subheadline: string }[]
> = {
  bus: [
    {
      headline: 'ব্রেকিং: সিটি বাসের সাথে পাল্লা দিতে গিয়ে সিএনজির ভর্তা!',
      subheadline: 'বাস ড্রাইভারের দাবি—"সিএনজি আমার লুকিং গ্লাসের অন্ধকারে ছিল, ভাই!"',
    },
    {
      headline: 'শীর্ষ সংবাদ: "আগে যামু" প্রতিযোগিতায় সিটি বাসের কাছে নকআউট!',
      subheadline: 'প্রত্যক্ষদর্শীরা জানান, খাঁচা-জালি অটুট থাকলেও মিটার বাক্স উড়ে গেছে।',
    },
  ],
  truck: [
    {
      headline: 'ব্রেকিং: "মায়ের দোয়া" ট্রাকের বাম্পারে আটকে গেল চট্টগ্রাম এক্সপ্রেস!',
      subheadline: 'ট্রাক হেলপার জানিয়েছেন, ওভারটেকের আগে হর্ন দেওয়া উচিত ছিল।',
    },
    {
      headline: 'শীর্ষ সংবাদ: ১০ চাকার ট্রাককে সাইড না দেওয়ায় সিএনজির মহাপ্রস্থান!',
      subheadline: 'সিএনজি সমিতি আগামীকাল আন্দরকিল্লায় চা-বিরতি ধর্মঘট ডেকেছে।',
    },
  ],
  pedestrian: [
    {
      headline: 'ব্রেকিং: ক্ষুব্ধ পথচারীদের গণধোলাইয়ে সিএনজি চালক কুপোকাত!',
      subheadline: 'কাদা ছিটানো ও ধাক্কা দেওয়ার প্রতিবাদে মুরাদপুর মোড়ে তীব্র চা-চক্র।',
    },
    {
      headline: 'শীর্ষ সংবাদ: "দেখে চালাতে পারস না?"—পথচারী বাহিনীর হাতে সিএনজি আটক!',
      subheadline: 'সিএনজির লোহার খাঁচা থাকা সত্ত্বেও জানালার ফাঁক দিয়ে চড়-থাপ্পড় বর্ষিত হয়।',
    },
  ],
  gas: [
    {
      headline: 'ব্রেকিং: মাঝরাস্তায় গ্যাস ফুরিয়ে ঠেলাগাড়িতে পরিণত সিএনজি!',
      subheadline: 'হলুদ জোন এড়িয়ে যাওয়ার খেসারত দিলেন চালক; পেছনে ৩ কিমি জ্যাম।',
    },
    {
      headline: 'শীর্ষ সংবাদ: খালি সিলিন্ডার নিয়েই বহদ্দারহাট জয়ের স্বপ্নভঙ্গ!',
      subheadline: 'যাত্রীরা ভাড়া না দিয়েই হেঁটে চকবাজারে চলে গেছেন বলে জানা গেছে।',
    },
  ],
  red_light: [
    {
      headline: 'ব্রেকিং: একের পর এক লাল বাতি ভেঙে ট্রাফিক সার্জেন্টের জালে সিএনজি!',
      subheadline: 'সার্জেন্টের মন্তব্য—"বাতি লাল দেখলেই চালকের চোখে সবুজ ভাসছিল!"',
    },
    {
      headline: 'শীর্ষ সংবাদ: সিগন্যাল না মানার বিশ্বরেকর্ড গড়ে ডাম্পিংয়ে চট্টগ্রাম এক্সপ্রেস!',
      subheadline: 'জরিমানার টাকায় জিএসি মোড়ে নতুন ট্রাফিক লাইট বসানো হবে বলে ঘোষণা।',
    },
  ],
};

export const NEWS_TICKER_LINES: string[] = [
  'হকার পুনর্বাসনের নতুন পরিকল্পনা ঘোষণা, পুরোনো ফুটপাত আগের মতোই জমজমাট',
  'সিএনজি থামানোর নির্দিষ্ট জায়গা ঘোষণা, চালকরা জানালেন—"যেখানে যাত্রী সেখানেই স্ট্যান্ড"',
  'আন্দরকিল্লা মোড়ে হর্ন প্রতিযোগিতায় নতুন রেকর্ড — পথচারীদের কানে তুলা দেওয়ার পরামর্শ',
  'উন্নয়ন কাজের জন্য রাস্তা সরানোর কথা ছিল, আপাতত উল্টো পথেই চলছে জরুরি যাতায়াত',
  'রাস্তায় পথচারী অক্ষত, তবে ক্ষুব্ধ — সিএনজি দেখলেই দৌড়ে ধরার ঘোষণা',
  'গ্যাস পাম্পে সিএনজির লম্বা লাইন — হলুদ দাগের ওপর থামলেই তাৎক্ষণিক রিফিল',
  'লাল বাতি অমান্য করলেই তাৎক্ষণিক জরিমানা ও ওয়ান্টেড — জিএসি মোড়ে ট্রাফিক পুলিশের কড়া নজরদারি',
  'আবহাওয়া অফিসের সতর্কতা: হঠাৎ বৃষ্টি ও ঘন কুয়াশায় সিএনজির ব্রেক ধরতে বাড়তি দূরত্ব রাখুন',
];

export const DAILY_STREAK_REWARDS: number[] = [100, 150, 200, 300, 400, 550, 750];

export const MISSION_RANK_POINTS = 600;

export const DRIVER_RANKS: DriverRankTier[] = [
  {
    level: 1,
    id: 'learner',
    title: 'শিক্ষানবিশ',
    tagline: 'স্টিয়ারিং হাতে সবে পথচলা শুরু',
    minPoints: 0,
    badgeTextClass: 'text-stone-200',
    badgeBorderClass: 'border-stone-500/80',
    badgeBgClass: 'bg-stone-900/90',
    barClass: 'bg-emerald-400',
  },
  {
    level: 2,
    id: 'rookie',
    title: 'গলির ওস্তাদ',
    tagline: 'অলিগলির হর্ন আর বাঁক সব মুখস্থ',
    minPoints: 1200,
    badgeTextClass: 'text-sky-200',
    badgeBorderClass: 'border-sky-400/75',
    badgeBgClass: 'bg-sky-950/90',
    barClass: 'bg-sky-400',
  },
  {
    level: 3,
    id: 'professional',
    title: 'পেশাদার চালক',
    tagline: 'যাত্রী তোলা ও জ্যাম কাটাতে পটু',
    minPoints: 3500,
    badgeTextClass: 'text-emerald-200',
    badgeBorderClass: 'border-emerald-400/80',
    badgeBgClass: 'bg-emerald-950/90',
    barClass: 'bg-emerald-400',
  },
  {
    level: 4,
    id: 'master',
    title: 'মহাসড়ক সম্রাট',
    tagline: 'হাইওয়ে ট্রাক-বাস সামলানো বাঁ হাতের খেল',
    minPoints: 7500,
    badgeTextClass: 'text-amber-200',
    badgeBorderClass: 'border-amber-400/85',
    badgeBgClass: 'bg-amber-950/90',
    barClass: 'bg-amber-400',
  },
  {
    level: 5,
    id: 'legend',
    title: 'চাঁটগাঁইয়া কিংবদন্তি',
    tagline: 'সদরঘাট থেকে বহদ্দারহাটের অপ্রতিদ্বন্দ্বী রাজা',
    minPoints: 14000,
    badgeTextClass: 'text-amber-200',
    badgeBorderClass: 'border-fuchsia-400/85',
    badgeBgClass: 'bg-fuchsia-950/90',
    barClass: 'bg-fuchsia-400',
  },
];

export const RADIO_STATION_NAME = 'চাঁটগাঁ এফএম ৯৯.৮';

export const AREA_RADIO_NEWS: Record<string, string[]> = {
  sadarghat: [
    'সদরঘাট সংবাদ: কর্ণফুলীর ঘাটে সাম্পানের চেয়ে আজ সিএনজির ভিড় বেশি, চালকদের হর্নে জেগে উঠেছে বন্দর!',
    'সদরঘাট বুলেটিন: শুঁটকি পট্টি থেকে আসছে মনমাতানো ঘ্রাণ, যাত্রী তুলতে সাবধানে ব্রেক ধরুন।',
  ],
  andarkilla: [
    'আন্দরকিল্লা খবর: ছাপাখানার কাগজ আনলোডের কারণে গলিতে জ্যাম—হর্ন বাজালেও সুর বদলাবে না ভাই!',
    'আন্দরকিল্লা আপডেট: বইয়ের দোকানের সামনে সিএনজি পার্ক করলে মালিক সমিতি চা-নাশতা বিল চাইতে পারে।',
  ],
  newmarket: [
    'নিউমার্কেট সংবাদ: বিপণী বিতানের সামনে বিকেলের কেনাকাটার চাপ, রিকশা আর বাসের মাঝে সরু গ্যাপে সাবধান!',
    'নিউমার্কেট ট্রাফিক: মোড়ে হকাররা ফুটপাত ছাড়িয়ে সড়কের অর্ধেক দখল করেছেন, ডান-বাম দেখে চলুন।',
  ],
  chawkbazar: [
    'চকবাজার খবর: মেজবানি গন্ধে সিএনজির স্পিড কমে গেছে! কোচিং ছুটির ভিড়ে সামলে স্টিয়ারিং ঘোরান।',
    'চকবাজার আপডেট: পেঁয়াজু আর বিরিয়ানির দোকান পেরিয়ে সামনেই মোড়—লাল বাতি দেখলে থামতে ভুলবেন না।',
  ],
  probortok: [
    'প্রবর্তক মোড় বার্তা: চট্টগ্রামের সবচেয়ে গোলমেলে চত্বরে ঢুকেছেন, ভুল লেনে ঢুকলে সার্জেন্ট চোখ রাঙাবেন!',
    'প্রবর্তক খবর: গোলচত্বরের বাঁক ঘুরেই সামনে সিটি বাস—সবুজ সিএনজি চালকরা চোখ খোলা রাখুন।',
  ],
  muradpur: [
    'মুরাদপুর বুলেটিন: ফ্লাইওভারের নিচে পিলার আর বাসের লড়াই তুঙ্গে! হর্ন বাজিয়ে নিজের জায়গা জানান দিন।',
    'মুরাদপুর সংবাদ: সিঙ্গারার দোকানের সামনে হঠাৎ যাত্রী হাত তুলছেন, ব্রেক চেপে ভাড়া পকেটে তুলুন।',
  ],
  duinogate: [
    '২নং গেইট খবর: রেললাইনের পাশে সতর্ক সংকেত, পুলিশ বক্সের সামনে দিয়ে স্পিড একটু কমিয়ে পাস দিন।',
    '২নং গেইট আপডেট: বিপ্লব উদ্যানের সামনে সন্ধ্যার জ্যাম শুরু—বামের লেন ধরে এগোলে লাভ হবে।',
  ],
  gecmor: [
    'জিএসি মোড় সংবাদ: নিয়ন আলো আর ভিআইপি জ্যামে ঝলমল করছে রাস্তা, ট্রাফিক সিগন্যাল অমান্য করলেই মামলা!',
    'জিএসি বুলেটিন: এখানে রকেট স্পিডে সিএনজি চালালে পেছনের যাত্রী হার্টবিট গুনতে শুরু করবেন!',
  ],
  alankar: [
    'অলংকার মোড় খবর: কক্সবাজার ও ঢাকার দূরপাল্লার বাসগুলো হর্ন ফাটিয়ে ঢুকছে—সাইড না দিলে বিপদ!',
    'অলংকার আপডেট: কাউন্টারের সামনে যাত্রী ভরা, সাগরিকা রোড থেকে ট্রাকও আসছে সারি ধরে।',
  ],
  akkhan: [
    'একেখান হাইওয়ে: ১০ চাকার ট্রাকের সুনামি বইছে, সিএনজি নিয়ে মাঝের লেনে বেশি বাহাদুরি দেখাবেন না!',
    'একেখান সংবাদ: পাহাড়তলী ফলের আড়তের ভ্যানগাড়ি হঠাৎ সামনে চলে আসতে পারে—সতর্ক থাকুন।',
  ],
  bahaddarhat: [
    'বহদ্দারহাট টার্মিনাল: ফ্লাইওভারের শেষ প্রান্তে কাপ্তাই বাসের সারি—এবার ঘুরলেই আবার সদরঘাট লুপ!',
    'বহদ্দারহাট বুলেটিন: টার্মিনাল এলাকায় হর্ন আর যাত্রী হাঁকডাকে জমজমাট পরিবেশ, গ্যাস চেক করে নিন।',
  ],
};

export const RADIO_FAST_CLIPS: string[] = [
  'গতি কমেন্ট্রি: ভাই, এটা সিএনজি অটোরিকশা নাকি জেট বিমান? স্পিড দেখে ট্রাফিক পুলিশের চশমা পড়ে গেছে!',
  'স্পিড অ্যালার্ট: {area} এলাকায় ঝড়ের বেগে ছুটছে সবুজ রকেট—যাত্রী পেছনে সিট শক্ত করে ধরে বসে আছেন!',
  'গতির খবর: মিটার নয়, আজ মনে হচ্ছে রকেটের কাউন্টার ঘুরছে! সামনের বাসের পেছনে ব্রেক করতে মনে রাখবেন।',
  'হাই-স্পিড বুলেটিন: {area} সড়কে বুস্ট চেপে উড়ছেন চালক—পাশের রিকশাওয়ালা অবাক হয়ে তাকিয়ে আছেন!',
];

export const RADIO_SLOW_CLIPS: string[] = [
  'ট্রাফিক কমেডি: {area} মোড়ে যে গতিতে চালাচ্ছেন, তাতে হাঁটা পথচারীও আগে বহদ্দারহাট পৌঁছে যাবে!',
  'ধীরগতির বার্তা: এই সুযোগে গ্যারেজের চা-দোকান থেকে এক কাপ চা-সিঙ্গারা খেয়ে আসা যেত ভাই!',
  'জ্যাম আপডেট: {area} এলাকায় গাড়ির চাকা ঘুরছে তো? পেছন থেকে "মায়ের দোয়া" বাস হর্ন দিচ্ছে কিন্তু!',
];

export const RADIO_WRONGWAY_CLIPS: string[] = [
  'ব্রেকিং অ্যালার্ট: {area} সড়কের উল্টো দিক দিয়ে আসছেন এক সাহসী সবুজ সিএনজি—সামনের গাড়ি সব চমকে গেছে!',
  'উল্টো পথ ধারাভাষ্য: ভাই, বাম-ডান গুলিয়ে ফেলেছেন নাকি? উল্টো পথে জাতীয় ক্ষতি দেড় গুণ বাড়ছে কিন্তু!',
];

export const RADIO_WEATHER_CLIPS: Record<'rainy' | 'foggy', string[]> = {
  rainy: [
    'বৃষ্টি স্পেশাল: চট্টগ্রামে ঝুম বৃষ্টিতে {area} সড়ক পিচ্ছিল—হঠাৎ ব্রেক চাপলে সিএনজি নাচতে শুরু করবে!',
    'আবহাওয়া বার্তা: বৃষ্টির মধ্যে পর্দা টেনে চালাচ্ছেন চালক, রাস্তার পানি ছিটকে পথচারী রাগ করাবেন না যেন!',
  ],
  foggy: [
    'কুয়াশা বুলেটিন: {area} এলাকায় ঘন কুয়াশায় হেডলাইটই ভরসা—সামনের লাল বাতি দেরিতে দেখা যেতে পারে!',
    'শীতের খবর: কুয়াশার চাদরে ঢাকা চট্টগ্রামের রাস্তা, সাবধানে হর্ন বাজিয়ে পথ চলুন।',
  ],
};

export function pickRadioClip(params: {
  areaId: string;
  areaName: string;
  speedKmh: number;
  boosting: boolean;
  wrongWay: boolean;
  weather: WeatherCondition;
  lastText?: string;
  preferKind?: RadioClipKind;
}): { kind: RadioClipKind; text: string } {
  const { areaId, areaName, speedKmh, boosting, wrongWay, weather, lastText, preferKind } = params;

  const chooseFrom = (pool: string[]): string => {
    const candidates = pool.filter((line) => line.replace('{area}', areaName) !== lastText);
    const list = candidates.length > 0 ? candidates : pool;
    const raw = list[Math.floor(Math.random() * list.length)] ?? pool[0];
    return raw.replace('{area}', areaName);
  };

  if (wrongWay) {
    return { kind: 'ট্রাফিক', text: chooseFrom(RADIO_WRONGWAY_CLIPS) };
  }

  if ((speedKmh >= 72 || boosting) && preferKind !== 'সংবাদ') {
    if (preferKind === 'গতি' || Math.random() < 0.72) {
      return { kind: 'গতি', text: chooseFrom(RADIO_FAST_CLIPS) };
    }
  }

  if (speedKmh <= 18 && preferKind !== 'সংবাদ' && Math.random() < 0.6) {
    return { kind: 'ট্রাফিক', text: chooseFrom(RADIO_SLOW_CLIPS) };
  }

  if ((weather === 'rainy' || weather === 'foggy') && preferKind !== 'গতি' && Math.random() < 0.3) {
    return { kind: 'ট্রাফিক', text: chooseFrom(RADIO_WEATHER_CLIPS[weather]) };
  }

  const areaPool = AREA_RADIO_NEWS[areaId] ?? AREA_RADIO_NEWS.sadarghat;
  return { kind: 'সংবাদ', text: chooseFrom(areaPool) };
}


