/**
 * seed_profiles.mjs
 * -----------------
 * Seeds 14 dummy profiles into Supabase for SparkUp.
 *
 * What it does:
 *   1. Uploads each profile photo to the `avatars` storage bucket
 *   2. Creates a Supabase Auth user (email+password) via the Admin API
 *   3. Inserts a row into the `users` table (name, bio, avatar_url, etc.)
 *   4. Fetches all questions and inserts a random answer for each
 *
 * Requirements:
 *   - Node.js 18+ (uses native fetch)
 *   - Run from the project root:  node scripts/seed_profiles.mjs
 *   - Set SUPABASE_SERVICE_ROLE_KEY below (from Supabase → Project Settings → API)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mhltfpymietbkxcyrsmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obHRmcHltaWV0Ymt4Y3lyc21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODgyNjEsImV4cCI6MjA5Mjk2NDI2MX0.ycUzWfleEbpyAY0VqiK33B2NCRrzZCE10gGtzZ20TCw';

// ⚠️  REQUIRED: paste your service_role key here (Supabase → Settings → API → service_role)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obHRmcHltaWV0Ymt4Y3lyc21vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM4ODI2MSwiZXhwIjoyMDkyOTY0MjYxfQ.jyzyNChMIhQ2roZFeVmHOfwgA_uxDZyHs5l9ZdsVrgc';

const DEFAULT_PASSWORD = 'SparkUp@2025';  // password for every dummy account
const EMAIL_DOMAIN = 'bmscetest.com';
// ─── END CONFIG ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

// Admin client – bypasses RLS
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── PROFILE DATA ──────────────────────────────────────────────────────────────
// Names come from the filenames (capitalised as shown).
// Bios, branch, year are crafted to match the vibe in each photo.
const profiles = [
  {
    filename: 'Damon.jpg',
    name: 'Damon',
    bio: 'Architecture and art history enthusiast. You would find me wandering museums on weekends or sketching campus buildings.Big believer in slow mornings and good coffee.',
    branch: 'Architecture',
    year: 3,
  },
  {
    filename: 'Jacko.jpg',
    name: 'Jacko',
    bio: 'Permanent resident of the library — curly hair, specs, and a MacBook covered in stickers. CS major who debugs code and people equally well.',
    branch: 'Computer Science',
    year: 2,
  },
  {
    filename: 'Rohit.jpg',
    name: 'Rohit',
    bio: 'ECE student with a passion for fashion and photography. Currently obsessed with analog film. Curly-haired, gold-watch-wearing, perpetually late to 8 AMs.',
    branch: 'Electronics & Communication',
    year: 3,
  },
  {
    filename: 'Takashi.jpg',
    name: 'Takashi',
    bio: 'Chilling on campus lawns with my AirPods and a playlist that switches between lo-fi and J-rock. CompSci + design double major. Will talk your ear off about typography.',
    branch: 'Computer Science',
    year: 2,
  },
  {
    filename: 'Vidit.jpg',
    name: 'Vidit',
    bio: 'Two screens, one hoodie, zero distractions. I build side-projects at 1 AM and have "Suffering is the true test of life" on my wall for motivation. Yes, I\'m fine.',
    branch: 'Information Science',
    year: 4,
  },
  {
    filename: 'aaron.jpg',
    name: 'Aaron',
    bio: 'Mirror selfies in elevators and long walks at dusk. Psychology student who listens more than he speaks. Denim jacket is non-negotiable.',
    branch: 'Psychology',
    year: 2,
  },
  {
    filename: 'abhinav.jpg',
    name: 'Abhinav',
    bio: 'Night owl coder who reads philosophy between commits. Mechanical keyboards, matcha lattes, and making playlists nobody asked for.',
    branch: 'Computer Science',
    year: 3,
  },
  {
    filename: 'akshat.jpg',
    name: 'Akshat',
    bio: 'Bookworm with a "New York" hoodie and big dreams. MBA aspirant who somehow ends up on the library floor with three textbooks spread out. Soft-spoken but has opinions.',
    branch: 'Business Administration',
    year: 2,
  },
  {
    filename: 'annanya.jpg',
    name: 'Annanya',
    bio: 'Literature lover, jhumka collector, and campus culture enthusiast. You can catch me at every fest or in the canteen debating the best South Indian dish.',
    branch: 'English Literature',
    year: 2,
  },
  {
    filename: 'ella.jpg',
    name: 'Ella',
    bio: 'Economics student who studies at malls because ambience matters. Laptop, textbooks, and a cold-brew at all times. Aspiring policy analyst.',
    branch: 'Economics',
    year: 3,
  },
  {
    filename: 'jahnvi.jpg',
    name: 'Jahnvi',
    bio: 'History & politics nerd who laughs too easily. Library is my comfort zone. Looking for someone to debate with over chai and samosas.',
    branch: 'Political Science',
    year: 2,
  },
  {
    filename: 'kiara.jpg',
    name: 'Kiara',
    bio: 'Finance major who somehow manages two monitors and a social life. Organised chaos. Will hype up your startup idea at 11 PM on a Tuesday.',
    branch: 'Finance',
    year: 4,
  },
  {
    filename: 'nisha.jpg',
    name: 'Nisha',
    bio: 'Future doctor, current overthinker. Studying hearts — both medically and metaphorically. Cafe study sessions and biology flashcards are my love language.',
    branch: 'MBBS',
    year: 2,
  },
  {
    filename: 'sara.jpg',
    name: 'Sara',
    bio: 'Pre-med student who hasn\'t slept properly since orientation. Running on caffeine and curiosity. Will absolutely geek out about anatomy with you.',
    branch: 'Biotechnology',
    year: 3,
  },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emailFor(name) {
  return `${name.toLowerCase()}01@${EMAIL_DOMAIN}`;
}

function anonymousId() {
  return `User#${randomInt(1000, 9999)}`;
}

async function uploadAvatar(filePath, userId) {
  const ext = path.extname(filePath).replace('.', '');
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const buffer = fs.readFileSync(filePath);

  const { data, error } = await adminSupabase.storage
    .from('avatars')
    .upload(fileName, buffer, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });

  if (error) {
    console.warn(`  ⚠  Avatar upload failed: ${error.message}`);
    // Fall back to a deterministic pravatar so the profile still looks good
    return `https://i.pravatar.cc/150?u=${userId}`;
  }

  const { data: urlData } = adminSupabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function createAuthUser(email, name) {
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,   // skip email verification
    user_metadata: { name },
  });

  if (error) {
    // If the user already exists, look them up
    if (error.message.includes('already been registered') || error.message.toLowerCase().includes('already exists')) {
      console.warn(`  ℹ  Auth user already exists for ${email}, fetching…`);
      const { data: listData, error: listErr } = await adminSupabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = listData.users.find(u => u.email === email);
      if (existing) return existing;
      throw new Error(`Could not find existing user for ${email}`);
    }
    throw error;
  }

  return data.user;
}

async function upsertUserProfile(userId, email, name, bio, avatarUrl) {
  const { error } = await adminSupabase
    .from('users')
    .upsert(
      {
        id: userId,
        email: email,
        university_domain: EMAIL_DOMAIN,
        name: name,
        anonymous_id: anonymousId(),
        bio: bio,
        avatar_url: avatarUrl,
        is_verified: true,
      },
      { onConflict: 'id' }
    );

  if (error) throw error;
}

async function fetchQuestions() {
  const { data, error } = await adminSupabase
    .from('questions')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function insertRandomAnswers(userId, questions) {
  // Delete existing answers first so re-runs are idempotent
  await adminSupabase
    .from('user_answers')
    .delete()
    .eq('user_id', userId);

  const rows = questions.map(q => {
    const options = q.options || [];
    const answerVal = options.length > 0 ? randomInt(0, options.length - 1) : 0;
    return {
      user_id: userId,
      question_id: q.id,   // UUID — matches questions.id after schema fix
      answer_value: answerVal,
    };
  });

  const { error } = await adminSupabase
    .from('user_answers')
    .insert(rows);

  if (error) {
    console.warn(`  ⚠  Could not save answers: ${error.message}`);
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 SparkUp Profile Seeder\n');

  if (SUPABASE_SERVICE_ROLE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌  Please set SUPABASE_SERVICE_ROLE_KEY in the script (or pass it as an env var).');
    console.error('    Go to: Supabase Dashboard → Project Settings → API → service_role secret\n');
    process.exit(1);
  }

  // Fetch questions once
  let questions = [];
  try {
    questions = await fetchQuestions();
    console.log(`📋 Found ${questions.length} question(s) in DB\n`);
  } catch (e) {
    console.warn(`⚠  Could not fetch questions: ${e.message}. Skipping questionnaire answers.\n`);
  }

  for (const profile of profiles) {
    const { filename, name, bio } = profile;
    const email = emailFor(name);
    const filePath = path.join(PROFILES_DIR, filename);

    console.log(`👤 Processing: ${name} (${email})`);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠  Image not found: ${filePath} — skipping\n`);
      continue;
    }

    try {
      // 1. Create auth user
      process.stdout.write('  ① Creating auth user… ');
      const authUser = await createAuthUser(email, name);
      console.log(`✓ (id: ${authUser.id})`);

      // 2. Upload avatar
      process.stdout.write('  ② Uploading avatar… ');
      const avatarUrl = await uploadAvatar(filePath, authUser.id);
      console.log(`✓`);

      // 3. Upsert user profile
      process.stdout.write('  ③ Saving profile to DB… ');
      await upsertUserProfile(authUser.id, email, name, bio, avatarUrl);
      console.log('✓');

      // 4. Random questionnaire answers
      if (questions.length > 0) {
        process.stdout.write(`  ④ Inserting ${questions.length} random answer(s)… `);
        await insertRandomAnswers(authUser.id, questions);
        console.log('✓');
      }

      console.log(`  ✅ ${name} seeded successfully!\n`);
    } catch (err) {
      console.error(`  ❌ Failed for ${name}: ${err.message}\n`);
    }
  }

  console.log('🎉 Seeding complete!');
  console.log(`\nAll accounts use password: ${DEFAULT_PASSWORD}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
