import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[#E4E4E7] bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#D4D4D8] ${className || ''}`}
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
    <h3 className={`text-lg font-semibold leading-none tracking-tight text-[#18181B] ${className || ''}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: CardProps) {
  return (
    <p className={`text-sm text-[#71717A] ${className || ''}`} {...props}>
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
