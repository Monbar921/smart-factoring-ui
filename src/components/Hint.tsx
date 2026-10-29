import { CircleHelp } from 'lucide-react';
import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/** отступ всплывающего окна от края экрана и от элемента, px */
const MARGIN = 8;
const GAP = 4;

/**
 * Положение всплывающего окна у элемента (замечания 29.10, П3-1): окно - в body с position: fixed, поэтому его не обрезают
 * таблица и карточка (overflow); у края экрана оно сдвигается внутрь, а без места снизу - открывается над элементом.
 */
function useFloating(anchor: RefObject<HTMLElement | null>, open: boolean, align: 'start' | 'end') {
  const floating = useRef<HTMLSpanElement>(null);

  // положение пишется прямо в style окна: оно меняется при прокрутке, и перерисовывать ради этого React незачем
  useLayoutEffect(() => {
    const element = floating.current;
    if (!open || !element) return;
    const update = () => {
      const target = anchor.current?.getBoundingClientRect();
      if (!target) return;
      const box = element.getBoundingClientRect();
      const preferred = align === 'end' ? target.right - box.width : target.left;
      const left = Math.max(Math.min(preferred, window.innerWidth - box.width - MARGIN), MARGIN);
      const below = target.bottom + GAP;
      const top = below + box.height > window.innerHeight - MARGIN ? Math.max(target.top - GAP - box.height, MARGIN) : below;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.visibility = 'visible';
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      // при следующем открытии окно сначала измеряется невидимым
      element.style.visibility = 'hidden';
    };
  }, [anchor, open, align]);

  return { floating, style: { left: 0, top: 0, visibility: 'hidden' as const } };
}

const POPOVER =
  'fixed z-50 rounded-md border bg-popover text-left text-xs font-normal whitespace-normal text-popover-foreground normal-case shadow-md';

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
  const anchor = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const open = hover || focus;
  const { floating, style } = useFloating(anchor, open, align);
  return (
    <span
      ref={anchor}
      className={cn('inline-flex', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={id}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="cursor-help underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {children}
      </span>
      {createPortal(
        <span
          ref={floating}
          id={id}
          role="tooltip"
          style={style}
          // закрытая подсказка скрыта, но остаётся в документе для aria-describedby
          className={cn(POPOVER, 'pointer-events-none w-64 max-w-[calc(100vw-1rem)] p-2', open ? 'block' : 'hidden')}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
}

/** Кнопка «?» со справкой, которая открывается по нажатию (справка по уровням риска) */
export function HelpButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const { floating, style } = useFloating(anchor, open, 'start');
  return (
    <span ref={anchor} className="relative inline-flex align-middle">
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
      {open &&
        createPortal(
          <span
            ref={floating}
            id={id}
            role="dialog"
            aria-label={title}
            style={style}
            className={cn(POPOVER, 'block w-72 max-w-[calc(100vw-1rem)] p-3')}
          >
            <span className="mb-1 block font-semibold">{title}</span>
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
