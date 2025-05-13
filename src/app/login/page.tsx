"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address.").min(1, "Email is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { signIn, user, isLoading: authLoading, error: authError } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorFromSubmit, setErrorFromSubmit] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorFromSubmit(null);
    const { error } = await signIn({ email: data.email, password: data.password });
    setIsSubmitting(false);

    if (error) {
      const errorMessage = error.message || "An unexpected error occurred. Please check your credentials or try again later.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setErrorFromSubmit(errorMessage);
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/"); 
    }
  };
  
  React.useEffect(() => {
    if (user && !authLoading) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  React.useEffect(() => {
    if (authError) {
        toast({
            title: "Authentication Service Error",
            description: authError.message || "An issue occurred with the authentication service.",
            variant: "destructive",
        });
    }
  }, [authError, toast]);

  if (authLoading && !user) { // Show loading only if not already logged in and navigating
    // return <div className="flex h-screen items-center justify-center">Loading authentication state...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Welcome Back!</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Sign in to access your PromptVerse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorFromSubmit && (
              <p className="text-sm text-center font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                {errorFromSubmit}
              </p>
            )}
             {authError && authError.message.includes("Firebase not configured") && (
                <p className="text-sm text-center font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                    Authentication is currently unavailable. Please ensure the application is configured correctly.
                </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="you@example.com" className="bg-input"/>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} placeholder="••••••••" className="bg-input"/>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || authLoading || (!!authError && authError.message.includes("Firebase not configured"))}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
