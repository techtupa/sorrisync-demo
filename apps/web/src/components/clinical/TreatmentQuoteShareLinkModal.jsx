import React from 'react';
import { Copy, Link2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TreatmentQuoteShareLinkModal = ({ open, onOpenChange, shareUrl, expiresAt, onCopy }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl" data-treatment-quote-share-link-modal>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-emerald-600" />Link seguro criado</DialogTitle>
        <DialogDescription>Copie manualmente e compartilhe pelo canal escolhido pela clínica. O SorriSync não envia este link.</DialogDescription>
      </DialogHeader>
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Exibição única</AlertTitle>
        <AlertDescription>Este link não poderá ser recuperado depois que esta janela for fechada. Gere um novo link caso seja necessário.</AlertDescription>
      </Alert>
      <div className="space-y-2">
        <Label htmlFor="treatment-quote-share-link">Link seguro</Label>
        <div className="flex gap-2">
          <Input id="treatment-quote-share-link" value={shareUrl} readOnly className="font-mono text-xs" data-treatment-quote-one-time-link />
          <Button type="button" variant="outline" onClick={onCopy} disabled={!shareUrl} data-treatment-quote-copy-link><Copy className="mr-2 h-4 w-4" />Copiar</Button>
        </div>
        <p className="text-xs text-muted-foreground">Validade: {expiresAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expiresAt)) : 'limitada pelo orçamento'}.</p>
      </div>
      <DialogFooter><Button type="button" onClick={() => onOpenChange(false)}>Fechar e ocultar link</Button></DialogFooter>
    </DialogContent>
  </Dialog>
);

export default TreatmentQuoteShareLinkModal;
