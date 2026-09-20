import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOnly } from "@/lib/format";
import { ACTIVITY_TYPE_LABEL, type CustomerActivityType, type CustomerActivityStatus } from "@/lib/customers";
import { ActivityStatusSelect } from "@/components/customers/activity-status-select";

export type ActivityRow = {
  id: string;
  date: Date;
  type: CustomerActivityType;
  summary: string;
  nextAction: string | null;
  nextActionDate: Date | null;
  status: CustomerActivityStatus;
  createdBy: { name: string };
};

const TYPE_STYLE: Record<CustomerActivityType, string> = {
  VISITA: "bg-primary/10 text-primary",
  LLAMADA: "bg-status-good/10 text-status-good",
  WHATSAPP: "bg-status-warning/15 text-[#8a5a00]",
};

export function ActivityTimeline({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Aún no se ha registrado ningún seguimiento comercial.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Resumen</TableHead>
          <TableHead>Próxima acción</TableHead>
          <TableHead>Registrado por</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="whitespace-nowrap text-sm">{formatDateOnly(a.date)}</TableCell>
            <TableCell>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[a.type]}`}
              >
                {ACTIVITY_TYPE_LABEL[a.type]}
              </span>
            </TableCell>
            <TableCell className="max-w-72 text-sm">{a.summary}</TableCell>
            <TableCell className="max-w-48 text-sm text-muted-foreground">
              {a.nextAction ? (
                <>
                  {a.nextAction}
                  {a.nextActionDate && (
                    <span className="block text-xs">{formatDateOnly(a.nextActionDate)}</span>
                  )}
                </>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{a.createdBy.name}</TableCell>
            <TableCell>
              <ActivityStatusSelect activityId={a.id} status={a.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
