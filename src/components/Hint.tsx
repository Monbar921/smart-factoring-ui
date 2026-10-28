import { CircleHelp } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Расшифровка при наведении и при фокусе с клавиатуры (замечания 28.10): подписи колонок, пометки, числа.
 * Текст подсказки - и в aria-describedby, чтобы его прочитали экранные читалки.
 */
export function Hint({
  text,
  children,
  className,
  align = 'start',
}: {
  text: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  const id = useId();
  return (
    <span className={cn('group/hint relative inline-flex', className)}>
      <span
        tabIndex={0}
        aria-describedby={id}
        className="cursor-help underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none invisible absolute top-full z-30 mt-1 w-64 rounded-md border bg-popover p-2 text-left text-xs font-normal whitespace-normal text-popover-foreground normal-case opacity-0 shadow-md transition-opacity',
          'group-focus-within/hint:visible group-focus-within/hint:opacity-100 group-hover/hint:visible group-hover/hint:opacity-100',
          align === 'end' ? 'right-0' : 'left-0',
        )}
      >
        {text}
      </span>
    </span>
  );
}

/** Кнопка «?» со справкой, которая открывается по нажатию (справка по уровням риска) */
export function HelpButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={title}
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <CircleHelp className="size-4" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="dialog"
          aria-label={title}
          className="absolute top-full left-0 z-30 mt-1 w-72 rounded-md border bg-popover p-3 text-left text-xs font-normal whitespace-normal text-popover-foreground normal-case shadow-md"
        >
          <span className="mb-1 block font-semibold">{title}</span>
          {children}
        </span>
      )}
    </span>
  );
}
