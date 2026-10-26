"use client";

import { Trash2Icon } from "lucide-react";
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

export function AvatarUpload({
  image,
  initials,
}: {
  image: string | null;
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

  return (<DetailSection title="Avatar" groupClassName="sm:grid-cols-1">
    <div className="flex items-center gap-4">
      <Avatar className="size-20" onClick={() => inputRef.current?.click()}>
        {image && <AvatarImage src={image} alt="Your avatar" />}
        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              Click the avatar to change image.{" "}
            </p>
            <p className="text-sm text-muted-foreground">
              PNG, JPEG, WebP or GIF accepted. Cropped to a square.
            </p>
          </div>
        )}
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
  </DetailSection>
  );
}
