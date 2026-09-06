import { cn } from '../utils/helpers'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = ({ className, required, children, ...props }: LabelProps) => (
  <label
    className={cn('label', className)}
    {...props}
  >
    {children}
    {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
  </label>
)