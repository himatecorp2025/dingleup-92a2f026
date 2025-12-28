import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRITICAL: 20 GLOBAL POOLS (pool_1 through pool_20)
// Each pool contains 300 questions (30 topics × 10 questions/topic)
// 6000 questions total => 20 pools
const TOTAL_POOLS = 20;
const MIN_QUESTIONS_PER_POOL = 300;
const QUESTIONS_PER_TOPIC_PER_POOL = 10; // Each pool gets max 10 questions from each topic

interface Question {
  id: string;
  question: string;
  answers: any[];
  audience: number[];
  third: string;
  topic_id: number;
  source_category: string;
  correct_answer: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin role required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get ALL questions with proper pagination (PostgREST default limit is 1000)
    // CRITICAL: Only fetch questions that have correct_answer set (exclude broken questions)
    const batchSize = 1000;
    let allQuestions: any[] = [];
    let offset = 0;

    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from('questions')
        .select('*')
        .not('correct_answer', 'is', null)
        .neq('correct_answer', '')
        .range(offset, offset + batchSize - 1);

      if (batchError) {
        throw new Error(`Failed to fetch questions: ${batchError.message}`);
      }

      if (!batch || batch.length === 0) break;

      allQuestions = allQuestions.concat(batch);
      offset += batchSize;

