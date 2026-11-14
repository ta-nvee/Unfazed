
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Therapist = require("./src/models/Therapist");
const Availability = require("./src/models/Availability");
const generateUniqueSlug = require("./src/utils/generateSlug");

const demoTherapists = [
  {
    name: "Dr. Ananya Sharma",
    email: "ananya.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600",
    qualifications: "M.A. Clinical Psychology",
    experience: 8,
    specializations: ["Anxiety", "Stress Management", "Depression"],
    languages: ["English", "Hindi"],
    bio: "A compassionate therapist helping individuals navigate anxiety, stress and emotional challenges.",
    services: [
      { title: "Individual Therapy", description: "One-to-one counselling", duration: 60, price: 1200 }
    ],
  },
  {
    name: "Dr. Riya Mehta",
    email: "riya.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600",
    qualifications: "M.Sc. Psychology",
    experience: 6,
    specializations: ["Relationship Issues", "Self-esteem", "Emotional Wellness"],
    languages: ["English", "Hindi", "Gujarati"],
    bio: "Supporting people in building healthier relationships and stronger self-confidence.",
    services: [
      { title: "Relationship Counselling", description: "Personal relationship support", duration: 60, price: 1500 }
    ],
  },
  {
    name: "Dr. Aarav Patel",
    email: "aarav.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600",
    qualifications: "M.Phil. Clinical Psychology",
    experience: 10,
    specializations: ["Depression", "Anxiety", "Emotional Regulation"],
    languages: ["English", "Hindi", "Gujarati"],
    bio: "Providing a supportive and non-judgmental space for emotional wellbeing.",
    services: [
      { title: "Individual Counselling", description: "Personal mental wellness sessions", duration: 60, price: 1600 }
    ],
  },
  {
    name: "Dr. Neha Kapoor",
    email: "neha.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600",
    qualifications: "M.A. Counselling Psychology",
    experience: 5,
    specializations: ["Student Counselling", "Academic Stress", "Anxiety"],
    languages: ["English", "Hindi"],
    bio: "Helping students manage academic pressure, transitions and personal challenges.",
    services: [
      { title: "Student Counselling", description: "Support for students", duration: 50, price: 900 }
    ],
  },
  {
    name: "Dr. Kabir Desai",
    email: "kabir.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600",
    qualifications: "M.Sc. Clinical Psychology",
    experience: 7,
    specializations: ["Anger Management", "Stress", "Mindfulness"],
    languages: ["English", "Hindi", "Gujarati"],
    bio: "Focused on practical emotional regulation and healthy coping strategies.",
    services: [
      { title: "Stress Management", description: "Personalized stress support", duration: 60, price: 1300 }
    ],
  },
  {
    name: "Dr. Meera Nair",
    email: "meera.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=600",
    qualifications: "M.A. Psychology",
    experience: 9,
    specializations: ["Women's Mental Health", "Self-esteem", "Life Transitions"],
    languages: ["English", "Hindi", "Malayalam"],
    bio: "Creating a warm and understanding environment for people navigating life changes.",
    services: [
      { title: "Wellness Counselling", description: "Emotional wellbeing support", duration: 60, price: 1400 }
    ],
  },
  {
    name: "Dr. Ishita Rao",
    email: "ishita.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
    qualifications: "M.Sc. Counselling Psychology",
    experience: 4,
    specializations: ["Grief", "Anxiety", "Emotional Support"],
    languages: ["English", "Hindi"],
    bio: "Offering empathetic support through difficult experiences and emotional transitions.",
    services: [
      { title: "Support Session", description: "A safe space to talk", duration: 50, price: 1000 }
    ],
  },
  {
    name: "Dr. Vivaan Shah",
    email: "vivaan.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600",
    qualifications: "M.Phil. Clinical Psychology",
    experience: 11,
    specializations: ["Family Counselling", "Relationship Issues", "Communication"],
    languages: ["English", "Hindi", "Gujarati"],
    bio: "Helping individuals and families improve communication and relationships.",
    services: [
      { title: "Family Counselling", description: "Family and relationship support", duration: 60, price: 1800 }
    ],
  },
  {
    name: "Dr. Sana Khan",
    email: "sana.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600",
    qualifications: "M.A. Applied Psychology",
    experience: 6,
    specializations: ["Trauma Support", "Anxiety", "Self-care"],
    languages: ["English", "Hindi", "Urdu"],
    bio: "Providing sensitive, supportive care focused on emotional safety and recovery.",
    services: [
      { title: "Individual Therapy", description: "Personalized support sessions", duration: 60, price: 1500 }
    ],
  },
  {
    name: "Dr. Arjun Verma",
    email: "arjun.demo@unfazed.com",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
    qualifications: "M.Sc. Psychology",
    experience: 5,
    specializations: ["Career Stress", "Work-life Balance", "Confidence"],
    languages: ["English", "Hindi"],
    bio: "Helping working professionals navigate career stress and find a healthier balance.",
    services: [
      { title: "Career Wellness Session", description: "Career and work-life support", duration: 60, price: 1100 }
    ],
  },
];

// Monday to Saturday: 9 AM to 5 PM
const workingDays = [1, 2, 3, 4, 5, 6];

const addDemoAvailability = async (therapistId, therapistName) => {
  for (const dayOfWeek of workingDays) {
    await Availability.findOneAndUpdate(
      {
        therapist: therapistId,
        dayOfWeek,
        date: null,
      },
      {
        $set: {
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
          availabilityType: "weekly",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log(`Availability added: ${therapistName}`);
};

const seedTherapists = async () => {
  try {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
      throw new Error(
        "MONGODB_URI and JWT_SECRET must be configured in .env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");

    const passwordHash = await bcrypt.hash(
      "DemoTherapist@123",
      10
    );

    let added = 0;
    let updated = 0;

    for (const data of demoTherapists) {
      let therapist = await Therapist.findOne({
        email: data.email,
      });

      if (therapist) {
        await Therapist.updateOne(
          { _id: therapist._id },
          {
            $set: {
              profileImage: data.profileImage,
              isPublic: true,
              isAcceptingClients: true,
            },
          }
        );

        updated++;
        console.log(`Updated: ${data.name}`);
      } else {
        const slug = await generateUniqueSlug(data.name);

        therapist = await Therapist.create({
          ...data,
          slug,
          password_hash: passwordHash,
          isPublic: true,
          isAcceptingClients: true,
        });

        added++;
        console.log(`Added: ${data.name}`);
      }

      await addDemoAvailability(therapist._id, data.name);
    }

    console.log("\nSeeding completed successfully.");
    console.log(`New profiles added: ${added}`);
    console.log(`Existing profiles updated: ${updated}`);
    console.log(`Availability configured for: ${demoTherapists.length} therapists`);
    console.log("Working days: Monday to Saturday");
    console.log("Working hours: 09:00 AM to 05:00 PM");

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedTherapists();
