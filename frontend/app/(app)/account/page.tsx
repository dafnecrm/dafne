import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
        <PageContentDescription>Your profile details.</PageContentDescription>
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

  return (
    
    <div className="flex flex-col md:flex-row gap-10">
      <div className="md:order-1">
        <AvatarUpload
          image={user.image ?? null}
          initials={`${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase()}
        />
      </div>
      <ProfileDetails user={user} />
    </div>
  );
}
