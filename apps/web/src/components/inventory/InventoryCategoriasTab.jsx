
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folders, AlertTriangle, ArrowRight, Activity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const InventoryCategoriasTab = ({ categories = [] }) => {
  const activeCategories = categories.filter((category) => category.status === 'Ativa');
  const leadingCategory = [...categories].sort((a, b) => b.count - a.count)[0];
  const categoriesWithAlerts = categories.reduce((total, category) => total + (category.alerts || 0), 0);

  const getConsumptionBadge = (cons) => {
    switch (cons) {
      case 'Atenção': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Atenção</Badge>;
      case 'Estável': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Estável</Badge>;
      default: return null;
    }
  };

  // Sort by usage share for the visual bars.
  const sortedByUsage = [...categories].sort((a, b) => b.usage_share - a.usage_share).slice(0, 5);

  const colorMap = {
    blue: 'bg-blue-500', indigo: 'bg-indigo-500', teal: 'bg-teal-500',
    green: 'bg-green-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
    violet: 'bg-violet-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500',
    slate: 'bg-slate-500', pink: 'bg-pink-500', orange: 'bg-orange-500',
  };

  return (
    <div className="space-y-8">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border/50 shadow-sm bg-card lg:col-span-2">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorias Ativas</p>
              <Folders className="w-4 h-4 text-primary opacity-50" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{activeCategories.length}</span>
              <span className="text-xs text-muted-foreground">agrupamentos</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mais Itens</p>
            <p className="text-sm font-bold text-foreground truncate">{leadingCategory?.name || 'Não definida'}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Distribuição</p>
            <p className="text-sm font-bold text-foreground truncate">{leadingCategory?.usage_share || 0}% dos itens</p>
          </CardContent>
        </Card>
        <Card className="border-[hsl(var(--inv-critical)_/_0.3)] shadow-sm bg-[hsl(var(--inv-critical)_/_0.02)]">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-[hsl(var(--inv-critical))] uppercase tracking-wider mb-1">Alertas Ativos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[hsl(var(--inv-critical))]">{categoriesWithAlerts}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sem Categoria</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{categories.filter((category) => category.name === 'Sem categoria').reduce((total, category) => total + category.count, 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Categories Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Organização do Estoque</h3>
            <Button size="sm" className="shadow-sm" disabled title="Disponível em entrega futura">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Categoria
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full border-border/50 shadow-sm hover:border-primary/30 transition-colors flex flex-col">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorMap[cat.color] || colorMap.slate}`}></div>
                        <h4 className="font-bold text-foreground">{cat.name}</h4>
                      </div>
                      {getConsumptionBadge(cat.consumption)}
                    </div>

                    <p className="text-xs text-muted-foreground mb-4 flex-1">{cat.description}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">{cat.count} <span className="text-xs text-muted-foreground font-normal">itens</span></span>
                        {cat.alerts > 0 && (
                          <span className="flex items-center text-[10px] font-medium text-[hsl(var(--inv-critical))] bg-[hsl(var(--inv-critical)_/_0.1)] px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {cat.alerts}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" disabled>Editar</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" disabled title="Navegação indisponível nesta entrega">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Usage Distribution Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Distribuição de Itens (%)
          </h3>
          <Card className="border-border/50 shadow-sm bg-card">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-6">
                Distribuição dos itens cadastrados no estoque atual por categoria.
              </p>

              <div className="space-y-5">
                {sortedByUsage.map((cat, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{cat.name}</span>
                      <span className="text-muted-foreground">{cat.usage_share}%</span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.usage_share}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`h-full ${colorMap[cat.color] || colorMap.slate}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default InventoryCategoriasTab;
