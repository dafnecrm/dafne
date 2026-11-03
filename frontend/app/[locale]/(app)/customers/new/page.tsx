import type { Metadata } from "next";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>New customer</PageContentTitle>
        <PageContentDescription>
          Only the name is required. Add as many addresses as you need.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <CustomerForm />
      </PageContentBody>
    </PageContent>
  );
}
