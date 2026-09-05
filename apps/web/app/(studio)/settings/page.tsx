import Link from "next/link";
import { Button } from "@ai-series/ui";
import { Settings2 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Review configuration that is currently available to this workspace."
      emptyTitle="No editable settings yet"
      emptyDescription="Platform and workspace settings are not configurable from this screen yet. You can still manage identity and workspace access in Accounts."
      icon={Settings2}
      action={
        <Button asChild variant="outline">
          <Link href="/accounts">Open accounts</Link>
        </Button>
      }
    />
  );
}
