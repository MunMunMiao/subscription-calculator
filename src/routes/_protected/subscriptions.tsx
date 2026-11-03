import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontalIcon, PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { EmptySubscriptions } from "@/components/empty-subscriptions"
import {
  SubscriptionForm,
  type SubscriptionFormValues,
  type SubscriptionRecord,
} from "@/components/subscription-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  categoryLabel,
  intervalLabels,
  statusLabels,
  typeLabels,
} from "@/lib/catalog"
import { formatMoney } from "@/lib/money"
import { orpc } from "@/orpc/client"

export const Route = createFileRoute("/_protected/subscriptions")({
  validateSearch: z.object({
    seed: z.string().optional(),
  }),
  component: SubscriptionsPage,
})

function SubscriptionsPage() {
  const search = Route.useSearch()
  const queryClient = useQueryClient()
  const listQuery = useQuery(orpc.subscriptions.list.queryOptions())
  const items = (listQuery.data ?? []) as SubscriptionRecord[]
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SubscriptionRecord | undefined>()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.subscriptions.key() })

  const createMutation = useMutation(
    orpc.subscriptions.create.mutationOptions({
      onSuccess: async () => {
        toast.success("已添加订阅")
        setOpen(false)
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const updateMutation = useMutation(
    orpc.subscriptions.update.mutationOptions({
      onSuccess: async () => {
        toast.success("已更新订阅")
        setOpen(false)
        setEditing(undefined)
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const removeMutation = useMutation(
    orpc.subscriptions.remove.mutationOptions({
      onSuccess: async () => {
        toast.success("已删除订阅")
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const seedMutation = useMutation(
    orpc.subscriptions.seedDemo.mutationOptions({
      onSuccess: async (result) => {
        if (result.seeded) {
          toast.success("已载入示例订阅")
        } else {
          toast.message("已有数据，未重复载入示例")
        }
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const seedMutate = seedMutation.mutate
  useEffect(() => {
    if (search.seed === "1" && !listQuery.isLoading && items.length === 0) {
      seedMutate(undefined)
    }
  }, [search.seed, listQuery.isLoading, items.length, seedMutate])

  function submit(values: SubscriptionFormValues) {
    if (editing) {
      updateMutation.mutate({ ...values, id: editing.id })
      return
    }
    createMutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">订阅列表</h1>
          <p className="text-sm text-muted-foreground">
            管理周期性订阅和一次性费用。金额按最小货币单位存储（分 / 分）。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setOpen(true)
          }}
        >
          <PlusIcon data-icon="inline-start" />
          添加订阅
        </Button>
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">正在读取订阅…</p>
      ) : items.length === 0 ? (
        <EmptySubscriptions
          onCreate={() => {
            setEditing(undefined)
            setOpen(true)
          }}
          onSeed={() => seedMutation.mutate(undefined)}
          seeding={seedMutation.isPending}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>周期</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {categoryLabel(item.category)}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatMoney(item.amountCents, item.currency)}
                  </TableCell>
                  <TableCell>{typeLabels[item.type]}</TableCell>
                  <TableCell>
                    {item.type === "recurring" && item.interval
                      ? item.interval === "custom"
                        ? `每 ${item.intervalDays} 天`
                        : intervalLabels[item.interval]
                      : "—"}
                  </TableCell>
                  <TableCell>{item.chargeDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "active" ? "default" : "outline"}
                    >
                      {statusLabels[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" />}
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(item)
                            setOpen(true)
                          }}
                        >
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm(`删除「${item.name}」？`)) {
                              removeMutation.mutate({ id: item.id })
                            }
                          }}
                        >
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setEditing(undefined)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑订阅" : "添加订阅"}</DialogTitle>
            <DialogDescription>
              周期性项目填写下次扣费日；一次性项目填写购买日。
            </DialogDescription>
          </DialogHeader>
          <SubscriptionForm
            key={editing?.id ?? "new"}
            initial={editing}
            submitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={submit}
            onCancel={() => {
              setOpen(false)
              setEditing(undefined)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
