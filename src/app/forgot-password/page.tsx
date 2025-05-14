"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext"; // Updated import path
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PaletteMail } from "lucide-react"; // Changed icon

const forgotPasswordFormSchema = z.object({
  email: z.string().email("Invalid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export default function ForgotPasswordPage() {
  const { sendPasswordReset, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });
  
  React.useEffect(() => {
    if (user) {
      router.push("/"); // Redirect if already logged in
    }
  }, [user, router]);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const { error } = await sendPasswordReset(values.email);
    if (error) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
    } else {
      // Toast message is handled by AuthContext's sendPasswordReset
      form.reset(); // Clear form on success
    }
  };
  
  if (user) { // If user becomes available while on this page, redirect
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <LoadingSpinner size="lg" />
        <p className="ml-2">Redirecting...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/70 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card">
        <CardHeader className="text-center">
          <div className="inline-flex justify-center items-center mb-4">
            <PaletteMail className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Forgot Your Password?</CardTitle>
          <CardDescription>
            No worries! Enter your email address below and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} className="bg-background"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                {authLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" passHref>
              <Button variant="link" className="font-medium text-primary p-0 h-auto">
                Sign In
              </Button>
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
