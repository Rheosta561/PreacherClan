const mongoose = require("mongoose");
const WorkoutSplit = require("./Models/WorkoutSplit");
const conn = require("./Connection/Connection");

const MOCK_SPLITS = [
  {
    split_id: "odin_strength_5day",
    split_name: "Odin’s Power Forge",
    creator: "Ragnar Lothbrok",
    description:
      "A 5-day strength-focused warrior split forged in the halls of Valhalla. Built for raw power and progressive overload.",
    trending: true,
    trusted: true,
    cover_image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba",
    exercises: [
      {
        day: "Mo",
        name: "Barbell Bench Press",
        sets: 5,
        reps: 5,
        difficulty: "Intermediate",
        target_muscles: ["Chest", "Triceps", "Front Delts"],
        equipment: "Barbell",
        youtube: "https://youtu.be/gRVjAtPip0Y",
        description: "A foundational Viking pressing movement to build relentless chest strength.",
      },
      {
        day: "Mo",
        name: "Incline Dumbbell Press",
        sets: 4,
        reps: 8,
        difficulty: "Intermediate",
        equipment: "Dumbbells",
        target_muscles: ["Upper Chest", "Shoulders"],
        youtube: "https://youtu.be/8iPEnn-ltC8",
      },
      {
        day: "Tu",
        name: "Back Squat",
        sets: 5,
        reps: 5,
        difficulty: "Intermediate",
        target_muscles: ["Quads", "Glutes", "Core"],
        equipment: "Barbell",
        youtube: "https://youtu.be/YaXPRqUwItQ",
      },
      {
        day: "Tu",
        name: "Romanian Deadlift",
        sets: 4,
        reps: 8,
        difficulty: "Intermediate",
        equipment: "Barbell",
        target_muscles: ["Hamstrings", "Glutes", "Lower Back"],
        youtube: "https://youtu.be/7j-2_s8fOPs",
      },
      {
        day: "We",
        name: "Overhead Press",
        sets: 5,
        reps: 5,
        difficulty: "Intermediate",
        equipment: "Barbell",
        target_muscles: ["Shoulders", "Triceps"],
        youtube: "https://youtu.be/2yjwXTZQDDI",
      },
      {
        day: "Fr",
        name: "Conventional Deadlift",
        sets: 5,
        reps: 3,
        difficulty: "Advanced",
        equipment: "Barbell",
        target_muscles: ["Posterior Chain", "Core", "Upper Back"],
        youtube: "https://youtu.be/-4qRntuXBSc",
      },
    ],
  },
  {
    split_id: "valkyrie_sculpt_hyper",
    split_name: "Valkyrie Sculpt Split",
    creator: "Lagertha",
    trusted: true,
    description:
      "A hypertrophy-focused split for fearless lifters seeking sculpted strength and warrior endurance.",
    cover_image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1",
    exercises: [
      {
        day: "Mo",
        name: "Incline Dumbbell Press",
        sets: 4,
        reps: 12,
        difficulty: "Beginner",
        equipment: "Dumbbells",
        target_muscles: ["Chest", "Shoulders"],
        youtube: "https://youtu.be/8iPEnn-ltC8",
      },
      {
        day: "Tu",
        name: "Goblet Squat",
        sets: 4,
        reps: 15,
        equipment: "Dumbbell",
        difficulty: "Beginner",
        target_muscles: ["Quads", "Glutes"],
        youtube: "https://youtu.be/6xwGFn-J_QM",
      },
      {
        day: "Th",
        name: "Lat Pulldown",
        sets: 4,
        reps: 12,
        equipment: "Cable",
        difficulty: "Beginner",
        target_muscles: ["Lats", "Biceps"],
        youtube: "https://youtu.be/CAwf7n6Luuc",
      },
    ],
  },
  {
    split_id: "berserker_push_pull_legs",
    split_name: "Berserker Push • Pull • Legs",
    creator: "Ubbe",
    trending: true,
    description:
      "A classic Viking Push-Pull-Legs split designed for steady growth and battle-ready conditioning.",
    cover_image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e",
    exercises: [
      {
        day: "Mo",
        name: "Dumbbell Shoulder Press",
        sets: 4,
        reps: 10,
        target_muscles: ["Shoulders", "Triceps"],
        equipment: "Dumbbells",
        youtube: "https://youtu.be/B-aVuyhvLHU",
        difficulty: "Intermediate",
      },
      {
        day: "Tu",
        name: "Seated Cable Row",
        sets: 4,
        reps: 12,
        target_muscles: ["Back", "Biceps"],
        equipment: "Cable Machine",
        youtube: "https://youtu.be/GZbfZ033f74",
      },
      {
        day: "We",
        name: "Leg Press",
        sets: 4,
        reps: 12,
        target_muscles: ["Quads", "Glutes"],
        equipment: "Machine",
        youtube: "https://youtu.be/IZxyjW7MPJQ",
      },
    ],
  },
];

async function runSeed() {
  await conn();
  for (const split of MOCK_SPLITS) {
    const existing = await WorkoutSplit.findOne({ split_id: split.split_id });
    if (!existing) {
      // Need a creatorId for schema validation if required, but it's not marked required
      // Oh wait, creator is required, creatorId is ref but maybe not required.
      const newSplit = new WorkoutSplit({
        ...split,
        creatorId: "67e9c035c1bd2f22459eb5ee", // mock or admin ID
      });
      await newSplit.save();
      console.log(`Seeded: ${split.split_id}`);
    } else {
      console.log(`Already exists: ${split.split_id}`);
    }
  }
  process.exit();
}
runSeed();
