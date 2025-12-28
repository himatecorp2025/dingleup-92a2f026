-- Fix missing/incorrect `answers[].correct` flags inside question pools
-- Derive the correct answer key from public.questions.correct_answer.

BEGIN;

-- 1) Hungarian pools: question_pools.questions is a SQL array of jsonb
UPDATE public.question_pools qp
SET questions = sub.fixed_questions
FROM (
  SELECT qp2.id,
         array_agg(q_fixed ORDER BY q_ord) AS fixed_questions
  FROM public.question_pools qp2
  CROSS JOIN LATERAL unnest(qp2.questions) WITH ORDINALITY AS q(q_json, q_ord)
  LEFT JOIN public.questions src
    ON src.id = (q.q_json->>'id')
  CROSS JOIN LATERAL (
    SELECT
      jsonb_set(
        q.q_json,
        '{answers}',
        (
          SELECT jsonb_agg(
                   (a.a_json - 'correct') || jsonb_build_object(
                     'correct',
                     CASE
                       WHEN src.correct_answer IS NULL THEN false
                       ELSE (a.a_json->>'key') = src.correct_answer
                     END
                   )
                   ORDER BY a.a_ord
                 )
          FROM jsonb_array_elements(q.q_json->'answers') WITH ORDINALITY AS a(a_json, a_ord)
        ),
        true
      ) AS q_fixed
  ) fixed
  GROUP BY qp2.id
) sub
WHERE qp.id = sub.id;

-- 2) English pools: question_pools.questions_en is jsonb (JSON array)
UPDATE public.question_pools qp
SET questions_en = sub.fixed_questions_en
FROM (
  SELECT qp2.id,
         jsonb_agg(q_fixed ORDER BY q_ord) AS fixed_questions_en
  FROM public.question_pools qp2
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(qp2.questions_en, '[]'::jsonb)) WITH ORDINALITY AS q(q_json, q_ord)
  LEFT JOIN public.questions src
    ON src.id = (q.q_json->>'id')
  CROSS JOIN LATERAL (
    SELECT
      jsonb_set(
        q.q_json,
        '{answers}',
        (
          SELECT jsonb_agg(
                   (a.a_json - 'correct') || jsonb_build_object(
                     'correct',
                     CASE
                       WHEN src.correct_answer IS NULL THEN false
                       ELSE (a.a_json->>'key') = src.correct_answer
                     END
                   )
                   ORDER BY a.a_ord
                 )
          FROM jsonb_array_elements(q.q_json->'answers') WITH ORDINALITY AS a(a_json, a_ord)
        ),
        true
      ) AS q_fixed
  ) fixed
  GROUP BY qp2.id
) sub
WHERE qp.id = sub.id;

COMMIT;