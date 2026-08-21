import { notFound } from "next/navigation";
import { getChallenge, toPublicChallenge, challenges } from "@/lib/challenges";
import { getAgentChallenge, toPublicAgentChallenge, agentChallenges } from "@/lib/agent-challenges";
import TargetClient from "@/components/TargetClient";
import AgenticTargetClient from "@/components/AgenticTargetClient";

export function generateStaticParams() {
  return [...challenges.map((c) => ({ id: c.id })), ...agentChallenges.map((c) => ({ id: c.id }))];
}

export default function TargetPage({ params }: { params: { id: string } }) {
  const challenge = getChallenge(params.id);
  if (challenge) return <TargetClient challenge={toPublicChallenge(challenge)} />;

  const agentChallenge = getAgentChallenge(params.id);
  if (agentChallenge) return <AgenticTargetClient challenge={toPublicAgentChallenge(agentChallenge)} />;

  notFound();
}
