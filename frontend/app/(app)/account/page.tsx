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

export const metadata: Metadata = { title: "Account · Tiny CRM" };

export default function AccountPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Account</CardTitle>
        <CardDescription>Your profile details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <Profile />
        </Suspense>
      </CardContent>
    </Card>
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
      <ProfileDetails
        firstname={user.firstname}
        lastname={user.lastname}
        email={user.email}
        createdAt={user.createdAt}
      />
    </div>
  );
}
