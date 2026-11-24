/**
 * 업데이트 소식 (공지). 새 항목은 맨 위에 추가한다. id 는 겹치지 않게(날짜-짧은이름).
 * 헤더의 "새 소식" 점은 가장 위 항목의 id 를 마지막으로 본 id 와 비교한다(localStorage).
 */
import type { Lang } from '../i18n'

export type UpdateKind = 'new' | 'improve' | 'data' | 'fix'

export interface UpdateEntry {
    id: string
    /** YYYY-MM-DD */
    date: string
    kind: UpdateKind
    title: Record<Lang, string>
    items: Record<Lang, string[]>
    /** 바로 가 볼 수 있는 화면 */
    link?: string
}

export const UPDATES: readonly UpdateEntry[] = [
    {
        id: '2026-11-24-wiki-flavors',
        date: '2026-11-24',
        kind: 'data',
        title: { ko: '1~5세대·모습별 도감 설명을 한국어로', en: 'Korean Pokédex entries for Gen 1–5 and forms', ja: '第1〜5世代・姿ごとの図鑑説明を韓国語で' },
        items: {
            ko: [
                '포켓몬 위키에 정리된 한국어 도감 설명 16,000여 개를 더했어요. 이제 4·5세대 설명과 메가진화·리전폼의 설명도 한국어로 볼 수 있어요.',
                '한국어판이 나오지 않은 작품(1~3세대 등)의 설명에는 "위키 번역"이라고 표시해요.',
            ],
            en: [
                'Added 16,000+ Korean Pokédex entries collected from the Korean Pokémon Wiki, including Gen 4–5 and Mega/regional form entries.',
                'Entries for games never released in Korean are marked as wiki translations.',
            ],
            ja: [
                '韓国語ポケモンウィキの図鑑説明 16,000件以上を追加しました。第4・5世代やメガシンカ・リージョンフォームの説明も韓国語で読めます。',
                '韓国語版が発売されていない作品の説明には「ウィキ翻訳」と表示します。',
            ],
        },
        link: '/pokemon/448',
    },
    {
        id: '2026-11-24-new-megas',
        date: '2026-11-24',
        kind: 'data',
        title: { ko: '새 메가진화 49종 추가', en: '49 new Mega Evolutions', ja: '新しいメガシンカ 49種を追加' },
        items: {
            ko: ['레전드 Z-A·메가 차원 러시의 메가진화(메가픽시, 메가망나뇽, 메가루카리오Z, 메가라이츄X·Y 등)를 도감에 더했어요.'],
            en: ['Added the Mega Evolutions from Legends: Z-A and Mega Dimension (Mega Clefable, Mega Dragonite, Mega Lucario Z, Mega Raichu X/Y and more).'],
            ja: ['LEGENDS Z-A・メガ次元ラッシュのメガシンカ(メガピクシー、メガカイリュー、メガルカリオZ、メガライチュウX・Yなど)を追加しました。'],
        },
        link: '/pokemon/10310',
    },
    {
        id: '2026-11-24-entries-by-game',
        date: '2026-11-24',
        kind: 'new',
        title: { ko: '도감 설명 모두 보기 · 세대와 함께 바뀌는 설명', en: 'All Pokédex entries, linked to generations', ja: '図鑑説明をすべて表示・世代と連動' },
        items: {
            ko: [
                '"모두 보기"를 누르면 작품별 도감 설명을 세대별로, 메가진화 같은 모습별 설명까지 한 번에 볼 수 있어요. 작품은 색 배지로 구분해요.',
                '세대를 고르면 그 세대의 설명이, 설명을 고르면 그 작품의 세대와 도트가 함께 바뀌어요.',
            ],
            en: [
                'Tap "Show all" to see every game\'s entry grouped by generation, including form entries. Games are marked with colored badges.',
                'Picking a generation picks its entry, and picking an entry switches to that game\'s generation and sprite.',
            ],
            ja: [
                '「すべて表示」で作品別の図鑑説明を世代ごとに、姿ごとの説明まで一度に見られます。作品は色のバッジで区別します。',
                '世代を選ぶとその世代の説明に、説明を選ぶとその作品の世代とドットに切り替わります。',
            ],
        },
        link: '/pokemon/6',
    },
    {
        id: '2026-11-24-shiny',
        date: '2026-11-24',
        kind: 'new',
        title: { ko: '이로치로 보기', en: 'Shiny view', ja: '色違いで見る' },
        items: {
            ko: ['상세 화면에서 "✦ 이로치"를 켜면 일러스트·세대별 도트·스프라이트 탭이 모두 이로치로 바뀌어요. 다른 포켓몬으로 넘어가도 유지돼요.'],
            en: ['Turn on "✦ Shiny" on a detail page to switch the artwork, generation sprites and the Sprites tab to shiny. It stays on as you browse.'],
            ja: ['詳細画面で「✦ 色違い」をオンにすると、イラスト・世代別ドット・スプライトタブが色違いになります。'],
        },
        link: '/pokemon/6?shiny=1',
    },
    {
        id: '2026-11-24-stat-rank',
        date: '2026-11-24',
        kind: 'improve',
        title: { ko: '종족값 순위를 더 알기 쉽게', en: 'Clearer base stat rankings', ja: '種族値の順位をわかりやすく' },
        items: {
            ko: [
                '상위 %를 소수 첫째 자리까지 보여 줘요(상위 0.5%). 낮은 값은 "하위 0.3%"처럼, 가장 높거나 낮으면 "단독 1위", "최하위"로 표시해요.',
                '막대에 올리면 "1,025종 중 16위"처럼 순위를 알려 줘요.',
            ],
            en: ['Percentiles now show one decimal (Top 0.5%). Low values read "Bottom 0.3%", and the extremes read "#1" or "Lowest".', 'Hover a bar to see the exact rank, e.g. "#16 of 1,025".'],
            ja: ['上位%を小数第1位まで表示します。低い値は「下位0.3%」、最も高い・低い値は「単独1位」「最下位」と表示します。', 'バーにカーソルを合わせると「1,025種中16位」のように順位がわかります。'],
        },
        link: '/pokemon/242',
    },
    {
        id: '2026-11-24-stat-map',
        date: '2026-11-24',
        kind: 'improve',
        title: { ko: '종족값 지도: 원하는 능력치로 비교', en: 'Base stat map: compare any two stats', ja: '種族値マップ: 好きな能力で比較' },
        items: {
            ko: ['가로·세로 축을 6가지 능력치와 합계 중에서 고를 수 있어요. 추천 비교, 그래프 귀퉁이 설명, 점에 올리면 나오는 정보 카드를 더했어요.'],
            en: ['Choose any of the six stats or the total for each axis. Added suggested comparisons, corner labels and an info card on hover.'],
            ja: ['縦・横の軸を6つの能力と合計から選べます。おすすめの比較、グラフの隅の説明、点に乗せると出る情報カードを追加しました。'],
        },
        link: '/',
    },
    {
        id: '2026-11-24-forms-sprites',
        date: '2026-11-24',
        kind: 'improve',
        title: { ko: '폼은 그림으로 고르고, 도트는 크게', en: 'Pick forms by picture, bigger sprites', ja: '姿は絵で選び、ドットは大きく' },
        items: {
            ko: ['상세 그림 바로 아래에서 폼을 그림 타일로 골라요.', '게임 도트를 원본 픽셀의 2·3배로 또렷하게 크게 보여 줘요.'],
            en: ['Pick forms from picture tiles right under the artwork.', 'Game sprites are shown at 2× or 3× their original pixels, crisp and large.'],
            ja: ['詳細のイラストのすぐ下で、姿を絵のタイルで選べます。', 'ゲームのドットを元のピクセルの2・3倍でくっきり大きく表示します。'],
        },
        link: '/sprites',
    },
    {
        id: '2026-11-24-korean-data',
        date: '2026-11-24',
        kind: 'fix',
        title: { ko: '영어로 나오던 이름·설명 고침', en: 'Fixed names and descriptions shown in English', ja: '英語で表示されていた名前・説明を修正' },
        items: {
            ko: ['폼 이름 121개(어택폼, 붉은 달 등)와 도구·특성·기술 설명 88개가 영어로 나오던 문제를 고쳤어요.'],
            en: ['Fixed 121 form names and 88 item/ability/move descriptions that appeared in English on the Korean screen.'],
            ja: ['韓国語画面で英語になっていた姿の名前121件と、道具・特性・技の説明88件を修正しました。'],
        },
    },
    {
        id: '2026-11-24-home',
        date: '2026-11-24',
        kind: 'new',
        title: { ko: '새 홈: 실루엣 퀴즈와 종족값 지도', en: 'New home: silhouette quiz and stat map', ja: '新しいホーム: シルエットクイズと種族値マップ' },
        items: {
            ko: ['매일 바뀌는 "이 포켓몬은 누구?" 퀴즈(초성도 정답), 검색·타입·세대 바로가기, 전체 포켓몬을 한눈에 보는 종족값 지도로 홈을 새로 만들었어요.'],
            en: ['The home page now has a daily "Who\'s that Pokémon?" quiz, quick search with type and generation shortcuts, and a stat map of every Pokémon.'],
            ja: ['毎日変わる「このポケモンだれ?」クイズ、検索・タイプ・世代のショートカット、全ポケモンの種族値マップでホームを作り直しました。'],
        },
        link: '/',
    },
    {
        id: '2026-11-24-pokedex',
        date: '2026-11-24',
        kind: 'improve',
        title: { ko: '도감 화면 새 단장 · 초성 검색', en: 'Refreshed Pokédex, Korean initial search', ja: '図鑑画面をリニューアル・初声検索' },
        items: {
            ko: [
                '도감을 큰 그림의 갤러리 카드와 지울 수 있는 필터 칩으로 바꿨어요. 휴대폰에서는 한 줄 목록이에요.',
                '"ㄹㅈㅁ"처럼 초성으로 찾을 수 있고, 표는 행 어디를 눌러도 열려요. 상세에서 돌아오면 보던 자리로 돌아가요.',
                '타입 배지를 게임과 같은 색·아이콘으로, 능력치 막대는 구간별 색으로 바꿨어요.',
            ],
            en: [
                'The Pokédex now uses gallery cards with large art and removable filter chips; phones get a compact list.',
                'Search by Korean initial consonants, click anywhere on a table row, and come back to where you were after viewing a Pokémon.',
                'Type badges use the in-game colors and icons; stat bars are colored by range.',
            ],
            ja: [
                '図鑑を大きな絵のギャラリーカードと外せるフィルターチップに変えました。スマホでは1行のリストです。',
                '韓国語の初声で検索でき、表は行のどこを押しても開きます。詳細から戻ると元の位置に戻ります。',
                'タイプのバッジをゲームと同じ色・アイコンに、能力バーは範囲ごとの色にしました。',
            ],
        },
        link: '/pokedex',
    },
    {
        id: '2026-11-18-rebuild',
        date: '2026-11-18',
        kind: 'new',
        title: { ko: 'Pokestra 2.0: 세 언어와 세대 타임라인', en: 'Pokestra 2.0: three languages and a generation timeline', ja: 'Pokestra 2.0: 3言語と世代タイムライン' },
        items: {
            ko: [
                '한국어·영어·일본어를 지원해요. 목록·검색·필터는 기다림 없이 바로 동작해요.',
                '상세에서 세대를 고르면 그 시절의 도트·타입·특성·종족값·울음소리를 보여 줘요.',
                '도구·나무열매 도감과 Lv50/Lv100 실능치를 더했고, 배틀·계산기는 빼고 도감에 집중했어요.',
            ],
            en: [
                'Korean, English and Japanese. Lists, search and filters work instantly.',
                'Pick a generation on a detail page to see that era\'s sprite, types, abilities, stats and cry.',
                'Added items and berries plus Lv50/Lv100 stat ranges; removed battle and calculator tools to focus on the Pokédex.',
            ],
            ja: [
                '韓国語・英語・日本語に対応。リスト・検索・フィルターは待ち時間なしで動きます。',
                '詳細で世代を選ぶと、その時代のドット・タイプ・特性・種族値・鳴き声を表示します。',
                '道具・きのみ図鑑とLv50/Lv100の実数値を追加し、バトル・計算機は外して図鑑に集中しました。',
            ],
        },
    },
    {
        id: '2026-03-02-launch',
        date: '2026-03-02',
        kind: 'new',
        title: { ko: 'Pokestra 공개', en: 'Pokestra launched', ja: 'Pokestra 公開' },
        items: {
            ko: ['포켓몬 도감 첫 버전을 공개했어요.'],
            en: ['First version of the Pokédex.'],
            ja: ['ポケモン図鑑の最初のバージョンを公開しました。'],
        },
    },
]

export const LATEST_UPDATE_ID = UPDATES[0]?.id ?? ''
