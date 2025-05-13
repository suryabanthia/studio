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
import type { User as FirebaseUser } from 'firebase/auth';


const signupFormSchema = z.object({
  email: z.string().email("Invalid email address.").min(1, "Email is required."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters long."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const { signUp, user, isLoading: authLoading, error: authError } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorFromSubmit, setErrorFromSubmit] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    setErrorFromSubmit(null); 
    const { error: signUpError, user: signedUpUser } = await signUp({ email: data.email, password: data.password });
    setIsSubmitting(false);

    if (signUpError) {
      const errorMessage = signUpError.message || "An unexpected error occurred during signup.";
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setErrorFromSubmit(errorMessage);
    } else if (signedUpUser) {
      // Firebase typically sends a verification email automatically if enabled in Firebase console.
      // Check if email verification is pending for the user (this property might not exist on all FirebaseUser types, or might behave differently based on Firebase project settings)
      const fbUser = signedUpUser as FirebaseUser; // Cast to access more specific Firebase properties
      if (!fbUser.emailVerified) {
         toast({
            title: "Signup Successful!",
            description: "Please check your email to verify your account before logging in.",
            duration: 7000, 
        });
        // router.push("/login"); // Redirect to login, user needs to confirm email
                               // Firebase often auto-signs in the user locally even if email is not verified.
                               // So, redirecting to home or dashboard might be okay.
                               // Let's redirect to login to be safe and enforce verification flow.
        router.push("/login"); 
      } else {
         toast({
            title: "Signup Successful!",
            description: "You are now logged in.",
        });
        router.push("/"); // Redirect to dashboard
      }
    } else {
         toast({
            title: "Signup Issue",
            description: "Something went wrong during signup. Please try again.",
            variant: "destructive",
        });
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


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Create Account</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Join PromptVerse to manage your AI prompts.
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} placeholder="••••••••" className="bg-input"/>
              {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || authLoading || (!!authError && authError.message.includes("Firebase not configured"))}>
              {isSubmitting ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
