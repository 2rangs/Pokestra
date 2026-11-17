import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { Link } from 'react-router'

/** Astryx 링크(Link, Button href, TopNavItem 등)를 react-router 링크로 렌더 */
const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string; to?: string }>(
    function RouterLink({ href, to, ...rest }, ref) {
        const target = to ?? href ?? ''
        if (/^(https?:|mailto:|#)/.test(target)) return <a ref={ref} href={target} {...rest} />
        return <Link ref={ref} to={target} {...rest} />
    },
)

export default RouterLink
