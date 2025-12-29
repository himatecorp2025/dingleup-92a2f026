-- Create question pools with properly set correct flags
-- question_count is a generated column, don't insert into it

DO $$
DECLARE
  v_pool_order INTEGER;
  v_question_count INTEGER;
  v_topic_record RECORD;
  v_question_record RECORD;
  v_pool_questions jsonb[];
  v_pool_questions_en jsonb := '[]'::jsonb;
  v_offset INTEGER;
  v_questions_per_topic INTEGER := 5;
  v_total_pools INTEGER := 25;
  v_min_questions INTEGER := 100;
  v_fixed_answers jsonb;
  v_fixed_answers_en jsonb;
BEGIN
  -- Create pools
  FOR v_pool_order IN 1..v_total_pools LOOP
    v_pool_questions := ARRAY[]::jsonb[];
    v_pool_questions_en := '[]'::jsonb;
    v_question_count := 0;
    
    -- For each topic, get questions offset by pool_order
    FOR v_topic_record IN SELECT DISTINCT topic_id FROM questions WHERE correct_answer IS NOT NULL AND correct_answer != '' ORDER BY topic_id LOOP
      v_offset := (v_pool_order - 1) * v_questions_per_topic;
      
      FOR v_question_record IN 
        SELECT 
          q.id, 
          q.question, 
          q.answers,
          q.audience,
          q.third,
          q.topic_id,
          q.source_category,
          q.correct_answer,
          qt.question_text as en_question,
          qt.answer_a as en_a,
          qt.answer_b as en_b,
          qt.answer_c as en_c
        FROM questions q
        LEFT JOIN question_translations qt ON q.id = qt.question_id AND qt.lang = 'en'
        WHERE q.topic_id = v_topic_record.topic_id 
          AND q.correct_answer IS NOT NULL 
          AND q.correct_answer != ''
        ORDER BY q.id
        OFFSET v_offset
        LIMIT v_questions_per_topic
      LOOP
        -- Build fixed answers with correct flag
        SELECT jsonb_agg(
          jsonb_build_object(
            'key', elem->>'key',
            'text', elem->>'text',
            'correct', (elem->>'key' = v_question_record.correct_answer)
          )
        ) INTO v_fixed_answers
        FROM jsonb_array_elements(v_question_record.answers) elem;
        
        -- Build English fixed answers
        SELECT jsonb_agg(
          jsonb_build_object(
            'key', elem->>'key',
            'text', CASE 
              WHEN elem->>'key' = 'A' THEN COALESCE(v_question_record.en_a, elem->>'text')
              WHEN elem->>'key' = 'B' THEN COALESCE(v_question_record.en_b, elem->>'text')
              WHEN elem->>'key' = 'C' THEN COALESCE(v_question_record.en_c, elem->>'text')
              ELSE elem->>'text'
            END,
            'correct', (elem->>'key' = v_question_record.correct_answer)
          )
        ) INTO v_fixed_answers_en
        FROM jsonb_array_elements(v_question_record.answers) elem;
        
        -- Append Hungarian question to array
        v_pool_questions := array_append(v_pool_questions, jsonb_build_object(
          'id', v_question_record.id,
          'question', v_question_record.question,
          'answers', v_fixed_answers,
          'audience', v_question_record.audience,
          'third', v_question_record.third,
          'topic_id', v_question_record.topic_id,
          'source_category', v_question_record.source_category,
          'correct_answer', v_question_record.correct_answer
        ));
        
        -- Append English question to jsonb array
        v_pool_questions_en := v_pool_questions_en || jsonb_build_array(jsonb_build_object(
          'id', v_question_record.id,
          'question', COALESCE(v_question_record.en_question, v_question_record.question),
          'answers', v_fixed_answers_en,
          'audience', v_question_record.audience,
          'third', v_question_record.third,
          'topic_id', v_question_record.topic_id,
          'source_category', v_question_record.source_category,
          'correct_answer', v_question_record.correct_answer
        ));
        
        v_question_count := v_question_count + 1;
      END LOOP;
    END LOOP;
    
    -- Insert pool if it has enough questions (question_count is auto-generated)
    IF v_question_count >= v_min_questions THEN
      INSERT INTO question_pools (pool_order, questions, questions_en, version)
      VALUES (v_pool_order, v_pool_questions, v_pool_questions_en, 1);
      
      RAISE NOTICE 'Pool % created with % questions', v_pool_order, v_question_count;
    ELSE
      RAISE NOTICE 'Pool % skipped (only % questions)', v_pool_order, v_question_count;
    END IF;
  END LOOP;
END $$;