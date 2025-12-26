import React from 'react';

interface EnvErrorProps {
    missingVars: string[];
}

export const EnvError: React.FC<EnvErrorProps> = ({ missingVars }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-red-500/30 bg-neutral-900 shadow-2xl">
                {/* Header */}
                <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-4">
                    <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            />
                        </svg>
                        Configuration Error
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white">
                            Missing or Invalid Environment Variables
                        </h3>
                        <p className="text-neutral-400">
                            The application cannot start because some required environment variables are
                            missing or configured with placeholder values.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-lg bg-black/50 p-4 border border-neutral-800">
                            <h4 className="text-sm font-medium text-neutral-300 mb-2">Issues Detected:</h4>
                            <ul className="list-disc list-inside space-y-1 text-red-400 font-mono text-sm">
                                {missingVars.map((v) => (
                                    <li key={v}>{v}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-lg bg-blue-500/5 p-4 border border-blue-500/20">
                            <h4 className="text-sm font-medium text-blue-400 mb-2">How to Fix:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-sm">
                                <li>
                                    Open your <code className="bg-neutral-800 px-1 py-0.5 rounded text-yellow-500">.env</code> file
                                </li>
                                <li>
                                    Replace the placeholder values (e.g., <code className="text-neutral-500">pk_test_...</code>) with your actual keys from the Clerk Dashboard.
                                </li>
                                <li>
                                    Save the file and restart the development server.
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
