import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { WorldDeepeningQuestion } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";

interface WorldDeepeningTabProps {
  questions: WorldDeepeningQuestion[];
  answerDrafts: Record<string, string>;
  setAnswerDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  llmQuickOptions: Record<string, string[]>;
  generatePending: boolean;
  submitPending: boolean;
  onGenerate: () => void;
  onSubmit: () => void;
}

export default function WorldDeepeningTab(props: WorldDeepeningTabProps) {
  const {
    questions,
    answerDrafts,
    setAnswerDrafts,
    llmQuickOptions,
    generatePending,
    submitPending,
    onGenerate,
    onSubmit,
  } = props;
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const activeQuestion = useMemo(() => {
    if (questions.length === 0) {
      return null;
    }
    return questions.find((question) => question.id === activeQuestionId) ?? questions[0];
  }, [activeQuestionId, questions]);
  const activeQuickOptions = activeQuestion
    ? (activeQuestion.quickOptions ?? llmQuickOptions[activeQuestion.id] ?? [])
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 4)
    : [];
  const answeredCount = questions.filter((question) => answerDrafts[question.id]?.trim()).length;

  return (
    <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Complete key settings</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">The AI will find the gaps in the manual that most affect the story, and you just need to choose a direction or answer with a sentence.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl bg-primary/[0.055] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-medium">Find the next batch of critical questions</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              Focus on a small number of high-impact questions at a time, and the answers are integrated into the rules, factions, locations, or conflict settings.
            </div>
          </div>
          <Button className="shrink-0 rounded-full" onClick={onGenerate} disabled={generatePending}>
            {generatePending ? "Generating..." : "Generate completion questions"}
          </Button>
        </div>

        {questions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <div className="space-y-2 rounded-3xl bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="px-2 text-sm font-medium">Questions to be answered</div>
                <div className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</div>
              </div>
              {questions.map((question, index) => {
                const answered = Boolean(answerDrafts[question.id]?.trim());
                const selected = activeQuestion?.id === question.id;
                return (
                  <button
                    key={question.id}
                    type="button"
                    className={[
                      "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                      selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60",
                    ].join(" ")}
                    onClick={() => setActiveQuestionId(question.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">Question {index + 1}</span>
                      <span className={answered ? "text-xs text-primary" : "text-xs text-muted-foreground"}>
                        {answered ? "There is an answer" : "To be answered"}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {question.question}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeQuestion ? (
              <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
                <div>
                  <div className="text-sm font-medium text-foreground">{activeQuestion.question}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    This answer will be used to complete the World Manual.
                  </div>
                </div>
                {activeQuickOptions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Answer directions that can be taken directly</div>
                    <div className="flex flex-wrap gap-2">
                      {activeQuickOptions.map((option) => (
                        <Button
                          key={`${activeQuestion.id}-${option}`}
                          size="sm"
                          variant={answerDrafts[activeQuestion.id] === option ? "default" : "outline"}
                          className="h-auto rounded-2xl whitespace-normal text-left"
                          onClick={() =>
                            setAnswerDrafts((prev) => ({ ...prev, [activeQuestion.id]: option }))
                          }
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-muted/20 p-3 text-xs text-muted-foreground">
                    You can write your set answer directly, or you can describe the direction in one sentence first.
                  </div>
                )}
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-border/45 bg-background/80 p-3 text-sm leading-6"
                  value={answerDrafts[activeQuestion.id] ?? ""}
                  onChange={(event) =>
                    setAnswerDrafts((prev) => ({ ...prev, [activeQuestion.id]: event.target.value }))
                  }
                  placeholder="Fill out this setting supplement"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl bg-muted/20 px-6 text-center">
            <div className="font-medium">Critical gaps in the world waiting to be discovered</div>
            <div className="mt-1 text-sm text-muted-foreground">After generating a question, you can select suggested directions one by one or add your own settings.</div>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            className="rounded-full"
            onClick={onSubmit}
            disabled={submitPending || answeredCount === 0 || questions.length === 0}
          >
            {submitPending ? "Integrating..." : "Submit and consolidate answers"}
          </Button>
        </div>
    </section>
  );
}
