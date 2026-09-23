import { colourOf, type Member } from '../types'

export function Clover({ fill, size = 24, className }: { fill: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g fill={fill}>
        <circle cx="12.5" cy="12.5" r="10" />
        <circle cx="27.5" cy="12.5" r="10" />
        <circle cx="12.5" cy="27.5" r="10" />
        <circle cx="27.5" cy="27.5" r="10" />
        <rect x="10" y="10" width="20" height="20" />
      </g>
    </svg>
  )
}

export function Avatar({ member, size = 28 }: { member: Member | undefined; size?: number }) {
  const c = colourOf(member?.colour)
  return (
    <span className="avatar" style={{ width: size, height: size }} title={member?.display_name}>
      <Clover fill={member ? c.hex : '#E4DCD3'} size={size} />
      <span style={{ color: member ? c.ink : '#5F1D3E', fontSize: size * 0.42 }}>
        {member?.display_name.slice(0, 1).toUpperCase() ?? '?'}
      </span>
    </span>
  )
}

export function PersonChip({ member, prefix }: { member: Member | undefined; prefix?: string }) {
  return (
    <span className="person-chip">
      <Avatar member={member} size={20} />
      <span>
        {prefix && <span className="muted">{prefix} </span>}
        {member?.display_name ?? 'Nobody'}
      </span>
    </span>
  )
}

// Someone outside the app, typed in by hand
export function NameChip({ name, prefix }: { name: string; prefix?: string }) {
  return (
    <span className="person-chip">
      <span className="avatar outside" style={{ width: 20, height: 20 }}>
        <Clover fill="#F7F2EC" size={20} />
        <span style={{ fontSize: 8.4 }}>{name.slice(0, 1).toUpperCase()}</span>
      </span>
      <span>
        {prefix && <span className="muted">{prefix} </span>}
        {name}
      </span>
    </span>
  )
}
