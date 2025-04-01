// src/app/auth/signin/page.js
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-indigo-600">StudyTrackerにログイン</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <SignIn
            path="/auth/signin"
            routing="path"
            signUpUrl="/auth/signup"
            redirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-transparent shadow-none",
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
