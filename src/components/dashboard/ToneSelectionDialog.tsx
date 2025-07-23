import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';

interface ToneSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onToneSelected: (tone: string) => void;
  leadName: string;
  isGenerating?: boolean;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'funny', label: 'Funny', description: 'Light-hearted with humor' },
  { value: 'formal', label: 'Formal', description: 'Very structured and official' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and excited' }
];

export default function ToneSelectionDialog({ 
  isOpen, 
  onOpenChange, 
  onToneSelected, 
  leadName,
  isGenerating = false 
}: ToneSelectionDialogProps) {
  const [selectedTone, setSelectedTone] = useState('professional');

  const handleGenerate = () => {
    onToneSelected(selectedTone);
  };

  const selectedToneDetails = TONE_OPTIONS.find(option => option.value === selectedTone);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Select Email Tone</span>
          </DialogTitle>
          <DialogDescription>
            Choose the tone for the email to <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tone">Email Tone</Label>
            <Select value={selectedTone} onValueChange={setSelectedTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedToneDetails && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{selectedToneDetails.label}:</strong> {selectedToneDetails.description}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Generate Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}