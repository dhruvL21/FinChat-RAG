/**
 * Finchat Intelligent Merchant & Category Detection Engine
 * 
 * Provides deterministic, high-accuracy classification for Indian and global
 * financial transactions based on merchant names, transaction narrations, and keywords.
 */

import { AllowedCategories, type CategoryType } from '@/lib/validation';

export interface CategoryDetectionResult {
  category: CategoryType;
  cleanedMerchant: string;
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword?: string;
}

// 1. Common banking prefixes to strip out when isolating business names
const NOISY_BANK_PREFIXES = [
  /^UPI[-/](?:DR|CR)[-/]\d+[-/]/i,
  /^UPI[-/]\d+[-/]/i,
  /^UPI[-/]/i,
  /^POS\s+\d+\s+/i,
  /^POS\s+/i,
  /^E[-_]?COMM\s+/i,
  /^NEFT[-_](?:CR|DR)[-_][A-Z0-9]+[-_]/i,
  /^NEFT[-_]/i,
  /^RTGS[-_]/i,
  /^IMPS[-/]\d+[-/]/i,
  /^IMPS[-/]/i,
  /^ACH[-_]\s*(?:DR|CR)[-_]?\s*/i,
  /^ACH[-_]/i,
  /^BIL[-/]ONL[-/]\d+[-/]/i,
  /^BIL[-/]ONL[-/]/i,
  /^BIL[-/]/i,
  /^CMS[-/]/i,
  /^VPS[-/]/i,
  /^INB[-/]/i,
  /^ATM[-/]\s*(?:WDL|CASH)[-/]?/i,
  /^TXN[-/]/i,
  /^TRANSFER\s+TO\s+/i,
  /^TRANSFER\s+FROM\s+/i,
  /^PAID\s+TO\s+/i,
  /^PAYMENT\s+TO\s+/i,
];

// Common suffixes or UPI VPA handles to trim
const NOISY_SUFFIXES = [
  /[-/](?:HDFC|ICICI|SBI|AXIS|YESB|KOTAK|PAYTM|OKAXIS|OKICICI|OKSBI|OKHDFC|IBL|YBL|APL|PAYU|RAZORPAY|PHONEPE|BHARATPE)[a-z0-9._-]*$/i,
  /@(?:okaxis|okicici|oksbi|okhdfcbank|paytm|ybl|ibl|upi|axisbank|icici|hdfcbank|sbi|kotak|barodampay)$/i,
  /\s*(?:pvt\s+ltd|private\s+limited|limited|ltd|inc|corp|co\.|llc|llp)\.?$/i,
  /\s*(?:bangalore|bengaluru|mumbai|delhi|new delhi|hyderabad|pune|chennai|kolkata|noida|gurgaon|gurugram|ahmedabad|jaipur)\b.*$/i,
];

interface RuleMatcher {
  category: CategoryType;
  keywords: string[];
}

