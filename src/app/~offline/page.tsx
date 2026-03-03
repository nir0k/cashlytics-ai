export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="font-display from-foreground to-foreground/60 bg-gradient-to-br bg-clip-text text-[3rem] leading-none font-bold tracking-[-0.03em] text-transparent">
          Keine Verbindung
        </div>
        <p className="text-muted-foreground/60 mt-1.5 max-w-sm text-sm">
          Du bist gerade offline. Bitte prüfe deine Internetverbindung und versuche es erneut.
        </p>
      </div>
    </div>
  );
}
