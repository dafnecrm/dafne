import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Tiny CRM" };

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Enter your email and password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
      <CardFooter className="justify-center text-muted-foreground">
        <span>
          No account yet?{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
