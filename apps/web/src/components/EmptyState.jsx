
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const EmptyState = ({
  icon: Icon = Database,
  title = 'Recurso preparado para próxima fase',
  description = 'Esta área será conectada futuramente no Codex com Supabase, permissões e dados reais.',
  features = [],
  ctaText = 'Configurar futuramente'
}) => {

  const handleAction = () => {
    toast.info('Ação executada apenas nesta demonstração.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="shadow-premium border-0 bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-5 gap-0">
            {/* Visual Section */}
            <div className="md:col-span-2 bg-gradient-to-br from-primary/5 to-secondary/10 p-8 flex flex-col items-center justify-center text-center border-r border-border/50">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="w-24 h-24 bg-card shadow-premium-lg rounded-2xl flex items-center justify-center relative z-10 border border-border/50">
                  <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <Badge className="badge-future border-0 mb-3 px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1.5" /> Futuro backend
              </Badge>
              <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm text-balance">
                {description}
              </p>
            </div>

            {/* Features Section */}
            <div className="md:col-span-3 p-8 md:p-10 bg-card flex flex-col">
              <h4 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-6">
                O que vem por aí
              </h4>
              <div className="space-y-5 mb-8 flex-1">
                {features.length > 0 ? features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-primary/10 rounded-md">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{feature.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{feature.desc}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-primary/10 rounded-md">
                      <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Integração Supabase</p>
                      <p className="text-sm text-muted-foreground leading-snug">Dados reais, autenticação e políticas de segurança (RLS).</p>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleAction} className="w-full sm:w-auto self-start group transition-all duration-300 shadow-sm">
                {ctaText}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EmptyState;
