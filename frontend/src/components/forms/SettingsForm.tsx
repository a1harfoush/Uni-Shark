"use client";
import { useSettings } from "@/lib/hooks/useSettings";
import { Card } from "@/components/ui/Card";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/Select";
import TutorialModal from "./TutorialModal";
import { useEffect, useState } from "react";

export default function SettingsForm() {
    const { settings, isLoading, updateSettings, isUpdating } = useSettings();
    const [formData, setFormData] = useState(settings || {});
    const [tutorialTopic, setTutorialTopic] = useState<'discord' | 'nopecha' | 'freecaptcha' | null>(null);

    useEffect(() => {
        if (settings) {
            setFormData({
                ...settings,
                notify_via_email: settings.notify_via_email || false,
                notify_via_telegram: settings.notify_via_telegram || false,
                telegram_chat_id: settings.telegram_chat_id || '',
                deadline_reminder_hours: settings.deadline_reminder_hours || 24,
                deadline_notifications: settings.deadline_notifications || false,
            });
        }
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        // Special handling for password field to clear placeholder when user starts typing
        if (id === 'dulms_password' && formData.dulms_password === "********" && value !== "********") {
            // User is typing a new password, clear the placeholder
            setFormData(prev => ({ ...prev, [id]: value }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, checked } = e.target;
        setFormData(prev => ({ ...prev, [id]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Create a copy of formData for the payload
        const payload = { ...formData };

        // If the password field is empty or still the placeholder,
        // do NOT include it in the update payload to avoid overwriting the real password
        if (!payload.dulms_password || payload.dulms_password === "********") {
            delete payload.dulms_password;
        }

        updateSettings(payload);
    }

    const openTutorial = (topic: 'discord' | 'nopecha' | 'freecaptcha') => {
        setTutorialTopic(topic);
    };

    const closeTutorial = () => {
        setTutorialTopic(null);
    };

    if (isLoading) return <p className="animate-pulse"> loading configuration...</p>;

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
                <Card className="relative overflow-hidden p-3 sm:p-4 md:p-6">
                    {/* Corner brackets - hidden on mobile for cleaner look */}
                    <div className="hidden sm:block absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>

                    <h2 className="font-heading text-sm sm:text-base md:text-lg text-accent-primary mb-2 sm:mb-3 md:mb-4 animate-flicker"
                        style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                        {`> DULMS_LOGIN_CREDENTIALS`}
                    </h2>
                    <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4 leading-relaxed">
                        Enter your DULMS login credentials - same as the DULMS website.
                    </p>
                    <div className="bg-green-900/20 border border-green-500/30 rounded p-2 mb-3">
                        <p className="text-xs text-green-400 flex items-center gap-2">
                            <span>🔒</span>
                            <span><strong>Encrypted & Secure</strong> - Your password is protected and never visible to anyone.</span>
                        </p>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        <InputField label="DULMS Username" id="dulms_username" value={formData.dulms_username || ''} onChange={handleInputChange} placeholder="Your DULMS username (e.g., student123)" />
                        <InputField label="DULMS Password" id="dulms_password" type="password" value={formData.dulms_password || ''} onChange={handleInputChange} placeholder="Enter new password to update (leave blank to keep current)" />
                    </div>
                </Card>

                <Card className="relative overflow-hidden p-3 sm:p-4 md:p-6">
                    {/* Corner brackets - hidden on mobile */}
                    <div className="hidden sm:block absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>

                    <h2 className="font-heading text-sm sm:text-base md:text-lg text-accent-primary mb-2 sm:mb-3 md:mb-4 animate-flicker"
                        style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                        {`> CAPTCHA_SOLVING_SERVICES`}
                    </h2>
                    <div className="bg-background-secondary/20 border border-accent-primary/20 rounded p-2 sm:p-3 mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm text-text-secondary mb-1 sm:mb-2">
                            <span className="font-semibold text-accent-primary">Required:</span> You need at least one CAPTCHA solving service to bypass DULMS security.
                        </p>
                        <p className="text-xs sm:text-sm text-text-secondary">
                            <span className="font-semibold text-accent-primary">Recommended:</span> Use both services for maximum reliability. If one fails, the system automatically switches to the other.
                        </p>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                                <label className="font-body text-xs sm:text-sm md:text-base text-text-primary">
                                    FreeCaptcha API Key
                                    <span className="text-accent-primary font-semibold ml-1 block sm:inline">(Primary - Recommended)</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => openTutorial('freecaptcha')}
                                    className="text-accent-primary hover:text-text-heading transition-colors self-start sm:self-auto"
                                    title="How to get FreeCaptcha API Key"
                                >
                                    <span className="font-mono text-xs border border-accent-primary/50 rounded px-1.5 py-0.5 hover:border-accent-primary">?</span>
                                </button>
                            </div>
                            <p className="text-xs text-text-secondary mb-2">Fast and reliable. Works well with DULMS CAPTCHAs.</p>
                            <InputField label="" id="fcb_api_key" value={formData.fcb_api_key || ''} onChange={handleInputChange} placeholder="Enter your FreeCaptcha API key" />
                        </div>

                        <div className="text-center text-text-secondary text-xs sm:text-sm py-2">
                            <span className="bg-background-secondary px-2 sm:px-3 py-1 rounded">OR</span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                                <label className="font-body text-xs sm:text-sm md:text-base text-text-primary">
                                    NopeCHA API Key
                                    <span className="text-text-secondary ml-1 block sm:inline">(Alternative)</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => openTutorial('nopecha')}
                                    className="text-accent-primary hover:text-text-heading transition-colors self-start sm:self-auto"
                                    title="How to get NopeCHA API Key"
                                >
                                    <span className="font-mono text-xs border border-accent-primary/50 rounded px-1.5 py-0.5 hover:border-accent-primary">?</span>
                                </button>
                            </div>
                            <p className="text-xs text-text-secondary mb-2">Alternative service. Good as backup or primary option.</p>
                            <InputField label="" id="nopecha_api_key" value={formData.nopecha_api_key || ''} onChange={handleInputChange} placeholder="Enter your NopeCHA API key" />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden p-3 sm:p-4 md:p-6">
                    {/* Corner brackets - hidden on mobile */}
                    <div className="hidden sm:block absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
                    <div className="hidden sm:block absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>

                    <h2 className="font-heading text-sm sm:text-base md:text-lg text-accent-primary mb-2 sm:mb-3 md:mb-4 animate-flicker"
                        style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                        {`> NOTIFICATION_CHANNELS`}
                    </h2>
                    <div className="bg-background-secondary/20 border border-accent-primary/20 rounded p-2 sm:p-3 mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                            Choose how you want to receive alerts about new assignments, quizzes, grades, and deadlines. You can enable multiple channels for maximum coverage.
                        </p>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {/* Email Section - First */}
                        <div className="border border-accent-primary/20 rounded p-3 sm:p-4 bg-background-secondary/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#EA4335] rounded flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819v.273L12 8.91l6.545-4.816v-.273h3.819c.904 0 1.636.732 1.636 1.636z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-text-primary text-sm sm:text-base">Email Notifications</h3>
                                        <p className="text-xs text-text-secondary">Professional emails sent to your registered address</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Switch
                                        id="notify_via_email"
                                        checked={formData.notify_via_email || false}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_via_email: checked }))}
                                        className="data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-background-secondary border-2 data-[state=checked]:border-accent-primary data-[state=unchecked]:border-text-secondary/30"
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-text-secondary bg-background-secondary/30 rounded p-2">
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819v.273L12 8.91l6.545-4.816v-.273h3.819c.904 0 1.636.732 1.636 1.636z" />
                                </svg>
                                Emails will be sent to your account email address
                            </div>
                        </div>

                        {/* Discord Section */}
                        <div className="border border-accent-primary/20 rounded p-3 sm:p-4 bg-background-secondary/10">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#5865F2] rounded flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text-primary text-sm sm:text-base">Discord Notifications</h3>
                                        <p className="text-xs text-text-secondary">Rich embeds with detailed information</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openTutorial('discord')}
                                    className="text-accent-primary hover:text-text-heading transition-colors self-start sm:self-auto"
                                    title="How to get Discord Webhook URL"
                                >
                                    <span className="font-mono text-xs border border-accent-primary/50 rounded px-1.5 py-0.5 hover:border-accent-primary">Setup Guide</span>
                                </button>
                            </div>
                            <div className="mt-3">
                                <InputField
                                    label="Discord Webhook URL"
                                    id="discord_webhook"
                                    value={formData.discord_webhook || ''}
                                    onChange={handleInputChange}
                                    placeholder="https://discord.com/api/webhooks/..."
                                />
                            </div>
                        </div>

                        {/* Telegram Section */}
                        <div className="border border-accent-primary/20 rounded p-3 sm:p-4 bg-background-secondary/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#0088CC] rounded flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-text-primary text-sm sm:text-base">Telegram Notifications</h3>
                                        <p className="text-xs text-text-secondary">Instant mobile alerts via Telegram bot</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Switch
                                        id="notify_via_telegram"
                                        checked={formData.notify_via_telegram || false}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_via_telegram: checked }))}
                                        className="data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-background-secondary border-2 data-[state=checked]:border-accent-primary data-[state=unchecked]:border-text-secondary/30"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <InputField
                                    label="Telegram Chat ID"
                                    id="telegram_chat_id"
                                    value={formData.telegram_chat_id || ''}
                                    onChange={handleInputChange}
                                    placeholder="Your Telegram Chat ID (e.g., 123456789)"
                                />
                                <div className="text-xs text-text-secondary bg-background-secondary/30 rounded p-2">
                                    <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                    To get your Chat ID: Message <a href="https://t.me/UniSharkBot" target="_blank" className="text-accent-primary underline font-semibold">@UniSharkBot</a> and type <code className="bg-background-secondary px-1 rounded">/start</code>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden p-3 sm:p-4 md:p-6">
                    {/* Corner brackets - hidden on mobile */}
                    <div className="hidden sm:block absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
                    <div className="absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>

                    <h2 className="font-heading text-base md:text-lg text-accent-primary mb-3 md:mb-4 animate-flicker"
                        style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                        {`> AUTOMATION_SETTINGS`}
                    </h2>
                    <div className="bg-background-secondary/20 border border-accent-primary/20 rounded p-3 mb-4">
                        <p className="text-sm text-text-secondary">
                            Configure how often UniShark automatically checks DULMS for new content and when to send deadline reminders.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Automated Scanning Section */}
                        <div className="border border-accent-primary/20 rounded p-4 bg-background-secondary/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                        <span className="text-accent-primary">🤖</span>
                                        Automated DULMS Scanning
                                    </h3>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Automatically check DULMS for new assignments, quizzes, grades, and announcements
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-text-secondary px-2 py-1 rounded bg-background-secondary">
                                        {formData.is_automation_active ? '🟢 ACTIVE' : '🔴 DISABLED'}
                                    </span>
                                    <Switch
                                        id="automation-switch"
                                        checked={formData.is_automation_active || false}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_automation_active: checked }))}
                                        className="data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-background-secondary border-2 data-[state=checked]:border-accent-primary data-[state=unchecked]:border-text-secondary/30"
                                    />
                                </div>
                            </div>

                            {formData.is_automation_active && (
                                <div className="space-y-4">
                                    <div className="bg-background-secondary/30 rounded p-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <label className="text-sm font-medium text-text-primary min-w-fit">
                                                Scan Frequency:
                                            </label>
                                            <Select
                                                value={String(formData.check_interval_hours || 4)}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, check_interval_hours: Number(value) }))}
                                            >
                                                <SelectTrigger className="w-full sm:w-auto min-w-[200px] border-2 border-accent-primary/30 bg-background-secondary hover:border-accent-primary focus:border-accent-primary data-[state=open]:border-accent-primary">
                                                    <SelectValue placeholder="Select frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="2">Every 2 Hours</SelectItem>
                                                    <SelectItem value="3">Every 3 Hours</SelectItem>
                                                    <SelectItem value="4">Every 4 Hours (Recommended)</SelectItem>
                                                    <SelectItem value="6">Every 6 Hours</SelectItem>
                                                    <SelectItem value="8">Every 8 Hours</SelectItem>
                                                    <SelectItem value="12">Every 12 Hours</SelectItem>
                                                    <SelectItem value="24">Once Daily</SelectItem>
                                                    <SelectItem value="48">Every 2 Days</SelectItem>
                                                    <SelectItem value="72">Every 3 Days</SelectItem>
                                                    <SelectItem value="168">Once Weekly (Low frequency)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="mt-2 text-xs text-text-secondary">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>• <strong>High frequency (1-4 hours):</strong> Best for active students</div>
                                                <div>• <strong>Medium frequency (6-12 hours):</strong> Balanced approach</div>
                                                <div>• <strong>Low frequency (24+ hours):</strong> Minimal resource usage</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!formData.is_automation_active && (
                                <div className="text-xs text-text-secondary bg-background-secondary/30 rounded p-2">
                                    ℹ️ When disabled, you'll need to manually check for updates using the dashboard scan button
                                </div>
                            )}
                        </div>

                        {/* Deadline Reminders Section */}
                        <div className="border border-accent-primary/20 rounded p-4 bg-background-secondary/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                        <span className="text-accent-primary">⏰</span>
                                        Deadline Reminders
                                    </h3>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Get notified before assignment and quiz deadlines via your enabled notification channels
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-text-secondary px-2 py-1 rounded bg-background-secondary">
                                        {formData.deadline_notifications ? '🟢 ENABLED' : '🔴 DISABLED'}
                                    </span>
                                    <Switch
                                        id="deadline_notifications"
                                        checked={formData.deadline_notifications || false}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, deadline_notifications: checked }))}
                                        className="data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-background-secondary border-2 data-[state=checked]:border-accent-primary data-[state=unchecked]:border-text-secondary/30"
                                    />
                                </div>
                            </div>

                            {formData.deadline_notifications && (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <label className="text-sm font-medium text-text-primary min-w-fit">
                                            Remind me:
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                id="deadline_reminder_hours"
                                                value={formData.deadline_reminder_hours || 24}
                                                onChange={handleInputChange}
                                                min="0"
                                                max="168"
                                                className="w-20 px-2 py-1 text-sm bg-background-secondary border border-accent-primary/20 rounded focus:border-accent-primary focus:outline-none"
                                            />
                                            <span className="text-sm text-text-secondary">hours before deadline</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-text-secondary bg-background-secondary/30 rounded p-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div>• <strong>6-12 hours:</strong> Last-minute alerts</div>
                                            <div>• <strong>24 hours:</strong> Standard reminder</div>
                                            <div>• <strong>48-72 hours:</strong> Early planning</div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-accent-primary/10">
                                            💡 <strong>Tip:</strong> Set to 0 to disable deadline reminders completely
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!formData.deadline_notifications && (
                                <div className="text-xs text-text-secondary bg-background-secondary/30 rounded p-2">
                                    ℹ️ Enable deadline reminders to get notified about upcoming assignment and quiz deadlines
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="flex justify-center">
                    <div className="relative">
                        {/* Corner brackets around button */}
                        <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary"></div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary"></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary"></div>
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary"></div>

                        <Button type="submit" disabled={isUpdating} className="px-8 py-3 font-heading">
                            {isUpdating ? '> DEPLOYING_CONFIG...' : '> DEPLOY_CONFIG'}
                        </Button>
                    </div>
                </div>

                {/* Tutorial Modal */}
                <TutorialModal
                    isOpen={!!tutorialTopic}
                    onClose={closeTutorial}
                    topic={tutorialTopic}
                />
            </form>
        </div>
    );
}