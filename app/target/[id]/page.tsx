import { notFound } from "next/navigation";
import { getChallenge, toPublicChallenge, challenges } from "@/lib/challenges";
import TargetClient from "@/components/TargetClient";

export function generateStaticParams() {
  return challenges.map((c) => ({ id: c.id }));
}

export default function TargetPage({ params }: { params: { id: string } }) {
  const challenge = getChallenge(params.id);
  if (!challenge) notFound();

  return <TargetClient challenge={toPublicChallenge(challenge)} />;
}
