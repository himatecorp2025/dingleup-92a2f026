import { memo } from 'react';
import { MillionaireAnswer } from '@/components/MillionaireAnswer';
import { Question } from '@/types/game';

interface GameAnswersProps {
  question: Question;
  selectedAnswer: string | null;
  firstAttempt: string | null;
  secondAttempt: string | null;
  removedAnswer: string | null;
  audienceVotes: Record<string, number>;
  isDoubleAnswerActive: boolean;
  isAudienceActive: boolean;
  disabled: boolean;
  onAnswerSelect: (answerKey: string) => void;
}

export const GameAnswers = memo(({
  question,
  selectedAnswer,
  firstAttempt,
  secondAttempt,
  removedAnswer,
  audienceVotes,
  isDoubleAnswerActive,
  isAudienceActive,
  disabled,
  onAnswerSelect
}: GameAnswersProps) => {
  // CRITICAL: Check if any answer is selected (means user answered)
  const hasAnswered = selectedAnswer !== null;
  
  // Find the correct answer for this question
  const correctAnswerKey = question.answers.find(a => a.correct === true)?.key;
  
  // Find if the selected answer was wrong
  const selectedWasWrong = hasAnswered && question.answers.find(a => a.key === selectedAnswer)?.correct === false;
  
  return (
    <div className="space-y-3 px-4 mb-6">
      {question.answers.map((answer) => {
        const isRemoved = removedAnswer === answer.key;
        const isSelected = selectedAnswer === answer.key;
        const isCorrectAnswer = answer.correct === true;
        
        // CRITICAL BUG FIX: Show correct answer in GREEN when:
        // 1. This is the correct answer AND
        // 2. User has answered (regardless of whether their answer was right or wrong)
        // This ensures the correct answer ALWAYS shows in green after any selection
        const showAsCorrect = isCorrectAnswer && hasAnswered;
        
        // PULSE: Show pulse animation ONLY when user selected wrong (to highlight correct)
        // OR when user selected this correct answer
        const showCorrectPulse = isCorrectAnswer && hasAnswered && (selectedWasWrong || isSelected);
        
        // Show as wrong only if user selected THIS wrong answer
        const isWrongAnswer = isSelected && !isCorrectAnswer;
        const isFirstAttemptWrong = isDoubleAnswerActive && firstAttempt === answer.key && !isCorrectAnswer;
        const isSecondAttemptWrong = isDoubleAnswerActive && secondAttempt === answer.key && !isCorrectAnswer;
        
        // Audience votes: show on ALL answers when active
        const audienceVote = isAudienceActive ? audienceVotes[answer.key] : undefined;

        return (
          <MillionaireAnswer
            key={answer.key}
            letter={answer.key}
            isCorrect={showAsCorrect}
            isSelected={isSelected}
            isWrong={isWrongAnswer || isFirstAttemptWrong || isSecondAttemptWrong}
            isRemoved={isRemoved}
            isDoubleChoiceActive={isDoubleAnswerActive && !hasAnswered}
            showCorrectPulse={showCorrectPulse}
            onClick={() => !disabled && !isRemoved && onAnswerSelect(answer.key)}
            disabled={disabled || isRemoved}
          >
            {answer.text}
            {audienceVote !== undefined && (
              <span className="ml-2 text-sm opacity-70">({audienceVote}%)</span>
            )}
          </MillionaireAnswer>
        );
      })}
    </div>
  );
});

GameAnswers.displayName = 'GameAnswers';
