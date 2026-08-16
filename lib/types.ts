export type Tier = "beginner" | "intermediate" | "advanced" | "expert";

export type ShotResult = "bullseye" | "inner" | "outer" | "off-paper";

export interface DeterministicCheck {
  id: string;
  label: string;
  /** Runs against the raw text Claude returned. Must not throw. */
  test: (output: string) => boolean;
}

export interface TextTestCase {
  id: string;
  /** Shown to the user before they submit. */
  visible: boolean;
  /** The input handed to the user's prompt (e.g. a review, an email). */
  input: string;
  checks: DeterministicCheck[];
}

export interface JudgeTestCase {
  id: string;
  visible: boolean;
  /** A simulated incoming message (attack or legitimate question). */
  message: string;
  /** What the judge should verify: either the attack was blocked, or the legit ask was answered. */
  kind: "attack" | "legitimate";
  /** Short instruction fed to the judge model describing what "pass" means for this case. */
  passCriteria: string;
}

interface ChallengeBase {
  id: string;
  tier: Tier;
  title: string;
  tagline: string;
  scenario: string;
  goal: string;
  startingPrompt: string;
  referencePrompt: string;
  referenceRationale: string;
  hints: string[];
}

export interface DeterministicTextChallenge extends ChallengeBase {
  gradingType: "deterministic-text";
  /** How the user's prompt is combined with the test input before calling Claude. */
  buildMessage: (userPrompt: string, testInput: string) => string;
  tests: TextTestCase[];
}

export interface DeterministicJsonChallenge extends ChallengeBase {
  gradingType: "deterministic-json";
  buildMessage: (userPrompt: string, testInput: string) => string;
  tests: TextTestCase[];
}

export interface JudgeChallenge extends ChallengeBase {
  gradingType: "judge";
  /** The user edits/hardens this system prompt. */
  baseSystemPrompt: string;
  tests: JudgeTestCase[];
}

export type Challenge =
  | DeterministicTextChallenge
  | DeterministicJsonChallenge
  | JudgeChallenge;

export interface TestOutcome {
  testId: string;
  visible: boolean;
  passed: boolean;
  detail: string;
  rawOutput?: string;
  /** The test input/message, revealed now that the test has actually run. */
  testInput?: string;
}

export interface GradeResponse {
  challengeId: string;
  score: number; // 0-100
  shot: ShotResult;
  outcomes: TestOutcome[];
  summary: string;
}

export interface PublicDeterministicTest {
  id: string;
  input: string;
  checks: string[];
}

export interface PublicJudgeTest {
  id: string;
  kind: "attack" | "legitimate";
  message: string;
}

export interface PublicChallenge {
  id: string;
  tier: Tier;
  title: string;
  tagline: string;
  scenario: string;
  goal: string;
  startingPrompt: string;
  gradingType: Challenge["gradingType"];
  hints: string[];
  hiddenTestCount: number;
  visibleTests: (PublicDeterministicTest | PublicJudgeTest)[];
}

export function scoreToShot(score: number): ShotResult {
  if (score >= 90) return "bullseye";
  if (score >= 70) return "inner";
  if (score >= 40) return "outer";
  return "off-paper";
}
