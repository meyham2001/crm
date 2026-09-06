import { cn } from '../utils/helpers'
import { Label } from './Label'
import { Input } from './Input'
import { Textarea } from './Textarea'
import { Select } from './Select'

type InputType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'url' | 'textarea' | 'select'

interface FormFieldProps {
  label: string
  name: string
  type?: InputType
  placeholder?: string
  required?: boolean
  error?: string
  helpText?: string
  children?: React.ReactNode
  className?: string
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
  helpText,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {children || (
        <>
          {type === 'textarea' ? (
            <Textarea
              id={name}
              name={name}
              placeholder={placeholder}
              required={required}
              aria-invalid={!!error}
              aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
            />
          ) : type === 'select' ? (
            <Select
              id={name}
              name={name}
              required={required}
              aria-invalid={!!error}
              aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
              options={[]}
            />
          ) : (
            <Input
              id={name}
              name={name}
              type={type as React.InputHTMLAttributes<HTMLInputElement>['type']}
              placeholder={placeholder}
              required={required}
              aria-invalid={!!error}
              aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
            />
          )}
          {error && (
            <p id={`${name}-error`} className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {helpText && !error && (
            <p id={`${name}-help`} className="text-sm text-gray-500">
              {helpText}
            </p>
          )}
        </>
      )}
    </div>
  )
}