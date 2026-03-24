import React, { useEffect, useRef, useState } from "react";

const COLS = 6;
const ROWS = 5;
const CELL = 62;
const BW = COLS * CELL;
const BH = ROWS * CELL;
const RAD = CELL * 0.42;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let _id = 0;
const nid = (): number => ++_id;

const TYPES = ["fire", "water", "grass", "electric", "dark", "heart", "light"] as const;
type OrbType = (typeof TYPES)[number] | "normal";

type ThemeMap = Record<
    OrbType,
    { hi: string; mid: string; lo: string; rgb: string; e: string; ring: string }
>;

const TM: ThemeMap = {
    fire: { hi: "#ffb4a8", mid: "#ef4444", lo: "#7f1d1d", rgb: "255,80,80", e: "🔥", ring: "#ff8f7d" },
    water: { hi: "#c0d8ff", mid: "#3b82f6", lo: "#1e3a8a", rgb: "59,130,246", e: "💧", ring: "#7cb8ff" },
    grass: { hi: "#aff5b6", mid: "#22c55e", lo: "#14532d", rgb: "74,222,128", e: "🌿", ring: "#74ff9b" },
    electric: { hi: "#fff0aa", mid: "#f59e0b", lo: "#78350f", rgb: "253,212,58", e: "⚡", ring: "#ffe56a" },
    dark: { hi: "#d8c4ff", mid: "#8b5cf6", lo: "#2e1065", rgb: "167,139,250", e: "🌙", ring: "#c498ff" },
    heart: { hi: "#ffd7f0", mid: "#ec4899", lo: "#831843", rgb: "249,168,212", e: "💗", ring: "#ff9fd2" },
    light: { hi: "#fff6c7", mid: "#facc15", lo: "#a16207", rgb: "250,204,21", e: "✨", ring: "#ffe982" },
    normal: { hi: "#edf2f7", mid: "#94a3b8", lo: "#334155", rgb: "148,163,184", e: "⭐", ring: "#c9d3df" },
};

const TYPE_NAME: Record<OrbType, string> = {
    fire: "불",
    water: "물",
    grass: "풀",
    electric: "전기",
    dark: "암흑",
    heart: "회복",
    light: "빛",
    normal: "노말",
};

const EFF: Record<OrbType, Partial<Record<OrbType, number>>> = {
    fire: { grass: 2, water: 0.5 },
    water: { fire: 2, grass: 0.5 },
    grass: { water: 2, fire: 0.5 },
    electric: { water: 2 },
    dark: { light: 1.5 },
    light: { dark: 1.5 },
    heart: {},
    normal: {},
};

interface PlayerData {
    id: number;
    name: string;
    type: OrbType;
    maxHp: number;
    atk: number;
}

interface Player extends PlayerData {
    hp: number;
}

interface EnemyBase {
    id: number;
    name: string;
    type: OrbType;
    baseHp: number;
    atk: number;
    lv: number;
    ae: number;
}

interface Enemy {
    id: number;
    name: string;
    type: OrbType;
    hp: number;
    maxHp: number;
    atk: number;
    lv: number;
    ae: number;
}

interface CellData {
    t: OrbType;
    id: number;
}

type BoardCell = CellData | null;

interface VisualState {
    x: number;
    y: number;
    tx: number;
    ty: number;
    scale: number;
    alpha: number;
    glow: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
    r: number;
    g: number;
    b: number;
}

interface DragState {
    id: number;
    t: OrbType;
    bi: number;
    px: number;
    py: number;
}

interface OverlayData {
    title: string;
    msg: string;
    btn: string;
    act: () => void;
}

interface FloatText {
    id: number;
    n: number;
    color: string;
    isPlayer: boolean;
    left: number;
}

interface UIState {
    ehp: number;
    emx: number;
    eid: number;
    ename: string;
    etype: OrbType;
    elv: number;
    stage: number;
    ac: number;
    combo: number;
    log: string;
    players: Player[];
    overlay: OverlayData | null;
    floats: FloatText[];
    attackFx: Array<{ id: number; type: OrbType }>;
}

interface GameState {
    board: BoardCell[];
    players: Player[];
    enemy: Enemy;
    ei: number;
    stage: number;
    ac: number;
    phase: "waiting" | "dragging" | "resolving" | "over";
}

const PDATA: PlayerData[] = [
    { id: 25, name: "피카츄", type: "electric", maxHp: 120, atk: 45 },
    { id: 4, name: "파이리", type: "fire", maxHp: 100, atk: 52 },
    { id: 7, name: "꼬부기", type: "water", maxHp: 130, atk: 40 },
    { id: 1, name: "이상해씨", type: "grass", maxHp: 115, atk: 44 },
    { id: 197, name: "블래키", type: "dark", maxHp: 128, atk: 49 },
    { id: 282, name: "가디안", type: "light", maxHp: 122, atk: 46 },
];

