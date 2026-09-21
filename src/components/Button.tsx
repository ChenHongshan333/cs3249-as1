import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  asChild?: boolean;
};

// A shared button style; asChild lets assistant-ui keep control of the action.
export function Button({ variant = 'primary', className = '', asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  return <Component type="button" className={`button button-${variant} ${className}`} {...props} />;
}
