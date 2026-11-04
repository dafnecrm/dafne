"use client";

import { useTranslations } from "next-intl";
import { Edit2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient, useAuthErrorMessage } from "@/lib/auth-client";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_FILE_BYTES,
  AvatarTooDetailedError,
  fileToAvatar,
} from "@/lib/avatar";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("account.avatar");
  const authErrorMessage = useAuthErrorMessage();

  /** Sets the avatar, or removes it with null. The backend validates the image. */
  const save = (next: string | null) =>
    startTransition(async () => {
      const { error } = await authClient.updateUser({ image: next });
      if (error) {
        setError(
          error.code || error.status === 401 || error.status === 429
            ? authErrorMessage(error)
            : t("saveFailed"),
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
      setError(t("wrongType"));
      return;
    }
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      setError(t("tooLarge", { mb: 10 }));
      return;
    }

    try {
      save(await fileToAvatar(file));
    } catch (err) {
      setError(
        err instanceof AvatarTooDetailedError
          ? t("tooDetailed")
          : t("unreadable"),
      );
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="relative">
            <Avatar
              className="size-50"
              onClick={() => editButtonRef.current?.click()}
            >
              {image && <AvatarImage src={image} alt={t("alt")} />}
              <AvatarFallback className="text-xl cursor-pointer">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 left-0 flex gap-2 items-center rounded-lg border border-border bg-background dark:border-input dark:bg-background h-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2">
              <Edit2Icon data-icon="inline-start" className="size-4" />{" "}
              {t("edit")}
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full">
          <DropdownMenuItem onClick={() => inputRef.current?.click()}>
            {t("upload")}
          </DropdownMenuItem>
          {image && (
            <DropdownMenuItem disabled={pending} onClick={() => save(null)}>
              {t("remove")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
          aria-label={t("input")}
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}
