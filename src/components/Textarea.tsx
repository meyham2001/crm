import { forwardRef } from 'react'
import { cn } from '../utils/helpers'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('input min-h-[100px] resize-y', className)}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'