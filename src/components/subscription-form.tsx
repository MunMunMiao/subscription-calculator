"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CATEGORIES,
  CURRENCIES,
  INTERVALS,
  STATUSES,
  SUBSCRIPTION_TYPES,
  categoryLabels,
  intervalLabels,
  statusLabels,
  typeLabels,
  isCategory,
  type Category,
  type Currency,
  type Interval,
  type Status,
  type SubscriptionType,
} from "@/lib/catalog"
import { centsToAmount } from "@/lib/money"
import { toISODate } from "@/lib/spend"

export type SubscriptionFormValues = {
  name: string
  amount: number
  currency: Currency
  category: Category
  notes?: string | null
  type: SubscriptionType
  interval?: Interval | null
  intervalDays?: number | null
  chargeDate: string
  status: Status
}

export type SubscriptionRecord = {
  id: string
  name: string
  amountCents: number
  currency: Currency
  category: string
  notes?: string | null
  type: SubscriptionType
  interval?: Interval | null
  intervalDays?: number | null
  chargeDate: string
  status: Status
}

const emptyValues: SubscriptionFormValues = {
  name: "",
  amount: 0,
  currency: "USD",
  category: "other",
  notes: "",
  type: "recurring",
  interval: "monthly",
  intervalDays: 30,
  chargeDate: toISODate(new Date()),
  status: "active",
}

export function SubscriptionForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: SubscriptionRecord
  submitting?: boolean
  onSubmit: (values: SubscriptionFormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<SubscriptionFormValues>(() =>
    initial
      ? {
          name: initial.name,
          amount: centsToAmount(initial.amountCents),
          currency: initial.currency,
          category: isCategory(initial.category)
            ? initial.category
            : "other",
          notes: initial.notes ?? "",
          type: initial.type,
          interval: initial.interval ?? "monthly",
          intervalDays: initial.intervalDays ?? 30,
          chargeDate: initial.chargeDate,
          status: initial.status,
        }
      : emptyValues
  )

  function update<TKey extends keyof SubscriptionFormValues>(
    key: TKey,
    value: SubscriptionFormValues[TKey]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          ...values,
          notes: values.notes?.trim() ? values.notes : null,
          interval: values.type === "recurring" ? values.interval : null,
          intervalDays:
            values.type === "recurring" && values.interval === "custom"
              ? values.intervalDays
              : null,
        })
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="name">名称</Label>
        <Input
          id="name"
          required
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="例如 Netflix、GitHub Copilot"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="amount">金额</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={Number.isFinite(values.amount) ? values.amount : 0}
            onChange={(event) =>
              update("amount", Number.parseFloat(event.target.value) || 0)
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label>货币</Label>
          <Select
            value={values.currency}
            onValueChange={(value) => {
              if (value === "USD" || value === "CNY") update("currency", value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>类型</Label>
          <Select
            value={values.type}
            onValueChange={(value) => {
              if (value === "recurring" || value === "one_time") {
                update("type", value)
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSCRIPTION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>分类</Label>
          <Select
            value={values.category}
            onValueChange={(value) => {
              if (typeof value === "string" && isCategory(value)) {
                update("category", value)
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {categoryLabels[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {values.type === "recurring" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>计费周期</Label>
            <Select
              value={values.interval ?? "monthly"}
              onValueChange={(value) => {
                if (
                  value === "monthly" ||
                  value === "yearly" ||
                  value === "weekly" ||
                  value === "custom"
                ) {
                  update("interval", value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((interval) => (
                  <SelectItem key={interval} value={interval}>
                    {intervalLabels[interval]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {values.interval === "custom" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="intervalDays">每隔多少天</Label>
              <Input
                id="intervalDays"
                type="number"
                min="1"
                required
                value={values.intervalDays ?? 30}
                onChange={(event) =>
                  update(
                    "intervalDays",
                    Number.parseInt(event.target.value, 10) || 1
                  )
                }
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="status">状态</Label>
              <Select
                value={values.status}
                onValueChange={(value) => {
                  if (
                    value === "active" ||
                    value === "paused" ||
                    value === "cancelled"
                  ) {
                    update("status", value)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="chargeDate">
            {values.type === "recurring" ? "下次扣费日期" : "购买日期"}
          </Label>
          <Input
            id="chargeDate"
            type="date"
            required
            value={values.chargeDate}
            onChange={(event) => update("chargeDate", event.target.value)}
          />
        </div>
        {values.type === "one_time" || values.interval === "custom" ? (
          <div className="grid gap-1.5">
            <Label>状态</Label>
            <Select
              value={values.status}
              onValueChange={(value) => {
                if (
                  value === "active" ||
                  value === "paused" ||
                  value === "cancelled"
                ) {
                  update("status", value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">备注（可选）</Label>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes ?? ""}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="套餐、付款账号、取消注意事项……"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  )
}
