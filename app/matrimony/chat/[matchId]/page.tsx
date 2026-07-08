import { MatrimonyRouteShell } from "@/components/matrimony/matrimony-route-shell"

interface MatrimonyChatPageProps {
  params: Promise<{
    matchId: string
  }>
}

export default async function MatrimonyChatPage({ params }: MatrimonyChatPageProps) {
  const { matchId } = await params

  return <MatrimonyRouteShell initialScreen="chat" initialChatId={decodeURIComponent(matchId)} />
}
