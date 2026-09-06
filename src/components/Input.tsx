import { forwardRef } from 'react'
import { cn } from '../utils/helpers'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('input', className)}
      {...props}
    />
  )
)
Input.displayName = 'Input'