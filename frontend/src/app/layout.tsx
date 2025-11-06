import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { initializeErrorTracker } from "@/lib/error-tracker";

initializeErrorTracker();

export const metadata: Metadata = {
  title: "UNI SHARK - Automated University Portal Monitoring",
  description: "Advanced neural network for automated DULMS monitoring and real-time notifications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Missing Clerk Publishable Key');
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: "#89DDFF", // Accent for buttons and highlights
          colorBackground: "#1A1A1D",
          colorText: "#C3E88D",
          colorInputBackground: "#252528",
          colorInputText: "#C3E88D",
          colorTextOnPrimaryBackground: "#1A1A1D", // Text on primary buttons
          colorTextSecondary: "#9CA3AF", // Secondary text
          colorNeutral: "#4A4A4D", // Neutral elements
          colorDanger: "#FF6B6B", // Error states
          colorSuccess: "#51CF66", // Success states
          colorWarning: "#FFD93D", // Warning states
          borderRadius: '0.125rem', // Sharper corners for cyber theme
          fontFamily: '"Fira Code", monospace',
        },
        elements: {
          card: {
            backgroundColor: 'rgba(37, 37, 40, 0.95)',
            border: '1px solid #4A4A4D',
            boxShadow: '0 0 20px rgba(137, 221, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          },
          headerTitle: {
            color: '#89DDFF',
            fontFamily: '"Fira Code", monospace',
            fontWeight: '700',
            fontSize: '1.5rem',
          },
          headerSubtitle: {
            color: '#C3E88D',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
          },
          formButtonPrimary: {
            backgroundColor: '#89DDFF',
            color: '#1A1A1D',
            border: '1px solid #89DDFF',
            fontFamily: '"Fira Code", monospace',
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '1rem',
            '&:hover': { 
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 10px rgba(137, 221, 255, 0.5)',
            },
          },
          formButtonSecondary: {
            backgroundColor: '#252528',
            color: '#C3E88D',
            border: '1px solid #4A4A4D',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
            '&:hover': {
              backgroundColor: '#4A4A4D',
              borderColor: '#89DDFF',
            },
          },
          socialButtonsBlockButton: {
            backgroundColor: '#4A4A4D',
            color: '#FFFFFF',
            border: '2px solid #89DDFF',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
            fontWeight: '600',
            '&:hover': {
              backgroundColor: '#89DDFF',
              borderColor: '#FFFFFF',
              color: '#1A1A1D',
              boxShadow: '0 0 10px rgba(137, 221, 255, 0.5)',
            },
          },
          formFieldInput: {
            backgroundColor: '#252528',
            border: '1px solid #4A4A4D',
            color: '#C3E88D',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
            '&:focus': {
              borderColor: '#89DDFF',
              boxShadow: '0 0 5px rgba(137, 221, 255, 0.3)',
            },
          },
          formFieldLabel: {
            color: '#C3E88D',
            fontFamily: '"Fira Code", monospace',
            fontSize: '0.9rem',
          },
          identityPreviewText: {
            color: '#FFFFFF',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
          },
          identityPreviewEditButton: {
            color: '#89DDFF',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
          },
          userButtonPopoverCard: {
            backgroundColor: 'rgba(37, 37, 40, 0.98)',
            border: '1px solid #4A4A4D',
          },
          userButtonPopoverActionButton: {
            color: '#FFFFFF',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
            '&:hover': {
              backgroundColor: '#4A4A4D',
              color: '#89DDFF',
            },
          },
          footerActionText: {
            color: '#C3E88D',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
          },
          footerActionLink: {
            color: '#89DDFF',
            fontFamily: '"Fira Code", monospace',
            fontSize: '1rem',
            textDecoration: 'underline',
            '&:hover': {
              color: '#FFFFFF',
            },
          },
          footer: {
            '& > div': {
              backgroundColor: 'transparent',
            },
          },
          modalContent: {
            backgroundColor: 'rgba(37, 37, 40, 0.98)',
          },
          modalCloseButton: {
            color: '#89DDFF',
          },
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Press+Start+2P&family=VT323&display=swap"
            rel="stylesheet"
          />
          <script async src="https://tally.so/widgets/embed.js"></script>
        </head>
        <body className="bg-background-primary text-text-primary font-body">
          {/* Permanent scanline overlay for Terminal Glow aesthetic */}
          <div className="scanline-overlay" />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
