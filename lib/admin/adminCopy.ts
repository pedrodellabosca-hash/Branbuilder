
export const adminCopy = {
    sidebar: {
        title: "Admin Panel",
        menu: {
            health: "Estado del Sistema",
            jobs: "Monitor de Trabajos",
            actions: "Ejecuciones Internas", // New for V3
            backToApp: "Volver a la App",
        },
        org: {
            title: "Org Admin",
            models: "Modelos AI",
            prompts: "Prompts",
            usage: "Uso de Tokens",
        }
    },
    systemHealth: {
        title: "Estado del Sistema",
        workersOnline: "Workers Activos",
        jobQueue: "Cola de Trabajos",
        aiProvider: "Proveedor IA",
        refresh: "Actualizar Ahora",
        lastUpdated: "Última actualización",
        status: {
            operational: "Operativo",
            degraded: "Degradado",
            offline: "Fuera de Servicio"
        }
    },
    jobs: {
        title: "Trabajos Globales",
        filters: {
            status: "Estado",
            stage: "Etapa",
            search: "Buscar por ID...",
            refresh: "Recargar"
        },
        table: {
            id: "ID de Trabajo",
            type: "Tipo",
            stage: "Stage",
            status: "Estado",
            duration: "Duración",
            created: "Creado",
            actions: "Acciones"
        },
        detail: {
            title: "Detalle del Trabajo",
            back: "Volver a la lista",
            timeline: "Línea de Tiempo",
            payload: "Payload de Entrada",
            result: "Resultado / Output",
            error: "Error",
            config: "Configuración de Ejecución",
            actions: {
                refresh: "Actualizar datos",
                retry: "Reintentar Job",
                markFailed: "Forzar Fallo",
                viewOutput: "Ver Output Generado"
            }
        },
        status: {
            QUEUED: "En Cola",
            PROCESSING: "Procesando",
            DONE: "Completado",
            FAILED: "Fallido"
        }
    },
    actions: {
        title: "Ejecuciones Internas",
        warning: "⚠️ Herramienta de uso interno. Ejecutar stages aquí tiene efectos reales en la base de datos.",
        form: {
            orgSelect: "Seleccionar Organización",
            projectSelect: "Seleccionar Proyecto",
            stageSelect: "Seleccionar Stage",
            actions: {
                run: "Ejecutar Stage",
                regenerate: "Regenerar Stage"
            }
        },
        results: {
            title: "Resultado de Ejecución",
            jobId: "ID del Job Lanzado"
        }
    }
};
