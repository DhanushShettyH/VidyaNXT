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
  // Add more regions as needed
};

function getLanguageFromLocation(location) {
  // Try exact match first
  if (LOCATION_LANGUAGE_MAP[location]) {
    return LOCATION_LANGUAGE_MAP[location];
  }

  // Try partial match
  for (const [key, value] of Object.entries(LOCATION_LANGUAGE_MAP)) {
    if (location.includes(key) || key.includes(location)) {
      return value;
    }
  }

  return "english"; // Default fallback
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

module.exports = {
  getLanguageFromLocation,
  getRegionalContext,
  LOCATION_LANGUAGE_MAP,
  REGIONAL_CONTEXT,
};