      if (batch.length < batchSize) break;
    }

    const questions = allQuestions as Question[];

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid questions found (all missing correct_answer)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Total VALID questions available: ${questions.length} (with correct_answer set)`);

    // Fetch ALL English translations with pagination
    let allEnTranslations: any[] = [];
    offset = 0;

    while (true) {
      const { data: transBatch, error: transBatchError } = await supabase
        .from('question_translations')
        .select('question_id, question_text, answer_a, answer_b, answer_c')
        .eq('lang', 'en')
        .range(offset, offset + batchSize - 1);

      if (transBatchError) {
        console.error('Failed to fetch translations:', transBatchError);
        break;
      }

      if (!transBatch || transBatch.length === 0) break;

      allEnTranslations = allEnTranslations.concat(transBatch);
      offset += batchSize;

      if (transBatch.length < batchSize) break;
    }

    const enTranslations = allEnTranslations;

    // Create lookup map for English translations
    const enTransMap = new Map<string, { question_text: string; answer_a: string; answer_b: string; answer_c: string }>();
    (enTranslations || []).forEach((t: any) => {
      enTransMap.set(t.question_id, {
        question_text: t.question_text,
        answer_a: t.answer_a,
        answer_b: t.answer_b,
        answer_c: t.answer_c,
      });
    });

    console.log(`English translations loaded: ${enTransMap.size}`);

    // Group questions by topic_id
    const questionsByTopic = new Map<number, Question[]>();
    questions.forEach((q: Question) => {
      if (!questionsByTopic.has(q.topic_id)) {
        questionsByTopic.set(q.topic_id, []);
      }
      questionsByTopic.get(q.topic_id)!.push(q);
    });

    const topicIds = Array.from(questionsByTopic.keys());
    console.log(`Found ${topicIds.length} unique topics`);

    // Shuffle questions within each topic
    topicIds.forEach(topicId => {
      const topicQuestions = questionsByTopic.get(topicId)!;
      for (let i = topicQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topicQuestions[i], topicQuestions[j]] = [topicQuestions[j], topicQuestions[i]];
      }
    });

    console.log(`[regenerate-pools] Creating ${TOTAL_POOLS} global pools with ${QUESTIONS_PER_TOPIC_PER_POOL} questions per topic per pool (target: ~300 questions/pool)`);

    // Delete ALL existing pools
    const { error: deleteError } = await supabase
      .from('question_pools')
      .delete()
      .neq('pool_order', 0); // Delete all

    if (deleteError) {
      console.error('Error deleting old pools:', deleteError);
    }

    // Create 50 GLOBAL pools with equal topic distribution
    const pools = [];
    const topicPointers = new Map<number, number>(); // Track position in each topic
    topicIds.forEach(id => topicPointers.set(id, 0));

    for (let poolOrder = 1; poolOrder <= TOTAL_POOLS; poolOrder++) {
      const poolQuestions: Question[] = [];

      // Get up to 10 questions from EACH topic (use ALL remaining questions even if < 10)
      for (const topicId of topicIds) {
        const topicQuestions = questionsByTopic.get(topicId)!;
        const startIdx = topicPointers.get(topicId)!;
        
        // Skip if no more questions available
        if (startIdx >= topicQuestions.length) {
          continue; // Topic exhausted
        }
        
        // Take as many questions as available (up to 10)
        const remainingQuestions = topicQuestions.length - startIdx;
        const questionsToTake = Math.min(QUESTIONS_PER_TOPIC_PER_POOL, remainingQuestions);
        const questionsToAdd = topicQuestions.slice(startIdx, startIdx + questionsToTake);
        
        poolQuestions.push(...questionsToAdd);
        
        // Update pointer
        const newPointer = startIdx + questionsToTake;
        topicPointers.set(topicId, newPointer);
        
        console.log(`[regenerate-pools] Pool ${poolOrder}, Topic ${topicId}: added ${questionsToAdd.length} questions (pointer now at ${newPointer}/${topicQuestions.length})`);
      }

      // Shuffle the pool so topics are mixed (not grouped)
      for (let i = poolQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolQuestions[i], poolQuestions[j]] = [poolQuestions[j], poolQuestions[i]];
      }

      // Create English version of pool questions
      // CRITICAL: Ensure correct answer flag is properly set based on correct_answer field
      const poolQuestionsEn = poolQuestions.map((q: Question) => {
        const enTrans = enTransMap.get(q.id);
        const correctKey = q.correct_answer; // 'A', 'B', 'C', or 'D'
        
        // Fix answers with correct flag based on correct_answer
        const fixedAnswers = q.answers.map((a: any) => ({
          ...a,
          correct: a.key === correctKey,
        }));
        
        if (enTrans) {
          return {
            ...q,
            question: enTrans.question_text,
            answers: fixedAnswers.map((a: any, idx: number) => ({
              ...a,
              text: idx === 0 ? enTrans.answer_a : idx === 1 ? enTrans.answer_b : enTrans.answer_c,
            })),
          };
        }
        return { ...q, answers: fixedAnswers }; // Hungarian with fixed correct flags
      });
      
      // Also fix Hungarian version's correct flags
      const poolQuestionsFixed = poolQuestions.map((q: Question) => {
        const correctKey = q.correct_answer;
        return {
          ...q,
          answers: q.answers.map((a: any) => ({
            ...a,
            correct: a.key === correctKey,
          })),
        };
      });

      if (poolQuestionsFixed.length >= MIN_QUESTIONS_PER_POOL) {
        pools.push({
          pool_order: poolOrder,
          questions: poolQuestionsFixed,
          questions_en: poolQuestionsEn,
          question_count: poolQuestions.length,
          version: 1,
        });
        console.log(`[regenerate-pools] ✓ Pool ${poolOrder}: ${poolQuestions.length} questions (${topicIds.length} topics mixed)`);
      } else {
        console.log(`[regenerate-pools] ✗ Pool ${poolOrder} skipped (only ${poolQuestions.length} questions, minimum is ${MIN_QUESTIONS_PER_POOL})`);
      }
    }

    console.log(`[regenerate-pools] Created ${pools.length} pools with EQUAL TOPIC DISTRIBUTION (${QUESTIONS_PER_TOPIC_PER_POOL} per topic per pool)`);

    // Insert all pools
    const { data: insertedPools, error: insertError } = await supabase
      .from('question_pools')
      .insert(pools)
      .select('id, pool_order, question_count');

    if (insertError) {
      throw new Error(`Failed to insert pools: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_questions: questions.length,
        pools_created: pools.length,
        topics_count: topicIds.length,
        questions_per_topic_per_pool: QUESTIONS_PER_TOPIC_PER_POOL,
        expected_questions_per_pool: topicIds.length * QUESTIONS_PER_TOPIC_PER_POOL,
        pools: insertedPools,
         note: `20 GLOBAL pools created with ${QUESTIONS_PER_TOPIC_PER_POOL} questions per topic per pool (currently ${topicIds.length} topics = ${topicIds.length * QUESTIONS_PER_TOPIC_PER_POOL} questions/pool)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[regenerate-pools] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
