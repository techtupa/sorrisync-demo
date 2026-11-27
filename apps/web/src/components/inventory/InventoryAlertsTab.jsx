
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShoppingCart, CheckCircle, Settings, Eye, Truck, Zap, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const physicalGap = ({ current, min }) => Math.max(0, Math.round(min * 100) - Math.round(current * 100));
const quantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const InventoryAlertsTab = ({ alerts = [], showPhysicalGap = false }) => {
  const criticalAlerts = alerts.filter((alert) => alert.priority === 'Alta').length;
  const lowStockAlerts = alerts.length - criticalAlerts;
  const replenishmentTotal = alerts.reduce((total, alert) => total + (alert.suggested_replenishment || 0), 0);

  const getPriorityBadge = (priority) => {
    return priority === 'Alta'
      ? <Badge variant="outline" className="inv-badge-critical">Crítico</Badge>
      : <Badge variant="outline" className="inv-badge-low">Atenção</Badge>;
  };

  const futureAlertRules = [
    { title: 'Estoque abaixo do mínimo', desc: 'Gera alerta assim que a quantidade atinge o gatilho', icon: Zap, active: true },
    { title: 'Item crítico zerado', desc: 'Notificação imediata para itens de uso essencial', icon: Activity, active: true },
    { title: 'Consumo acima da média', desc: 'Alerta se a saída for 50% maior que o mês anterior', icon: Activity, active: false },
    { title: 'Reposição recorrente', desc: 'Lembrete baseado no padrão de consumo histórico', icon: ShoppingCart, active: true },
    { title: 'Fornecedor sem reposição', desc: 'Alerta sobre fornecedores preferenciais inativos', icon: Truck, active: false },
    { title: 'Consumo acima do padrão', desc: 'Alerta se a saída operacional subir repentinamente', icon: Activity, active: false }
  ];

  return (
    <div className="space-y-8">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[hsl(var(--inv-critical)_/_0.3)] shadow-sm bg-[hsl(var(--inv-critical)_/_0.02)]">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-[hsl(var(--inv-critical))] uppercase tracking-wider mb-1">Críticos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[hsl(var(--inv-critical))]">{criticalAlerts}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[hsl(var(--inv-low)_/_0.3)] shadow-sm bg-[hsl(var(--inv-low)_/_0.02)]">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-[hsl(var(--inv-low))] uppercase tracking-wider mb-1">Estoque Baixo</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[hsl(var(--inv-low))]">{lowStockAlerts}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{showPhysicalGap ? 'Itens Abaixo do Mínimo' : 'Reposição Sugerida'}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">{showPhysicalGap ? alerts.filter(alert => physicalGap(alert) > 0).length : replenishmentTotal} itens</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Alertas Abertos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">{alerts.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table - Active Alerts */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <h3 className="text-base font-bold text-foreground">Alertas Ativos</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Prioridade</TableHead>
                <TableHead className="w-[250px]">Item</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Qtd Atual</TableHead>
                <TableHead className="text-right">{showPhysicalGap ? 'Falta no Saldo Físico' : 'Reposição Sugerida'}</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert, i) => (
                <motion.tr
                  key={alert.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                >
                  <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{alert.item_name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{alert.category}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{alert.supplier_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-semibold">{alert.current}</span>
                    <span className="text-muted-foreground text-xs ml-1">/ {alert.min}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-primary">
                    {showPhysicalGap ? quantity.format(physicalGap(alert) / 100) : `+${alert.suggested_replenishment}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem disabled>
                          <ShoppingCart className="w-4 h-4 mr-2" /> Criar reposição
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <CheckCircle className="w-4 h-4 mr-2" /> Ignorar alerta
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Eye className="w-4 h-4 mr-2" /> Detalhes do item
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Truck className="w-4 h-4 mr-2" /> Ver fornecedor
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Settings className="w-4 h-4 mr-2" /> Ajustar estoque mín.
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))}
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Nenhum alerta operacional aberto.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Regras Futuras */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h3 className="text-lg font-bold text-foreground">Regras de Alerta Futuro</h3>
          <p className="text-sm text-muted-foreground">Estas regras permanecem demonstrativas e indisponíveis. Não há automação de alertas nesta entrega.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {futureAlertRules.map((rule, i) => (
            <Card key={i} className={`border-border/50 shadow-sm ${rule.active ? 'bg-card' : 'bg-muted/10 opacity-70'}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 text-primary rounded-md shrink-0">
                      <rule.icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{rule.title}</h4>
                  </div>
                  <Switch checked={false} disabled aria-label={`${rule.title} indisponível`} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{rule.desc}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8" disabled>Editar regra</Button>
                  <Button variant="secondary" size="sm" className="w-full text-xs h-8" disabled>Testar alerta</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Flow Visual */}
      <Card className="border-primary/20 shadow-sm bg-primary/5">
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Activity className="w-5 h-5" /> Fluxo Visual de Estoque
            </h3>
            <p className="text-sm text-foreground/80">O fluxo demonstra a sequência operacional prevista para reposição segura de materiais.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 overflow-x-auto pb-2">
            {[
              { icon: Zap, label: 'Estoque Baixo' },
              { icon: Activity, label: 'Alerta Gerado' },
              { icon: CheckCircle2, label: 'Tarefa Central' },
              { icon: ShoppingCart, label: 'Reposição Visual' },
              { icon: CheckCircle2, label: 'Recebimento Visual' },
            ].map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center text-center w-24 shrink-0">
                  <div className="w-12 h-12 rounded-full bg-background border border-primary/20 flex items-center justify-center mb-2 shadow-sm">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{step.label}</span>
                </div>
                {idx < 4 && (
                  <ArrowRight className="w-5 h-5 text-primary/40 hidden md:block shrink-0" />
                )}
                {idx < 4 && (
                  <div className="w-px h-6 bg-primary/20 md:hidden my-1"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAlertsTab;
