import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function TermsOfService() {
  return (
    <div className="min-h-screen w-full grid-background text-text-primary p-4 lg:p-8">
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 18, 18, 0.5) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px'
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="font-heading text-4xl md:text-6xl text-text-heading animate-flicker"
                 style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.5)' }}>
              UNI SHARK
            </div>
          </Link>
          <h1 className="font-heading text-2xl text-state-warning animate-flicker mb-2">
            &gt; DISCLAIMER & TERMS OF USE
          </h1>
          <p className="text-text-secondary font-mono text-sm">
            // LEGAL DOCUMENTATION - READ CAREFULLY
          </p>
        </header>

        {/* Content */}
        <div className="border-2 border-state-warning bg-background-secondary/90 backdrop-blur-sm rounded-lg shadow-lg shadow-state-warning/20 p-8">
          <div className="space-y-8 text-text-secondary font-body">
            
            {/* Introduction */}
            <div>
              <p className="text-accent-primary font-heading mb-4">&gt; OVERVIEW</p>
              <p className="mb-4">
                Uni Shark is an open-source project provided for educational and personal use purposes only. 
                By using this software, you agree to the following terms and conditions.
              </p>
            </div>

            {/* User Responsibility */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; USER RESPONSIBILITY</h2>
              <p className="mb-4">
                You are solely responsible for your use of Uni Shark, including providing any credentials or APIs 
                (e.g., for captcha solving). Ensure your actions comply with all applicable laws, including Egypt's 
                Anti-Cyber and Information Technology Crimes Law, and the terms of service/policies of your university 
                or any accessed systems (e.g., DULMS).
              </p>
              <p className="mb-4">
                Unauthorized access, data scraping, or automation may violate these terms and could result in:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                <li>Account suspension from your university systems</li>
                <li>Legal action from third parties</li>
                <li>Other consequences as determined by affected institutions</li>
              </ul>
            </div>

            {/* No Endorsement */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; NO ENDORSEMENT OR AFFILIATION</h2>
              <p className="mb-4">
                This application is not affiliated with, endorsed by, or approved by any university or educational institution. 
                Uni Shark relies on user-provided information and does not guarantee:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                <li>Accuracy of scraped data</li>
                <li>Timeliness of information updates</li>
                <li>Availability of services</li>
                <li>Compatibility with university system changes</li>
              </ul>
            </div>

            {/* No Warranties */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; NO WARRANTIES</h2>
              <p className="mb-4">
                Uni Shark is provided "as is" without any warranties, express or implied, including but not limited to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement of third-party rights</li>
                <li>Security of data transmission or storage</li>
                <li>Continuous operation without interruption</li>
              </ul>
              <p className="mt-4">
                The developer assumes no liability for any errors, data loss, security breaches, or damages arising from use of this software.
              </p>
            </div>

            {/* Data Handling */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; DATA HANDLING</h2>
              <p className="mb-4">
                While credentials are encrypted during transmission and storage, you share them at your own risk. 
                Important considerations:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                <li>Do not use this app if sharing credentials violates your university's policies</li>
                <li>Regularly review your university account activity</li>
                <li>Change your passwords if you suspect unauthorized access</li>
                <li>Understand that data scraping may leave traces in system logs</li>
              </ul>
            </div>

            {/* Legal Compliance */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; LEGAL COMPLIANCE</h2>
              <p className="mb-4">
                Users must ensure compliance with all applicable laws and regulations, including but not limited to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                <li>Egypt's Anti-Cyber and Information Technology Crimes Law</li>
                <li>University terms of service and acceptable use policies</li>
                <li>Data protection and privacy regulations</li>
                <li>Computer fraud and abuse laws in your jurisdiction</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; CONCERNS AND CONTACT</h2>
              <p className="mb-4">
                If you represent a university or have concerns about this project, please contact{' '}
                <a href="mailto:admin@unishark.site" className="text-accent-primary hover:text-state-success transition-colors underline">
                  admin@unishark.site
                </a>{' '}
                for discussion or removal requests.
              </p>
              <p className="mb-4">
                We are committed to working with educational institutions to address any legitimate concerns.
              </p>
            </div>

            {/* Modifications */}
            <div>
              <h2 className="text-accent-primary font-heading text-lg mb-4">&gt; MODIFICATIONS</h2>
              <p className="mb-4">
                The developer reserves the right to modify or discontinue the project at any time without prior notice. 
                Continued use of Uni Shark after any modifications constitutes acceptance of the updated terms.
              </p>
            </div>

            {/* Final Notice */}
            <div className="border-t border-text-secondary/30 pt-6">
              <p className="text-state-warning font-mono text-sm mb-4">
                // IMPORTANT: By using Uni Shark, you acknowledge that you have read, understood, and agree to be bound by these terms.
              </p>
              <p className="text-xs text-text-secondary">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-8">
          <Link href="/" className="inline-block">
            <Button 
              variant="primary" 
              className="font-heading text-sm px-8 py-3 hover:shadow-glow-primary transition-all duration-200"
            >
              &gt; RETURN TO TERMINAL
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <div className="font-heading text-xs text-text-secondary">
            UNI_SHARK_LEGAL_v1.0 | 
            <span className="text-state-warning mx-2">TERMS_ACTIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}