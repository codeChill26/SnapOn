import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 backdrop-blur-md transition-all hover:border-zinc-700/60 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return <div className={`flex flex-col space-y-1.5 pb-4 ${className || ''}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return (
    <h3 className={`text-lg font-semibold leading-none tracking-tight text-white ${className || ''}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: CardProps) {
  return (
    <p className={`text-sm text-zinc-400 ${className || ''}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return <div className={`pt-0 ${className || ''}`} {...props}>{children}</div>;
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return <div className={`flex items-center pt-4 ${className || ''}`} {...props}>{children}</div>;
}
