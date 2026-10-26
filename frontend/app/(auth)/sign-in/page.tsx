import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription, CardHeader,
  CardTitle
} from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";
import { PawPrint } from "lucide-react";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 items-center justify-center">
          <PawPrint /> 
          <span className="font-medium text-2xl bg-linear-to-r from-primary to-[dimgrey] bg-clip-text text-transparent">Dafne</span>  
        </div>
        <CardTitle className="text-xl text-center">Sign in with your account</CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
        <div className="flex justify-center text-muted-foreground mt-4">
          <span>
            No account yet?{" "}
            <Link
              href="/sign-up"
              className="text-foreground underline underline-offset-4"
            >
              Sign up
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
