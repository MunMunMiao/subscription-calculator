import { WalletCardsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function EmptySubscriptions({
  onCreate,
  onSeed,
  seeding,
}: {
  onCreate: () => void
  onSeed: () => void
  seeding?: boolean
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WalletCardsIcon />
        </EmptyMedia>
        <EmptyTitle>还没有订阅</EmptyTitle>
        <EmptyDescription>
          添加
          Netflix、云服务、域名续费或一次性购买，就能在总览里看到月/年支出、分类占比和即将扣费日期。
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onCreate}>添加第一笔订阅</Button>
          <Button variant="outline" onClick={onSeed} disabled={seeding}>
            {seeding ? "正在载入示例…" : "载入示例数据"}
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}
