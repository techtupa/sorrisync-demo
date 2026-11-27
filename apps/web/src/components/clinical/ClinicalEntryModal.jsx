import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { CLINICAL_CONTENT_MAX_LENGTH, validateClinicalContent } from '@/repositories/index.js';

const ClinicalEntryModal = ({ open, onOpenChange, onSubmit, isSaving }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    setContent('');
    setError('');
    setRequestId(crypto.randomUUID());
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateClinicalContent(content);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setError('');
    try {
      await onSubmit({ requestId, content: validation.content });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível registrar a evolução clínica agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Nova evolução clínica</DialogTitle>
          <DialogDescription>O registro será finalizado e preservado sem edição ou exclusão.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="clinical-entry-content">Evolução clínica</Label>
            <Textarea
              id="clinical-entry-content"
              rows={10}
              maxLength={CLINICAL_CONTENT_MAX_LENGTH}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Registre a evolução em texto simples."
              required
            />
            <p className="text-xs text-muted-foreground">{content.length}/5.000 caracteres. HTML, Markdown executável, links e payloads não são aceitos.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar evolução
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClinicalEntryModal;