const EPOOL: EnemyBase[] = [
    { id: 493, name: "아르세우스", type: "normal", baseHp: 1200, atk: 120, lv: 999, ae: 1 },
    { id: 149, name: "망나뇽", type: "dragon", baseHp: 260, atk: 44, lv: 18, ae: 3 },
    { id: 130, name: "갸라도스", type: "water", baseHp: 320, atk: 52, lv: 24, ae: 2 },
    { id: 94, name: "팬텀", type: "dark", baseHp: 360, atk: 58, lv: 28, ae: 2 },
    { id: 150, name: "뮤츠", type: "dark", baseHp: 500, atk: 70, lv: 45, ae: 1 },
];

const randType = (): OrbType => TYPES[Math.floor(Math.random() * TYPES.length)];
const idx = (r: number, c: number) => r * COLS + c;
const rc = (i: number) => ({ r: Math.floor(i / COLS), c: i % COLS });
const cellCtr = (r: number, c: number) => ({ cx: c * CELL + CELL / 2, cy: r * CELL + CELL / 2 });

function findMatches(board: BoardCell[]): Set<number> {
    const s = new Set<number>();

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 3; c++) {
            const t = board[idx(r, c)]?.t;
            if (!t) continue;
            if (board[idx(r, c + 1)]?.t === t && board[idx(r, c + 2)]?.t === t) {
                let e = c + 2;
                while (e + 1 < COLS && board[idx(r, e + 1)]?.t === t) e++;
                for (let k = c; k <= e; k++) s.add(idx(r, k));
            }
        }
    }

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 3; r++) {
            const t = board[idx(r, c)]?.t;
            if (!t) continue;
            if (board[idx(r + 1, c)]?.t === t && board[idx(r + 2, c)]?.t === t) {
                let e = r + 2;
                while (e + 1 < ROWS && board[idx(e + 1, c)]?.t === t) e++;
                for (let k = r; k <= e; k++) s.add(idx(k, c));
            }
        }
    }

    return s;
}

function gravity(board: BoardCell[]): BoardCell[] {
    const b = [...board];
    for (let c = 0; c < COLS; c++) {
        let w = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (b[idx(r, c)]) {
                const v = b[idx(r, c)];
                b[idx(r, c)] = null;
                b[idx(w, c)] = v;
                w--;
            }
        }
        for (let r = w; r >= 0; r--) b[idx(r, c)] = null;
    }
    return b;
}

function makeBoard(): BoardCell[] {
    const b: BoardCell[] = Array.from({ length: ROWS * COLS }, () => ({ t: randType(), id: nid() }));
    for (let p = 0; p < 10; p++) {
        const m = findMatches(b);
        if (!m.size) break;
        for (const i of m) b[i] = { t: randType(), id: nid() };
    }
    return b;
}

function drawBoardFrame(ctx: CanvasRenderingContext2D) {
    const cell = CELL;
    ctx.fillStyle = "#3a2414";
    ctx.fillRect(0, 0, BW, BH);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * cell;
            const y = r * cell;
            ctx.fillStyle = (r + c) % 2 === 0 ? "#5a3b24" : "#68462b";
            ctx.fillRect(x, y, cell, cell);
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        }
    }

    ctx.strokeStyle = "#1d120a";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, BW - 4, BH - 4);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, BW - 10, BH - 10);
}

