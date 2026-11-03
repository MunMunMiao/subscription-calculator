export const CURRENCIES = ["USD", "CNY"] as const
export const SUBSCRIPTION_TYPES = ["recurring", "one_time"] as const
export const INTERVALS = ["monthly", "yearly", "weekly", "custom"] as const
export const STATUSES = ["active", "paused", "cancelled"] as const
export const CATEGORIES = [
  "streaming",
  "software",
  "cloud",
  "food",
  "health",
  "education",
  "finance",
  "insurance",
  "other",
] as const

export type Currency = (typeof CURRENCIES)[number]
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number]
export type Interval = (typeof INTERVALS)[number]
export type Status = (typeof STATUSES)[number]
export type Category = (typeof CATEGORIES)[number]

export const currencyLabels: Record<Currency, string> = {
  USD: "USD",
  CNY: "CNY",
}

export const typeLabels: Record<SubscriptionType, string> = {
  recurring: "周期性订阅",
  one_time: "一次性费用",
}

export const intervalLabels: Record<Interval, string> = {
  monthly: "每月",
  yearly: "每年",
  weekly: "每周",
  custom: "自定义天数",
}

export const statusLabels: Record<Status, string> = {
  active: "生效中",
  paused: "已暂停",
  cancelled: "已取消",
}

export const categoryLabels: Record<Category, string> = {
  streaming: "流媒体",
  software: "软件",
  cloud: "云服务",
  food: "餐饮",
  health: "健康",
  education: "教育",
  finance: "金融",
  insurance: "保险",
  other: "其他",
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

export function categoryLabel(value: string): string {
  return isCategory(value) ? categoryLabels[value] : value
}
