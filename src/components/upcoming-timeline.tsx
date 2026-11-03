import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categoryLabel, typeLabels } from "@/lib/catalog"
import { formatMoney } from "@/lib/money"
import type { UpcomingCharge } from "@/lib/spend"

export function UpcomingTimeline({ charges }: { charges: UpcomingCharge[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>即将扣费</CardTitle>
        <CardDescription>未来 90 天内的续费与一次性费用</CardDescription>
      </CardHeader>
      <CardContent>
        {charges.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            暂无即将到来的扣费。暂停或取消的项目不会出现在这里。
          </p>
        ) : (
          <ol className="space-y-3">
            {charges.slice(0, 12).map((charge) => (
              <li
                key={charge.id}
                className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div>
                  <div className="font-medium">{charge.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {charge.date} · {categoryLabel(charge.category)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatMoney(charge.amountCents, charge.currency)}
                  </div>
                  <Badge variant="outline">{typeLabels[charge.type]}</Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
