import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">BrandForge</h1>
                    <p className="text-slate-400">
                        Plataforma de creación de marcas con IA
                    </p>
                </div>
                <SignIn
                    appearance={{
                        elements: {
                            rootBox: "mx-auto",
                            card: "bg-slate-800/50 backdrop-blur-xl border border-slate-700 shadow-2xl",
                            headerTitle: "text-white",
                            headerSubtitle: "text-slate-400",
                            socialButtonsBlockButton: "bg-slate-700 border-slate-600 text-white hover:bg-slate-600",
                            socialButtonsBlockButtonText: "text-white",
                            dividerLine: "bg-slate-600",
                            dividerText: "text-slate-400",
                            formFieldLabel: "text-slate-300",
                            formFieldInput: "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500",
                            formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                            footerActionLink: "text-blue-400 hover:text-blue-300",
                            identityPreviewText: "text-white",
                            identityPreviewEditButtonIcon: "text-slate-400",
                        },
                    }}
                    routing="path"
                    path="/sign-in"
                    signUpUrl="/sign-up"
                />
            </div>
        </div>
    );
}
