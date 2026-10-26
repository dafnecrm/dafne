import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { AvatarUpload } from "./avatar-upload";
import { ProfileDetails } from "./profile-details";
import { PageContent, PageContentBody, PageContentDescription, PageContentHeader, PageContentTitle } from "@/components/page-content";

export const metadata: Metadata = { title: "AccountCRM" };

export default function AccountPage() {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle className="text-xl">Account</PageContentTitle>
        <PageContentDescription>Your account details.</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <Profile />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

async function Profile() {
  const user = await requireUser();

  return (<>
    <AvatarUpload
      image={user.image ?? null}
      initials={`${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase()}
    />
    <ProfileDetails user={user} />
  </>
  );
}
