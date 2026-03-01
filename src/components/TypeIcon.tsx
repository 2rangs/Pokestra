type Props = { types: string[] }

export function TypeIcon({ types }: Props) {
    return (
        <div className="flex gap-2">
            {types.map((type) => (
                <div key={type} className={`icon ${type}`}>
                    <img src={`/Pokestra/assets/types/${type}.svg`} alt={type} />
                </div>
            ))}
        </div>
    )
}