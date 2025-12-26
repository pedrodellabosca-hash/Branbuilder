import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6">
                <Settings className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
                Configuración
            </h2>
            <p className="text-slate-400 mb-6 max-w-sm">
                Próximamente podrás gestionar la configuración de tu organización y preferencias personales aquí.
            </p>
            <div className="px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-300">
                🚀 En desarrollo
            </div>
        </div>
    );
}
