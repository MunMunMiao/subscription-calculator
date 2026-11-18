import type { ReactNode } from "react"

import {
  CATEGORIES,
  CURRENCIES,
  INTERVALS,
  STATUSES,
  categoryLabels,
  currencyLabels,
  intervalLabels,
  statusLabels,
  typeLabels,
  type Category,
  type Currency,
  type Interval,
  type Status,
  type SubscriptionType,
} from "@/lib/catalog"
import { compactAmount, compactDate, formatMonthlyBanner } from "@/lib/desk-ink"
import { monthlyRecurringCents, type SpendItem } from "@/lib/spend"
import type { ContentWidgetId } from "@/lib/widget-machine"

const CHIP = ["#e27898", "#7eb8d4", "#6a9a4e", "#d4a84b", "#c48a6a", "#8a7bb8"]

const TITLES: Record<ContentWidgetId, string> = {
  category: "分类",
  subs: "订阅",
  charges: "扣费",
  compose: "记一笔",
}

export type DialogForm = {
  name: string
  amount: number
  currency: Currency
  category: Category
  notes: string
  type: SubscriptionType
  interval: Interval
  intervalDays: number
  chargeDate: string
  status: Status
}

type ChargeRow = {
  id: string
  name: string
  amountCents: number
  currency: Currency
  date: string
}

function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="dialog-paper">
      <header className="dialog-bar">
        <h2>{title}</h2>
        <button id="dialog-close" type="button" onClick={onClose}>
          关闭
        </button>
      </header>
      {children}
    </div>
  )
}

function CategoryDialog({
  items,
  onClose,
  onCategory,
}: {
  items: SpendItem[]
  onClose: () => void
  onCategory: (id: string, category: Category) => void
}) {
  return (
    <DialogShell title={TITLES.category} onClose={onClose}>
      <div className="chip-grid">
        {CATEGORIES.map((category, index) => {
          const count = items.filter(
            (item) => item.category === category
          ).length
          return (
            <div
              key={category}
              className="chip-cell"
              style={{ background: CHIP[index % CHIP.length] }}
            >
              <span>
                {categoryLabels[category]} {count}
              </span>
            </div>
          )
        })}
      </div>
      <ul className="dialog-list">
        {items.length === 0 ? <li>暂无分类</li> : null}
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <select
              aria-label={`${item.name} 分类`}
              value={
                CATEGORIES.includes(item.category as Category)
                  ? item.category
                  : "other"
              }
              onChange={(event) =>
                onCategory(item.id, event.target.value as Category)
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </DialogShell>
  )
}

function SubsDialog({
  items,
  onClose,
  onEdit,
  onDelete,
}: {
  items: SpendItem[]
  onClose: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <DialogShell title={TITLES.subs} onClose={onClose}>
      <ul className="dialog-list">
        {items.length === 0 ? <li>暂无订阅</li> : null}
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>
              {formatMonthlyBanner(monthlyRecurringCents(item), item.currency)}
            </span>
            <button type="button" onClick={() => onEdit(item.id)}>
              编辑
            </button>
            <button type="button" onClick={() => onDelete(item.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>
    </DialogShell>
  )
}

function ChargesDialog({
  charges,
  onClose,
}: {
  charges: ChargeRow[]
  onClose: () => void
}) {
  return (
    <DialogShell title={TITLES.charges} onClose={onClose}>
      <ol className="charge-timeline">
        {charges.length === 0 ? <li>暂无扣费</li> : null}
        {charges.map((charge) => (
          <li key={charge.id}>
            <time dateTime={charge.date}>{compactDate(charge.date)}</time>
            <span>{charge.name}</span>
            <span>{compactAmount(charge.amountCents, charge.currency)}</span>
          </li>
        ))}
      </ol>
    </DialogShell>
  )
}

function ComposeDialog({
  form,
  editing,
  submitting,
  onClose,
  onChange,
  onSubmit,
}: {
  form: DialogForm
  editing: boolean
  submitting: boolean
  onClose: () => void
  onChange: (patch: Partial<DialogForm>) => void
  onSubmit: () => void
}) {
  return (
    <DialogShell title={TITLES.compose} onClose={onClose}>
      <form
        id="compose-form"
        className="compose-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <label>
          名称
          <input
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label>
          金额
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              onChange({ amount: Number(event.target.value) })
            }
          />
        </label>
        <label>
          币种
          <select
            value={form.currency}
            onChange={(event) =>
              onChange({ currency: event.target.value as Currency })
            }
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currencyLabels[currency]}
              </option>
            ))}
          </select>
        </label>
        <label>
          分类
          <select
            value={form.category}
            onChange={(event) =>
              onChange({ category: event.target.value as Category })
            }
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </label>
        <label>
          类型
          <select
            value={form.type}
            onChange={(event) =>
              onChange({ type: event.target.value as SubscriptionType })
            }
          >
            <option value="recurring">{typeLabels.recurring}</option>
            <option value="one_time">{typeLabels.one_time}</option>
          </select>
        </label>
        {form.type === "recurring" ? (
          <label>
            周期
            <select
              value={form.interval}
              onChange={(event) =>
                onChange({ interval: event.target.value as Interval })
              }
            >
              {INTERVALS.map((interval) => (
                <option key={interval} value={interval}>
                  {intervalLabels[interval]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {form.type === "recurring" && form.interval === "custom" ? (
          <label>
            天数
            <input
              type="number"
              min="1"
              value={form.intervalDays}
              onChange={(event) =>
                onChange({ intervalDays: Number(event.target.value) })
              }
            />
          </label>
        ) : null}
        <label>
          下次扣费
          <input
            type="date"
            value={form.chargeDate}
            onChange={(event) => onChange({ chargeDate: event.target.value })}
          />
        </label>
        <label>
          状态
          <select
            value={form.status}
            onChange={(event) =>
              onChange({ status: event.target.value as Status })
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          备注
          <textarea
            value={form.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "保存中…" : editing ? "更新" : "保存"}
        </button>
      </form>
    </DialogShell>
  )
}

export function DeskDialogMount({
  widget,
  items,
  charges,
  form,
  editing,
  submitting,
  onClose,
  onEdit,
  onDelete,
  onCategory,
  onChange,
  onSubmit,
}: {
  widget: ContentWidgetId | null
  items: SpendItem[]
  charges: ChargeRow[]
  form: DialogForm
  editing: boolean
  submitting: boolean
  onClose: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onCategory: (id: string, category: Category) => void
  onChange: (patch: Partial<DialogForm>) => void
  onSubmit: () => void
}) {
  let body: ReactNode = null
  if (widget === "category") {
    body = (
      <CategoryDialog items={items} onClose={onClose} onCategory={onCategory} />
    )
  } else if (widget === "subs") {
    body = (
      <SubsDialog
        items={items}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )
  } else if (widget === "charges") {
    body = <ChargesDialog charges={charges} onClose={onClose} />
  } else if (widget === "compose") {
    body = (
      <ComposeDialog
        form={form}
        editing={editing}
        submitting={submitting}
        onClose={onClose}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    )
  } else if (widget !== null) {
    const _never: never = widget
    body = _never
  }

  return (
    <g id="desk-dialog" pointerEvents="none">
      {widget ? (
        <foreignObject
          x="270"
          y="120"
          width="740"
          height="560"
          pointerEvents="auto"
        >
          <div
            {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
            className="dialog-host"
          >
            {body}
          </div>
        </foreignObject>
      ) : null}
    </g>
  )
}
