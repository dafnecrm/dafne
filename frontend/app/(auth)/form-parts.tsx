import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    // Base UI buttons default to type="button".
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  );
}
