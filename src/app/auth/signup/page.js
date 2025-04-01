// src/app/auth/signup/page.js
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-indigo-600">StudyTrackerに新規登録</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <SignUp
            path="/auth/signup"
            routing="path"
            signInUrl="/auth/signin"
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
