"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect } from "react";
import { redirect } from "next/navigation";




export default function LandingPage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      redirect("/");
      
    }
  }, [session]);


  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        {/* Navbar */}
        <nav className="flex justify-between items-center px-8 py-4">
          <h1 className="text-2xl font-bold">ChatApp</h1>
          
        </nav>

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center px-6 mt-20">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            Real-Time Chat <br /> Made Simple 💬
          </h2>

          <p className="mt-6 text-lg text-gray-200 max-w-xl">
            Connect instantly with friends using our fast and secure chat app.
            Built with Next.js and WebSockets.
          </p>

          <button
            onClick={() => signIn()}
            className="mt-8 bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 cursor-pointer"
          >
            Get Started with Google
          </button>
        </section>

        {/* Features Section */}
        <section className="mt-24 px-8 grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
            <h3 className="text-xl font-semibold">⚡ Real-Time</h3>
            <p className="mt-2 text-gray-200">
              Instant messaging powered by WebSockets.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
            <h3 className="text-xl font-semibold">🔐 Secure Login</h3>
            <p className="mt-2 text-gray-200">
              Google authentication for safe access.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
            <h3 className="text-xl font-semibold">📱 Responsive</h3>
            <p className="mt-2 text-gray-200">
              Works perfectly on mobile and desktop.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-300 pb-6">
          © 2026 ChatApp. All rights reserved.
        </footer>
      </div>
    );
  }
}
