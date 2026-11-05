import type { ReactNode } from "react"
import { Component } from "react"
import { describe, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  getPayloadConfigFromPayload,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const themeBox = vi.hoisted(() => ({
  current: undefined as string | undefined,
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: themeBox.current }),
}))

class Catch extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }

  render() {
    if (this.state.error) return <p>{this.state.error}</p>
    return this.props.children
  }
}

function Mark() {
  return <svg data-testid="mark" />
}

const chartConfig = {
  desktop: { label: "桌面", color: "#111" },
  marked: { label: "标", icon: Mark, color: "#222" },
  visits: { label: "访问" },
  themed: { theme: { light: "#abc", dark: "#def" } },
  faded: {
    color: "#444",
    theme: { light: undefined, dark: "" },
  },
} as unknown as ChartConfig

describe("ui kit", () => {
  test("renders controls, menus, and both toaster themes", async () => {
    themeBox.current = undefined
    const view = await render(
      <div>
        <Button>Go</Button>
        <Button variant="outline" size="xs">
          o
        </Button>
        <Button variant="secondary" size="sm">
          s
        </Button>
        <Button variant="ghost" size="lg">
          g
        </Button>
        <Button variant="destructive" size="icon">
          d
        </Button>
        <Button variant="link" size="icon-xs">
          l
        </Button>
        <Button variant="default" size="icon-sm">
          i
        </Button>
        <Button size="icon-lg">L</Button>
        <Badge>def</Badge>
        <Badge variant="secondary">sec</Badge>
        <Badge variant="destructive">bad</Badge>
        <Badge variant="outline">out</Badge>
        <Badge variant="ghost">ghost</Badge>
        <Badge variant="link" render={<a href="#kit" />}>
          link
        </Badge>
        <Input className="in" type="text" placeholder="name" />
        <Label className="lb">名称</Label>
        <Textarea className="ta" defaultValue="note" />
        <Separator />
        <Separator orientation="vertical" className="v" />
        <Switch />
        <Switch size="sm" className="sw" defaultChecked />
        <Alert>
          <AlertTitle>标题</AlertTitle>
          <AlertDescription>说明</AlertDescription>
          <AlertAction>动作</AlertAction>
        </Alert>
        <Alert variant="destructive" className="al">
          坏了
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>卡</CardTitle>
            <CardDescription>述</CardDescription>
            <CardAction>act</CardAction>
          </CardHeader>
          <CardContent>body</CardContent>
          <CardFooter>foot</CardFooter>
        </Card>
        <Card size="sm" className="sm">
          small
        </Card>
        <Empty className="em">
          <EmptyHeader>
            <EmptyMedia>pic</EmptyMedia>
            <EmptyMedia variant="icon" className="ic">
              ic
            </EmptyMedia>
            <EmptyTitle>空</EmptyTitle>
            <EmptyDescription>没有</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>more</EmptyContent>
        </Empty>
        <Table className="tb">
          <TableCaption>cap</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>h</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>c</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>f</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">one</TabsContent>
        </Tabs>
        <Tabs orientation="vertical" className="vt" defaultValue="a">
          <TabsList variant="line" className="tl">
            <TabsTrigger className="tt" value="a">
              A
            </TabsTrigger>
          </TabsList>
          <TabsContent className="tc" value="a">
            two
          </TabsContent>
        </Tabs>
        <Dialog open>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader className="dh">
              <DialogTitle className="dt">Title</DialogTitle>
              <DialogDescription className="dd">Body</DialogDescription>
            </DialogHeader>
            <DialogFooter className="df" showCloseButton>
              <DialogClose>Dismiss</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open>
          <DialogPortal>
            <DialogOverlay className="ov" />
          </DialogPortal>
          <DialogContent showCloseButton={false} className="plain">
            <DialogFooter showCloseButton={false}>plain</DialogFooter>
          </DialogContent>
        </Dialog>
        <Select open defaultValue="a">
          <SelectTrigger>
            <SelectValue placeholder="pick" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup className="sg">
              <SelectLabel className="sl">组</SelectLabel>
              <SelectItem value="a">A</SelectItem>
            </SelectGroup>
            <SelectSeparator className="ss" />
          </SelectContent>
        </Select>
        <Select open>
          <SelectTrigger size="sm" className="st">
            <SelectValue className="sv" />
          </SelectTrigger>
          <SelectContent
            className="sc"
            side="top"
            sideOffset={8}
            align="start"
            alignOffset={2}
            alignItemWithTrigger={false}
          >
            <SelectItem className="si" value="b">
              B
            </SelectItem>
            <SelectScrollUpButton className="up" />
            <SelectScrollDownButton className="down" />
          </SelectContent>
        </Select>
        <DropdownMenu open>
          <DropdownMenuTrigger>menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>标签</DropdownMenuLabel>
              <DropdownMenuLabel inset>内</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                项<DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem inset variant="destructive">
                删
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>勾</DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="1">
              <DropdownMenuRadioItem value="1">一</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>更多</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>子</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu open>
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              alignOffset={3}
              side="right"
              sideOffset={6}
              className="dc"
            >
              <DropdownMenuCheckboxItem inset checked={false}>
                空
              </DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup>
                <DropdownMenuRadioItem inset value="2">
                  二
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger inset className="sub">
                  侧
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  align="end"
                  alignOffset={1}
                  side="left"
                  sideOffset={4}
                  className="subc"
                >
                  <DropdownMenuItem>叶</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
        <Toaster />
      </div>
    )
    expect(document.body.textContent).toContain("Go")
    expect(document.body.textContent).toContain("Title")
    expect(view.container.querySelector("[data-slot='switch']")).toBeTruthy()
    await view.unmount()

    themeBox.current = "dark"
    const themed = await render(<Toaster className="hot" />)
    expect(themed.container).toBeTruthy()
    await themed.unmount()
  })
})

