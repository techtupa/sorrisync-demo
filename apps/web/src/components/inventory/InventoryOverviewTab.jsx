
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Info, XCircle, ArrowRight, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
const InventoryOverviewTab = ({ alerts = [], suppliers = [], summary = {}, categories = [] }) => {
  const visibleAlerts = alerts.slice(0, 6);
  const visibleSuppliers = suppliers.filter((supplier) => supplier.status === 'Ativo').slice(0, 5);
  const chartData = categories
    .filter((category) => category.usage_share > 0)
    .map((category) => ({ name: category.name, value: category.usage_share }));

  const getPriorityBadge = (priority) => {
    return priority === 'Alta'
      ? <Badge variant="outline" className="inv-badge-critical text-[10px]">Alta</Badge>
      : <Badge variant="outline" className="inv-badge-low text-[10px]">Média</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* 1. Saúde do Estoque */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Saúde do Estoque</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 shadow-sm bg-card">
            <CardContent className="p-5 flex flex-col items-start gap-2">
              <div className="p-2 rounded-lg bg-[hsl(var(--inv-normal)_/_0.1)] text-[hsl(var(--inv-normal))]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{summary.healthyItemsCount || 0}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Saudável</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card">
            <CardContent className="p-5 flex flex-col items-start gap-2">
              <div className="p-2 rounded-lg bg-[hsl(var(--inv-low)_/_0.1)] text-[hsl(var(--inv-low))]">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{summary.lowStockItemsCount || 0}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Estoque Baixo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[hsl(var(--inv-critical)_/_0.3)] shadow-sm bg-[hsl(var(--inv-critical)_/_0.02)]">
            <CardContent className="p-5 flex flex-col items-start gap-2">
              <div className="p-2 rounded-lg bg-[hsl(var(--inv-critical)_/_0.1)] text-[hsl(var(--inv-critical))]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--inv-critical))] tabular-nums">{summary.criticalItemsCount || 0}</p>
                <p className="text-xs font-medium text-[hsl(var(--inv-critical))] uppercase tracking-wider mt-0.5">Crítico</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card">
            <CardContent className="p-5 flex flex-col items-start gap-2">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{summary.inactiveItemsCount || 0}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Inativo</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Itens em Atenção */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm flex flex-col h-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/50">
            <div>
              <CardTitle className="text-base font-bold">Alertas e Reposições</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Itens que precisam de atenção imediata.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" disabled>Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar max-h-[350px]">
            <div className="divide-y divide-border/50">
              {visibleAlerts.map((alert) => (
                <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-md ${alert.priority === 'Alta' ? 'bg-[hsl(var(--inv-critical)_/_0.1)] text-[hsl(var(--inv-critical))]' : 'bg-[hsl(var(--inv-low)_/_0.1)] text-[hsl(var(--inv-low))]'}`}>
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.item_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{alert.supplier_name}</span>
                        <span className="text-[10px] text-muted-foreground/50">•</span>
                        <span className="text-xs font-medium text-foreground">Atual: {alert.current} (Min: {alert.min})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getPriorityBadge(alert.priority)}
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled title="Reposição indisponível nesta entrega">Repor {alert.suggested_replenishment}</Button>
                  </div>
                </div>
              ))}
              {visibleAlerts.length === 0 && (
                <p className="p-6 text-sm text-center text-muted-foreground">Nenhum alerta operacional aberto.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Fornecedores Principais */}
        <Card className="border-border/50 shadow-sm flex flex-col h-full">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold">Fornecedores Principais</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Fornecedores vinculados aos itens atuais.</p>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar max-h-[350px]">
            <div className="divide-y divide-border/50">
              {visibleSuppliers.map((sup) => (
                <div key={sup.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {sup.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{sup.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{sup.category}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {sup.recent_replenishments}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">reposições</p>
                  </div>
                </div>
              ))}
              {visibleSuppliers.length === 0 && (
                <p className="p-6 text-sm text-center text-muted-foreground">Nenhum fornecedor ativo vinculado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Chart */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">Itens por Categoria (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            {chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer> : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem distribuição por categoria disponível.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryOverviewTab;
