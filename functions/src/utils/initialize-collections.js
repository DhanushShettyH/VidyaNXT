// functions/src/utils/initialize-collections.js
const admin = require("firebase-admin");
const db = admin.firestore();

async function initializeSahayakCollections() {
  // Initialize Regional Knowledge for Maharashtra
  const maharashtraRef = db.collection("regional_knowledge").doc("maharashtra");

  // Science regional knowledge
  await maharashtraRef
    .collection("science")
    .doc("soil")
    .set({
      culturalReferences: {
        festivals: ["Gudi Padwa", "Akshaya Tritiya"],
        crops: ["rice", "sugarcane", "cotton", "wheat"],
        traditions: ["organic farming", "crop rotation"],
        localTerms: {
          soil: "माती",
          fertile: "सुपीक",
          farming: "शेती",
          crops: "पिके",
        },
      },
      examples: [
        "Konkan region black soil",
        "Vidarbha cotton fields",
        "Western Maharashtra sugarcane farms",
      ],
      stories: [
        "Traditional farming wisdom",
        "Seasonal farming practices",
        "Local soil types and their uses",
      ],
    });

  // Mathematics regional knowledge
  await maharashtraRef
    .collection("mathematics")
    .doc("numbers")
    .set({
      culturalReferences: {
        festivals: ["Diwali counting", "Ganesh Chaturthi"],
        games: ["Lagori", "Kho-kho player counting"],
        traditions: ["Rangoli patterns", "Kolam designs"],
        localTerms: {
          numbers: "संख्या",
          counting: "मोजणी",
          addition: "बेरीज",
          subtraction: "वजाबाकी",
        },
      },
      examples: [
        "Market counting in local bazaars",
        "Festival decoration patterns",
        "Traditional games scoring",
      ],
    });

  // Initialize Curriculum Standards for Maharashtra
  const curriculumRef = db
    .collection("curriculum_standards")
    .doc("maharashtra");

  // Grade 1 Standards
  await curriculumRef
    .collection("1")
    .doc("science")
    .set({
      objectives: [
        "Basic observation skills",
        "Simple identification",
        "Sensory learning",
        "Basic classification",
      ],
      vocabularyLevel: "basic",
      complexity: "simple",
      keySkills: ["observing", "touching", "naming", "sorting"],
      assessmentTypes: ["show and tell", "drawing", "simple questions"],
    });

  await curriculumRef
    .collection("1")
    .doc("mathematics")
    .set({
      objectives: [
        "Number recognition 1-20",
        "Basic counting",
        "Simple addition",
        "Shape identification",
      ],
      vocabularyLevel: "basic",
      complexity: "simple",
      keySkills: ["counting", "recognizing", "matching", "sorting"],
      assessmentTypes: ["counting objects", "drawing", "verbal answers"],
    });

  // Grade 2 Standards
  await curriculumRef
    .collection("2")
    .doc("science")
    .set({
      objectives: [
        "Understanding basic concepts",
        "Simple experiments",
        "Cause and effect",
        "Basic scientific method",
      ],
      vocabularyLevel: "elementary",
      complexity: "moderate",
      keySkills: ["experimenting", "questioning", "comparing", "explaining"],
      assessmentTypes: [
        "simple experiments",
        "drawings with labels",
        "short answers",
      ],
    });

  await curriculumRef
    .collection("2")
    .doc("mathematics")
    .set({
      objectives: [
        "Number operations up to 100",
        "Basic addition and subtraction",
        "Time and money concepts",
        "Measurement basics",
      ],
      vocabularyLevel: "elementary",
      complexity: "moderate",
      keySkills: ["calculating", "measuring", "solving", "applying"],
      assessmentTypes: ["problem solving", "practical tasks", "written work"],
    });

  // Grade 3 Standards
  await curriculumRef
    .collection("3")
    .doc("science")
    .set({
      objectives: [
        "Scientific inquiry",
        "Detailed observations",
        "Making predictions",
        "Understanding processes",
      ],
      vocabularyLevel: "intermediate",
      complexity: "detailed",
      keySkills: ["investigating", "predicting", "analyzing", "concluding"],
      assessmentTypes: ["project work", "detailed explanations", "experiments"],
    });

  await curriculumRef
    .collection("3")
    .doc("mathematics")
    .set({
      objectives: [
        "Multi-digit operations",
        "Fractions introduction",
        "Geometry concepts",
        "Data handling",
      ],
      vocabularyLevel: "intermediate",
      complexity: "detailed",
      keySkills: ["problem solving", "reasoning", "applying", "creating"],
      assessmentTypes: ["complex problems", "projects", "presentations"],
    });

  // Initialize Simulated Students
  await db
    .collection("simulated_students")
    .doc("1")
    .set({
      students: [
        {
          id: "grade1_high_achiever",
          type: "high_achiever",
          characteristics: [
            "quick_learner",
            "good_vocabulary_for_age",
            "curious",
            "asks_questions",
            "completes_tasks_quickly",
          ],
          learningStyle: "visual_auditory",
          attentionSpan: "above_average",
          interests: ["stories", "colors", "animals"],
        },
        {
          id: "grade1_average",
          type: "average",
          characteristics: [
            "moderate_pace",
            "needs_examples",
            "follows_instructions",
            "learns_with_repetition",
          ],
          learningStyle: "visual_kinesthetic",
          attentionSpan: "average",
          interests: ["games", "drawing", "songs"],
        },
        {
          id: "grade1_struggling",
          type: "needs_support",
          characteristics: [
            "slower_pace",
            "visual_learner",
            "needs_encouragement",
            "requires_individual_attention",
          ],
          learningStyle: "visual_kinesthetic",
          attentionSpan: "below_average",
          interests: ["hands_on_activities", "pictures", "simple_games"],
        },
      ],
    });

  await db
    .collection("simulated_students")
    .doc("2")
    .set({
      students: [
        {
          id: "grade2_high_achiever",
          type: "high_achiever",
          characteristics: [
            "advanced_vocabulary",
            "connects_concepts",
            "independent_learner",
            "helps_others",
          ],
          learningStyle: "visual_auditory_kinesthetic",
          attentionSpan: "above_average",
          interests: ["experiments", "reading", "puzzles"],
        },
        {
          id: "grade2_average",
          type: "average",
          characteristics: [
            "steady_progress",
            "needs_clear_instructions",
            "works_well_in_groups",
            "responds_to_encouragement",
          ],
          learningStyle: "visual_auditory",
          attentionSpan: "average",
          interests: ["group_activities", "stories", "art"],
        },
        {
          id: "grade2_struggling",
          type: "needs_support",
          characteristics: [
            "needs_more_time",
            "benefits_from_peer_support",
            "requires_step_by_step_guidance",
            "responds_to_visual_aids",
          ],
          learningStyle: "visual_kinesthetic",
          attentionSpan: "below_average",
          interests: ["manipulatives", "movement", "simple_crafts"],
        },
      ],
    });

  await db
    .collection("simulated_students")
    .doc("3")
    .set({
      students: [
        {
          id: "grade3_high_achiever",
          type: "high_achiever",
          characteristics: [
            "analytical_thinking",
            "enjoys_challenges",
            "self_directed",
            "creative_problem_solver",
          ],
          learningStyle: "all_modalities",
          attentionSpan: "high",
          interests: ["science_experiments", "complex_stories", "research"],
        },
        {
          id: "grade3_average",
          type: "average",
          characteristics: [
            "developing_critical_thinking",
            "needs_structured_learning",
            "collaborates_well",
            "improving_independence",
          ],
          learningStyle: "visual_auditory",
          attentionSpan: "average",
          interests: ["group_projects", "discussions", "demonstrations"],
        },
        {
          id: "grade3_struggling",
          type: "needs_support",
          characteristics: [
            "needs_additional_practice",
            "benefits_from_scaffolding",
            "requires_frequent_feedback",
            "learns_through_repetition",
          ],
          learningStyle: "kinesthetic_visual",
          attentionSpan: "below_average",
          interests: [
            "hands_on_learning",
            "visual_supports",
            "one_on_one_help",
          ],
        },
      ],
    });

  // Sample virtual students for Grade 1
  await db
    .collection("simulated_students")
    .doc("grade_1")
    .set({
      personas: [
        {
          id: "g1_fast_learner",
          name: "Arjun",
          grade: 1,
          learningSpeed: "fast",
          attentionSpan: "high",
          homeLang: "Hindi",
          readingLevel: 1.5,
          misconceptions: ["All animals are pets"],
          strengths: ["verbal skills", "curiosity"],
          challenges: ["writing"],
        },
        {
          id: "g1_slow_learner",
          name: "Priya",
          grade: 1,
          learningSpeed: "slow",
          attentionSpan: "medium",
          homeLang: "Marathi",
          readingLevel: 0.8,
          misconceptions: ["Numbers always get bigger"],
          strengths: ["hands-on learning"],
          challenges: ["abstract concepts"],
        },
      ],
    });

  // Sample regional knowledge for Maharashtra
  await db
    .collection("regional_knowledge")
    .doc("marathi_maharashtra_science")
    .set({
      dialectWords: {
        soil: "माती",
        water: "पाणी",
        sun: "सूर्य",
        rain: "पाऊस",
        farmer: "शेतकरी",
      },
      culturalSnippets: [
        "Sant Tukaram stories",
        "Warli art traditions",
        "Kolhapur farming methods",
        "Sahyadri mountains",
      ],
      localExamples: [
        "Konkan coast geography",
        "Nashik grape farming",
        "Pune weather patterns",
        "Godavari river system",
      ],
      festivals: ["Gudi Padwa", "Ganesh Chaturthi", "Diwali"],
      landmarks: ["Sahyadri mountains", "Godavari river", "Konkan coast"],
    });

  console.log("Collections initialized successfully");
  console.log("Sahayak collections initialized successfully!");
}

