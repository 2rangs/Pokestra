type Props = { types: string[] }

export function TypeIcon({ types }: Props) {
    return (
        <div className="flex gap-1">
            {types.map((type) => (
                <div
                    key={type}
                    className={`
            ${type}
            inline-flex items-center gap-1
            px-2 py-1
            min-h-8
            rounded-md
            text-white text-xs font-bold uppercase
            leading-none
            whitespace-nowrap
          `}
                >
                    <img
                        src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
                        alt={type}
                        className="w-5 h-5 shrink-0"
                    />
                    <span className="leading-none">{type}</span>
                </div>
            ))}
        </div>
    )
}