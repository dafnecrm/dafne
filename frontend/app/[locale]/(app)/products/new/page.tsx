import type { Metadata } from "next";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>New product</PageContentTitle>
        <PageContentDescription>
          Only the name is required.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ProductForm />
      </PageContentBody>
    </PageContent>
  );
}
