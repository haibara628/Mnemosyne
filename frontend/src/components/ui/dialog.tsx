import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error('Dialog 子组件必须在 <Dialog> 内使用');
  return ctx;
}

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          aria-hidden="true"
          onClick={() => onOpenChange(false)}
        />
        {children}
      </div>
    </DialogContext.Provider>
  );
}

function DialogContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { onOpenChange } = useDialog();

  return (
    <div
      data-slot="dialog-content"
      className={cn(
        'relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
      <button
        type="button"
        aria-label="关闭"
        onClick={() => onOpenChange(false)}
        className="absolute right-4 top-4 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
