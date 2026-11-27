import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { CLINICAL_CONTENT_MAX_LENGTH, validateClinicalContent } from '@/repositories/index.js';

const ClinicalAddendumModal = ({ open, onOpenChange, targetEntry, onSubmit, isSaving }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    setContent('');
    setError('');
    setRequestId(crypto.randomUUID());
  }, [open, targetEntry?.entry_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateClinicalContent(content);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setError('');
    try {
      await onSubmit({ targetEntryId: targetEntry.entry_id, requestId, content: validation.content });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível registrar o adendo agora.');
    }
  };

  if (!targetEntry) return null;
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Adicionar adendo</DialogTitle>
          <DialogDescription>O texto original será preservado. O adendo ficará vinculado diretamente à evolução selecionada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evolução original preservada</p>
            <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-foreground">{targetEntry.content}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinical-addendum-content">Texto do adendo</Label>
            <Textarea id="clinical-addendum-content" rows={8} maxLength={CLINICAL_CONTENT_MAX_LENGTH} value={content} onChange={(event) => setContent(event.target.value)} required />
            <p className="text-xs text-muted-foreground">{content.length}/5.000 caracteres em texto simples.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar adendo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClinicalAddendumModal;
