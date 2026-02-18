import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password/", { email });
      setSent(true);
    } catch {
      // Always show the confirmation regardless — mirrors backend behaviour
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Xyno</CardTitle>
          <CardDescription>
            {sent ? "Check your inbox" : "Reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If an account with that email exists, a password reset link has been sent. Check
                your inbox (and spam folder).
              </p>
              <p className="text-center">
                <Link to="/login" className="text-sm text-primary underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-primary underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
