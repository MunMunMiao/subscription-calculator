"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { DeskScene } from "@/components/desk-scene"
import {
  ComposeFace,
  SceneChart,
  SceneComposeActions,
  SceneComposeHost,
  SceneFooter,
  SceneLanding,
  SceneList,
  SceneSummary,
  SceneTabs,
  SceneUpcoming,
  type FormValues,
  type SubscriptionRecord,
} from "@/components/paper-ink"
import { isCategory, type Currency } from "@/lib/catalog"
import { isE2ePreviewUser } from "@/lib/e2e-preview"
import { gsap, useGSAP } from "@/lib/gsap"
import { authClient } from "@/lib/auth-client"
import { centsToAmount, parseAmountToCents } from "@/lib/money"
import {
  applyScenePose,
  bindStickers,
  bootScene,
  enterCompose,
  exitCompose,
  JUST_AUTHED_KEY,
  playAmbient,
  playClosing,
  playInkGrow,
  playOpening,
  playTabFlip,
  reduceScene,
  tabSelector,
  type BrowseTab,
  type SceneEvent,
  type SceneName,
  type SceneSnapshot,
} from "@/lib/scene"
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
  throw new Error(`Unhandled scene: ${String(value)}`)
}

function formToRecord(form: FormValues, id: string): SubscriptionRecord {
  return {
    id,
    name: form.name,
    amountCents: parseAmountToCents(form.amount),
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

export function DeskApp({ user }: { user: DeskUser }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [snap, setSnap] = useState<SceneSnapshot>(() =>
    bootScene({ user: Boolean(user), justAuthed: false })
  )
  const [returnTab, setReturnTab] = useState<BrowseTab>("overview")
  const [editing, setEditing] = useState<SubscriptionRecord | undefined>()
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [currency, setCurrency] = useState<Currency>("USD")
  const [now] = useState(() => new Date())
  const [e2eItems, setE2eItems] = useState<SubscriptionRecord[]>([])
  const prevTab = useRef<BrowseTab>("overview")
  const prevScene = useRef<SceneName>(snap.scene)
  const scene = snap.scene
  const tab = snap.tab
  const locked = snap.locked
  const e2eMode = isE2ePreviewUser(user)

  function dispatch(event: SceneEvent) {
    setSnap((current) => reduceScene(current, event))
  }

  const listQuery = useQuery({
    ...orpc.subscriptions.list.queryOptions(),
    enabled: Boolean(user) && scene !== "sealed" && !e2eMode,
  })
  const items = e2eMode
    ? e2eItems
    : ((listQuery.data ?? []) as SubscriptionRecord[])
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

  function settleSavedCompose() {
    const tl = exitCompose(true)
    tl.eventCallback("onComplete", () => {
      dispatch({ type: "compose-saved", tab: returnTab })
    })
  }

  const createMutation = useMutation(
    orpc.subscriptions.create.mutationOptions({
      onSuccess: async () => {
        toast.success("已记下")
        setEditing(undefined)
        setForm(EMPTY_FORM)
        await invalidate()
        settleSavedCompose()
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
        await invalidate()
        settleSavedCompose()
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

  useEffect(() => {
    if (!user) return
    if (sessionStorage.getItem(JUST_AUTHED_KEY) !== "1") return
    sessionStorage.removeItem(JUST_AUTHED_KEY)
    const id = window.setTimeout(() => dispatch({ type: "login-success" }), 0)
    return () => window.clearTimeout(id)
  }, [user])

  useEffect(() => {
    const stage = rootRef.current?.querySelector("#stage")
    stage?.setAttribute("data-scene", scene)
    const page = rootRef.current?.querySelector("#page")
    page?.setAttribute(
      "data-state",
      scene === "sealed" || scene === "closing" ? "sealed" : "open"
    )
  }, [scene])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduce = Boolean(context.conditions?.reduceMotion)
          gsap.set("#page", { rotation: -0.55, transformOrigin: "50% 50%" })
          if (!reduce) {
            gsap.from(".paper-line", {
              drawSVG: 0,
              stagger: 0.018,
              duration: 0.55,
            })
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
            playAmbient()
          }
        }
      )
      return () => mm.revert()
    },
    { scope: rootRef }
  )

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      return bindStickers(root, () => locked)
    },
    { scope: rootRef, dependencies: [scene, tab, user] }
  )

  useGSAP(
    () => {
      applyScenePose(scene)
      if (scene === "opening") {
        const tl = playOpening(() => {
          dispatch({ type: "opening-done" })
        })
        return () => tl.kill()
      }
      if (scene === "closing") {
        const tl = playClosing(() => {
          dispatch({ type: "closing-done" })
          void authClient.signOut().then(() => {
            window.location.assign("/")
          })
        })
        return () => tl.kill()
      }
      if (scene === "compose") {
        const tl = enterCompose()
        return () => tl.kill()
      }
    },
    { scope: rootRef, dependencies: [scene] }
  )

  useGSAP(
    () => {
      if (scene === "browse" && prevScene.current === "compose") {
        prevScene.current = scene
        prevTab.current = tab
        const tl = playInkGrow()
        return () => tl.kill()
      }
      if (scene !== "browse") {
        prevScene.current = scene
        prevTab.current = tab
        return
      }
      if (prevTab.current !== tab) {
        const from = tabSelector(prevTab.current)
        const to = tabSelector(tab)
        prevTab.current = tab
        prevScene.current = scene
        const tl = playTabFlip(from, to, playInkGrow)
        return () => tl.kill()
      }
      prevScene.current = scene
      prevTab.current = tab
    },
    { scope: rootRef, dependencies: [tab, scene, items] }
  )

  function login() {
    if (locked) return
    sessionStorage.setItem(JUST_AUTHED_KEY, "1")
    void authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    })
  }

  function logout() {
    dispatch({ type: "logout" })
  }

  function goTab(next: BrowseTab) {
    dispatch({ type: "tab", tab: next })
  }

  function goCompose() {
    if (locked) return
    if (scene === "browse") setReturnTab(tab)
    setEditing(undefined)
    setForm(EMPTY_FORM)
    dispatch({ type: "compose" })
  }

  function openEdit(item: SubscriptionRecord) {
    if (locked) return
    if (scene === "browse") setReturnTab(tab)
    setEditing(item)
    setForm(recordToForm(item))
    dispatch({ type: "compose" })
  }

  function cancelCompose() {
    const tl = exitCompose(false)
    tl.eventCallback("onComplete", () => {
      setEditing(undefined)
      setForm(EMPTY_FORM)
      dispatch({ type: "compose-cancel", tab: returnTab })
    })
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
    if (e2eMode) {
      const record = formToRecord(form, editing?.id ?? crypto.randomUUID())
      setE2eItems((current) =>
        editing
          ? current.map((item) => (item.id === record.id ? record : item))
          : [...current, record]
      )
      toast.success(editing ? "已更新" : "已记下")
      setEditing(undefined)
      setForm(EMPTY_FORM)
      settleSavedCompose()
      return
    }
    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id })
      return
    }
    createMutation.mutate(payload)
  }

  function saveCompose() {
    const formEl = document.querySelector<HTMLFormElement>("#ink-form")
    formEl?.requestSubmit()
  }

  function renderInk() {
    switch (scene) {
      case "sealed":
      case "opening":
        return null
      case "closing":
      case "browse":
        switch (tab) {
          case "overview":
            return (
              <SceneSummary
                loading={!e2eMode && listQuery.isLoading}
                items={items}
                totals={totals}
                currency={activeCurrency}
                currencies={currencies}
                onCurrency={setCurrency}
                onCompose={goCompose}
                onSeed={() => seedMutation.mutate(undefined)}
                seeding={seedMutation.isPending}
              />
            )
          case "category":
            return (
              <SceneChart
                loading={!e2eMode && listQuery.isLoading}
                slices={slices}
                forecast={forecast}
                currency={activeCurrency}
              />
            )
          case "subs":
            return (
              <SceneList
                loading={!e2eMode && listQuery.isLoading}
                items={items}
                onEdit={openEdit}
                onDelete={(item) => {
                  if (window.confirm(`删除「${item.name}」？`)) {
                    removeMutation.mutate({ id: item.id })
                  }
                }}
                onCompose={goCompose}
                onSeed={() => seedMutation.mutate(undefined)}
                seeding={seedMutation.isPending}
              />
            )
          case "charges":
            return (
              <SceneUpcoming
                loading={!e2eMode && listQuery.isLoading}
                charges={charges}
              />
            )
          default:
            return assertNever(tab)
        }
      case "compose":
        return (
          <g>
            <SceneComposeHost>
              <ComposeFace
                form={form}
                setForm={setForm}
                editing={Boolean(editing)}
                onSubmit={submitForm}
              />
            </SceneComposeHost>
            <SceneComposeActions
              submitting={createMutation.isPending || updateMutation.isPending}
              onBack={cancelCompose}
              onSave={saveCompose}
            />
          </g>
        )
      default:
        return assertNever(scene)
    }
  }

  const showChrome = Boolean(user) && scene !== "sealed"
  const showLanding =
    scene === "sealed" || scene === "opening" || scene === "closing"

  return (
    <div
      ref={rootRef}
      className={`desk-root${locked ? " is-scene-locked" : ""}`}
      data-testid="desk-root"
      data-scene={scene}
      data-tab={tab}
      data-locked={locked ? "true" : "false"}
    >
      <DeskScene cover={showLanding ? <SceneLanding onLogin={login} /> : null}>
        {showChrome || scene === "opening" || scene === "closing" ? (
          <SceneTabs
            scene={scene}
            tab={tab}
            onTab={goTab}
            onCompose={goCompose}
          />
        ) : null}
        <g
          id="ink-body"
          className="entity-motion"
          clipPath="url(#page-ink-clip)"
        >
          <g id="ink-swap" data-ink-state="idle">
            {renderInk()}
          </g>
        </g>
        {showChrome ? (
          <SceneFooter name={user?.name ?? ""} onLogout={logout} />
        ) : null}
      </DeskScene>
    </div>
  )
}
