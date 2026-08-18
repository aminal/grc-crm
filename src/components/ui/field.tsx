import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
};
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const controlFrameClasses = [
    'relative block w-full',
    'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-none',
    'dark:before:hidden',
    'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset focus-within:after:ring-2 focus-within:after:ring-purple-500',
    'has-[input:disabled]:opacity-50 has-[input:disabled]:before:bg-zinc-950/5 has-[input:disabled]:before:shadow-none has-[select:disabled]:opacity-50 has-[select:disabled]:before:bg-zinc-950/5 has-[select:disabled]:before:shadow-none has-[textarea:disabled]:opacity-50 has-[textarea:disabled]:before:bg-zinc-950/5 has-[textarea:disabled]:before:shadow-none',
];

export const controlClasses = [
    'relative font-medium block w-full appearance-none rounded-lg border border-transparent bg-zinc-950/5 text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-base/6',
    'hover:border-transparent focus:outline-hidden disabled:border-transparent disabled:bg-zinc-950/5',
    'dark:border-transparent dark:bg-white/5 dark:text-white dark:hover:border-transparent dark:disabled:border-transparent dark:disabled:bg-white/2.5 dark:scheme-dark',
    'aria-invalid:border-red-500 aria-invalid:hover:border-red-500 dark:aria-invalid:border-red-600 dark:aria-invalid:hover:border-red-600',
];

const dateClasses = [
    '[&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-datetime-edit]:inline-flex [&::-webkit-datetime-edit]:p-0',
    '[&::-webkit-datetime-edit-year-field]:p-0 [&::-webkit-datetime-edit-month-field]:p-0 [&::-webkit-datetime-edit-day-field]:p-0',
    '[&::-webkit-datetime-edit-hour-field]:p-0 [&::-webkit-datetime-edit-minute-field]:p-0 [&::-webkit-datetime-edit-second-field]:p-0 [&::-webkit-datetime-edit-millisecond-field]:p-0 [&::-webkit-datetime-edit-meridiem-field]:p-0',
];

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): React.ReactElement {
    return <label data-slot='label' className={cn('text-base/6 text-zinc-950 select-none uppercase sm:text-sm/6 dark:text-zinc-500', className)} {...props} />;
}

export function Input({ className, type, leadingIcon, trailingIcon, ...props }: InputProps): React.ReactElement {
    const isDateType = type ? ['date', 'datetime-local', 'month', 'time', 'week'].includes(type) : false;

    return (
        <span data-slot='control' className={cn('group', controlFrameClasses, className)}>
      <input
          type={type}
          className={cn(
              controlClasses,
              leadingIcon ? 'pl-[calc(--spacing(10)-1px)] sm:pl-[calc(--spacing(9)-1px)]' : 'pl-[calc(--spacing(3.5)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
              trailingIcon ? 'pr-[calc(--spacing(10)-1px)] sm:pr-[calc(--spacing(9)-1px)]' : 'pr-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(3)-1px)]',
              'py-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(2)-1px)]',
              'file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2.5 file:py-2 file:text-sm/6 file:font-medium file:text-zinc-950 hover:file:bg-zinc-200',
              isDateType && dateClasses,
          )}
          {...props}
      />
            {leadingIcon ? (
                <span className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 group-has-[input:disabled]:text-zinc-600 sm:pl-3 dark:text-zinc-400 forced-colors:text-[CanvasText]'>
          {leadingIcon}
        </span>
            ) : null}
            {trailingIcon ? (
                <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 group-has-[input:disabled]:text-zinc-600 sm:pr-3 dark:text-zinc-400 forced-colors:text-[CanvasText]'>
          {trailingIcon}
        </span>
            ) : null}
    </span>
    );
}

export function Textarea({ className, ...props }: TextareaProps): React.ReactElement {
    return (
        <span data-slot='control' className={cn(controlFrameClasses, className)}>
      <textarea className={cn(controlClasses, 'min-h-24 px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(3)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(2)-1px)]')} {...props} />
    </span>
    );
}

export function Select({ className, multiple, ...props }: SelectProps): React.ReactElement {
    return (
        <span data-slot='control' className={cn('group', controlFrameClasses, className)}>
      <select
          multiple={multiple}
          className={cn(
              controlClasses,
              'py-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(2)-1px)] [&_optgroup]:font-semibold dark:*:bg-zinc-800 dark:text-white',
              multiple ? 'px-[calc(--spacing(3.5)-1px)] sm:px-[calc(--spacing(3)-1px)]' : 'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
          )}
          {...props}
      />
            {!multiple ? (
                <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
          <svg className='size-5 stroke-zinc-500 group-has-[select:disabled]:stroke-zinc-600 sm:size-4 dark:stroke-zinc-400 forced-colors:stroke-[CanvasText]' viewBox='0 0 16 16' aria-hidden='true' fill='none'>
            <path d='M5.75 10.75L8 13L10.25 10.75' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round' />
            <path d='M10.25 5.25L8 3L5.75 5.25' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </span>
            ) : null}
    </span>
    );
}

export function Field({ label, className, children }: {
    label: string;
    className?: string;
    children: React.ReactNode
}): React.ReactElement {
    return (
        <div className={cn(
            '[&>[data-slot=label]+[data-slot=control]]:mt-1.5 *:data-[slot=label]:font-medium',
            className,
        )}>
            <Label className={className}>{label}</Label>
            {children}
        </div>
    );
}
