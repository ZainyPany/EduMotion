import type { Metadata } from "next"
import { ClerkProvider, SignIn, Show } from "@clerk/nextjs"
import "./globals.css"

export const metadata: Metadata = {
  title: "EduMotion AI Motion Studio",
  description: "Educational motion-graphics platform for teachers",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="flex min-h-full flex-col font-body">
          <Show when="signed-in">
            {children}
          </Show>
          <Show when="signed-out">
            <div className="flex min-h-screen items-center justify-center bg-[#FDF9F3]">
              <SignIn routing="hash" />
            </div>
          </Show>
        </body>
      </html>
    </ClerkProvider>
  )
}
