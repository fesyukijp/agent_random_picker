interface Props {
  open: boolean
}

export function ChevronIcon({ open }: Props) {
  return (
    <svg
      className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2l4 4-4 4" />
    </svg>
  )
}
