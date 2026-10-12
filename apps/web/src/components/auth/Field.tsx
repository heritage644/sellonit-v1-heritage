import type { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type BaseInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'className'
>;

export type FieldProps = BaseInputProps & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Error message for this field; replaces the helper text while shown. */
  error?: string | null;
  helper?: string;
  /** Static prefix rendered inside the input (e.g. the "+234" country code). */
  prefix?: string;
  inputClassName?: string;
};

/**
 * Labelled text input with accessible helper/error association
 * (`aria-describedby` + `aria-invalid`).
 */
export function Field(props: FieldProps) {
  const { id, label, value, onChange, error, helper, prefix, inputClassName, ...inputProps } =
    props;
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  const input = (
    <Input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(
        prefix && 'h-11 border-0 rounded-none shadow-none focus-visible:ring-0',
        inputClassName,
      )}
      {...inputProps}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {prefix ? (
        <div
          className={cn(
            'flex items-stretch rounded-control border border-input bg-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/16',
            error && 'border-destructive focus-within:ring-destructive/14',
          )}
        >
          <span
            className="flex items-center border-r border-border bg-field-bg px-3 text-[15px] font-semibold whitespace-nowrap text-muted-foreground"
            aria-hidden="true"
          >
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
      {error ? (
        <p className="text-[13px] leading-snug text-destructive" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-[13px] leading-snug text-faint" id={`${id}-helper`}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
