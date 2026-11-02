import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs 子组件必须在 <Tabs> 内使用');
  return ctx;
}

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  value,
  className,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  const { value: current, setValue } = useTabs();
  const active = current === value;

  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      data-state={active ? 'active' : 'inactive'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  );
}

function TabsContent({
  value,
  className,
  ...props
}: React.ComponentProps<'div'> & { value: string }) {
  const { value: current } = useTabs();
  if (current !== value) return null;

  return (
    <div data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
