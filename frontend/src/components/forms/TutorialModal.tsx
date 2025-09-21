// /frontend/src/components/forms/TutorialModal.tsx
"use client";

import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { cn } from "@/lib/utils";

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    topic: 'discord' | 'nopecha' | 'freecaptcha' | null;
}

const tutorialContent = {
    discord: {
        title: "How to get a Discord Webhook URL",
        steps: [
            {
                step: 1,
                title: "Open Discord Server",
                description: "Open Discord and navigate to the server where you want to receive notifications."
            },
            {
                step: 2,
                title: "Access Channel Settings",
                description: "Right-click on a text channel and select 'Edit Channel' > 'Integrations'."
            },
            {
                step: 3,
                title: "Create Webhook",
                description: "Click 'Create Webhook' or 'View Webhooks' if you already have some."
            },
            {
                step: 4,
                title: "Configure Webhook",
                description: "Name your webhook (e.g., 'UniShark Bot') and optionally set an avatar."
            },
            {
                step: 5,
                title: "Copy URL",
                description: "Click 'Copy Webhook URL' and paste it into the input field in settings."
            }
        ],
        tips: [
            "Make sure you have 'Manage Webhooks' permission in the server",
            "Test the webhook by sending a manual scan notification",
            "Keep your webhook URL private - anyone with it can send messages to your channel"
        ]
    },
    nopecha: {
        title: "How to get a Free NopeCHA API Key",
        steps: [
            {
                step: 1,
                title: "Visit NopeCHA Website",
                description: (
                    <>
                        Go to{' '}
                        <a 
                            href="https://nopecha.com/manage" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-accent-primary underline hover:text-text-heading transition-colors"
                        >
                            https://nopecha.com/manage
                        </a>
                        {' '}and create an account or login.
                    </>
                )
            },
            {
                step: 2,
                title: "GitHub Method (Recommended)",
                description: "Login with your GitHub account to get a free GitHub key automatically."
            },
            {
                step: 3,
                title: "Discord Method (Alternative)",
                description: "Join their Discord server, navigate to #free-key-discord channel, and send !nopecha in the chat. The bot will send the API key to your Discord DMs."
            }
        ],
        tips: [
            "GitHub login is the fastest method for free keys",
            "Discord method: join server > #free-key-discord > type !nopecha",
            "Both methods provide free API access with daily limits"
        ]
    },
    freecaptcha: {
        title: "How to get FreeCaptcha API Key",
        steps: [
            {
                step: 1,
                title: "Visit FreeCaptcha Website",
                description: (
                    <>
                        Go to{' '}
                        <a 
                            href="https://freecaptchabypass.com/cp/index" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-accent-primary underline hover:text-text-heading transition-colors"
                        >
                            https://freecaptchabypass.com/cp/index
                        </a>
                        {' '}and create an account.
                    </>
                )
            },
            {
                step: 2,
                title: "Access Control Panel",
                description: "After registration, login and navigate to your control panel dashboard."
            },
            {
                step: 3,
                title: "Get Your API Key",
                description: "Find and copy your API key from the control panel. It should be displayed prominently on your dashboard."
            }
        ],
        tips: [
            "Registration is free and provides initial credits",
            "API key is available immediately after account creation",
            "Check your dashboard for usage statistics and remaining credits"
        ]
    }
};

export default function TutorialModal({ isOpen, onClose, topic }: TutorialModalProps) {
    if (!topic || !tutorialContent[topic]) return null;

    const content = tutorialContent[topic];

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background-primary border-2 border-accent-primary rounded-none shadow-2xl z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto m-2 sm:m-4">
                    {/* Header */}
                    <div className="relative p-4 md:p-6 border-b border-accent-primary/30">
                        <Dialog.Title className="font-heading text-base md:text-lg lg:text-xl text-text-heading pr-8"
                                     style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}>
                            {`> ${content.title.toUpperCase()}`}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="absolute top-3 md:top-4 right-3 md:right-4 p-2 text-text-secondary hover:text-accent-primary transition-colors">
                                <Cross2Icon className="h-4 w-4 md:h-5 md:w-5" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Content */}
                    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                        {/* Steps */}
                        <div className="space-y-4">
                            <h3 className="font-body text-base md:text-lg text-text-primary font-bold mb-4">
                                {`// STEP_BY_STEP_GUIDE`}
                            </h3>
                            {content.steps.map((step) => (
                                <div key={step.step} className="flex gap-3 md:gap-4 p-3 md:p-4 bg-background-secondary/30 rounded border border-accent-primary/20">
                                    <div className="flex-shrink-0">
                                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-accent-primary/20 border border-accent-primary flex items-center justify-center">
                                            <span className="font-mono text-xs md:text-sm text-accent-primary font-bold">
                                                {step.step}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-body text-sm md:text-base text-text-primary mb-2 font-bold">
                                            {step.title}
                                        </h4>
                                        <p className="font-body text-xs md:text-sm text-text-secondary">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tips */}
                        <div className="space-y-3">
                            <h3 className="font-body text-base md:text-lg text-text-primary font-bold">
                                {`// IMPORTANT_TIPS`}
                            </h3>
                            <div className="bg-background-secondary/20 border border-accent-primary/30 rounded p-3 md:p-4">
                                <ul className="space-y-2">
                                    {content.tips.map((tip, index) => (
                                        <li key={index} className="font-body text-xs md:text-sm text-text-secondary flex items-start gap-2">
                                            <span className="text-accent-primary mt-1 flex-shrink-0">•</span>
                                            <span className="flex-1">{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-4 border-t border-accent-primary/30">
                            <button
                                onClick={onClose}
                                className="px-4 md:px-6 py-2 bg-accent-primary text-background-primary font-heading hover:bg-white hover:shadow-glow-primary active:scale-95 transition-all duration-200 text-sm md:text-base"
                            >
                                {`> CLOSE_TUTORIAL`}
                            </button>
                        </div>
                    </div>

                    {/* Corner brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-50"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-50"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-50"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-50"></div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}