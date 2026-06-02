-- ============================================================
-- Migrate: Replace seed questions + add all 10 personality questions
-- Run in Supabase SQL Editor
-- ============================================================

-- Clear existing questions (and cascade-delete existing user_answers)
DELETE FROM user_answers;
DELETE FROM questions;

-- Insert all 10 personality test questions
-- answer_value stored per option: 0=first option, 1=second, 2=third, 3=fourth
-- The app maps index → value internally, DB stores the option index (0-3)
INSERT INTO questions (text, type, options, is_active) VALUES
(
  'At a college fest or party, you usually:',
  'multiple_choice',
  '["Move around, meet new people, and start conversations","Stick with friends but chat with others too","Chill with a small familiar group","Stay for a bit, then quietly leave"]',
  true
),
(
  'When choosing what to do this weekend, you:',
  'multiple_choice',
  '["Plan something exciting and make it happen","Have a rough plan but stay flexible","Decide based on mood at the last minute","Wait for friends to decide"]',
  true
),
(
  'You didn''t do well on a test or assignment. You:',
  'multiple_choice',
  '["Immediately plan how to improve next time","Think about what went wrong and adjust","Feel bad for a while before moving on","Avoid thinking about it"]',
  true
),
(
  'A friend gives you honest feedback about yourself. You:',
  'multiple_choice',
  '["Appreciate it and try to improve","Listen if it makes sense","Overthink it later","Get annoyed or defensive"]',
  true
),
(
  'During a stressful week (deadlines + exams), you:',
  'multiple_choice',
  '["Make a plan and start working","Talk to friends or vent it out","Take some alone time to reset","Procrastinate and hope things work out"]',
  true
),
(
  'Your ideal college project/teamwork style is:',
  'multiple_choice',
  '["Clear roles and organized planning","Some structure but relaxed vibes","Go with the flow and figure it out","Last-minute chaos but somehow works"]',
  true
),
(
  'When drama or conflict happens in your friend group, you:',
  'multiple_choice',
  '["Address it directly and clear things up","Try to help everyone compromise","Stay neutral and avoid involvement","Let others deal with it"]',
  true
),
(
  'Sudden plan change? (Class cancelled, surprise trip, etc.)',
  'multiple_choice',
  '["Love it — new adventure!","Adjust easily","Need some time to get used to it","Wish things stayed predictable"]',
  true
),
(
  'What motivates you the most in college life?',
  'multiple_choice',
  '["Achievements, success, and recognition","Learning new things and self-growth","Comfort, good vibes, and stability","Rewards like money, perks, or benefits"]',
  true
),
(
  'When a plan completely fails (event cancelled, project issue), you:',
  'multiple_choice',
  '["Take charge and fix what you can","Analyze what happened","Accept it as bad luck","Ignore it and move on"]',
  true
);