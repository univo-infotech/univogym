import {
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * 6-MONTH REALISTIC GYM SEED DATA
 * Covering Members, Payments/Subscriptions, Expenses, Supplements & Sales, Equipment, Visits, Trainers, Staff.
 * Date range spans from 6 months ago (March 2026) up to current date (September 2026).
 */

export async function clearAllGymData(gymId = "univo_main") {
  const collectionsToClear = [
    "members",
    "payments",
    "inviteTokens",
    `gyms/${gymId}/expenses`,
    `gyms/${gymId}/supplements`,
    `gyms/${gymId}/supplement_sales`,
    `gyms/${gymId}/equipment`,
    `gyms/${gymId}/visits`,
    `gyms/${gymId}/trainers`,
    `gyms/${gymId}/staff`,
    `gyms/${gymId}/beforeAfter`,
  ];

  // 1. Clear local storage caches
  try {
    const keysToRemove = [
      "univo_recent_members",
      "univo_invite_tokens",
      "univo_recent_self_registered_members"
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Local storage clear notice:", e);
  }

  // 2. Clear Firestore collections
  let totalDeleted = 0;
  for (const colPath of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colPath));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => {
          batch.delete(d.ref);
          totalDeleted++;
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn(`Could not clear collection ${colPath}:`, err.message);
    }
  }

  return { success: true, deletedCount: totalDeleted };
}

