export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        Placeholder — this surface will be implemented in a later feature.
      </div>
    </div>
  );
}