const CATEGORY_RULES: RuleMatcher[] = [
  // FOOD & DINING
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'blinkit', 'zepto', 'instamart', 'bigbasket', 'bbdaily', 'dmart',
      'mcdonalds', 'mcdonald', 'burger king', 'kfc', 'dominos', 'pizza hut', 'subway',
      'starbucks', 'cafe coffee day', 'ccd', 'costa coffee', 'third wave', 'blue tokai',
      'chaayos', 'chai point', 'haldiram', 'bikanervala', 'barbeque nation', 'freshmenu',
      'eatclub', 'behrouz', 'faasos', 'oven story', 'biryani by kilo', 'paradise biryani',
      'sagar ratna', 'saravana bhavan', 'baskin robbins', 'dunkin', 'wow momo', 'taco bell',
      'nature basket', 'spencers', 'grofers', 'dunzo', 'mad over donuts', 'chai', 'coffee',
      'bakery', 'restaurant', 'restro', 'dhaba', 'kitchen', 'caterer', 'cafe', 'bhojanalaya',
      'sweets', 'confection', 'supermarket', 'hypermarket', 'grocery', 'groceries', 'food',
      'dining', 'eats', 'tiffin', 'canteen', 'ice cream', 'shawarma', 'pizzeria', 'burger'
    ]
  },

  // TRAVEL & COMMUTE
  {
    category: 'Travel',
    keywords: [
      'uber', 'ola', 'rapido', 'blusmart', 'meru', 'irctc', 'railway', 'indian rail',
      'indigo', 'air india', 'vistara', 'spicejet', 'akasa', 'airasia', 'emirates', 'qatar air',
      'makemytrip', 'mmt', 'goibibo', 'easemytrip', 'yatra', 'cleartrip', 'ixigo', 'redbus',
      'abhibus', 'metro', 'dmrc', 'bmrcl', 'mmmocl', 'toll', 'fastag', 'nhai', 'iocl',
      'indian oil', 'bpcl', 'bharat petro', 'hpcl', 'hindustan petro', 'shell petrol',
      'shell india', 'cng station', 'petrol pump', 'fuel', 'petrol', 'diesel', 'cng',
      'zoomcar', 'drivezy', 'avis', 'cab', 'taxi', 'parking', 'flight', 'airline', 'airport',
      'auto stand', 'intercity', 'bus booking', 'lodging', 'hotel', 'resort', 'homestay', 'airbnb'
    ]
  },

  // SHOPPING & RETAIL
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'amzn', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq',
      'zara', 'h&m', 'hm india', 'uniqlo', 'shoppers stop', 'lifestyle', 'westside',
      'max fashion', 'reliance trends', 'pantaloons', 'marks & spencer', 'marks and spencer',
      'croma', 'vijay sales', 'reliance digital', 'apple store', 'apple india', 'samsung store',
      'decathlon', 'lenskart', 'boat', 'noise', 'fire-boltt', 'ikea', 'pepperfry', 'urban ladder',
      'firstcry', 'purplle', 'snitch', 'bewakoof', 'souled store', 'titan', 'fastrack', 'tanishq',
      'caratlane', 'bluestone', 'kalyan jewellers', 'malabar gold', 'bata', 'metro shoes',
      'woodland', 'puma', 'nike', 'adidas', 'skechers', 'levi', 'us polo', 'allen solly',
      'van heusen', 'peter england', 'louis philippe', 'raymond', 'fabindia', 'manyavar',
      'shopping', 'retail', 'clothing', 'apparel', 'boutique', 'footwear', 'electronics'
    ]
  },

  // UTILITIES & BILLS
  {
    category: 'Utilities',
    keywords: [
      'bescom', 'tata power', 'adani elec', 'bses', 'msedcl', 'torrent power', 'cesc',
      'uppcl', 'dhbvn', 'electricity', 'power bill', 'airtel', 'jio mobility', 'jio fiber',
      'vodafone', 'vi prepaid', 'vi postpaid', 'bsnl', 'mtnl', 'act fibernet', 'act broadband',
      'hathway', 'tata play', 'dish tv', 'sun direct', 'dth', 'indane', 'bharat gas', 'hp gas',
      'igl', 'mgl', 'adani gas', 'piped gas', 'water supply', 'jal board', 'municipal',
      'billdesk', 'bbps', 'recharge', 'broadband', 'wifi', 'utility', 'utilities', 'gas bill',
      'water bill', 'postpaid', 'prepaid'
    ]
  },

  // ENTERTAINMENT & SUBSCRIPTIONS
  {
    category: 'Entertainment',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'disney', 'amazon prime', 'prime video', 'youtube',
      'yt premium', 'apple.com/bill', 'itunes', 'google play', 'google one', 'sonyliv',
      'zee5', 'bookmyshow', 'pvr', 'inox', 'cinepolis', 'miraj cinema', 'steam', 'playstation',
      'ps store', 'xbox', 'nintendo', 'audible', 'kindle', 'gaana', 'wynk', 'jiosaavn',
      'gaming', 'movies', 'cinema', 'theatre', 'amusement', 'entertainment', 'subscription'
    ]
  },

  // RENT & HOUSING
  {
    category: 'Rent',
    keywords: [
      'nobroker', 'nestaway', 'housing.com', 'magicbricks', '99acres', 'landlord',
      'house rent', 'flat rent', 'room rent', 'office rent', 'pg rent', 'paying guest',
      'society maintenance', 'building maintenance', 'apartment maintenance', 'lease',
      'rental', 'tenancy', 'rent'
    ]
  },

  // EMI & LOANS
  {
    category: 'EMI',
    keywords: [
      'bajaj finance', 'bajaj finserv', 'hdfc loan', 'icici loan', 'sbi loan', 'axis loan',
      'kotak loan', 'tata capital', 'aditya birla finance', 'muthoot', 'manappuram',
      'kreditbee', 'moneytap', 'navi loan', 'cashe', 'payu finance', 'lazypay', 'zestmoney',
      'idfc first loan', 'home loan', 'personal loan', 'car loan', 'auto loan', 'gold loan',
      'education loan', 'emi', 'loan', 'equated monthly', 'amortization'
    ]
  },

  // HEALTHCARE & FITNESS
  {
    category: 'Healthcare',
    keywords: [
      'apollo', 'medplus', 'netmeds', '1mg', 'tata 1mg', 'pharmeasy', 'practo',
      'dr lal pathlabs', 'srl diagnostics', 'metropolis', 'thyrocare', 'fortis',
      'max healthcare', 'manipal hospital', 'narayana hrudayalaya', 'columbia asia',
      'aster cmi', 'cloudnine', 'cult.fit', 'cultfit', 'curefit', 'golds gym', 'anytime fitness',
      'healthifyme', 'pharmacy', 'chemist', 'drugstore', 'hospital', 'clinic', 'doctor',
      'dental', 'dentist', 'eye hospital', 'optical', 'diagnostic', 'pathology', 'medical',
      'healthcare', 'physio', 'ayurveda', 'homeopathy'
    ]
  },

  // EDUCATION & LEARNING
  {
    category: 'Education',
    keywords: [
      'coursera', 'udemy', 'edx', 'unacademy', 'byjus', 'simplilearn', 'scaler', 'upgrad',
      'duolingo', 'allen', 'aakash', 'fiitjee', 'resonance', 'school fees', 'college fees',
      'university fees', 'tuition fees', 'coaching fees', 'exam fee', 'upsc', 'gate',
      'cat fee', 'books', 'bookstore', 'stationery', 'education', 'learning', 'academy'
    ]
  },

  // INVESTMENT & WEALTH
  {
    category: 'Investment',
    keywords: [
      'zerodha', 'groww', 'upstox', 'angel one', '5paisa', 'dhan', 'icici direct',
      'hdfc sky', 'kotak securities', 'motilal oswal', 'sharekhan', 'geojit', 'mutual fund',
      'sip', 'cams', 'kfintech', 'uti mf', 'sbi mf', 'hdfc mf', 'icici pru', 'nippon india',
      'parag parikh', 'mirae asset', 'axis mf', 'smallcase', 'wint wealth', 'stable money',
      'dezerv', 'indmoney', 'kuvera', 'stocks', 'equity', 'nps', 'ppf', 'sgb', 'sovereign gold',
      'investment', 'bonds'
    ]
  },

  // SALARY & INCOME
  {
    category: 'Salary',
    keywords: [
      'salary', 'payroll', 'wages', 'stipend', 'dividend', 'interest credit', 'interest paid',
      'cashback', 'reward credit', 'bonus', 'direct deposit', 'reimbursement', 'refund'
    ]
  }
];

