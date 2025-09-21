"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    feedback_type: "Bug Report",
    message: "",
    screenshot: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      const payload = {
        feedback_type: formData.feedback_type,
        message: formData.message,
        page_url: window.location.pathname,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Feedback submitted! We'll investigate this issue.");
      setFormData({ feedback_type: "Bug Report", message: "", screenshot: null });
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background-primary border-2 border-accent-primary rounded-lg shadow-2xl">
        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-50"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-50"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-50"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-50"></div>
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-lg text-accent-primary animate-flicker"
                style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
              // REPORT ISSUE
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-accent-primary transition-colors text-xl font-mono"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Feedback Type */}
            <div>
              <label className="block font-mono text-sm text-text-secondary mb-2">
                TYPE OF FEEDBACK:
              </label>
              <select
                value={formData.feedback_type}
                onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value })}
                className="w-full px-3 py-2 bg-background-secondary border border-accent-primary/30 rounded font-mono text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value="Bug Report">🐞 Bug Report</option>
                <option value="Feature Suggestion">💡 Feature Suggestion</option>
                <option value="General Question">❓ General Question</option>
                <option value="Performance Issue">⚡ Performance Issue</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block font-mono text-sm text-text-secondary mb-2">
                DESCRIBE THE ISSUE:
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please describe the issue in as much detail as possible. If it's a bug, what were you doing when it happened?"
                rows={6}
                className="w-full px-3 py-2 bg-background-secondary border border-accent-primary/30 rounded font-mono text-sm text-text-primary placeholder-text-secondary/50 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 resize-none"
                required
              />
            </div>

            {/* Auto-included info notice */}
            <div className="text-xs text-text-secondary font-mono bg-background-secondary/30 p-3 rounded border border-accent-primary/10">
              <p className="mb-1">📊 AUTOMATICALLY INCLUDED:</p>
              <p>• Current page: {typeof window !== 'undefined' ? window.location.pathname : ''}</p>
              <p>• User ID: {userId}</p>
              <p>• Browser info & timestamp</p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-background-secondary border border-accent-primary/30 text-text-secondary font-mono text-sm rounded hover:bg-background-secondary/80 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.message.trim()}
                className="flex-1 px-4 py-2 bg-accent-primary text-background-primary font-mono text-sm font-bold rounded hover:bg-text-heading transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "SENDING..." : "SUBMIT"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BugReportModal;