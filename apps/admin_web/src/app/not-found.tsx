import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-card border border-border bg-surface shadow-card">
        <EmptyState
          icon={SearchX}
          title="Record not found"
          body="It may not exist, or it is outside your current scope. Nothing was changed."
          action={
            <Button asChild variant="primary">
              <Link href="/">Return to command center</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
