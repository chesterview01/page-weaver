import React from 'react';
import { Loader2, ClipboardList, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminSubmissions, type ProjectSubmission } from '@/hooks/useProjectSubmissions';
import { toast } from '@/hooks/use-toast';

const STATUS_META: Record<ProjectSubmission['status'], { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  en_revision: { label: 'En Revisión', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  completado: { label: 'Completado', className: 'bg-green-500/10 text-green-500 border-green-500/30' },
  rechazado: { label: 'Rechazado', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
};

const AdminSubmissions: React.FC = () => {
  const { items, loading, reload, updateStatus } = useAdminSubmissions();

  const handleChange = async (id: string, value: ProjectSubmission['status']) => {
    const { error } = await updateStatus(id, value);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    } else {
      toast({ title: 'Estado actualizado' });
    }
  };

  return (
    <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-xl shadow-black/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pedidos de Revisión
          </CardTitle>
          <CardDescription>
            Solicitudes de auditoría profesional enviadas por los usuarios antes de lanzar a producción.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="border-white/10">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            Aún no hay solicitudes de revisión.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/5">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="min-w-[280px]">Mensaje</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Cambiar estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const meta = STATUS_META[s.status] || STATUS_META.pendiente;
                  return (
                    <TableRow key={s.id} className="border-white/5">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(s.created_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.user_email || <span className="font-mono text-xs">{s.user_id.slice(0, 8)}…</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{s.project_name}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                          {s.custom_message}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.className}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={s.status}
                          onValueChange={(v) => handleChange(s.id, v as ProjectSubmission['status'])}
                        >
                          <SelectTrigger className="w-40 ml-auto bg-white/[0.03] border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_revision">En Revisión</SelectItem>
                            <SelectItem value="completado">Completado</SelectItem>
                            <SelectItem value="rechazado">Rechazado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSubmissions;
