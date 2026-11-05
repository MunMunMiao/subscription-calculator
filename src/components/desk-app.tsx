"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { DeskScene } from "@/components/desk-scene"
import {
  ComposeFace,
  SceneChart,
  SceneComposeHost,
  SceneFooter,
  SceneLanding,
  SceneList,
  SceneSummary,
  SceneTabs,
  SceneUpcoming,
  type FormValues,
  type PaperMode,
  type SubscriptionRecord,
} from "@/components/paper-ink"
import { isCategory, type Currency } from "@/lib/catalog"
import { gsap, useGSAP } from "@/lib/gsap"
import { authClient } from "@/lib/auth-client"
import { centsToAmount } from "@/lib/money"
import {
  categoryBreakdown,
  sixMonthForecast,
  toISODate,
  totalsByCurrency,
  upcomingCharges,
  usedCurrencies,
} from "@/lib/spend"
import { orpc } from "@/orpc/client"

export type DeskUser = {
  name: string
  email: string
  image?: string | null
} | null

const EMPTY_FORM: FormValues = {
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

function assertNever(value: never): never {
  throw new Error(`Unhandled paper mode: ${String(value)}`)
}

function recordToForm(item: SubscriptionRecord): FormValues {
  return {
    name: item.name,
    amount: centsToAmount(item.amountCents),
    currency: item.currency,
    category: isCategory(item.category) ? item.category : "other",
    notes: item.notes ?? "",
    type: item.type,
    interval: item.interval ?? "monthly",
    intervalDays: item.intervalDays ?? 30,
    chargeDate: item.chargeDate,
    status: item.status,
  }
}

function motionOf(node: Element) {
  return node.querySelector(".entity-motion") ?? node
}

export function DeskApp({ user }: { user: DeskUser }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<PaperMode>(user ? "summary" : "landing")
  const [editing, setEditing] = useState<SubscriptionRecord | undefined>()
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [currency, setCurrency] = useState<Currency>("USD")
  const [now] = useState(() => new Date())

  const listQuery = useQuery({
    ...orpc.subscriptions.list.queryOptions(),
    enabled: Boolean(user),
  })
  const items = (listQuery.data ?? []) as SubscriptionRecord[]
  const currencies = usedCurrencies(items)
  const activeCurrency = currencies.includes(currency)
    ? currency
    : (currencies[0] ?? "USD")
  const totals = totalsByCurrency(items, now).find(
    (item) => item.currency === activeCurrency
  )
  const charges = upcomingCharges(items, now, 90)
  const slices = categoryBreakdown(items, activeCurrency)
  const forecast = sixMonthForecast(items, activeCurrency, now)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.subscriptions.key() })

  const createMutation = useMutation(
    orpc.subscriptions.create.mutationOptions({
      onSuccess: async () => {
        toast.success("已记下")
        setEditing(undefined)
        setForm(EMPTY_FORM)
        setMode("list")
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const updateMutation = useMutation(
    orpc.subscriptions.update.mutationOptions({
      onSuccess: async () => {
        toast.success("已更新")
        setEditing(undefined)
        setForm(EMPTY_FORM)
        setMode("list")
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const removeMutation = useMutation(
    orpc.subscriptions.remove.mutationOptions({
      onSuccess: async () => {
        toast.success("已删除")
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const seedMutation = useMutation(
    orpc.subscriptions.seedDemo.mutationOptions({
      onSuccess: async (result) => {
        if (result.seeded) toast.success("已载入示例")
        else toast.message("已有记录")
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduceMotion)
          const duration = reduce ? 0 : 0.7
          gsap.set("#page", {
            rotation: -0.55,
            transformOrigin: "50% 50%",
          })
          const tl = gsap.timeline({
            defaults: { ease: "power2.out", duration },
          })
          tl.from(
            ".desk-prop",
            {
              autoAlpha: 0,
              scale: 0.86,
              y: 18,
              stagger: reduce ? 0 : 0.05,
              transformOrigin: "50% 50%",
            },
            0
          )
          tl.from(
            "#page",
            { rotation: -6, x: reduce ? 0 : -18, transformOrigin: "0% 50%" },
            0.12
          )
          if (!reduce) {
            tl.from(
              ".paper-line",
              { drawSVG: 0, stagger: 0.018, duration: 0.55 },
              0.18
            )
            tl.from(
              ".sparkle",
              { scale: 0, stagger: 0.07, ease: "back.out(2.2)" },
              0.42
            )
            gsap.to(".plant-leaf", {
              rotation: 2.6,
              transformOrigin: "50% 90%",
              yoyo: true,
              repeat: -1,
              duration: 2.6,
              stagger: 0.18,
              ease: "sine.inOut",
            })
            gsap.to(".sparkle", {
              scale: 1.18,
              autoAlpha: 0.72,
              yoyo: true,
              repeat: -1,
              duration: 1.15,
              stagger: 0.16,
              ease: "sine.inOut",
            })
            gsap.to(".pencil", {
              rotation: "+=1.6",
              yoyo: true,
              repeat: -1,
              duration: 3.2,
              ease: "sine.inOut",
            })
          }
        }
      )
      return () => mm.revert()
    },
    { scope: rootRef }
  )

  useGSAP(
    () => {
      const tape = gsap.utils.toArray<Element>("[id^='tab-']")
      const pens = gsap.utils.toArray<Element>(
        "#btn-write, #btn-sample, #btn-logout, #btn-login, [id^='list-']"
      )
      const cleanups: Array<() => void> = []

      for (const node of tape) {
        const motion = motionOf(node)
        const enter = () => {
          gsap.to(motion, { y: -3, rotation: -1, duration: 0.4 })
          if (node.getAttribute("data-state") !== "active") {
            node.setAttribute("data-state", "hover")
          }
        }
        const leave = () => {
          gsap.to(motion, { y: 0, rotation: 0, duration: 0.4 })
          if (node.getAttribute("data-state") === "hover") {
            node.setAttribute("data-state", "idle")
          }
        }
        node.addEventListener("pointerenter", enter)
        node.addEventListener("pointerleave", leave)
        cleanups.push(() => {
          node.removeEventListener("pointerenter", enter)
          node.removeEventListener("pointerleave", leave)
        })
      }

      for (const node of pens) {
        const motion = motionOf(node)
        const down = () => {
          gsap.to(motion, { scale: 0.98, y: 1, duration: 0.12 })
          node.setAttribute("data-state", "press")
        }
        const up = () => {
          gsap.to(motion, { scale: 1, y: 0, duration: 0.18 })
          if (node.getAttribute("data-state") === "press") {
            node.setAttribute("data-state", "idle")
          }
        }
        node.addEventListener("pointerdown", down)
        node.addEventListener("pointerup", up)
        node.addEventListener("pointerleave", up)
        cleanups.push(() => {
          node.removeEventListener("pointerdown", down)
          node.removeEventListener("pointerup", up)
          node.removeEventListener("pointerleave", up)
        })
      }

      return () => {
        for (const cleanup of cleanups) cleanup()
      }
    },
    { scope: rootRef, dependencies: [mode, user] }
  )

  useGSAP(
    () => {
      const page = document.querySelector("#page")
      const ink = document.querySelector("#ink-body")
      if (!page || !ink) return
      const mm = gsap.matchMedia()
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduce = Boolean(context.conditions?.reduceMotion)
          page.setAttribute("data-state", "turn")
          gsap.fromTo(
            ink,
            {
              x: reduce ? 0 : 18,
              rotation: reduce ? 0 : 2.2,
              transformOrigin: "0% 50%",
            },
            {
              x: 0,
              rotation: 0,
              duration: reduce ? 0 : 0.52,
              ease: "power2.out",
              onComplete: () => {
                page.setAttribute("data-state", "open")
              },
            }
          )
        }
      )
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [mode], revertOnUpdate: true }
  )

  function login() {
    void authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    })
  }

  async function logout() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const motion = document.querySelector("#btn-logout .entity-motion")
    const finish = () => {
      void authClient.signOut().then(() => {
        window.location.assign("/")
      })
    }
    if (!motion) {
      finish()
      return
    }
    document.querySelector("#btn-logout")?.setAttribute("data-state", "press")
    gsap.to(motion, {
      scale: 0.98,
      y: 1,
      duration: reduce ? 0 : 0.18,
      ease: "power2.in",
      onComplete: finish,
    })
  }

  function go(next: PaperMode) {
    if (next === "compose" && mode !== "compose") {
      setEditing(undefined)
      setForm(EMPTY_FORM)
    }
    setMode(next)
  }

  function openEdit(item: SubscriptionRecord) {
    setEditing(item)
    setForm(recordToForm(item))
    setMode("compose")
  }

  function submitForm(event: FormEvent) {
    event.preventDefault()
    const payload = {
      name: form.name,
      amount: form.amount,
      currency: form.currency,
      category: form.category,
      notes: form.notes.trim() ? form.notes : null,
      type: form.type,
      interval: form.type === "recurring" ? form.interval : null,
      intervalDays:
        form.type === "recurring" && form.interval === "custom"
          ? form.intervalDays
          : null,
      chargeDate: form.chargeDate,
      status: form.status,
    }
    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id })
      return
    }
    createMutation.mutate(payload)
  }

  function renderInk() {
    switch (mode) {
      case "landing":
        return <SceneLanding onLogin={login} />
      case "summary":
        return (
          <SceneSummary
            loading={listQuery.isLoading}
            items={items}
            totals={totals}
            currency={activeCurrency}
            currencies={currencies}
            onCurrency={setCurrency}
            onCompose={() => go("compose")}
            onSeed={() => seedMutation.mutate(undefined)}
            seeding={seedMutation.isPending}
          />
        )
      case "chart":
        return (
          <SceneChart
            loading={listQuery.isLoading}
            slices={slices}
            forecast={forecast}
            currency={activeCurrency}
          />
        )
      case "list":
        return (
          <SceneList
            loading={listQuery.isLoading}
            items={items}
            onEdit={openEdit}
            onDelete={(item) => {
              if (window.confirm(`删除「${item.name}」？`)) {
                removeMutation.mutate({ id: item.id })
              }
            }}
            onCompose={() => go("compose")}
            onSeed={() => seedMutation.mutate(undefined)}
            seeding={seedMutation.isPending}
          />
        )
      case "upcoming":
        return <SceneUpcoming loading={listQuery.isLoading} charges={charges} />
      case "compose":
        return (
          <SceneComposeHost>
            <ComposeFace
              form={form}
              setForm={setForm}
              editing={Boolean(editing)}
              submitting={createMutation.isPending || updateMutation.isPending}
              onSubmit={submitForm}
              onCancel={() => {
                setEditing(undefined)
                setForm(EMPTY_FORM)
                setMode("list")
              }}
            />
          </SceneComposeHost>
        )
      default:
        return assertNever(mode)
    }
  }

  return (
    <div ref={rootRef} className="desk-root">
      <DeskScene>
        {user ? <SceneTabs mode={mode} onGo={go} /> : null}
        <g
          id="ink-body"
          className="entity-motion"
          clipPath="url(#page-ink-clip)"
        >
          {renderInk()}
        </g>
        {user ? (
          <SceneFooter name={user.name} onLogout={() => void logout()} />
        ) : null}
      </DeskScene>
    </div>
  )
}
