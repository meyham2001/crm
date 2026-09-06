import { cn } from '../utils/helpers'
import { getInitials } from '../utils/helpers'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const bgColors = [
    'bg-brand-amber/20 text-brand-amber',
    'bg-brand-blue/20 text-brand-blue',
    'bg-brand-purple/20 text-brand-purple',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-blue-100 text-blue-800',
  ]

  const colorIndex = name ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % bgColors.length : 0

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        'bg-gray-100 text-gray-600',
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full rounded-full object-cover" />
      ) : name ? (
        <span className={bgColors[colorIndex]}>{getInitials(name)}</span>
      ) : (
        <span className="text-gray-400">?</span>
      )}
    </div>
  )
}