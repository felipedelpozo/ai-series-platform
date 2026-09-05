import { StudioShell } from "@/components/studio-shell";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to content
      </a>
      <StudioShell>{children}</StudioShell>
    </>
  );
}
