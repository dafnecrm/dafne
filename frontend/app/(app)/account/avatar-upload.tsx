"use client";

import { Edit2Icon, EditIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_FILE_BYTES,
  fileToAvatar,
} from "@/lib/avatar";
import { DetailSection } from "@/components/detail";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";

export function AvatarUpload({
  image,
  className,
  initials,
}: {
  image: string | null;
  className?: string | null;
  initials: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  /** Sets the avatar, or removes it with null. The backend validates the image. */
  const save = (next: string | null) =>
    startTransition(async () => {
      const { error } = await authClient.updateUser({ image: next });
      if (error) {
        setError(
          error.status === 401
            ? "Your session has expired. Sign in again."
            : error.message || "Couldn't save your avatar. Please try again.",
        );
        return;
      }
      setError(undefined);
      // Re-render this page and the sidebar with the new image.
      router.refresh();
    });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
      setError("Pick a PNG, JPEG, WebP or GIF image.");
      return;
    }
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      setError("The image must be smaller than 10 MB.");
      return;
    }

    try {
      save(await fileToAvatar(file));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't read this image.",
      );
    }
  }

  return (<div className={cn('flex flex-col items-center gap-4', className)}>
    <Tooltip>
      <TooltipTrigger>
        <Avatar className="size-40 cursor-pointer" onClick={() => inputRef.current?.click()}>
          {image && <AvatarImage src={image} alt="Your avatar" />}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Click to update.
      </TooltipContent>
    </Tooltip>

    {image && (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => save(null)}
      >
        <Trash2Icon data-icon="inline-start" />
        Remove
      </Button>
    )}

    <div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        aria-label="Avatar image"
        onChange={onFileChange}
      />
    </div>
  </div>
  );
}