describe("chart", () => {
  test("resolves payload config and draws every tooltip branch", async () => {
    expect(
      getPayloadConfigFromPayload(chartConfig, null, "desktop")
    ).toBeUndefined()
    expect(
      getPayloadConfigFromPayload(chartConfig, 4, "desktop")
    ).toBeUndefined()
    expect(
      getPayloadConfigFromPayload(chartConfig, { name: "desktop" }, "name")
        ?.label
    ).toBe("桌面")
    expect(
      getPayloadConfigFromPayload(
        chartConfig,
        { name: 3, payload: null },
        "name"
      )
    ).toBeUndefined()
    expect(
      getPayloadConfigFromPayload(
        chartConfig,
        { payload: { name: "marked" } },
        "name"
      )?.label
    ).toBe("标")
    expect(
      getPayloadConfigFromPayload(chartConfig, { payload: { name: 2 } }, "name")
    ).toBeUndefined()
    expect(
      getPayloadConfigFromPayload(chartConfig, { payload: "nope" }, "missing")
    ).toBeUndefined()

    const dot = [
      {
        dataKey: "desktop",
        name: "Desktop",
        value: 1200,
        color: "#111",
        payload: { fill: "#222" },
        type: "rect",
      },
      { type: "none", name: "skip", value: 1 },
    ]
    const line = [
      {
        name: "marked",
        value: "12",
        color: "#333",
        payload: {},
      },
    ]
    const dashed = [
      { name: "unknown", value: null, color: "#444" },
      { dataKey: "desktop", name: "Desktop", value: 0, color: "#555" },
    ]
    const formatterItem = [
      { name: "Desktop", value: 8, dataKey: "desktop", color: "#1" },
    ]
    const noFormatter = [{ value: undefined, dataKey: "desktop", color: "#1" }]
    const nameless = [{ value: 1, dataKey: "desktop", color: "#1" }]

    const view = await render(
      <div>
        <ChartStyle id="empty" config={{ visits: { label: "访问" } }} />
        <ChartStyle id="colors" config={chartConfig} />
        <ChartContainer
          id="probe"
          className="chart"
          config={chartConfig}
          style={{ width: 480, height: 240 }}
        >
          <div>
            <ChartTooltip />
            <ChartLegend />
            <ChartTooltipContent
              active
              payload={dot as never}
              label="desktop"
            />
            <ChartTooltipContent
              active
              payload={dot as never}
              label="missing-label"
              className="tip"
            />
            <ChartTooltipContent active payload={dot as never} label="" />
            <ChartTooltipContent
              active
              payload={line as never}
              indicator="line"
              label={4 as never}
              labelClassName="lb"
            />
            <ChartTooltipContent
              active
              payload={line as never}
              indicator="dashed"
              hideIndicator
              labelKey="name"
            />
            <ChartTooltipContent
              active
              payload={dashed as never}
              indicator="dashed"
              color="#abc"
            />
            <ChartTooltipContent active={false} payload={[{} as never]} />
            <ChartTooltipContent
              active={false}
              payload={[undefined as never]}
            />
            <ChartTooltipContent
              active
              indicator="dashed"
              payload={[{ name: "plain", value: 3, color: "#123" }] as never}
            />
            <ChartTooltipContent
              active
              payload={[{ value: 1, color: "#111" }] as never}
            />
            <ChartTooltipContent active payload={[] as never} />
            <ChartTooltipContent hideLabel active payload={dot as never} />
            <ChartTooltipContent
              active
              payload={formatterItem as never}
              formatter={() => <span>fmt</span>}
            />
            <ChartTooltipContent
              active
              payload={noFormatter as never}
              formatter={() => <span>nope</span>}
            />
            <ChartTooltipContent
              active
              payload={nameless as never}
              formatter={() => <span>noname</span>}
              nameKey="alias"
            />
            <ChartTooltipContent
              active
              payload={line as never}
              indicator="line"
              label="marked"
              labelFormatter={(value) => <em>{String(value)}</em>}
            />
            <ChartLegendContent
              payload={
                [{ dataKey: "marked", color: "#222", type: "rect" }] as never
              }
            />
            <ChartLegendContent
              payload={
                [{ dataKey: "marked", color: "#222", type: "rect" }] as never
              }
              verticalAlign="top"
              hideIcon
              className="leg"
              nameKey="name"
            />
            <ChartLegendContent payload={[] as never} />
            <ChartLegendContent payload={dashed as never} />
          </div>
        </ChartContainer>
        <ChartContainer config={{ visits: { label: "访问" } }}>
          <div />
        </ChartContainer>
        <Catch>
          <ChartTooltipContent />
        </Catch>
      </div>
    )

    expect(view.container.textContent).toContain("桌面")
    expect(view.container.textContent).toContain("fmt")
    expect(view.container.textContent).toContain("useChart")
    expect(view.container.querySelector("style")?.textContent).toContain(
      "--color-desktop"
    )
    await view.unmount()
  })
})
