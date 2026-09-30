import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${
        interactive ? 'transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-300' : ''
      } ${className}`}
      {...props}
    />
  )
}
