import { Link } from 'react-router'
import Game from '../components/3match-puzzle.tsx'
import { ALL_POKEMON, isAlternateForm, MOVES } from '../lib/dex'

const FEATURES = [
    {
        to: '/pokedex',
        title: '포켓몬 도감',
        desc: '이름·번호·타입·세대·배우는 기술로 검색하고 종족값으로 정렬',
        emoji: '📖',
        tone: 'from-red-50 to-white',
    },
    {
        to: '/battle',
        title: '배틀 시뮬레이터',
        desc: '내 팀으로 CPU와 싱글 배틀, 또는 CPU끼리 관전 (테라스탈 지원)',
        emoji: '⚔️',
        tone: 'from-sky-50 to-white',
    },
    {
        to: '/calc',
        title: '데미지 계산기',
        desc: '노력치·성격·도구·날씨까지 반영한 9세대 데미지 공식',
        emoji: '🧮',
        tone: 'from-amber-50 to-white',
    },
]

export default function HomePage() {
    const species = ALL_POKEMON.filter(p => !isAlternateForm(p)).length
    const forms = ALL_POKEMON.length - species
    return (
        <div className="space-y-10">
            <section className="pt-4 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    도감에서 배틀까지, <span className="text-red-500">Pokestra</span>
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
                    포켓몬 {species.toLocaleString()}종(폼 {forms}개 포함 시 {ALL_POKEMON.length.toLocaleString()}개)과 기술 {MOVES.length}개를 담은 도감,
                    그리고 같은 데이터로 돌아가는 배틀 엔진.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {FEATURES.map(f => (
                    <Link
                        key={f.to}
                        to={f.to}
                        className={`group rounded-3xl border border-slate-200 bg-gradient-to-b ${f.tone} p-5 transition hover:-translate-y-1 hover:shadow-lg`}
                    >
                        <span className="text-3xl" aria-hidden>{f.emoji}</span>
                        <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-red-500">{f.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
                    </Link>
                ))}
            </section>

            <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">미니게임</h2>
                <Game />
            </section>
        </div>
    )
}