// Sample content library entry
async function addSampleContent() {
  await db.collection("content_library").add({
    topic: "soil",
    subject: "science",
    grades: ["1", "2", "3"],
    language: "marathi",
    location: "maharashtra",
    content: {
      story: {
        title: "माती आणि आपले मित्र",
        culturalContext: "Maharashtra farming traditions",
        versions: {
          1: {
            story: "Simple story about soil for grade 1",
            vocabulary: "basic",
            length: "short",
          },
          2: {
            story: "Moderate story about soil for grade 2",
            vocabulary: "elementary",
            length: "medium",
          },
          3: {
            story: "Detailed story about soil for grade 3",
            vocabulary: "intermediate",
            length: "long",
          },
        },
      },
      visualAids: {
        diagrams: ["soil_layers.svg", "soil_types.svg"],
        worksheets: ["soil_identification.pdf", "soil_texture.pdf"],
        activities: ["soil_sorting_game", "soil_observation_sheet"],
      },
      activities: {
        1: [
          "Touch different soil types",
          "Sort soil samples",
          "Draw soil pictures",
        ],
        2: [
          "Soil texture experiment",
          "Plant growth observation",
          "Soil comparison chart",
        ],
        3: [
          "Soil permeability test",
          "Soil composition analysis",
          "Soil conservation project",
        ],
      },
    },
    reliabilityScore: 0.92,
    createdAt: new Date(),
    reusable: true,
    usageCount: 0,
  });
}

// Functions to call during Firebase Functions deployment
exports.initializeSahayakCollections = initializeSahayakCollections;
exports.addSampleContent = addSampleContent;
