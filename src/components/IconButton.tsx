import { forwardRef } from 'react'
import { cn } from '../utils/helpers'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', variant = 'default', children, ...props }, ref) => {
    const sizes = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    }

    const variants = {
      default: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
      danger: 'text-red-500 hover:text-red-700 hover:bg-red-50',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
          sizes[size],
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
IconButton.displayName = 'IconButton'