function drawOrb(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    type: OrbType,
    scale: number,
    glowAmt: number,
    alpha: number
) {
    const m = TM[type];
    if (!m || alpha <= 0) return;

    const r = RAD * scale;
    ctx.save();
    ctx.globalAlpha = alpha;

    const halo = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r + 10 + glowAmt * 12);
    halo.addColorStop(0, `rgba(${m.rgb},${0.22 + glowAmt * 0.2})`);
    halo.addColorStop(1, `rgba(${m.rgb},0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10 + glowAmt * 12, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    const outer = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.15, cx, cy, r);
    outer.addColorStop(0, m.hi);
    outer.addColorStop(0.52, m.mid);
    outer.addColorStop(1, m.lo);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = outer;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 1.2, Math.PI * 0.18, Math.PI * 1.82);
    ctx.strokeStyle = m.ring;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    const shine = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 0, cx - r * 0.2, cy - r * 0.25, r * 0.55);
    shine.addColorStop(0, "rgba(255,255,255,0.9)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = shine;
    ctx.fill();

    ctx.font = `${Math.floor(r * 0.92)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(m.e, cx, cy + 1.5);
    ctx.restore();
}

function getEnemyBg(type: OrbType): string {
    switch (type) {
        case "fire":
            return "linear-gradient(180deg,#cdbb9b 0%, #b79d7a 48%, #8f7350 100%)";
        case "water":
            return "linear-gradient(180deg,#a9d0ea 0%, #6ea0c8 48%, #4f7093 100%)";
        case "grass":
            return "linear-gradient(180deg,#b5d9a2 0%, #7ea368 50%, #4f6e42 100%)";
        case "dark":
            return "linear-gradient(180deg,#958ea6 0%, #615d77 48%, #2d2a3d 100%)";
        case "light":
            return "linear-gradient(180deg,#e9dfb0 0%, #c9b35d 48%, #8c7330 100%)";
        default:
            return "linear-gradient(180deg,#cdbb9b 0%, #b79d7a 48%, #8f7350 100%)";
    }
}

export default function Game(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const G = useRef<GameState | null>(null);

    if (!G.current) {
        const b0 = EPOOL[0];
        G.current = {
            board: makeBoard(),
            players: PDATA.map((d) => ({ ...d, hp: d.maxHp })),
            enemy: { ...b0, hp: b0.baseHp, maxHp: b0.baseHp },
            ei: 0,
            stage: 1,
            ac: b0.ae,
            phase: "waiting",
        };
    }

    const V = useRef<Record<number, VisualState>>({});
    const Ptcls = useRef<Particle[]>([]);
    const Drag = useRef<DragState | null>(null);
    const Flash = useRef<Set<number>>(new Set());
    const FT = useRef<number>(0);
    const AttackFx = useRef<Array<{ id: number; type: OrbType }>>([]);

    const [ui, setUi] = useState<UIState>(() => {
        const g = G.current!;
        const e = g.enemy;
        return {
            ehp: e.hp,
            emx: e.maxHp,
            eid: e.id,
            ename: e.name,
            etype: e.type,
            elv: e.lv,
            stage: g.stage,
            ac: g.ac,
            combo: 0,
            log: "드래그해서 콤보를 만들어보세요",
            players: g.players.map((p) => ({ ...p })),
            overlay: null,
            floats: [],
            attackFx: [],
        };
    });

    const syncUi = () => {
        const g = G.current!;
        const e = g.enemy;
        setUi((p) => ({
            ...p,
            ehp: e.hp,
            emx: e.maxHp,
            eid: e.id,
            ename: e.name,
            etype: e.type,
            elv: e.lv,
            stage: g.stage,
            ac: g.ac,
            players: g.players.map((x) => ({ ...x })),
        }));
    };

    const setLog = (s: string) => setUi((p) => ({ ...p, log: s }));
    const setCombo = (n: number) => setUi((p) => ({ ...p, combo: n }));

    const addFloat = (n: number, color: string, isPlayer: boolean) => {
        const fid = nid();
        const left = 10 + Math.random() * 68;
        setUi((p) => ({ ...p, floats: [...p.floats, { id: fid, n, color, isPlayer, left }] }));
        setTimeout(() => {
            setUi((p) => ({ ...p, floats: p.floats.filter((f) => f.id !== fid) }));
        }, 1200);
    };

    const pushAttackFx = (types: OrbType[]) => {
        const effects = types.filter((t) => t !== "heart").map((type) => ({ id: nid(), type }));
        if (!effects.length) return;
        AttackFx.current = [...AttackFx.current, ...effects];
        setUi((p) => ({ ...p, attackFx: [...AttackFx.current] }));
        setTimeout(() => {
            const ids = new Set(effects.map((e) => e.id));
            AttackFx.current = AttackFx.current.filter((e) => !ids.has(e.id));
            setUi((p) => ({ ...p, attackFx: [...AttackFx.current] }));
        }, 520);
    };

    function initVis(board: BoardCell[]) {
        V.current = {};
        for (let i = 0; i < board.length; i++) {
            const cell = board[i];
            if (!cell) continue;
            const { r, c } = rc(i);
            const { cx, cy } = cellCtr(r, c);
            V.current[cell.id] = { x: cx, y: cy - 220, tx: cx, ty: cy, scale: 1, alpha: 1, glow: 0 };
        }
    }

    function syncTargets(board: BoardCell[]) {
        for (let i = 0; i < board.length; i++) {
            const cell = board[i];
            if (!cell) continue;
            const { r, c } = rc(i);
            const { cx, cy } = cellCtr(r, c);
            const v = V.current[cell.id];
            if (v) {
                v.tx = cx;
                v.ty = cy;
            } else {
                V.current[cell.id] = { x: cx, y: cy - 220, tx: cx, ty: cy, scale: 1, alpha: 1, glow: 0 };
            }
        }
    }

    function spawnBurst(cellId: number, type: OrbType) {
        const v = V.current[cellId];
        if (!v) return;
        const m = TM[type];
        const hex = m.mid.slice(1);
        const r0 = parseInt(hex.slice(0, 2), 16);
        const g0 = parseInt(hex.slice(2, 4), 16);
        const b0 = parseInt(hex.slice(4, 6), 16);
        for (let k = 0; k < 10; k++) {
            const ang = (k / 10) * Math.PI * 2 + Math.random() * 0.5;
            const spd = 80 + Math.random() * 120;
            Ptcls.current.push({
                x: v.x,
                y: v.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 45,
                alpha: 1,
                size: 3 + Math.random() * 4,
                r: r0,
                g: g0,
                b: b0,
            });
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let raf = 0;
        let last = 0;
        initVis(G.current!.board);

        const tick = (ts: number) => {
            const dt = Math.min((ts - last) / 1000, 0.05);
            last = ts;
            FT.current += dt * 10;

            for (const v of Object.values(V.current)) {
                v.x += (v.tx - v.x) * 0.45;
                v.y += (v.ty - v.y) * 0.45;
            }

            for (const p of Ptcls.current) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 240 * dt;
                p.alpha -= dt * 2.6;
                p.size = Math.max(0, p.size - dt * 4.8);
            }
            Ptcls.current = Ptcls.current.filter((p) => p.alpha > 0 && p.size > 0);

            drawBoardFrame(ctx);

            const d = Drag.current;
            if (d && d.bi >= 0) {
                const { r, c } = rc(d.bi);
                ctx.fillStyle = "rgba(255,255,255,0.12)";
                ctx.fillRect(c * CELL + 4, r * CELL + 4, CELL - 8, CELL - 8);
            }

            const board = G.current!.board;
            for (let i = 0; i < board.length; i++) {
                const cell = board[i];
                if (!cell) continue;
                if (d && d.id === cell.id) continue;
                const v = V.current[cell.id];
                if (!v) continue;

                let scale = v.scale;
                let glow = v.glow;
                let alpha = v.alpha;

                if (Flash.current.has(i)) {
                    const pulse = 0.65 + 0.35 * Math.sin(FT.current * 2.2);
                    scale = 1 + pulse * 0.1;
                    glow = 0.8;
                    alpha = 1;
                }

                drawOrb(ctx, v.x, v.y, cell.t, scale, glow, alpha);
            }

            for (const p of Ptcls.current) {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                const col = `rgb(${p.r},${p.g},${p.b})`;
                ctx.fillStyle = col;
                ctx.shadowColor = col;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.restore();
            }

            if (d) {
                drawOrb(ctx, d.px, d.py, d.t, 1.18, 1.1, 1);
            }

            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    function boardPos(e: React.PointerEvent<HTMLCanvasElement>) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const rawX = ((e.clientX - rect.left) * BW) / rect.width;
        const rawY = ((e.clientY - rect.top) * BH) / rect.height;
        return {
            x: Math.max(RAD, Math.min(BW - RAD, rawX)),
            y: Math.max(RAD, Math.min(BH - RAD, rawY)),
        };
    }

    const xyIdx = (x: number, y: number): number => {
        const c = Math.floor(x / CELL);
        const r = Math.floor(y / CELL);
        return r < 0 || r >= ROWS || c < 0 || c >= COLS ? -1 : idx(r, c);
    };

    function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
        const g = G.current!;
        if (g.phase !== "waiting") return;

        const { x, y } = boardPos(e);
        const i = xyIdx(x, y);
        if (i < 0 || !g.board[i]) return;

        e.preventDefault();
        canvasRef.current?.setPointerCapture(e.pointerId);
        const cell = g.board[i]!;
        g.board = [...g.board];
        g.board[i] = null;
        g.phase = "dragging";
        Drag.current = { id: cell.id, t: cell.t, bi: i, px: x, py: y };
    }

    function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
        const d = Drag.current;
        if (!d) return;
        e.preventDefault();
        const { x, y } = boardPos(e);
        d.px = x;
        d.py = y;

        const ni = xyIdx(x, y);
        const g = G.current!;
        if (ni >= 0 && ni !== d.bi) {
            g.board = [...g.board];
            const displaced = g.board[ni];
            g.board[ni] = null;
            g.board[d.bi] = displaced;
            d.bi = ni;
            syncTargets(g.board);
        }
    }

    function onUp() {
        const d = Drag.current;
        if (!d) return;
        const g = G.current!;
        g.board = [...g.board];
        g.board[d.bi] = { t: d.t, id: d.id };

        const { r, c } = rc(d.bi);
        const { cx, cy } = cellCtr(r, c);
        const v = V.current[d.id];
        if (v) {
            v.tx = cx;
            v.ty = cy;
        }

        Drag.current = null;
        g.phase = "resolving";
        setTimeout(resolveLoop, 10);
    }

    async function resolveLoop() {
        const g = G.current!;
        let combo = 0;
        let totalDamage = 0;
        let totalHeal = 0;

        while (true) {
            const ms = findMatches(g.board);
            if (!ms.size) break;
            combo++;
            setCombo(combo);

            const cnt: Partial<Record<OrbType, number>> = {};
            for (const i of ms) {
                const t = g.board[i]?.t;
                if (t) cnt[t] = (cnt[t] || 0) + 1;
            }
            pushAttackFx(Object.keys(cnt) as OrbType[]);

            Flash.current = ms;
            await sleep(120);
            Flash.current = new Set();

            for (const i of ms) {
                const cell = g.board[i];
                if (!cell) continue;
                spawnBurst(cell.id, cell.t);
                const v = V.current[cell.id];
                if (v) {
                    v.alpha = 0;
                    v.scale = 1.6;
                }
            }
            await sleep(90);

            g.board = [...g.board];
            for (const i of ms) {
                const cell = g.board[i];
                if (cell) delete V.current[cell.id];
                g.board[i] = null;
            }

            for (const [type, count] of Object.entries(cnt) as [OrbType, number][]) {
                if (type === "heart") {
                    totalHeal += count * 16;
                    continue;
                }
                const atker = g.players.find((p) => p.type === type && p.hp > 0) || g.players.find((p) => p.hp > 0);
                if (!atker) continue;
                totalDamage += Math.floor(atker.atk * count * 0.92 * (1 + (combo - 1) * 0.28) * (EFF[type]?.[g.enemy.type] ?? 1));
            }

            g.board = gravity(g.board);
            syncTargets(g.board);
            await sleep(120);

            g.board = [...g.board];
            for (let i = 0; i < g.board.length; i++) {
                if (!g.board[i]) {
                    const cell: CellData = { t: randType(), id: nid() };
                    g.board[i] = cell;
                    const { r, c } = rc(i);
                    const { cx, cy } = cellCtr(r, c);
                    V.current[cell.id] = { x: cx, y: cy - 150 - Math.random() * 60, tx: cx, ty: cy, scale: 1, alpha: 1, glow: 0 };
                }
            }
            await sleep(120);
        }

        if (totalDamage > 0) {
            g.enemy = { ...g.enemy, hp: Math.max(0, g.enemy.hp - totalDamage) };
            addFloat(totalDamage, "#ffd84d", false);
            setLog(combo > 1 ? `${combo}콤보! ${totalDamage} 대미지` : `${totalDamage} 대미지`);
        }

        if (totalHeal > 0) {
            g.players = g.players.map((p) => (p.hp > 0 ? { ...p, hp: Math.min(p.maxHp, p.hp + totalHeal) } : p));
            setLog(`회복 ${totalHeal}`);
        }

        syncUi();

        if (g.enemy.hp <= 0) {
            await sleep(180);
            handleWin();
            return;
        }

        g.ac--;
        if (g.ac <= 0) {
            const tgt = g.players.find((p) => p.hp > 0);
            if (tgt) {
                const dmg = Math.floor(g.enemy.atk * (0.88 + Math.random() * 0.24));
                addFloat(dmg, "#ff7f7f", true);
                setLog(`${g.enemy.name}의 공격! ${dmg}`);
                g.players = g.players.map((p) => (p === tgt ? { ...p, hp: Math.max(0, p.hp - dmg) } : p));
                syncUi();
                await sleep(160);
            }
            g.ac = g.enemy.ae;
        }

        if (g.players.every((p) => p.hp <= 0)) {
            handleLose();
            return;
        }

        g.phase = "waiting";
        setCombo(0);
        syncUi();
        if (!totalDamage && !totalHeal) setLog("드래그해서 콤보를 만들어보세요");
    }

    function nextEnemy(stage: number, ei: number): Enemy {
        const base = EPOOL[Math.min(ei, EPOOL.length - 1)];
        const scale = 1 + (stage - 1) * 0.16;
        return {
            ...base,
            hp: Math.floor(base.baseHp * scale),
            maxHp: Math.floor(base.baseHp * scale),
            atk: Math.floor(base.atk * scale),
        };
    }

    function handleWin() {
        const g = G.current!;
        g.phase = "over";
        setUi((p) => ({
            ...p,
            overlay: {
                title: "승리!",
                msg: `${g.enemy.name} 격파\nStage ${g.stage} 클리어`,
                btn: "다음 전투",
                act: () => {
                    g.ei = Math.min(g.ei + 1, EPOOL.length - 1);
                    g.stage += 1;
                    g.players = g.players.map((pl) => ({ ...pl, hp: Math.min(pl.maxHp, pl.hp + Math.floor(pl.maxHp * 0.3)) }));
                    g.enemy = nextEnemy(g.stage, g.ei);
                    g.ac = g.enemy.ae;
                    g.phase = "waiting";
                    g.board = makeBoard();
                    initVis(g.board);
                    Ptcls.current = [];
                    Flash.current = new Set();
                    AttackFx.current = [];
                    setUi((prev) => ({ ...prev, overlay: null, combo: 0, log: "다음 전투 시작", attackFx: [] }));
                    syncUi();
                },
            },
        }));
    }

    function handleLose() {
        const g = G.current!;
        g.phase = "over";
        setUi((p) => ({
            ...p,
            overlay: {
                title: "전멸...",
                msg: "파티가 모두 쓰러졌습니다.",
                btn: "처음부터",
                act: () => {
                    Object.assign(g, {
                        board: makeBoard(),
                        players: PDATA.map((d) => ({ ...d, hp: d.maxHp })),
                        enemy: nextEnemy(1, 0),
                        ei: 0,
                        stage: 1,
                        ac: EPOOL[0].ae,
                        phase: "waiting",
                    } satisfies GameState);
                    initVis(g.board);
                    Ptcls.current = [];
                    Flash.current = new Set();
                    AttackFx.current = [];
                    setUi((prev) => ({ ...prev, overlay: null, combo: 0, log: "다시 시작", attackFx: [] }));
                    syncUi();
                },
            },
        }));
    }

    const teamHp = ui.players.reduce((sum, p) => sum + p.hp, 0);
    const teamMaxHp = ui.players.reduce((sum, p) => sum + p.maxHp, 0);
    const enemyPct = Math.max(0, Math.min(100, (ui.ehp / Math.max(ui.emx, 1)) * 100));
    const teamPct = Math.max(0, Math.min(100, (teamHp / Math.max(teamMaxHp, 1)) * 100));
    const spr = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(.9)}100%{opacity:0;transform:translateY(-60px) scale(1.1)}}
        @keyframes blinkTurn{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes fxSlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.55) rotate(-10deg)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.2) rotate(8deg)}}
        @keyframes fxBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}25%{opacity:.95}100%{opacity:0;transform:translate(-50%,-50%) scale(1.35)}}
        @keyframes fxWave{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}30%{opacity:.9}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}
        body{margin:0}
      `}</style>

            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "radial-gradient(circle at top,#42311f 0%, #22180f 40%, #100b08 100%)",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    padding: 16,
                }}
            >
                <div
                    style={{
                        width: 404,
                        background: "#1b130f",
                        border: "4px solid #5d4631",
                        borderRadius: 10,
                        overflow: "hidden",
                        position: "relative",
                        boxShadow: "0 18px 50px rgba(0,0,0,.45)",
                    }}
                >
                    <div
                        style={{
                            height: 220,
                            position: "relative",
                            background: getEnemyBg(ui.etype),
                            overflow: "hidden",
                            borderBottom: "3px solid #6a4b33",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background:
                                    "radial-gradient(circle at 50% 20%, rgba(255,255,255,.18), transparent 42%), repeating-linear-gradient(115deg, rgba(255,255,255,.06) 0 12px, transparent 12px 26px)",
                                opacity: 0.4,
                            }}
                        />

                        <div style={{ position: "absolute", top: 8, left: 10, color: "#f6d76b", fontWeight: 800, fontSize: 28, textShadow: "0 2px 0 #000" }}>
                            {Math.max(0, ui.ehp)}
                        </div>
                        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ color: "#fff0c2", fontWeight: 800, fontSize: 22, textShadow: "0 2px 0 #000" }}>{ui.stage}</div>
                            <button
                                style={{
                                    border: "2px solid #243548",
                                    background: "linear-gradient(180deg,#4a6e8b,#23425e)",
                                    color: "#dff6ff",
                                    borderRadius: 6,
                                    padding: "4px 10px",
                                    fontWeight: 800,
                                    fontSize: 16,
                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)",
                                }}
                            >
                                Menu
                            </button>
                        </div>

                        <img
                            src={spr(ui.eid)}
                            alt={ui.ename}
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: 18,
                                transform: "translateX(-50%)",
                                width: 190,
                                height: 190,
                                objectFit: "contain",
                                filter: "drop-shadow(0 8px 10px rgba(0,0,0,.4))",
                            }}
                        />

                        {ui.attackFx.map((fx, index) => {
                            const styleMap: Record<OrbType, React.CSSProperties> = {
                                fire: {
                                    width: 150,
                                    height: 150,
                                    background: "radial-gradient(circle, rgba(255,210,120,.9) 0%, rgba(255,95,55,.85) 38%, rgba(255,95,55,0) 72%)",
                                    clipPath: "polygon(50% 0%, 66% 18%, 60% 36%, 78% 52%, 62% 60%, 72% 100%, 50% 76%, 28% 100%, 38% 60%, 22% 52%, 40% 36%, 34% 18%)",
                                    filter: "drop-shadow(0 0 10px rgba(255,120,60,.8))",
                                    animation: "fxBurst .52s ease-out forwards",
                                },
                                water: {
                                    width: 168,
                                    height: 168,
                                    background: "radial-gradient(circle, rgba(180,225,255,.8) 0%, rgba(72,155,255,.75) 42%, rgba(72,155,255,0) 74%)",
                                    borderRadius: "50% 50% 46% 54% / 52% 48% 56% 44%",
                                    filter: "drop-shadow(0 0 12px rgba(72,155,255,.85))",
                                    animation: "fxWave .52s ease-out forwards",
                                },
                                grass: {
                                    width: 150,
                                    height: 150,
                                    background: "conic-gradient(from 0deg, rgba(90,255,130,0) 0 10%, rgba(90,255,130,.9) 10% 22%, rgba(90,255,130,0) 22% 34%, rgba(90,255,130,.9) 34% 46%, rgba(90,255,130,0) 46% 58%, rgba(90,255,130,.9) 58% 70%, rgba(90,255,130,0) 70% 100%)",
                                    borderRadius: "50%",
                                    filter: "drop-shadow(0 0 12px rgba(80,255,120,.85))",
                                    animation: "fxBurst .52s ease-out forwards",
                                },
                                electric: {
                                    width: 150,
                                    height: 150,
                                    background: "linear-gradient(135deg, rgba(255,255,255,0) 0 28%, rgba(255,232,99,.95) 28% 42%, rgba(255,255,255,0) 42% 100%)",
                                    clipPath: "polygon(40% 0%, 72% 0%, 55% 34%, 78% 34%, 34% 100%, 46% 56%, 24% 56%)",
                                    filter: "drop-shadow(0 0 12px rgba(255,228,84,.95))",
                                    animation: "fxSlash .48s ease-out forwards",
                                },
                                dark: {
                                    width: 170,
                                    height: 170,
                                    background: "radial-gradient(circle, rgba(220,180,255,.55) 0%, rgba(120,70,190,.78) 35%, rgba(35,15,60,0) 72%)",
                                    borderRadius: "50%",
                                    boxShadow: "inset 0 0 22px rgba(255,255,255,.12)",
                                    animation: "fxWave .52s ease-out forwards",
                                },
                                heart: {
                                    width: 140,
                                    height: 140,
                                    background: "radial-gradient(circle, rgba(255,210,235,.95) 0%, rgba(255,120,180,.78) 40%, rgba(255,120,180,0) 72%)",
                                    clipPath: "path('M 70 124 C 60 106, 16 80, 16 48 C 16 24, 34 10, 52 10 C 63 10, 70 18, 70 18 C 70 18, 77 10, 88 10 C 106 10, 124 24, 124 48 C 124 80, 80 106, 70 124 Z')",
                                    animation: "fxBurst .52s ease-out forwards",
                                },
                                light: {
                                    width: 170,
                                    height: 170,
                                    background: "radial-gradient(circle, rgba(255,255,220,.95) 0%, rgba(255,225,105,.88) 35%, rgba(255,225,105,0) 74%)",
                                    borderRadius: "50%",
                                    boxShadow: "0 0 18px rgba(255,237,130,.95)",
                                    animation: "fxBurst .5s ease-out forwards",
                                },
                                normal: {
                                    width: 140,
                                    height: 140,
                                    background: "radial-gradient(circle, rgba(255,255,255,.8) 0%, rgba(210,220,230,.55) 40%, rgba(210,220,230,0) 72%)",
                                    borderRadius: "50%",
                                    animation: "fxBurst .52s ease-out forwards",
                                },
                            };
                            return (
                                <div
                                    key={fx.id}
                                    style={{
                                        position: "absolute",
                                        left: `calc(50% ${index % 2 === 0 ? "- 18px" : "+ 18px"})`,
                                        top: `calc(50% ${index > 1 ? "+ 10px" : "- 2px"})`,
                                        pointerEvents: "none",
                                        transform: "translate(-50%, -50%)",
                                        zIndex: 2,
                                        ...styleMap[fx.type],
                                    }}
                                />
                            );
                        })}

                        <div style={{ position: "absolute", left: 12, right: 12, bottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                                <div style={{ color: "#fff8d8", fontWeight: 800, fontSize: 18, textShadow: "0 2px 0 rgba(0,0,0,.65)" }}>
                                    {ui.ename}
                                </div>
                                <div style={{ color: "#fff4cb", fontWeight: 700, fontSize: 13, textShadow: "0 1px 0 rgba(0,0,0,.65)" }}>
                                    Lv.{ui.elv} · {TYPE_NAME[ui.etype]}
                                </div>
                            </div>
                            <div
                                style={{
                                    height: 10,
                                    borderRadius: 999,
                                    background: "#49361d",
                                    border: "2px solid #2d1f10",
                                    overflow: "hidden",
                                    boxShadow: "inset 0 2px 3px rgba(0,0,0,.45)",
                                }}
                            >
                                <div
                                    style={{
                                        height: "100%",
                                        width: `${enemyPct}%`,
                                        background: "linear-gradient(180deg,#d2f57c,#8eaf28)",
                                        transition: "width .25s ease",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(6, 1fr)",
                            gap: 4,
                            padding: 6,
                            background: "linear-gradient(180deg,#2e241a,#1b1510)",
                            borderTop: "2px solid #7a5b40",
                            borderBottom: "2px solid #7a5b40",
                        }}
                    >
                        {ui.players.map((p) => {
                            const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        background: "linear-gradient(180deg,#4a4037,#241b15)",
                                        border: "2px solid #8e7558",
                                        borderRadius: 6,
                                        padding: 2,
                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)",
                                        opacity: p.hp <= 0 ? 0.45 : 1,
                                        position: "relative",
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 2,
                                            left: 2,
                                            minWidth: 14,
                                            height: 14,
                                            borderRadius: 999,
                                            background: "rgba(0,0,0,.55)",
                                            color: "#fff",
                                            fontSize: 9,
                                            display: "grid",
                                            placeItems: "center",
                                        }}
                                    >
                                        {TM[p.type].e}
                                    </div>
                                    <img src={spr(p.id)} alt={p.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "contain", display: "block" }} />
                                    <div style={{ height: 4, background: "#110d0a", borderRadius: 999, overflow: "hidden" }}>
                                        <div style={{ width: `${hpPct}%`, height: "100%", background: "linear-gradient(180deg,#75f25b,#1f9f11)" }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ background: "#130e0a", borderBottom: "2px solid #5b432f", padding: "4px 8px 6px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff7d7", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                            <span>HP</span>
                            <span>{teamHp} / {teamMaxHp}</span>
                        </div>
                        <div
                            style={{
                                height: 16,
                                background: "#28170f",
                                border: "2px solid #0f0906",
                                borderRadius: 999,
                                overflow: "hidden",
                                boxShadow: "inset 0 2px 4px rgba(0,0,0,.45)",
                            }}
                        >
                            <div
                                style={{
                                    width: `${teamPct}%`,
                                    height: "100%",
                                    background: "linear-gradient(180deg,#8dff6a,#20bd15)",
                                    transition: "width .2s ease",
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ background: "#0d0906", padding: 6, position: "relative" }}>
                        <canvas
                            ref={canvasRef}
                            width={BW}
                            height={BH}
                            style={{ display: "block", width: "100%", height: "auto", touchAction: "none", cursor: "grab", borderRadius: 6 }}
                            onPointerDown={onDown}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            onPointerLeave={onUp}
                            onPointerCancel={onUp}
                        />

                        <div
                            style={{
                                position: "absolute",
                                left: 10,
                                right: 10,
                                top: 10,
                                display: "flex",
                                justifyContent: "space-between",
                                pointerEvents: "none",
                                color: "#fff8e2",
                                fontWeight: 800,
                                textShadow: "0 2px 0 rgba(0,0,0,.9)",
                                fontSize: 13,
                            }}
                        >
                            <span style={{ opacity: ui.combo > 1 ? 1 : 0 }}>{ui.combo > 1 ? `${ui.combo} Combo` : ""}</span>
                            <span style={{ animation: ui.ac <= 1 ? "blinkTurn .7s linear infinite" : "none", color: ui.ac <= 1 ? "#ffb4b4" : "#fff8e2" }}>
                Enemy {ui.ac}
              </span>
                        </div>
                    </div>

                    <div
                        style={{
                            background: "linear-gradient(180deg,#3a2b1b,#1a120d)",
                            color: "#fff4d3",
                            padding: "8px 10px",
                            fontSize: 13,
                            fontWeight: 700,
                            borderTop: "2px solid #6a4d35",
                            minHeight: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                        }}
                    >
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ui.log}</span>
                        <span style={{ fontSize: 12, color: "#e5c58a", flexShrink: 0 }}>Stage {ui.stage}</span>
                    </div>

                    {ui.overlay && (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,.72)",
                                display: "grid",
                                placeItems: "center",
                                zIndex: 10,
                            }}
                        >
                            <div
                                style={{
                                    width: 280,
                                    background: "linear-gradient(180deg,#5b432e,#24180f)",
                                    border: "4px solid #b79265",
                                    borderRadius: 14,
                                    padding: 18,
                                    textAlign: "center",
                                    boxShadow: "0 18px 40px rgba(0,0,0,.45)",
                                }}
                            >
                                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff4d1", marginBottom: 10 }}>{ui.overlay.title}</div>
                                <div style={{ fontSize: 15, color: "#f6e6bc", whiteSpace: "pre-line", lineHeight: 1.6, marginBottom: 16 }}>{ui.overlay.msg}</div>
                                <button
                                    onClick={ui.overlay.act}
                                    style={{
                                        border: "2px solid #ffe0a2",
                                        background: "linear-gradient(180deg,#ffcf74,#e4932b)",
                                        color: "#4f2600",
                                        fontWeight: 800,
                                        fontSize: 16,
                                        padding: "10px 20px",
                                        borderRadius: 999,
                                        cursor: "pointer",
                                    }}
                                >
                                    {ui.overlay.btn}
                                </button>
                            </div>
                        </div>
                    )}

                    {ui.floats.map((f) => (
                        <div
                            key={f.id}
                            style={{
                                position: "absolute",
                                left: `${f.left}%`,
                                top: f.isPlayer ? "56%" : "18%",
                                color: f.color,
                                fontWeight: 900,
                                fontSize: 28,
                                textShadow: "0 2px 0 #000, 0 0 12px currentColor",
                                pointerEvents: "none",
                                animation: "floatUp 1.2s ease-out forwards",
                                zIndex: 9,
                            }}
                        >
                            {f.isPlayer ? `-${f.n}` : `${f.n}`}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
