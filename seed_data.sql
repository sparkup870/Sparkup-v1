-- SEED DATA FOR SPARKUP

-- Insert some questions
INSERT INTO public.questions (text, type, options) VALUES
('What is your ideal Friday night?', 'multiple_choice', '["Staying in and watching a movie", "Going out to a loud party", "Exploring a new part of the city", "Playing video games with friends"]'),
('What kind of music do you prefer?', 'multiple_choice', '["Pop / Top 40", "Rock / Indie", "Hip Hop / R&B", "Classical / Jazz"]'),
('How would you describe your personality?', 'multiple_choice', '["Introverted and reflective", "Extroverted and energetic", "A mix of both", "I am a total mystery"]'),
('How often do you like to study at the library?', 'likert', '["Never", "Rarely", "Sometimes", "Often", "Always"]');

-- Note: You can add more questions as needed.
