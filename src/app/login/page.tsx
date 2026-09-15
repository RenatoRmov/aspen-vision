import { LoginForm } from "./login-form";
import { AspenLogo } from "@/components/brand/logo";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const callbackUrlStr = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#15130f] p-12 text-[#ece5d6] lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(217,163,84,0.18), transparent 45%), radial-gradient(circle at 80% 70%, rgba(217,163,84,0.10), transparent 40%)",
          }}
        />
        <AspenLogo className="relative z-10" markClassName="text-[#d9a354]" />
        <div className="relative z-10 max-w-md space-y-4">
          <p className="text-3xl font-medium leading-tight text-balance">
            El control de tu inventario, ventas y embajadores en un solo
            lugar.
          </p>
          <p className="text-sm text-[#ab9f88]">
            Sistema de gestión interna de Aspen Vision — distribución de
            lentes ópticos y de sol.
          </p>
        </div>
        <p className="relative z-10 text-xs text-[#7c7461]">
          © {new Date().getFullYear()} Aspen Vision
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1 lg:hidden">
            <AspenLogo className="text-foreground" markClassName="text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Inicia sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema de gestión.
            </p>
          </div>
          <LoginForm callbackUrl={callbackUrlStr} />
        </div>
      </div>
    </div>
  );
}
