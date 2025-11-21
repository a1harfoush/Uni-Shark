import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background-primary">
      <SignIn 
        appearance={{
          variables: {
            colorPrimary: "#89DDFF",
            colorBackground: "#1A1A1D",
            colorText: "#C3E88D",
            colorInputBackground: "#252528",
            colorInputText: "#C3E88D",
            colorTextSecondary: "#9CA3AF",
            colorNeutral: "#4A4A4D",
            borderRadius: '0.125rem',
            fontFamily: '"Fira Code", monospace',
          },
          elements: {
            card: {
              backgroundColor: 'rgba(37, 37, 40, 0.95)',
              border: '1px solid #4A4A4D',
              boxShadow: '0 0 20px rgba(137, 221, 255, 0.1)',
            },
            headerTitle: {
              fontSize: '1.5rem',
              color: '#89DDFF',
            },
            headerSubtitle: {
              fontSize: '1rem',
              color: '#C3E88D',
            },
            socialButtonsBlockButton: {
              backgroundColor: '#4A4A4D',
              color: '#FFFFFF',
              border: '2px solid #89DDFF',
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
              fontSize: '1rem',
            },
            formFieldLabel: {
              fontSize: '0.9rem',
              color: '#C3E88D',
            },
            footerActionText: {
              fontSize: '1rem',
              color: '#C3E88D',
            },
            footerActionLink: {
              fontSize: '1rem',
              color: '#89DDFF',
              '&:hover': {
                color: '#FFFFFF',
              },
            },
          },
        }}
        forceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}