/**
 * 홈의 "종족값 지도": 전체 종(폼 제외)을 한 그래프에 점으로.
 * - 축 조합: 공격력(공격·특공 중 높은 값)×스피드, 방어×특방, HP×공격력. 0–200 고정 눈금(넘는 값은 끝에).
 * - 점 크기는 종족값 합계, 색은 타입. 타입을 고르면 그 타입만 진하게(색도 그 타입), 나머지는 흐리게.
 * - 강조된 것 중 합계 상위 3마리는 이름표. 점에 올리면 이름·수치(title), 누르면 상세로.
 * 키보드·스크린리더 사용자는 그래프 대신 요약 문장과 검색·도감을 쓴다(점 1,000여 개를 모두 초점에 넣지 않는다).
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { formatNumber, useLang, useT } from "../../i18n";
import { homeMessages } from "../../i18n/messages/home";
import {
  ALL_POKEMON,
  type DexPokemon,
  TYPES,
  baseStatTotal,
  isAlternateForm,
  pokemonName,
  statLabel,
  typeName,
} from "../../lib/dex";
import { TYPE_COLOR_CLASSES } from "../../lib/typeColorClasses";
import { TypeGlyph } from "../ui/TypeChip";
import { cx } from "../ui/utils";

const SPECIES: readonly DexPokemon[] = ALL_POKEMON.filter(
  (p) => !isAlternateForm(p),
);

type AxesKey = "offense" | "bulk" | "hp";
const AXES: Record<
  AxesKey,
  { x: (p: DexPokemon) => number; y: (p: DexPokemon) => number }
> = {
  offense: {
    x: (p) => Math.max(p.stats.attack, p.stats.spAtk),
    y: (p) => p.stats.speed,
  },
  bulk: { x: (p) => p.stats.defense, y: (p) => p.stats.spDef },
  hp: {
    x: (p) => p.stats.hp,
    y: (p) => Math.max(p.stats.attack, p.stats.spAtk),
  },
};

// 그림은 칸 너비만큼 실제 픽셀로 그린다(글자·점 크기가 화면과 상관없이 같다). 좁은 화면에서는 더 길쭉하게.
const PAD = { l: 36, r: 12, t: 20, b: 40 };
const MAX = 200;
const radius = (total: number, narrow: boolean) =>
  Math.max(
    narrow ? 1.5 : 2,
    Math.min(narrow ? 6 : 9, 2 + (total - 180) / (narrow ? 110 : 80)),
  );
const TICKS = [0, 50, 100, 150, 200];

export function StatMap() {
  const lang = useLang();
  const t = useT(homeMessages);
  const navigate = useNavigate();
  const [axes, setAxes] = useState<AxesKey>("offense");
  const [type, setType] = useState<string | null>(null);
  const boxRef = useRef<HTMLSpanElement>(null);
  const [W, setW] = useState(1000);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(280, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 640;
  const H = narrow ? Math.round(W * 0.95) : Math.min(440, Math.round(W * 0.4));
  const sx = (v: number) =>
    PAD.l + (Math.min(MAX, v) / MAX) * (W - PAD.l - PAD.r);
  const sy = (v: number) =>
    H - PAD.b - (Math.min(MAX, v) / MAX) * (H - PAD.t - PAD.b);

  const axisLabel = {
    offense: { x: t("mapOffense"), y: statLabel("speed", lang) },
    bulk: { x: statLabel("defense", lang), y: statLabel("spDef", lang) },
    hp: { x: statLabel("hp", lang), y: t("mapOffense") },
  }[axes];

  const points = useMemo(() => {
    const a = AXES[axes];
    return SPECIES.map((p) => {
      const on = type === null || p.types.includes(type);
      // 강조 중이면 그 타입 색, 아니면 첫 타입 색
      const colorType = type && on ? type : p.types[0];
      return {
        p,
        x: sx(a.x(p)),
        y: sy(a.y(p)),
        r: radius(baseStatTotal(p), narrow),
        on,
        colorType,
        total: baseStatTotal(p),
        vx: a.x(p),
        vy: a.y(p),
      };
    }).sort((u, v) => Number(u.on) - Number(v.on) || v.r - u.r); // 흐린 점 먼저, 큰 점 먼저(작은 점이 위에)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sx/sy 는 W·H 로 정해진다
  }, [axes, type, W, H, narrow]);

  // 이름표: 합계 상위 3마리. 글자 상자가 겹치면 오른쪽 → 왼쪽 → 위 → 아래 순서로 자리를 옮긴다
  const labeled = useMemo(() => {
    const top = points
      .filter((d) => d.on)
      .sort((u, v) => v.total - u.total)
      .slice(0, 3);
    // 강조 고리 자체도 장애물
    const boxes = top.map((d) => ({
      x: d.x - d.r - 6,
      y: d.y - d.r - 6,
      w: 2 * d.r + 12,
      h: 2 * d.r + 12,
    }));
    return top.map((d) => {
      const name = pokemonName(d.p, lang);
      const w = name.length * 13 + 4;
      const h = 16;
      const spots = [
        { x: d.x + d.r + 8, y: d.y - h / 2, anchor: "start" as const },
        { x: d.x - d.r - 8 - w, y: d.y - h / 2, anchor: "end" as const },
        { x: d.x - w / 2, y: d.y - d.r - 10 - h, anchor: "middle" as const },
        { x: d.x - w / 2, y: d.y + d.r + 10, anchor: "middle" as const },
      ];
      const hit = (b: { x: number; y: number }) =>
        boxes.some(
          (o) =>
            b.x < o.x + o.w &&
            o.x < b.x + w &&
            b.y < o.y + o.h &&
            o.y < b.y + h,
        );
      const spot = spots.find((b) => !hit(b)) ?? spots[0];
      boxes.push({ x: spot.x, y: spot.y, w, h });
      const tx =
        spot.anchor === "start"
          ? spot.x
          : spot.anchor === "end"
            ? spot.x + w
            : spot.x + w / 2;
      return { d, name, tx, ty: spot.y + h - 3, anchor: spot.anchor };
    });
  }, [points, lang]);
  const typeLabel = type ? typeName(type, lang) : t("mapAll");

  return (
    <Card padding={5} className="max-sm:p-4">
      <VStack gap={3}>
        <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
          <VStack gap={0.5}>
            <Heading level={2} id="stat-map-heading">
              {t("mapTitle")}
            </Heading>
            <Text type="supporting" color="secondary">
              {t("mapLead", { n: formatNumber(SPECIES.length, lang) })}
            </Text>
          </VStack>
          <Selector
            label={t("mapAxes")}
            isLabelHidden
            width={180}
            presentation="adaptive"
            value={axes}
            onChange={(v) => setAxes(v as AxesKey)}
            options={[
              { value: "offense", label: t("mapAxesOffense") },
              { value: "bulk", label: t("mapAxesBulk") },
              { value: "hp", label: t("mapAxesHp") },
            ]}
          />
        </HStack>

        <HStack
          gap={1.5}
          vAlign="center"
          wrap="wrap"
          role="group"
          aria-label={t("mapHighlight")}
        >
          <Token
            label={t("mapAll")}
            color={type === null ? "gray" : "default"}
            onClick={() => setType(null)}
          />
          {TYPES.map((ty) => (
            <Token
              key={ty.name}
              label={typeName(ty.name, lang)}
              icon={<TypeGlyph type={ty.name} size="sm" />}
              color={type === ty.name ? "gray" : "default"}
              onClick={() => setType(type === ty.name ? null : ty.name)}
            />
          ))}
        </HStack>

        <span ref={boxRef} className="block w-full">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block"
            role="img"
            aria-labelledby="stat-map-heading"
            aria-description={t("mapSummary", {
              x: axisLabel.x,
              y: axisLabel.y,
              type: typeLabel,
            })}
          >
            {TICKS.map((v) => (
              <g key={v}>
                <line
                  x1={sx(v)}
                  x2={sx(v)}
                  y1={PAD.t}
                  y2={H - PAD.b}
                  className="stroke-border"
                />
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={sy(v)}
                  y2={sy(v)}
                  className="stroke-border"
                />
                <text
                  x={sx(v)}
                  y={H - PAD.b + 16}
                  textAnchor="middle"
                  className="fill-secondary text-[11px]"
                >
                  {v}
                </text>
                <text
                  x={PAD.l - 8}
                  y={sy(v) + 4}
                  textAnchor="end"
                  className="fill-secondary text-[11px]"
                >
                  {v}
                </text>
              </g>
            ))}
            <text
              x={(W + PAD.l) / 2}
              y={H - 6}
              textAnchor="middle"
              className="fill-secondary text-[12px]"
            >
              {axisLabel.x} →
            </text>
            <text
              x={PAD.l}
              y={PAD.t - 4}
              className="fill-secondary text-[12px]"
            >
              ↑ {axisLabel.y}
            </text>

            {points.map((d) => (
              <circle
                key={d.p.id}
                cx={d.x}
                cy={d.y}
                r={d.r}
                strokeWidth={1}
                className={cx(
                  "cursor-pointer stroke-surface transition-opacity hover:stroke-primary hover:stroke-2",
                  d.on
                    ? (TYPE_COLOR_CLASSES[d.colorType]?.dot ?? "fill-secondary")
                    : "fill-secondary opacity-15",
                )}
                onClick={() => navigate(`/pokemon/${d.p.id}`)}
              >
                <title>{`${pokemonName(d.p, lang)} — ${axisLabel.x} ${d.vx}, ${axisLabel.y} ${d.vy}, ${t("mapTotal", { n: d.total })}`}</title>
              </circle>
            ))}

            {labeled.map(({ d, name, tx, ty, anchor }) => (
              <g key={d.p.id} className="pointer-events-none">
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={d.r + 4}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={2}
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor={anchor}
                  className="fill-primary stroke-surface text-[13px] font-bold [paint-order:stroke]"
                  strokeWidth={4}
                >
                  {name}
                </text>
              </g>
            ))}
          </svg>
        </span>
      </VStack>
    </Card>
  );
}
