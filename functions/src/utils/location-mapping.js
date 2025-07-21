const LOCATION_LANGUAGE_MAP = {
  Karnataka: "kannada",
  Bangalore: "kannada",
  Maharashtra: "marathi",
  Mumbai: "marathi",
  Pune: "marathi",
  Delhi: "hindi",
  "New Delhi": "hindi",
  "Uttar Pradesh": "hindi",
  Rajasthan: "hindi",
  "Tamil Nadu": "tamil",
  Chennai: "tamil",
  Kerala: "malayalam",
  Kochi: "malayalam",
  "West Bengal": "bengali",
  Kolkata: "bengali",
  Gujarat: "gujarati",
  Ahmedabad: "gujarati",
  Punjab: "punjabi",
  Chandigarh: "punjabi",
  Haryana: "hindi",
  Gurgaon: "hindi",
  Odisha: "odia",
  Bhubaneswar: "odia",
  "Andhra Pradesh": "telugu",
  Hyderabad: "telugu",
  Telangana: "telugu",
  "Madhya Pradesh": "hindi",
  Bhopal: "hindi",
  Indore: "hindi",
  Bihar: "hindi",
  Patna: "hindi",
  "Himachal Pradesh": "hindi",
  Shimla: "hindi",
  Assam: "assamese",
  Guwahati: "assamese",
  Jharkhand: "hindi",
  Ranchi: "hindi",
  Chhattisgarh: "hindi",
  Raipur: "hindi",
  "Navi Mumbai": "marathi",
  Nashik: "marathi",
  Nagpur: "marathi",
  Coimbatore: "tamil",
  Madurai: "tamil",
  Thiruvananthapuram: "malayalam",
};

const REGIONAL_CONTEXT = {
  Karnataka: {
    crops: ["ragi", "jowar", "coffee", "coconut", "areca nut"],
    festivals: ["Ugadi", "Dasara", "Karaga"],
    landmarks: ["Mysore Palace", "Hampi", "Coorg"],
    localHeroes: ["Tipu Sultan", "Kempegowda", "Basavanna"],
  },
  Maharashtra: {
    crops: ["cotton", "sugarcane", "wheat", "rice", "bajra"],
    festivals: ["Ganpati", "Gudi Padwa", "Navratri"],
    landmarks: ["Gateway of India", "Ajanta Caves", "Shirdi"],
    localHeroes: ["Shivaji Maharaj", "Dr. Babasaheb Ambedkar", "Jyotiba Phule"],
  },
  Delhi: {
    crops: ["wheat", "rice", "bajra", "mustard"],
    festivals: ["Diwali", "Holi", "Dussehra", "Karva Chauth"],
    landmarks: ["Red Fort", "India Gate", "Qutub Minar"],
    localHeroes: [
      "Mahatma Gandhi",
      "Subhash Chandra Bose",
      "Lal Bahadur Shastri",
    ],
  },
  "Tamil Nadu": {
    crops: ["rice", "sugarcane", "cotton", "groundnut", "millets"],
    festivals: ["Pongal", "Diwali", "Navaratri", "Karthikai Deepam"],
    landmarks: ["Meenakshi Temple", "Brihadeeswarar Temple", "Kanyakumari"],
    localHeroes: ["Thiruvalluvar", "APJ Abdul Kalam", "Bharathiar"],
    languages: ["tamil", "english"],
    materials: ["palm leaves", "clay", "banana leaves"],
    occupations: ["farming", "weaving", "fishing", "temple crafts"],
  },

  Kerala: {
    crops: ["coconut", "rubber", "spices", "tea", "coffee"],
    festivals: ["Onam", "Vishu", "Thrissur Pooram"],
    landmarks: ["Backwaters", "Munnar", "Kochi Fort"],
    localHeroes: ["Sree Narayana Guru", "Kumaran Asan"],
    languages: ["malayalam", "english"],
    materials: ["coconut shells", "coir", "bamboo"],
    occupations: ["fishing", "spice cultivation", "boat making"],
  },
  // Add more regions as needed
};

function getLanguageFromLocation(location) {
  if (!location) return "english";

  const normalizedLocation = location.toLowerCase().trim();

  // Exact match (case insensitive)
  for (const [key, value] of Object.entries(LOCATION_LANGUAGE_MAP)) {
    if (key.toLowerCase() === normalizedLocation) {
      return value;
    }
  }

  // Partial match with priority (states before cities)
  const stateMatches = [];
  const cityMatches = [];

  for (const [key, value] of Object.entries(LOCATION_LANGUAGE_MAP)) {
    const keyLower = key.toLowerCase();
    if (
      normalizedLocation.includes(keyLower) ||
      keyLower.includes(normalizedLocation)
    ) {
      if (key.length > 10) {
        // Assume longer names are states
        stateMatches.push([key, value]);
      } else {
        cityMatches.push([key, value]);
      }
    }
  }

  // Prioritize state matches
  if (stateMatches.length > 0) {
    return stateMatches[0][1];
  }
  if (cityMatches.length > 0) {
    return cityMatches[0][1];
  }

  return "english";
}

function getRegionalContext(location) {
  // Try exact match first
  if (REGIONAL_CONTEXT[location]) {
    return REGIONAL_CONTEXT[location];
  }

  // Try partial match
  for (const [key, value] of Object.entries(REGIONAL_CONTEXT)) {
    if (location.includes(key) || key.includes(location)) {
      return value;
    }
  }

  return REGIONAL_CONTEXT["Karnataka"]; // Default fallback
}

// ! don't know the use of below
const EDUCATIONAL_CONTEXT = {
  Karnataka: {
    schoolTypes: ["government", "aided", "private", "kendriya vidyalaya"],
    commonChallenges: ["language transition", "rural infrastructure"],
    teachingMethods: ["activity-based learning", "local craft integration"],
    communityResources: ["self-help groups", "village panchayats"],
  },
};
const MULTILINGUAL_REGIONS = {
  Hyderabad: ["telugu", "hindi", "english"],
  Mumbai: ["marathi", "hindi", "english"],
  Bangalore: ["kannada", "english", "hindi"],
};
const SEASONAL_CONTEXT = {
  Karnataka: {
    monsoon: "June-September",
    harvestSeasons: ["Kharif: Oct-Nov", "Rabi: Mar-Apr"],
    schoolCalendar: "June-March",
  },
};




module.exports = {
  getLanguageFromLocation,
  getRegionalContext,
  LOCATION_LANGUAGE_MAP,
  REGIONAL_CONTEXT,
};
