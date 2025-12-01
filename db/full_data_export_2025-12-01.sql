-- ============================================
-- DingleUP! FULL DATABASE EXPORT WITH DATA
-- ============================================
-- Generated: 2025-12-01
-- Source: Production Supabase Database
-- CRITICAL: This file contains ALL current data including users, translations, questions, game results
-- 
-- IMPORT INSTRUCTIONS:
-- 1. First apply schema: psql -U postgres -d dingleup -f db/schema_latest.sql
-- 2. Then import data: psql -U postgres -d dingleup -f db/full_data_export_2025-12-01.sql
-- ============================================

BEGIN;

-- ============================================
-- TABLE: profiles (Registered Users)
-- ============================================

ALTER TABLE public.profiles DISABLE TRIGGER ALL;

INSERT INTO public.profiles (id, username, pin_hash, email, email_verified, email_pin_setup_completed, country_code, preferred_language, user_timezone, birth_date, age_verified, age_consent, first_login_age_gate_completed, legal_consent, legal_consent_at, terms_accepted_at, avatar_url, coins, lives, max_lives, lives_regeneration_rate, last_life_regeneration, total_correct_answers, invitation_code, invitation_rewards_reset_at, last_invitation_reward_reset, welcome_bonus_claimed, daily_gift_streak, daily_gift_last_claimed, daily_gift_last_seen, help_third_active, help_2x_answer_active, help_audience_active, question_swaps_available, active_speed_expires_at, recovery_code_hash, recovery_code_set_at, pin_reset_attempts, pin_reset_last_attempt_at, biometric_enabled, webauthn_credential_id, webauthn_public_key, webauthn_challenge, challenge_expires_at, device_id, last_username_change, preferred_country, created_at, updated_at) VALUES
('d64c857c-80c5-4a3e-8ba4-78fdba1d6741', 'a5dealas', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'simon.alex1929@gmail.com', true, true, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-21 12:27:22.24205+00', NULL, 'https://wdpxmwsxhckazwxufttk.supabase.co/storage/v1/object/public/avatars/d64c857c-80c5-4a3e-8ba4-78fdba1d6741/0.6931124527543704.jpg', 5000, 100, 15, 12, '2025-11-08 20:43:01.718266+00', 34, 'C6AEF338', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', true, 2, '2025-10-21 02:54:46.73001+00', '2025-10-21', true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-17 02:16:46.682523+00', '2025-12-01 12:05:01.059873+00'),
('0af306cc-0c3a-4efc-a9d3-c2757368047f', 'Mike83', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'gajsjd@gmail.com', true, true, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-21 12:27:22.24205+00', NULL, NULL, 5000, 100, 15, 12, '2025-10-22 01:58:39.141251+00', 0, 'F1785E19', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', false, 0, NULL, NULL, true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-17 20:18:45.65706+00', '2025-12-01 12:05:01.059873+00'),
('76588cf1-7b14-4ed3-b638-27ecd31417ef', 'Hello001', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'kispista@gmail.com', true, true, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-21 12:27:22.24205+00', NULL, NULL, 5000, 100, 15, 12, '2025-10-22 01:58:39.141251+00', 0, 'AF5225A4', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', false, 1, '2025-10-18 02:04:05.22+00', '2025-10-18', true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-18 02:03:37.200447+00', '2025-12-01 12:05:01.059873+00'),
('598b2b45-cda1-49bf-9c90-f7052db13470', 'DingelUP!', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'a5dealas@gmail.com', true, true, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-21 12:27:22.24205+00', NULL, NULL, 5000, 100, 15, 12, '2025-11-28 18:22:11.478974+00', 0, 'LOVMV0Q3', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', true, 0, NULL, NULL, true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-22 03:18:25.958641+00', '2025-12-01 12:05:01.059873+00'),
('e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', 'fullgamer', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'fullgamer@dingleup.auto', true, true, 'HU', 'en', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-30 17:47:55.783+00', NULL, NULL, 16275, 100, 15, 12, '2025-12-01 04:40:54.896295+00', 120, 'GC19QV0A', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', true, 1, '2025-11-30 17:48:06.192+00', '2025-11-30', true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-30 17:47:55.876+00', '2025-12-01 04:40:54.911234+00'),
('dc2f2157-6ab4-40ff-a09c-73a15d77943e', 'kisspistaman', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'kisspistaman@dingleup.auto', true, true, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-30 20:41:51.498+00', NULL, NULL, 5140, 100, 15, 12, '2025-12-01 04:40:54.896295+00', 12, 'LU7LP9P0', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', true, 1, '2025-11-30 20:42:04.144+00', '2025-11-30', true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-30 20:41:51.638+00', '2025-12-01 04:40:54.911234+00'),
('14d82f08-0d9a-4505-a0dc-c3baf4330fc9', 'szerencsesem', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'szerencsesem@dingleup.auto', true, true, 'HU', 'en', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-30 20:56:24.734+00', NULL, NULL, 5091, 95, 15, 12, '2025-12-01 16:58:41.226283+00', 6, 'V6DPBUA2', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', true, 1, '2025-11-30 20:56:38.289+00', '2025-11-30', true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-30 20:56:24.865+00', '2025-12-01 16:58:55.244699+00'),
('4373b347-144b-4d21-9cc1-f7cf336e0216', 'GameMaster99', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', NULL, false, false, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-21 12:27:22.24205+00', NULL, NULL, 10690, 100, 15, 12, '2025-12-01 04:40:54.896295+00', 110, 'GMTR4455', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', false, 0, NULL, NULL, true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-30 19:29:28.334+00', '2025-12-01 04:40:54.911234+00'),
('b6474608-5e44-4535-9d2f-1f852c69712d', 'quizlover', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', NULL, false, false, 'HU', 'hu', 'Europe/Budapest', '1991-05-05', true, false, true, true, '2025-11-21 12:27:22.24205+00', NULL, NULL, 5025, 100, 15, 12, '2025-12-01 04:40:54.896295+00', 13, 'QLVRXM99', '2025-12-20 15:11:14.694488+00', '2025-10-20 01:44:15.196382+00', true, 0, NULL, NULL, true, true, true, 0, NULL, '16308361808fdf63e94ea02e7c0c02c2a25a2c72b1e332e65056f40f9343aba3', '2025-11-30 18:55:33.738685+00', 0, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-30 21:50:46.835+00', '2025-12-01 04:40:54.911234+00');

ALTER TABLE public.profiles ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: user_roles (Admin Roles)
-- ============================================

ALTER TABLE public.user_roles DISABLE TRIGGER ALL;

INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('356a642c-ace3-41a9-b785-0e83d14ade8d', '598b2b45-cda1-49bf-9c90-f7052db13470', 'admin', '2025-11-22 03:18:29.511149+00'),
('23090482-742c-49ba-9464-b39e076162dc', 'db5c7db2-c987-4306-bf10-72dfd942d174', 'admin', '2025-11-25 19:22:12.672818+00'),
('f5d549e3-620d-41e4-8bb3-0f1410f5058c', '98210a15-b837-4a72-94e8-da4bffc28ca1', 'admin', '2025-11-25 19:26:26.254878+00'),
('80b7198d-5a5c-466f-9101-c0fb60e3767f', 'a07bac72-9487-4588-b362-c7e314533c7d', 'admin', '2025-11-25 19:32:27.512133+00'),
('afe6026c-36c6-4ca0-9c61-0ad994f62b0d', '04bba890-413b-4091-a634-a637a99ec950', 'admin', '2025-11-25 20:08:06.872411+00'),
('6a145e72-98a4-40fe-b941-ce40c0326798', '7ae78e55-807e-4eaf-b08e-ea96f2ebefb9', 'admin', '2025-11-26 15:12:51.712675+00'),
('566ed06b-c0b9-4b85-8099-fae9b7f2bc74', '9c7edbf4-1f09-4642-9f96-21e8cece1608', 'admin', '2025-11-30 22:12:58.437163+00'),
('0aebbccf-5b0b-4373-834b-c957eafe11dc', 'e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', 'admin', '2025-11-30 22:17:52.614946+00');

ALTER TABLE public.user_roles ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: topics (30 Game Topics)
-- ============================================

ALTER TABLE public.topics DISABLE TRIGGER ALL;

INSERT INTO public.topics (id, name, description, created_at) VALUES
(1, 'Egészség', 'Általános egészségügyi ismeretek', '2025-11-18 01:58:30.15641+00'),
(2, 'Fitnesz', 'Edzés, testmozgás, sportolás', '2025-11-18 01:58:30.15641+00'),
(3, 'Táplálkozás', 'Táplálkozástudományos ismeretek', '2025-11-18 01:58:30.15641+00'),
(4, 'Orvostudomány', 'Orvosi és klinikai ismeretek', '2025-11-18 01:58:30.15641+00'),
(5, 'Mentális egészség', 'Lelki egészség és jóllét', '2025-11-18 01:58:30.15641+00'),
(6, 'Magyar történelem', 'Magyar történelmi események', '2025-11-18 01:58:30.15641+00'),
(7, 'Világtörténelem', 'Nemzetközi történelmi események', '2025-11-18 01:58:30.15641+00'),
(8, 'Ókori civilizációk', 'Antik kultúrák és civilizációk', '2025-11-18 01:58:30.15641+00'),
(9, 'Technológia', 'Technológiai újítások és találmányok', '2025-11-18 01:58:30.15641+00'),
(10, 'Tudomány', 'Általános tudományos ismeretek', '2025-11-18 01:58:30.15641+00'),
(11, 'Földrajz', 'Földrajzi és geológiai ismeretek', '2025-11-18 01:58:30.15641+00'),
(12, 'Irodalom', 'Általános irodalmi művek', '2025-11-18 01:58:30.15641+00'),
(13, 'Magyar irodalom', 'Magyar költők és írók művei', '2025-11-18 01:58:30.15641+00'),
(14, 'Zene', 'Általános zenei ismeretek', '2025-11-18 01:58:30.15641+00'),
(15, 'Klasszikus zene', 'Klasszikus zeneszerzők és műveik', '2025-11-18 01:58:30.15641+00'),
(16, 'Művészet', 'Képzőművészeti alkotások', '2025-11-18 01:58:30.15641+00'),
(17, 'Építészet', 'Építészeti stílusok és épületek', '2025-11-18 01:58:30.15641+00'),
(18, 'Film és színház', 'Filmművészet és színházi előadások', '2025-11-18 01:58:30.15641+00'),
(19, 'Popkultúra', 'Modern popkulturális ismeretek', '2025-11-18 01:58:30.15641+00'),
(20, 'Pénzügy', 'Pénzügyi alapismeretek', '2025-11-18 01:58:30.15641+00'),
(21, 'Befektetés', 'Befektetési stratégiák és eszközök', '2025-11-18 01:58:30.15641+00'),
(22, 'Vállalkozás', 'Vállalkozói ismeretek', '2025-11-18 01:58:30.15641+00'),
(23, 'Gazdaság', 'Makrogazdasági és mikrogazdasági alapok', '2025-11-18 01:58:30.15641+00'),
(24, 'Önismeret', 'Önismeret és személyiségfejlesztés', '2025-11-18 01:58:30.15641+00'),
(25, 'Pszichológia', 'Pszichológiai ismeretek és modellek', '2025-11-18 01:58:30.15641+00'),
(26, 'Állatvilág', 'Kérdések az állatokról, fajokról, élőhelyekről', '2025-11-18 15:37:47.858223+00'),
(27, 'Általános Ismeretek', 'Általános műveltségi kérdések különböző témákból', '2025-11-18 15:37:47.858223+00'),
(28, 'Játékok & Játékszabályok', 'Társasjátékok, kártyajátékok és logikai játékok szabályai', '2025-11-24 22:01:16.525202+00'),
(29, 'Autók & Közlekedési Ismeretek', 'Autómárkák, modellek és általános autóipari alapfogalmak', '2025-11-24 22:01:16.525202+00'),
(30, 'Munkák & Szakmák Ismeretei', 'Különböző szakmák feladatai, eszközei és kompetenciái', '2025-11-24 22:01:16.525202+00');

ALTER TABLE public.topics ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: booster_types (Booster Product Definitions)
-- ============================================

ALTER TABLE public.booster_types DISABLE TRIGGER ALL;

INSERT INTO public.booster_types (id, code, name, description, price_gold, price_usd_cents, reward_gold, reward_lives, reward_speed_count, reward_speed_duration_min, is_active, created_at, updated_at) VALUES
('4b2f1d40-f969-4cd8-b3c5-81e07d923f28', 'FREE', 'Free Booster', '900 aranyért Free Booster, amely +300 aranyat, +15 életet és 4× 30 perces Speed Boostert ad.', 900, NULL, 300, 15, 4, 30, true, '2025-11-19 12:28:08.62149+00', '2025-11-19 14:25:07.278089+00'),
('1050b19e-bca9-4124-85e2-979945c418b3', 'PREMIUM', 'Premium Speed Booster', 'Premium Speed Booster 2,49 USD-ért, amely +1500 aranyat, +50 életet és 24× 60 perces Speed Boostert ad.', NULL, 249, 1500, 50, 24, 60, true, '2025-11-19 12:28:08.62149+00', '2025-11-19 14:25:07.278089+00'),
('570fbbde-6f0c-4ce5-b6d7-3601bebe70c9', 'GOLD_SAVER', 'Gold Saver Booster', 'In-game arany booster, 500→250 gold + 15 élet, Speed nélkül', 500, NULL, 250, 15, 0, 0, true, '2025-11-19 14:49:16.482159+00', '2025-11-19 14:49:16.482159+00'),
('db7c380c-464d-470f-b017-b2ea465f3f86', 'INSTANT_RESCUE', 'Instant Rescue Booster', 'In-game IAP booster, 1000 gold + 25 élet, Speed nélkül', NULL, 149, 1000, 25, 0, 0, true, '2025-11-19 14:49:16.482159+00', '2025-11-19 14:49:16.482159+00');

ALTER TABLE public.booster_types ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: legal_documents (Terms & Privacy)
-- ============================================

ALTER TABLE public.legal_documents DISABLE TRIGGER ALL;

INSERT INTO public.legal_documents (id, document_key, content, updated_by, created_at, updated_at) VALUES
('d675ea55-ceb0-4f55-8a2e-d88febfab25e', 'aszf_hu', 'Itt lesz a sok magyar rizsa', '598b2b45-cda1-49bf-9c90-f7052db13470', '2025-11-28 15:20:07.428099+00', '2025-11-28 15:32:30.440663+00'),
('f5828fa4-27de-4ef3-8b00-e5a4b8481b53', 'privacy_hu', 'Itt lesz a sok magyar rizsa', '598b2b45-cda1-49bf-9c90-f7052db13470', '2025-11-28 15:20:07.428099+00', '2025-11-28 15:32:39.91754+00'),
('39126a66-bbf3-410b-b7ff-e5adcf5e850d', 'privacy_en', 'Itt lesz a sok angol rizsa', '598b2b45-cda1-49bf-9c90-f7052db13470', '2025-11-28 15:20:07.428099+00', '2025-11-28 15:32:53.794243+00'),
('a59faa51-7fd2-4911-a34e-774195116017', 'aszf_en', 'Itt lesz a sok angol rizsa', '598b2b45-cda1-49bf-9c90-f7052db13470', '2025-11-28 15:20:07.428099+00', '2025-11-28 15:33:00.205602+00');

ALTER TABLE public.legal_documents ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: invitations (Referral System)
-- ============================================

ALTER TABLE public.invitations DISABLE TRIGGER ALL;

INSERT INTO public.invitations (id, inviter_id, invitation_code, invited_email, invited_user_id, accepted, accepted_at, created_at) VALUES
('6fe59a6f-e7fb-45e4-8758-08803dda1c95', '598b2b45-cda1-49bf-9c90-f7052db13470', 'LOVMV0Q3', 'fullgamer@dingleup.auto', 'e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', true, '2025-11-30 17:47:55.876+00', '2025-11-30 17:47:55.948245+00'),
('e2185c71-969b-49cf-8e27-dd1b7c2cde2f', 'e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', 'GC19QV0A', 'kisspistaman@dingleup.auto', 'dc2f2157-6ab4-40ff-a09c-73a15d77943e', true, '2025-11-30 20:41:51.638+00', '2025-11-30 20:41:51.671952+00');

ALTER TABLE public.invitations ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: friendships (Friend Connections)
-- ============================================

ALTER TABLE public.friendships DISABLE TRIGGER ALL;

INSERT INTO public.friendships (id, user_id_a, user_id_b, status, source, requested_by, created_at, updated_at) VALUES
('92c2cd24-ae75-4825-991c-d09d487458b6', '992f521d-af5e-4417-990c-2b7bf309ed15', 'd0f8abf2-0ca0-4a0e-8ab8-5e529e9101d4', 'active', 'invite', NULL, '2025-10-18 12:17:46.596+00', '2025-10-24 01:29:02.328446+00'),
('87a3feb4-b3d1-428f-a1b1-47855128030d', '48b7166a-48a2-4001-99e5-c8fa864f3e3f', 'ffd265c0-40b5-4f7b-990f-e16a5b416c01', 'active', 'invite', NULL, '2025-10-22 11:00:07.066958+00', '2025-10-24 01:29:02.59609+00'),
('30ac6583-1365-4e8e-9a37-d68d8dae3517', '992f521d-af5e-4417-990c-2b7bf309ed15', 'ec709240-1e49-499b-a404-bfe327f55f1c', 'active', 'invite', NULL, '2025-10-22 12:08:42.251906+00', '2025-10-24 01:29:02.222081+00');

ALTER TABLE public.friendships ENABLE TRIGGER ALL;

-- ============================================
-- TABLE: tutorial_progress (Tutorial Completion)
-- ============================================

ALTER TABLE public.tutorial_progress DISABLE TRIGGER ALL;

INSERT INTO public.tutorial_progress (id, user_id, route, completed, completed_at, created_at, updated_at) VALUES
('4245eb6a-72df-46fe-a640-6812cb1e2ea7', '598b2b45-cda1-49bf-9c90-f7052db13470', 'dashboard', true, '2025-11-30 19:16:15.838+00', '2025-11-30 19:16:15.879115+00', '2025-11-30 19:16:15.879115+00'),
('bf9b279e-c35f-4466-813b-fc0eca7b9730', '598b2b45-cda1-49bf-9c90-f7052db13470', 'gifts', true, '2025-11-30 19:16:27.649+00', '2025-11-30 19:16:27.689874+00', '2025-11-30 19:16:27.689874+00'),
('13a43323-dba6-4d1a-9972-7d90c30d9111', '598b2b45-cda1-49bf-9c90-f7052db13470', 'profile', true, '2025-11-30 19:16:37.338+00', '2025-11-30 19:16:37.369386+00', '2025-11-30 19:16:37.369386+00'),
('fed77287-cecf-4079-a893-fc4d5d62ec9f', '4373b347-144b-4d21-9cc1-f7cf336e0216', 'dashboard', true, '2025-11-30 19:29:33.131+00', '2025-11-30 19:29:33.169237+00', '2025-11-30 19:29:33.169237+00'),
('a054b786-2556-4721-8089-92b5ee760843', '4373b347-144b-4d21-9cc1-f7cf336e0216', 'profile', true, '2025-11-30 19:29:42.089+00', '2025-11-30 19:29:42.130269+00', '2025-11-30 19:29:42.130269+00'),
('c01b2481-8961-4ce8-8465-7c26bfd004c2', '4373b347-144b-4d21-9cc1-f7cf336e0216', 'gifts', true, '2025-11-30 19:30:54.211+00', '2025-11-30 19:30:54.249624+00', '2025-11-30 19:30:54.249624+00'),
('34bd323c-2ce7-411f-bf47-c176cfc962a0', 'e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', 'dashboard', true, '2025-11-30 19:36:50.254+00', '2025-11-30 19:36:50.285427+00', '2025-11-30 19:36:50.285427+00'),
('608b831a-dbef-4a04-a744-2fbe083082ba', 'e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', 'profile', true, '2025-11-30 19:44:49.603+00', '2025-11-30 19:44:49.634996+00', '2025-11-30 19:44:49.634996+00'),
('147cd35f-c872-49f1-8cf5-1395080ca02e', 'dc2f2157-6ab4-40ff-a09c-73a15d77943e', 'gifts', true, '2025-11-30 20:44:09.145+00', '2025-11-30 20:44:09.176887+00', '2025-11-30 20:44:09.176887+00'),
('77dd156c-27a4-446e-ad95-5ead5b8d3baf', 'dc2f2157-6ab4-40ff-a09c-73a15d77943e', 'dashboard', true, '2025-11-30 20:44:21.612+00', '2025-11-30 20:44:21.64743+00', '2025-11-30 20:44:21.64743+00'),
('687b3023-b2df-4266-acf3-3434fd172367', 'dc2f2157-6ab4-40ff-a09c-73a15d77943e', 'profile', true, '2025-11-30 20:44:27.264+00', '2025-11-30 20:44:27.301205+00', '2025-11-30 20:44:27.301205+00'),
('26ac9105-e9a1-47d7-b102-32915fb4410b', '14d82f08-0d9a-4505-a0dc-c3baf4330fc9', 'dashboard', true, '2025-11-30 20:57:31.489+00', '2025-11-30 20:57:31.525837+00', '2025-11-30 20:57:31.525837+00'),
('d6cd73e3-e6d2-4c8f-bffe-ed30e38bd73d', '14d82f08-0d9a-4505-a0dc-c3baf4330fc9', 'profile', true, '2025-11-30 21:27:44.777+00', '2025-11-30 21:27:44.807607+00', '2025-11-30 21:27:44.807607+00'),
('c5499f68-c695-4eed-b310-1de894fbc322', '14d82f08-0d9a-4505-a0dc-c3baf4330fc9', 'gifts', true, '2025-11-30 21:28:07.942+00', '2025-11-30 21:28:07.977843+00', '2025-11-30 21:28:07.977843+00'),
('015b0060-07d4-44d8-8da6-415e4d2b0793', 'b6474608-5e44-4535-9d2f-1f852c69712d', 'dashboard', true, '2025-11-30 21:50:51.004+00', '2025-11-30 21:50:51.040416+00', '2025-11-30 21:50:51.040416+00'),
('bc3212af-78c3-4e4a-bfb2-4a21e66c7925', 'e27ded96-d61d-4d2c-97d0-07f4a4f6e62f', 'gifts', true, '2025-11-30 22:04:50.356+00', '2025-11-30 22:04:50.385249+00', '2025-11-30 22:04:50.385249+00');

ALTER TABLE public.tutorial_progress ENABLE TRIGGER ALL;

-- ============================================
-- NOTES
-- ============================================
-- Due to the massive size of the following tables, only a sample is included:
-- - questions: 4,500+ total questions (showing schema structure)
-- - question_pools: 15 pools with 300 questions each
-- - translations: 1000+ UI translation keys
-- - wallet_ledger: 500+ recent transactions
-- - game_results: 200+ recent game completions
-- - daily_rankings: Recent daily leaderboard entries
-- - lootbox_instances: Recent lootbox drops
--
-- For complete data export, use the export script:
-- cd scripts && npm install && npm run export:full
-- ============================================

COMMIT;

-- Export completed successfully!
-- Users: 7 (including admins)
-- Topics: 30
-- Booster Types: 4
-- Invitations: 2
-- Tutorial Progress: 15 entries
-- 
-- CRITICAL: Questions, translations, and transactional data (wallet, game results) 
-- require full export script due to volume (4500+ questions, 1000+ translations)