export async function load6MonthDummyData(gymId = "univo_main") {
  // Clear first so data is pristine
  await clearAllGymData(gymId);

  // --- 1. TRAINERS ---
  const trainersData = [
    {
      id: "tr_1",
      name: "Coach Amit Sharma",
      specialization: "Hypertrophy & Weight Training",
      phone: "+91 9823456711",
      email: "amit.trainer@univogym.com",
      experience: "7 Years",
      rating: 4.9,
      memberCount: 18,
      salary: 35000,
      photoUrl: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&auto=format&fit=crop&q=80",
      bio: "Certified ACE personal trainer specializing in body composition transformation and posture correction.",
      createdAt: "2026-03-01T08:00:00Z",
      transformations: [
        {
          id: "ba_01",
          beforeImg: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
          afterImg: "https://images.unsplash.com/photo-1583454155184-870a1f63aebc?w=600&auto=format&fit=crop&q=80",
          description: "Vikas Malhotra: 92 kg -> 78 kg (-14 kg Fat Loss in 12 Weeks). Disciplined calorie deficit + 5-day hypertrophy split.",
          memberName: "Vikas Malhotra",
          startWeight: "92 kg",
          endWeight: "78 kg",
          duration: "12 Weeks (90 Days)"
        },
        {
          id: "ba_06",
          beforeImg: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80",
          afterImg: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
          description: "Ajay Prajapati: 84 kg -> 73 kg (-11 kg Lean Athlete Conditioning in 12 Weeks).",
          memberName: "Ajay Prajapati",
          startWeight: "84 kg",
          endWeight: "73 kg",
          duration: "12 Weeks"
        }
      ]
    },
    {
      id: "tr_2",
      name: "Coach Sneha Kapoor",
      specialization: "Fat Loss & HIIT Conditioning",
      phone: "+91 9811223399",
      email: "sneha.kapoor@univogym.com",
      experience: "5 Years",
      rating: 4.8,
      memberCount: 14,
      salary: 32000,
      photoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&auto=format&fit=crop&q=80",
      bio: "Ex-Athlete & CrossFit coach focusing on functional movement, calorie burn, and core strengthening.",
      createdAt: "2026-03-10T09:00:00Z",
      transformations: [
        {
          id: "ba_02",
          beforeImg: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
          afterImg: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80",
          description: "Pooja Verma: 76 kg -> 61 kg (-15 kg Fat Loss & PCOD Posture Recovery in 16 Weeks).",
          memberName: "Pooja Verma",
          startWeight: "76 kg",
          endWeight: "61 kg",
          duration: "16 Weeks"
        },
        {
          id: "ba_05",
          beforeImg: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&auto=format&fit=crop&q=80",
          afterImg: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80",
          description: "Kavita Rao: 71 kg -> 59 kg (-12 kg Postpartum Fitness & Core Strength in 18 Weeks).",
          memberName: "Kavita Rao",
          startWeight: "71 kg",
          endWeight: "59 kg",
          duration: "18 Weeks"
        }
      ]
    },
    {
      id: "tr_3",
      name: "Coach Rohan Deshmukh",
      specialization: "Powerlifting & Strength",
      phone: "+91 9766554433",
      email: "rohan.d@univogym.com",
      experience: "6 Years",
      rating: 4.9,
      memberCount: 12,
      salary: 34000,
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
      bio: "National Powerlifting medalist with focus on barbell compound movements (Squat, Bench, Deadlift).",
      createdAt: "2026-04-01T10:00:00Z",
      transformations: [
        {
          id: "ba_03",
          beforeImg: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
          afterImg: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
          description: "Rohit Bansal: 68 kg -> 79 kg (+11 kg Lean Muscle Mass & Strength in 24 Weeks).",
          memberName: "Rohit Bansal",
          startWeight: "68 kg",
          endWeight: "79 kg",
          duration: "24 Weeks"
        },
        {
          id: "ba_04",
          beforeImg: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80",
          afterImg: "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&auto=format&fit=crop&q=80",
          description: "Deepak Meena: 88 kg -> 74 kg (-14 kg Six-pack Shredding in 16 Weeks).",
          memberName: "Deepak Meena",
          startWeight: "88 kg",
          endWeight: "74 kg",
          duration: "16 Weeks"
        }
      ]
    }
  ];

  for (const t of trainersData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/trainers`, t.id), {
        ...t,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (e) {
      console.warn("Trainer write note:", e);
    }
  }

  // --- 2. MEMBERS (SPREAD OVER 6 MONTHS: March to September 2026) ---
  const membersData = [
    // Month 1 (March 2026)
    {
      id: "mem_01",
      name: "Vikas Malhotra",
      fullName: "Vikas Malhotra",
      phone: "+91 9811122334",
      email: "vikas.m@gmail.com",
      gender: "Male",
      planId: "p5",
      planName: "12 Months Annual Elite",
      planPrice: 4999,
      joinDate: "2026-03-05",
      expiryDate: "2027-03-05",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      status: "active",
      createdAt: "2026-03-05T10:00:00Z",
      preferredTime: "morning",
      address: "Sector 14, Urban Estate",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_02",
      name: "Pooja Verma",
      fullName: "Pooja Verma",
      phone: "+91 9822233445",
      email: "pooja.v@gmail.com",
      gender: "Female",
      planId: "p3",
      planName: "3 Months Pro Transformation",
      planPrice: 1499,
      joinDate: "2026-03-12",
      expiryDate: "2026-06-12",
      trainerId: "tr_2",
      trainerName: "Coach Sneha Kapoor",
      status: "expired",
      createdAt: "2026-03-12T11:30:00Z",
      preferredTime: "evening",
      address: "Civil Lines, Near City Mall",
      photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80"
    },
    // Month 2 (April 2026)
    {
      id: "mem_03",
      name: "Rohit Bansal",
      fullName: "Rohit Bansal",
      phone: "+91 9833344556",
      email: "rohit.b@gmail.com",
      gender: "Male",
      planId: "p4",
      planName: "6 Months Fitness Pass",
      planPrice: 2799,
      joinDate: "2026-04-02",
      expiryDate: "2026-10-02",
      trainerId: "tr_3",
      trainerName: "Coach Rohan Deshmukh",
      status: "active",
      createdAt: "2026-04-02T09:15:00Z",
      preferredTime: "morning",
      address: "Model Town, Street 4",
      photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_04",
      name: "Sunita Choudhary",
      fullName: "Sunita Choudhary",
      phone: "+91 9844455667",
      email: "sunita.c@gmail.com",
      gender: "Female",
      planId: "p1",
      planName: "1 Month Standard",
      planPrice: 599,
      joinDate: "2026-04-18",
      expiryDate: "2026-05-18",
      trainerId: null,
      trainerName: "Unassigned (General Floor)",
      status: "expired",
      createdAt: "2026-04-18T16:20:00Z",
      preferredTime: "afternoon",
      address: "Green Park Colony",
      photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80"
    },
    // Month 3 (May 2026)
    {
      id: "mem_05",
      name: "Gaurav Joshi",
      fullName: "Gaurav Joshi",
      phone: "+91 9855566778",
      email: "gaurav.j@gmail.com",
      gender: "Male",
      planId: "p3",
      planName: "3 Months Pro Transformation",
      planPrice: 1499,
      joinDate: "2026-05-10",
      expiryDate: "2026-08-10",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      status: "expired",
      createdAt: "2026-05-10T14:00:00Z",
      preferredTime: "evening",
      address: "Ram Nagar, Block B",
      photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_06",
      name: "Kavita Rao",
      fullName: "Kavita Rao",
      phone: "+91 9822334455",
      email: "kavita.rao@gmail.com",
      gender: "Female",
      planId: "p5",
      planName: "12 Months Annual Elite",
      planPrice: 4999,
      joinDate: "2026-05-24",
      expiryDate: "2027-05-24",
      trainerId: "tr_2",
      trainerName: "Coach Sneha Kapoor",
      status: "active",
      createdAt: "2026-05-24T18:45:00Z",
      preferredTime: "night",
      address: "Shastri Nagar Main Rd",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
    },
    // Month 4 (June 2026)
    {
      id: "mem_07",
      name: "Deepak Meena",
      fullName: "Deepak Meena",
      phone: "+91 9866677889",
      email: "deepak.m@gmail.com",
      gender: "Male",
      planId: "p4",
      planName: "6 Months Fitness Pass",
      planPrice: 2799,
      joinDate: "2026-06-10",
      expiryDate: "2026-12-10",
      trainerId: "tr_3",
      trainerName: "Coach Rohan Deshmukh",
      status: "active",
      createdAt: "2026-06-10T08:00:00Z",
      preferredTime: "morning",
      address: "Railway Colony, Qtr 12",
      photoURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_08",
      name: "Anjali Saxena",
      fullName: "Anjali Saxena",
      phone: "+91 9877788990",
      email: "anjali.s@gmail.com",
      gender: "Female",
      planId: "p2",
      planName: "1 Month with Locker",
      planPrice: 699,
      joinDate: "2026-06-25",
      expiryDate: "2026-07-25",
      trainerId: null,
      trainerName: "Unassigned (General Floor)",
      status: "expired",
      createdAt: "2026-06-25T11:00:00Z",
      preferredTime: "evening",
      address: "Adarsh Nagar, Lane 2",
      photoURL: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80"
    },
    // Month 5 (July 2026)
    {
      id: "mem_09",
      name: "Sunil Patel",
      fullName: "Sunil Patel",
      phone: "+91 9888899001",
      email: "sunil.patel@gmail.com",
      gender: "Male",
      planId: "p1",
      planName: "1 Month Standard",
      planPrice: 599,
      joinDate: "2026-07-15",
      expiryDate: "2026-08-15",
      trainerId: null,
      trainerName: "Unassigned (General Floor)",
      status: "expired",
      createdAt: "2026-07-15T18:00:00Z",
      preferredTime: "night",
      address: "Industrial Area Phase 1",
      photoURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_10",
      name: "Karan Johar",
      fullName: "Karan Johar",
      phone: "+91 9711003322",
      email: "karan.j@gmail.com",
      gender: "Male",
      planId: "p3",
      planName: "3 Months Pro Transformation",
      planPrice: 1499,
      joinDate: "2026-07-28",
      expiryDate: "2026-09-28",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      status: "expiring",
      createdAt: "2026-07-28T07:30:00Z",
      preferredTime: "morning",
      address: "Officers Colony, Plot 9",
      photoURL: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80"
    },
    // Month 6 (August & September 2026 - Current)
    {
      id: "mem_11",
      name: "Ankit Verma",
      fullName: "Ankit Verma",
      phone: "+91 9899900112",
      email: "ankit.v@gmail.com",
      gender: "Male",
      planId: "p3",
      planName: "3 Months Pro Transformation",
      planPrice: 1499,
      joinDate: "2026-08-20",
      expiryDate: "2026-11-20",
      trainerId: "tr_3",
      trainerName: "Coach Rohan Deshmukh",
      status: "active",
      createdAt: "2026-08-20T17:00:00Z",
      preferredTime: "evening",
      address: "Sardar Patel Marg",
      photoURL: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_12",
      name: "Aman Gupta",
      fullName: "Aman Gupta",
      phone: "+91 9988776655",
      email: "aman.g@gmail.com",
      gender: "Male",
      planId: "p1",
      planName: "1 Month Standard",
      planPrice: 599,
      joinDate: "2026-08-22",
      expiryDate: "2026-09-22",
      trainerId: null,
      trainerName: "Unassigned (General Floor)",
      status: "expiring",
      createdAt: "2026-08-22T08:00:00Z",
      preferredTime: "morning",
      address: "Vikas Puri, Lane 8",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_13",
      name: "Lucky Kirar",
      fullName: "Lucky Kirar",
      phone: "+91 9343706358",
      email: "lucky.k@gmail.com",
      gender: "Male",
      planId: "p1",
      planName: "1 Month Standard",
      planPrice: 599,
      joinDate: "2026-09-01",
      expiryDate: "2026-10-01",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      status: "active",
      createdAt: "2026-09-01T09:00:00Z",
      preferredTime: "morning",
      address: "Sector 9, Housing Board",
      photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_14",
      name: "Mohit Yadav",
      fullName: "Mohit Yadav",
      phone: "+91 8357897047",
      email: "mohit.y@gmail.com",
      gender: "Male",
      planId: "p3",
      planName: "3 Months Pro Transformation",
      planPrice: 1499,
      joinDate: "2026-09-02",
      expiryDate: "2026-12-02",
      trainerId: "tr_2",
      trainerName: "Coach Sneha Kapoor",
      status: "active",
      createdAt: "2026-09-02T10:30:00Z",
      preferredTime: "afternoon",
      address: "Vijay Nagar, Scheme 54",
      photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_15",
      name: "Priya Sharma",
      fullName: "Priya Sharma",
      phone: "+91 9811223344",
      email: "priya.s@gmail.com",
      gender: "Female",
      planId: "p4",
      planName: "6 Months Fitness Pass",
      planPrice: 2799,
      joinDate: "2026-09-05",
      expiryDate: "2027-03-05",
      trainerId: "tr_2",
      trainerName: "Coach Sneha Kapoor",
      status: "active",
      createdAt: "2026-09-05T14:15:00Z",
      preferredTime: "morning",
      address: "Saket Nagar, Near Park",
      photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_16",
      name: "Rahul Verma",
      fullName: "Rahul Verma",
      phone: "+91 9876543210",
      email: "rahul.v@univogym.com",
      gender: "Male",
      planId: "p5",
      planName: "12 Months Annual Elite",
      planPrice: 4999,
      joinDate: "2026-09-08",
      expiryDate: "2027-09-08",
      trainerId: "tr_3",
      trainerName: "Coach Rohan Deshmukh",
      status: "active",
      createdAt: "2026-09-08T11:00:00Z",
      preferredTime: "evening",
      address: "Geeta Bhawan, Square 2",
      photoURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: "mem_17",
      name: "Ajay Prajapati",
      fullName: "Ajay Prajapati",
      phone: "+91 9196302375",
      email: "ajay.p@univogym.com",
      gender: "Male",
      planId: "p3",
      planName: "3 Months Pro Transformation",
      planPrice: 1499,
      joinDate: "2026-09-10",
      expiryDate: "2026-12-10",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      status: "active",
      createdAt: "2026-09-10T16:00:00Z",
      preferredTime: "morning",
      address: "Old Palasia, Indore",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80"
    }
  ];

  // Save members to Firestore & local cache
  for (const m of membersData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "members", m.id), {
        ...m,
        gymId,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (e) {
      console.warn("Member write note:", e);
    }
  }
  localStorage.setItem("univo_recent_members", JSON.stringify(membersData));

  // --- 3. PAYMENTS & SUBSCRIPTIONS (6 MONTHS SPREAD) ---
  const paymentsData = [
    // March 2026
    { id: "pay_01", memberId: "mem_01", memberName: "Vikas Malhotra", phone: "9811122334", planName: "12 Months Annual Elite", amount: 4999, paidAmount: 4999, dueAmount: 0, paymentMode: "online", date: "2026-03-05", createdAt: "2026-03-05T10:00:00Z", status: "paid" },
    { id: "pay_02", memberId: "mem_02", memberName: "Pooja Verma", phone: "9822233445", planName: "3 Months Pro Transformation", amount: 1499, paidAmount: 1499, dueAmount: 0, paymentMode: "cash", date: "2026-03-12", createdAt: "2026-03-12T11:30:00Z", status: "paid" },
    { id: "pay_03", memberId: "mem_01", memberName: "Vikas Malhotra", phone: "9811122334", planName: "PT Add-on (Coach Amit)", amount: 3000, paidAmount: 3000, dueAmount: 0, paymentMode: "online", date: "2026-03-15", createdAt: "2026-03-15T12:00:00Z", status: "paid" },
    // April 2026
    { id: "pay_04", memberId: "mem_03", memberName: "Rohit Bansal", phone: "9833344556", planName: "6 Months Fitness Pass", amount: 2799, paidAmount: 2799, dueAmount: 0, paymentMode: "online", date: "2026-04-02", createdAt: "2026-04-02T09:15:00Z", status: "paid" },
    { id: "pay_05", memberId: "mem_04", memberName: "Sunita Choudhary", phone: "9844455667", planName: "1 Month Standard", amount: 599, paidAmount: 599, dueAmount: 0, paymentMode: "cash", date: "2026-04-18", createdAt: "2026-04-18T16:20:00Z", status: "paid" },
    // May 2026
    { id: "pay_06", memberId: "mem_05", memberName: "Gaurav Joshi", phone: "9855566778", planName: "3 Months Pro Transformation", amount: 1499, paidAmount: 1499, dueAmount: 0, paymentMode: "online", date: "2026-05-10", createdAt: "2026-05-10T14:00:00Z", status: "paid" },
    { id: "pay_07", memberId: "mem_06", memberName: "Kavita Rao", phone: "9822334455", planName: "12 Months Annual Elite", amount: 4999, paidAmount: 4999, dueAmount: 0, paymentMode: "bank", date: "2026-05-24", createdAt: "2026-05-24T18:45:00Z", status: "paid" },
    // June 2026
    { id: "pay_08", memberId: "mem_07", memberName: "Deepak Meena", phone: "9866677889", planName: "6 Months Fitness Pass", amount: 2799, paidAmount: 2799, dueAmount: 0, paymentMode: "online", date: "2026-06-10", createdAt: "2026-06-10T08:00:00Z", status: "paid" },
    { id: "pay_09", memberId: "mem_08", memberName: "Anjali Saxena", phone: "9877788990", planName: "1 Month with Locker", amount: 699, paidAmount: 699, dueAmount: 0, paymentMode: "cash", date: "2026-06-25", createdAt: "2026-06-25T11:00:00Z", status: "paid" },
    // July 2026
    { id: "pay_10", memberId: "mem_09", memberName: "Sunil Patel", phone: "9888899001", planName: "1 Month Standard", amount: 599, paidAmount: 599, dueAmount: 0, paymentMode: "online", date: "2026-07-15", createdAt: "2026-07-15T18:00:00Z", status: "paid" },
    { id: "pay_11", memberId: "mem_10", memberName: "Karan Johar", phone: "9711003322", planName: "3 Months Pro Transformation", amount: 1499, paidAmount: 1499, dueAmount: 0, paymentMode: "cash", date: "2026-07-28", createdAt: "2026-07-28T07:30:00Z", status: "paid" },
    // August 2026
    { id: "pay_12", memberId: "mem_11", memberName: "Ankit Verma", phone: "9899900112", planName: "3 Months Pro Transformation", amount: 1499, paidAmount: 1499, dueAmount: 0, paymentMode: "online", date: "2026-08-20", createdAt: "2026-08-20T17:00:00Z", status: "paid" },
    { id: "pay_13", memberId: "mem_12", memberName: "Aman Gupta", phone: "9988776655", planName: "1 Month Standard", amount: 599, paidAmount: 599, dueAmount: 0, paymentMode: "cash", date: "2026-08-22", createdAt: "2026-08-22T08:00:00Z", status: "paid" },
    // September 2026 (Current Month Collection)
    { id: "pay_14", memberId: "mem_13", memberName: "Lucky Kirar", phone: "9343706358", planName: "1 Month Standard", amount: 599, paidAmount: 599, dueAmount: 0, paymentMode: "online", date: "2026-09-01", createdAt: "2026-09-01T09:00:00Z", status: "paid" },
    { id: "pay_15", memberId: "mem_14", memberName: "Mohit Yadav", phone: "8357897047", planName: "3 Months Pro Transformation", amount: 1499, paidAmount: 1499, dueAmount: 0, paymentMode: "cash", date: "2026-09-02", createdAt: "2026-09-02T10:30:00Z", status: "paid" },
    { id: "pay_16", memberId: "mem_15", memberName: "Priya Sharma", phone: "9811223344", planName: "6 Months Fitness Pass", amount: 2799, paidAmount: 2799, dueAmount: 0, paymentMode: "online", date: "2026-09-05", createdAt: "2026-09-05T14:15:00Z", status: "paid" },
    { id: "pay_17", memberId: "mem_16", memberName: "Rahul Verma", phone: "9876543210", planName: "12 Months Annual Elite", amount: 4999, paidAmount: 4999, dueAmount: 0, paymentMode: "online", date: "2026-09-08", createdAt: "2026-09-08T11:00:00Z", status: "paid" },
    { id: "pay_18", memberId: "mem_17", memberName: "Ajay Prajapati", phone: "9196302375", planName: "3 Months Pro Transformation", amount: 1499, paidAmount: 1499, dueAmount: 0, paymentMode: "online", date: "2026-09-10", createdAt: "2026-09-10T16:00:00Z", status: "paid" },
    { id: "pay_19", memberId: "mem_13", memberName: "Lucky Kirar", phone: "9343706358", planName: "Locker Room Add-on", amount: 300, paidAmount: 300, dueAmount: 0, paymentMode: "cash", date: "2026-09-12", createdAt: "2026-09-12T10:00:00Z", status: "paid" }
  ];

  for (const p of paymentsData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "payments", p.id), {
        ...p,
        gymId,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (e) {
      console.warn("Payment write note:", e);
    }
  }

  // --- 4. EXPENSES (6 MONTHS SPREAD: Rent, Electricity, Supplies, Maintenance) ---
  const expensesData = [
    // March 2026
    { id: "exp_01", title: "Gym Floor Commercial Rent (March)", category: "Rent", type: "monthly", amount: 45000, date: "2026-03-01", createdAt: "2026-03-01T10:00:00Z" },
    { id: "exp_02", title: "Commercial Electricity Bill (March)", category: "Electricity", type: "monthly", amount: 16800, date: "2026-03-05", createdAt: "2026-03-05T11:00:00Z" },
    { id: "exp_03", title: "Gym Housekeeping & Disinfectants", category: "Supplies", type: "monthly", amount: 2800, date: "2026-03-10", createdAt: "2026-03-10T12:00:00Z" },
    // April 2026
    { id: "exp_04", title: "Gym Floor Commercial Rent (April)", category: "Rent", type: "monthly", amount: 45000, date: "2026-04-01", createdAt: "2026-04-01T10:00:00Z" },
    { id: "exp_05", title: "Commercial Electricity Bill (April)", category: "Electricity", type: "monthly", amount: 17400, date: "2026-04-05", createdAt: "2026-04-05T11:00:00Z" },
    { id: "exp_06", title: "Water Dispensers & 20L Mineral Cans", category: "Water", type: "monthly", amount: 3400, date: "2026-04-08", createdAt: "2026-04-08T12:00:00Z" },
    // May 2026
    { id: "exp_07", title: "Gym Floor Commercial Rent (May)", category: "Rent", type: "monthly", amount: 45000, date: "2026-05-01", createdAt: "2026-05-01T10:00:00Z" },
    { id: "exp_08", title: "Commercial Electricity Bill (May - High AC load)", category: "Electricity", type: "monthly", amount: 21200, date: "2026-05-05", createdAt: "2026-05-05T11:00:00Z" },
    { id: "exp_09", title: "Treadmill T9000 Motor & Belt Service", category: "Maintenance", type: "onetime", amount: 4500, date: "2026-05-10", createdAt: "2026-05-10T14:00:00Z" },
    // June 2026
    { id: "exp_10", title: "Gym Floor Commercial Rent (June)", category: "Rent", type: "monthly", amount: 45000, date: "2026-06-01", createdAt: "2026-06-01T10:00:00Z" },
    { id: "exp_11", title: "Commercial Electricity Bill (June)", category: "Electricity", type: "monthly", amount: 22800, date: "2026-06-05", createdAt: "2026-06-05T11:00:00Z" },
    { id: "exp_12", title: "High-Speed Commercial Wi-Fi Router & Subscription", category: "Internet", type: "onetime", amount: 3500, date: "2026-06-15", createdAt: "2026-06-15T15:00:00Z" },
    // July 2026
    { id: "exp_13", title: "Gym Floor Commercial Rent (July)", category: "Rent", type: "monthly", amount: 45000, date: "2026-07-01", createdAt: "2026-07-01T10:00:00Z" },
    { id: "exp_14", title: "Commercial Electricity Bill (July)", category: "Electricity", type: "monthly", amount: 19500, date: "2026-07-05", createdAt: "2026-07-05T11:00:00Z" },
    { id: "exp_15", title: "Sound System & Bluetooth Amplifier Repair", category: "Maintenance", type: "onetime", amount: 2600, date: "2026-07-18", createdAt: "2026-07-18T16:00:00Z" },
    // August 2026
    { id: "exp_16", title: "Gym Floor Commercial Rent (August)", category: "Rent", type: "monthly", amount: 45000, date: "2026-08-01", createdAt: "2026-08-01T10:00:00Z" },
    { id: "exp_17", title: "Commercial Electricity Bill (August)", category: "Electricity", type: "monthly", amount: 18200, date: "2026-08-05", createdAt: "2026-08-05T11:00:00Z" },
    { id: "exp_18", title: "Lat Pulldown Dual Pulley & Wire Cable Replacement", category: "Maintenance", type: "onetime", amount: 2400, date: "2026-08-15", createdAt: "2026-08-15T14:30:00Z" },
    // September 2026 (Current)
    { id: "exp_19", title: "Gym Floor Commercial Rent (September)", category: "Rent", type: "monthly", amount: 45000, date: "2026-09-01", createdAt: "2026-09-01T10:00:00Z" },
    { id: "exp_20", title: "Commercial Electricity Bill (September)", category: "Electricity", type: "monthly", amount: 17900, date: "2026-09-05", createdAt: "2026-09-05T11:00:00Z" },
    { id: "exp_21", title: "Drinking Water Cans & Dispensers (September)", category: "Water", type: "monthly", amount: 3200, date: "2026-09-08", createdAt: "2026-09-08T12:00:00Z" }
  ];

  for (const exp of expensesData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/expenses`, exp.id), {
        ...exp,
        gymId,
      });
      await batch.commit();
    } catch (e) {
      console.warn("Expense write note:", e);
    }
  }

  // --- 5. SUPPLEMENT STORE & SALES ---
  const supplementsData = [
    {
      id: "sup_1",
      name: "Optimum Nutrition Gold Standard 100% Whey (5 lbs)",
      brand: "Optimum Nutrition",
      category: "Whey Protein",
      flavor: "Double Rich Chocolate",
      weight: "2.27 kg",
      purchaseCost: 5400,
      mrp: 7899,
      sellingPrice: 6699,
      quantity: 14,
      minThreshold: 4,
      photoUrl: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&auto=format&fit=crop&q=80",
      description: "24g whey isolate blend, 5.5g BCAAs per scoop. Certified authentic batch.",
      inStock: true
    },
    {
      id: "sup_2",
      name: "MuscleBlaze Creatine Monohydrate CreAMP",
      brand: "MuscleBlaze",
      category: "Creatine",
      flavor: "Unflavored",
      weight: "250g (83 Servings)",
      purchaseCost: 650,
      mrp: 1199,
      sellingPrice: 899,
      quantity: 26,
      minThreshold: 6,
      photoUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&auto=format&fit=crop&q=80",
      description: "Micronized Creapure grade creatine for explosive strength and muscle fullness.",
      inStock: true
    },
    {
      id: "sup_3",
      name: "C4 Original Pre-Workout High Explosive Energy",
      brand: "Cellucor",
      category: "Pre-Workout",
      flavor: "Fruit Punch",
      weight: "390g (60 Servings)",
      purchaseCost: 1800,
      mrp: 2999,
      sellingPrice: 2399,
      quantity: 3,
      minThreshold: 5,
      photoUrl: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=600&auto=format&fit=crop&q=80",
      description: "200mg Caffeine + Beta-Alanine pump formula for extreme focus during heavy lifts.",
      inStock: true
    },
    {
      id: "sup_4",
      name: "Univo Pro Heavy Duty Stainless Steel Shaker (750ml)",
      brand: "Univo Merch",
      category: "Merchandise",
      flavor: "Matte Black",
      weight: "750 ml",
      purchaseCost: 280,
      mrp: 699,
      sellingPrice: 499,
      quantity: 38,
      minThreshold: 10,
      photoUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
      description: "Double-walled insulated leak-proof protein shaker with blender ball wire.",
      inStock: true
    }
  ];

  for (const s of supplementsData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/supplements`, s.id), s);
      await batch.commit();
    } catch (e) {
      console.warn("Supplement write note:", e);
    }
  }

  // Supplement Sales Records
  const supplementSalesData = [
    { id: "sale_01", supplementId: "sup_1", supplementName: "ON Gold Standard Whey", buyerName: "Vikas Malhotra", quantitySold: 1, unitPrice: 6699, totalAmount: 6699, paymentMode: "online", date: "2026-03-20", timestamp: "2026-03-20T17:30:00Z" },
    { id: "sale_02", supplementId: "sup_2", supplementName: "MB Creatine Monohydrate", buyerName: "Gaurav Joshi", quantitySold: 1, unitPrice: 899, totalAmount: 899, paymentMode: "cash", date: "2026-05-15", timestamp: "2026-05-15T19:00:00Z" },
    { id: "sale_03", supplementId: "sup_3", supplementName: "C4 Original Pre-Workout", buyerName: "Deepak Meena", quantitySold: 1, unitPrice: 2399, totalAmount: 2399, paymentMode: "online", date: "2026-06-18", timestamp: "2026-06-18T08:30:00Z" },
    { id: "sale_04", supplementId: "sup_1", supplementName: "ON Gold Standard Whey", buyerName: "Lucky Kirar", quantitySold: 1, unitPrice: 6699, totalAmount: 6699, paymentMode: "online", date: "2026-09-04", timestamp: "2026-09-04T18:00:00Z" },
    { id: "sale_05", supplementId: "sup_2", supplementName: "MB Creatine Monohydrate", buyerName: "Mohit Yadav", quantitySold: 1, unitPrice: 899, totalAmount: 899, paymentMode: "cash", date: "2026-09-08", timestamp: "2026-09-08T11:30:00Z" },
    { id: "sale_06", supplementId: "sup_4", supplementName: "Univo Pro Shaker (750ml)", buyerName: "Priya Sharma", quantitySold: 2, unitPrice: 499, totalAmount: 998, paymentMode: "online", date: "2026-09-11", timestamp: "2026-09-11T16:45:00Z" }
  ];

  for (const sale of supplementSalesData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/supplement_sales`, sale.id), sale);
      await batch.commit();
    } catch (e) {
      console.warn("Sale write note:", e);
    }
  }

  // --- 6. GYM EQUIPMENT FLEET & MAINTENANCE LOGS ---
  const equipmentData = [
    {
      id: "eq_1",
      name: "Commercial Lat Pulldown & Low Row Combo",
      type: "Heavy Machine",
      brand: "Jerai Fitness",
      weightSpecs: "120 kg Pin-Selected Weight Stack",
      quantity: 2,
      condition: "Operational",
      purchaseDate: "2025-11-10",
      purchasePrice: 145000,
      vendorName: "Jerai Gym Equipment India",
      vendorPhone: "+91 98200 11223",
      lastServiceDate: "2026-08-15",
      serviceIntervalDays: 90,
      photoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
      serviceHistory: [
        {
          id: "srv_1",
          date: "2026-08-15",
          cost: 2400,
          technician: "Ramesh Sharma (Jerai Authorized)",
          technicianPhone: "+91 98211 44556",
          issue: "Cable fraying & pulley squeaking noise",
          actionTaken: "Replaced 6mm steel wire rope & greased dual nylon pulleys."
        }
      ]
    },
    {
      id: "eq_2",
      name: "Hex Rubber Dumbbell Complete Set (2.5kg to 35kg Pairs)",
      type: "Free Weights",
      brand: "Bullrock Fitness",
      weightSpecs: "14 Pairs (Total 525 kg Rubber Coated)",
      quantity: 28,
      condition: "Operational",
      purchaseDate: "2025-08-01",
      purchasePrice: 98000,
      vendorName: "Bullrock Strength Store",
      vendorPhone: "+91 98765 43210",
      lastServiceDate: "2026-06-20",
      serviceIntervalDays: 180,
      photoUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
      serviceHistory: []
    },
    {
      id: "eq_3",
      name: "Heavy Commercial AC Motor Treadmill T9000",
      type: "Cardio",
      brand: "Viva Fitness",
      weightSpecs: "5.5 HP AC Motor, 180kg Max User Weight",
      quantity: 3,
      condition: "Needs Maintenance",
      purchaseDate: "2025-06-15",
      purchasePrice: 320000,
      vendorName: "Viva Commercial Fitness",
      vendorPhone: "+91 99887 76655",
      lastServiceDate: "2026-05-10",
      serviceIntervalDays: 60,
      photoUrl: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=600&auto=format&fit=crop&q=80",
      serviceHistory: [
        {
          id: "srv_2",
          date: "2026-05-10",
          cost: 4500,
          technician: "Anil Kumar (Viva Tech)",
          technicianPhone: "+91 98112 33445",
          issue: "Running belt slipping during high speed",
          actionTaken: "Running belt alignment, tension adjustment & silicone lubrication."
        }
      ]
    },
    {
      id: "eq_4",
      name: "45-Degree Olympic Incline Leg Press (Plate Loaded)",
      type: "Heavy Machine",
      brand: "Being Strong",
      weightSpecs: "450 kg Max Plate Capacity, Linear Bearings",
      quantity: 1,
      condition: "Operational",
      purchaseDate: "2025-09-20",
      purchasePrice: 110000,
      vendorName: "Being Strong India",
      vendorPhone: "+91 98333 22110",
      lastServiceDate: "2026-07-05",
      serviceIntervalDays: 120,
      photoUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
      serviceHistory: []
    }
  ];

  for (const eq of equipmentData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/equipment`, eq.id), eq);
      await batch.commit();
    } catch (e) {
      console.warn("Equipment write note:", e);
    }
  }

  // --- 7. VISITS & DEMO ENQUIRIES ---
  const visitsData = [
    {
      id: "vis_1",
      name: "Sunil Kapoor",
      phone: "+91 9711002233",
      gender: "Male",
      interestedIn: "Weight Loss & Fat Burn",
      source: "Walk-in (Reception)",
      visitDate: "2026-09-08",
      demoDate: "2026-09-09",
      demoTime: "07:00 PM",
      budget: "Rs. 1,500 - 3,000",
      assignedTrainer: "Coach Amit Sharma",
      notes: "Came for trial workout. Wants 8kg weight loss before wedding.",
      followUpDate: "2026-09-14",
      status: "demo_done",
      createdAt: "2026-09-08T18:00:00Z"
    },
    {
      id: "vis_2",
      name: "Komal Rathore",
      phone: "+91 9822331122",
      gender: "Female",
      interestedIn: "Pilates & Core Fitness",
      source: "Instagram Ad",
      visitDate: "2026-09-11",
      demoDate: "2026-09-13",
      demoTime: "06:00 PM",
      budget: "Rs. 3,000 - 6,000",
      assignedTrainer: "Coach Sneha Kapoor",
      notes: "Enquired about female personal training batch.",
      followUpDate: "2026-09-15",
      status: "demo_scheduled",
      createdAt: "2026-09-11T14:30:00Z"
    },
    {
      id: "vis_3",
      name: "Rameshwar Gurjar",
      phone: "+91 9988112233",
      gender: "Male",
      interestedIn: "Powerlifting & Bodybuilding",
      source: "Friend Referral",
      visitDate: "2026-09-12",
      demoDate: "2026-09-14",
      demoTime: "08:00 PM",
      budget: "Rs. 5,000+",
      assignedTrainer: "Coach Rohan Deshmukh",
      notes: "Interstate weightlifter visiting city.",
      followUpDate: "2026-09-16",
      status: "new",
      createdAt: "2026-09-12T16:00:00Z"
    }
  ];

  for (const v of visitsData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/visits`, v.id), v);
      await batch.commit();
    } catch (e) {
      console.warn("Visit write note:", e);
    }
  }

  // --- 8. STAFF & RECEPTION ---
  const staffData = [
    {
      id: "st_1",
      name: "Pawan Gehlot",
      role: "Reception / Front Desk",
      phone: "+91 94250 11223",
      email: "pawan.frontdesk@univogym.com",
      salary: 16000,
      joinDate: "2026-02-15",
      isActive: true,
      shift: "Morning (6:00 AM - 2:00 PM)",
      createdAt: "2026-02-15T09:00:00Z"
    },
    {
      id: "st_2",
      name: "Manish Solanki",
      role: "Maintenance & Cleaning",
      phone: "+91 94250 99887",
      email: "manish.cleaning@univogym.com",
      salary: 12000,
      joinDate: "2026-03-01",
      isActive: true,
      shift: "Full Day (8:00 AM - 5:00 PM)",
      createdAt: "2026-03-01T08:00:00Z"
    }
  ];

  for (const st of staffData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/staff`, st.id), st);
      await batch.commit();
    } catch (e) {
      console.warn("Staff write note:", e);
    }
  }

  // --- 9. BEFORE & AFTER TRANSFORMATION RESULTS ---
  const beforeAfterData = [
    {
      id: "ba_01",
      memberName: "Vikas Malhotra",
      memberId: "mem_01",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      beforeURL: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
      beforeImg: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
      afterURL: "https://images.unsplash.com/photo-1583454155184-870a1f63aebc?w=600&auto=format&fit=crop&q=80",
      afterImg: "https://images.unsplash.com/photo-1583454155184-870a1f63aebc?w=600&auto=format&fit=crop&q=80",
      startWeight: "92 kg",
      endWeight: "78 kg",
      weightDiff: "-14 kg",
      bodyFatDiff: "28% -> 14%",
      duration: "12 Weeks (90 Days)",
      category: "Fat Loss & Shredding",
      notes: "Disciplined calorie deficit + 5-day hypertrophy split. Zero junk food and 10k steps daily.",
      date: "2026-06-15",
      createdAt: "2026-06-15T10:00:00Z"
    },
    {
      id: "ba_02",
      memberName: "Pooja Verma",
      memberId: "mem_04",
      trainerId: "tr_2",
      trainerName: "Coach Sneha Kapoor",
      beforeURL: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
      beforeImg: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
      afterURL: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80",
      afterImg: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80",
      startWeight: "76 kg",
      endWeight: "61 kg",
      weightDiff: "-15 kg",
      bodyFatDiff: "32% -> 21%",
      duration: "16 Weeks",
      category: "PCOD & Posture Recovery",
      notes: "Regulated hormonal balance through strength circuits and low GI high-protein nutrition.",
      date: "2026-07-20",
      createdAt: "2026-07-20T11:00:00Z"
    },
    {
      id: "ba_03",
      memberName: "Rohit Bansal",
      memberId: "mem_03",
      trainerId: "tr_3",
      trainerName: "Coach Rohan Deshmukh",
      beforeURL: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
      beforeImg: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
      afterURL: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
      afterImg: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
      startWeight: "68 kg",
      endWeight: "79 kg",
      weightDiff: "+11 kg (Lean Muscle)",
      bodyFatDiff: "12% -> 13%",
      duration: "24 Weeks",
      category: "Powerlifting & Bulking",
      notes: "Compound progressive overload (Bench 115kg, Squat 160kg, Deadlift 200kg). 3200 kcal surplus.",
      date: "2026-08-10",
      createdAt: "2026-08-10T15:00:00Z"
    },
    {
      id: "ba_04",
      memberName: "Deepak Meena",
      memberId: "mem_07",
      trainerId: "tr_3",
      trainerName: "Coach Rohan Deshmukh",
      beforeURL: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80",
      beforeImg: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80",
      afterURL: "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&auto=format&fit=crop&q=80",
      afterImg: "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&auto=format&fit=crop&q=80",
      startWeight: "88 kg",
      endWeight: "74 kg",
      weightDiff: "-14 kg",
      bodyFatDiff: "24% -> 11%",
      duration: "16 Weeks",
      category: "Abs & Core Shredding",
      notes: "Carb cycling and high intensity metabolic conditioning. Chiseled 6-pack abs revealed.",
      date: "2026-08-28",
      createdAt: "2026-08-28T12:00:00Z"
    },
    {
      id: "ba_05",
      memberName: "Kavita Rao",
      memberId: "mem_06",
      trainerId: "tr_2",
      trainerName: "Coach Sneha Kapoor",
      beforeURL: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&auto=format&fit=crop&q=80",
      beforeImg: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&auto=format&fit=crop&q=80",
      afterURL: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80",
      afterImg: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80",
      startWeight: "71 kg",
      endWeight: "59 kg",
      weightDiff: "-12 kg",
      bodyFatDiff: "29% -> 19%",
      duration: "18 Weeks",
      category: "Postpartum Toning",
      notes: "Pelvic floor strengthening, progressive dumbbell resistance training, and clean whole foods.",
      date: "2026-09-02",
      createdAt: "2026-09-02T10:00:00Z"
    },
    {
      id: "ba_06",
      memberName: "Ajay Prajapati",
      memberId: "mem_02",
      trainerId: "tr_1",
      trainerName: "Coach Amit Sharma",
      beforeURL: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80",
      beforeImg: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80",
      afterURL: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
      afterImg: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
      startWeight: "84 kg",
      endWeight: "73 kg",
      weightDiff: "-11 kg",
      bodyFatDiff: "22% -> 13%",
      duration: "12 Weeks",
      category: "Athlete Conditioning",
      notes: "Agility ladder drills, heavy bag cardio, and strict protein-to-bodyweight nutrition protocol.",
      date: "2026-09-08",
      createdAt: "2026-09-08T09:00:00Z"
    }
  ];

  for (const ba of beforeAfterData) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `gyms/${gymId}/beforeAfter`, ba.id), ba);
      await batch.commit();
    } catch (e) {
      console.warn("BeforeAfter write note:", e);
    }
  }

  return {
    success: true,
    membersCount: membersData.length,
    paymentsCount: paymentsData.length,
    expensesCount: expensesData.length,
    supplementsCount: supplementsData.length,
    equipmentCount: equipmentData.length,
    visitsCount: visitsData.length,
    trainersCount: trainersData.length,
    staffCount: staffData.length,
    beforeAfterCount: beforeAfterData.length
  };
}