/**
 * Extracts a human-readable clean business/merchant name from raw banking text.
 */
export function cleanMerchantName(rawText: string): string {
  if (!rawText) return 'Unknown Merchant';
  let clean = rawText.trim();

  // Strip common noisy prefixes
  for (const prefix of NOISY_BANK_PREFIXES) {
    clean = clean.replace(prefix, '');
  }

  // Strip trailing UPI IDs, bank codes, cities
  for (const suffix of NOISY_SUFFIXES) {
    clean = clean.replace(suffix, '');
  }

  // Clean excess punctuation
  clean = clean.replace(/[0-9*#_\\/:|-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // If text became too short or empty, fallback to trimmed original
  if (clean.length < 2) {
    clean = rawText.split(/[-/|:]/)[0].trim() || rawText.trim();
  }

  // Capitalize title
  return clean
    .split(' ')
    .filter(Boolean)
    .slice(0, 4) // Keep max 4 words for clean display
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Main categorization function.
 * Matches description / business name against rules with high confidence.
 */
export function detectCategoryFromBusiness(
  rawText: string,
  isCredit: boolean = false
): CategoryDetectionResult {
  if (isCredit) {
    return {
      category: 'Salary',
      cleanedMerchant: cleanMerchantName(rawText),
      confidence: 'high',
      matchedKeyword: 'credit/deposit'
    };
  }

  const normalized = (rawText || '').toLowerCase();
  const cleaned = cleanMerchantName(rawText);

  // Check each category rule in priority order
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      // Word boundary or substring matching
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:\\b|_|/|-)${escaped}(?:\\b|_|/|-|\\s|$)`, 'i');
      
      if (regex.test(normalized) || normalized.includes(keyword)) {
        return {
          category: rule.category,
          cleanedMerchant: cleaned,
          confidence: 'high',
          matchedKeyword: keyword
        };
      }
    }
  }

  // Fallback: check basic generic words
  if (/dining|cafe|coffee|lunch|dinner|breakfast|snack|tea|meal/i.test(normalized)) {
    return { category: 'Food', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/ride|toll|fuel|petrol|diesel|fare|bus|train|flight|commute/i.test(normalized)) {
    return { category: 'Travel', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/bill|electricity|broadband|water|lpg|gas|telecom/i.test(normalized)) {
    return { category: 'Utilities', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/movie|cinema|show|ticket|stream|music/i.test(normalized)) {
    return { category: 'Entertainment', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/loan|interest|emi|repay/i.test(normalized)) {
    return { category: 'EMI', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/rent|deposit|flat|housing/i.test(normalized)) {
    return { category: 'Rent', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/doctor|hospital|clinic|pharma|medicine|lab/i.test(normalized)) {
    return { category: 'Healthcare', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/school|college|fees|course|study|book/i.test(normalized)) {
    return { category: 'Education', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/fund|shares|stocks|mf|sip|invest/i.test(normalized)) {
    return { category: 'Investment', cleanedMerchant: cleaned, confidence: 'medium' };
  }
  if (/store|mart|shop|retail|mall/i.test(normalized)) {
    return { category: 'Shopping', cleanedMerchant: cleaned, confidence: 'medium' };
  }

  return {
    category: 'Miscellaneous',
    cleanedMerchant: cleaned,
    confidence: 'low'
  };
}
