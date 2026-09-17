import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SinAccesoPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16">
      <Card className="w-full text-center">
        <CardHeader>
          <CardTitle className="text-xl text-slate-800">Acceso no permitido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Esta sección es solo para recepción. Si creés que deberías tener acceso, contactá a un administrador de
            la clínica.
          </p>
          <Button asChild>
            <Link href="/agenda">Volver a la agenda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
