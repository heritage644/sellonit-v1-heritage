import type { InputHTMLAttributes } from 'react';

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
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={inputClassName}
      {...inputProps}
    />
  );

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {prefix ? (
        <div className={`input-group${error ? ' has-error' : ''}`}>
          <span className="input-prefix" aria-hidden="true">
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="field-helper" id={`${id}-helper`}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
