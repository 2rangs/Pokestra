interface Props {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

const Pagination = ({ page, totalPages, onPageChange }: Props) => {
    const getRange = () => {
        const delta = 2
        const range: number[] = []
        const left = Math.max(2, page - delta)
        const right = Math.min(totalPages - 1, page + delta)

        range.push(1)
        if (left > 2) range.push(-1)
        for (let i = left; i <= right; i++) range.push(i)
        if (right < totalPages - 1) range.push(-1)
        if (totalPages > 1) range.push(totalPages)

        return range
    }

    return (
        <div className="pagination">
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>
                ‹
            </button>

            {getRange().map((p, i) =>
                p === -1 ? (
                    <span key={`e-${i}`} style={{ color: 'var(--text-muted)', fontSize: 12 }}>…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={p === page ? 'active' : ''}
                    >
                        {p}
                    </button>
                )
            )}

            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
                ›
            </button>
        </div>
    )
}

export default Pagination