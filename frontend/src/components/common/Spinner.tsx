export interface SpinnerProps {
  fullscreen?: boolean;
  label?: string;
}

export default function Spinner({ fullscreen, label = 'Yükleniyor...' }: SpinnerProps) {
  const content = (
    <div className="flex items-center justify-center gap-2 text-sm text-foreground/70">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/30 border-t-transparent" />
      <span>{label}</span>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-[200px] w-full items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
