import type { Metadata } from "next";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { ActivityForm } from "../activity-form";

export const metadata: Metadata = { title: "New activity" };

export default function NewActivityPage() {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>New activity</PageContentTitle>
        <PageContentDescription>
          Only the name is required.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ActivityForm />
      </PageContentBody>
    </PageContent>
  );
}
