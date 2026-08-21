export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-20">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Chat widget demo</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Draggable, dockable AI chat widget
          </h1>
          <p className="max-w-xl text-muted-foreground">
            The launcher is fixed in the bottom-right corner. Open it, then
            drag the header around the viewport — drop it near the left or
            right edge to dock it as a full-height drawer. Drag the docked
            header back out, or use the pop-out button, to return to floating
            mode.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-5 text-card-foreground"
            >
              <p className="text-sm font-medium">Sample content block {i + 1}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This page content is just here to show the widget floating
                and docking over real layout.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
