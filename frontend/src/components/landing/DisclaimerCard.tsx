'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function DisclaimerCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
    // Store acknowledgment in localStorage
    localStorage.setItem('uni-shark-disclaimer-acknowledged', 'true');
  };

  // Check if already acknowledged
  if (typeof window !== 'undefined' && localStorage.getItem('uni-shark-disclaimer-acknowledged')) {
    return null;
  }

  return (
    <div className="relative z-20 mb-8">
      <div className="border-2 border-state-warning bg-background-secondary/90 backdrop-blur-sm rounded-lg shadow-lg shadow-state-warning/20 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-state-warning rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-state-warning rounded-full animate-pulse"></div>
            </div>
            <h3 className="font-heading text-lg text-state-warning">
              &gt; IMPORTANT DISCLAIMER & TERMS OF USE
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-text-secondary hover:text-accent-primary transition-colors font-mono text-sm"
          >
            {isExpanded ? '[COLLAPSE]' : '[EXPAND]'}
          </button>
        </div>

        {/* Summary */}
        <div className="text-text-secondary font-body text-sm mb-4">
          <p className="mb-2">
            <span className="text-accent-primary font-mono">&gt;</span> Uni Shark is provided for <strong>educational and personal use only</strong>. 
            By using this software, you accept full responsibility for compliance with all applicable laws and university policies.
          </p>
          <p className="text-xs text-text-secondary font-mono">
            // Click [EXPAND] to read summary, <Link href="/terms" className="text-accent-primary hover:text-state-success transition-colors underline">[FULL TERMS]</Link> for complete documentation, or [I UNDERSTAND] to proceed
          </p>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-text-secondary/30 pt-4 mt-4 space-y-4 text-sm text-text-secondary font-body max-h-64 overflow-y-auto">
            <div>
              <h4 className="text-accent-primary font-heading mb-2">&gt; USER RESPONSIBILITY</h4>
              <p>
                You are solely responsible for your use of Uni Shark, including providing any credentials or APIs (e.g., for captcha solving). 
                Ensure your actions comply with all applicable laws, including Egypt's Anti-Cyber and Information Technology Crimes Law, 
                and the terms of service/policies of your university or any accessed systems (e.g., DULMS). Unauthorized access, 
                data scraping, or automation may violate these and could result in account suspension, legal action, or other consequences from third parties.
              </p>
            </div>

            <div>
              <h4 className="text-accent-primary font-heading mb-2">&gt; NO ENDORSEMENT OR AFFILIATION</h4>
              <p>
                This app is not affiliated with, endorsed by, or approved by any university or educational institution. 
                It relies on user-provided information and does not guarantee accuracy, timeliness, or availability of scraped data.
              </p>
            </div>

            <div>
              <h4 className="text-accent-primary font-heading mb-2">&gt; NO WARRANTIES</h4>
              <p>
                Uni Shark is provided "as is" without any warranties, express or implied, including but not limited to fitness for a particular purpose, 
                non-infringement, or security. The developer assumes no liability for any errors, data loss, security breaches, 
                or damages arising from use.
              </p>
            </div>

            <div>
              <h4 className="text-accent-primary font-heading mb-2">&gt; DATA HANDLING</h4>
              <p>
                Credentials are encrypted, but you share them at your own risk. Do not use this app if sharing credentials violates your university's policies.
              </p>
            </div>

            <div>
              <h4 className="text-accent-primary font-heading mb-2">&gt; CONCERNS AND CONTACT</h4>
              <p>
                If you represent a university or have concerns about this project, please contact{' '}
                <a href="mailto:admin@unishark.site" className="text-accent-primary hover:text-state-success transition-colors">
                  admin@unishark.site
                </a>{' '}
                for discussion or removal requests.
              </p>
            </div>

            <div className="border-t border-text-secondary/30 pt-4">
              <p className="text-xs text-text-secondary font-mono">
                Continued use constitutes acceptance of these terms. The developer reserves the right to modify or discontinue the project at any time.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 space-y-3 sm:space-y-0">
          <div className="text-xs text-text-secondary font-mono">
            // ACKNOWLEDGMENT REQUIRED FOR SYSTEM ACCESS
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 border border-text-secondary text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-colors font-mono text-xs"
            >
              {isExpanded ? 'COLLAPSE' : 'SUMMARY'}
            </button>
            <Link href="/terms">
              <button className="px-4 py-2 border border-accent-primary text-accent-primary hover:border-state-success hover:text-state-success transition-colors font-mono text-xs">
                FULL TERMS
              </button>
            </Link>
            <Button
              variant="primary"
              onClick={handleAcknowledge}
              className="font-heading text-xs px-6 py-2 hover:shadow-glow-primary transition-all duration-200"
            >
              &gt; I UNDERSTAND AND AGREE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}