import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Send, Edit3, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedin: string;
  snippet: string;
  image: string | null;
  company_domain: string;
}

interface EmailPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  emailContent: string;
  tone: string;
  onEmailUpdate: (leadId: string, emailContent: string) => void;
  onEmailSent: (leadId: string) => void;
}

export default function EmailPreviewModal({
  isOpen,
  onOpenChange,
  lead,
  emailContent,
  tone,
  onEmailUpdate,
  onEmailSent,
}: EmailPreviewModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [currentTone, setCurrentTone] = useState(tone);
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'funny', label: 'Funny' },
    { value: 'formal', label: 'Formal' },
    { value: 'enthusiastic', label: 'Enthusiastic' },
  ];

  // FIX: Improved email parsing logic to handle N8N webhook response format
  useEffect(() => {
    if (emailContent) {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(emailContent);
        
        // Handle N8N webhook response format: [{"output": {"Subject Line": "...", "Email Body": "..."}}]
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].output) {
          const output = parsed[0].output;
          if (output['Subject Line'] && output['Email Body']) {
            setSubject(output['Subject Line']);
            setBody(output['Email Body']);
            return;
          }
        }
        
        // Handle direct object format: {"Subject Line": "...", "Email Body": "..."}
        if (parsed['Subject Line'] && parsed['Email Body']) {
          setSubject(parsed['Subject Line']);
          setBody(parsed['Email Body']);
          return;
        }
        
        // Handle existing format: {"subject": "...", "body": "..."}
        if (parsed.subject && parsed.body) {
          setSubject(parsed.subject);
          setBody(parsed.body);
          return;
        }
      } catch (error) {
        // Not JSON, try to parse as text
        console.log('Email content is not JSON, trying text parsing:', error);
      }

      // Parse text format
      const subjectMatch = emailContent.match(/(?:subject|SUBJECT|Subject Line):\s*(.+?)(?:\n|$)/i);
      const bodyMatch = emailContent.match(/(?:body|BODY|Email Body):\s*([\s\S]*?)(?:\n\n|$)/i);
      
      if (subjectMatch) {
        setSubject(subjectMatch[1].trim());
      }
      
      if (bodyMatch) {
        setBody(bodyMatch[1].trim());
      } else if (subjectMatch) {
        // If we found a subject, treat everything after it as body
        const bodyStart = emailContent.indexOf(subjectMatch[0]) + subjectMatch[0].length;
        setBody(emailContent.substring(bodyStart).trim());
      } else {
        // No subject found, treat entire content as body
        setSubject(`Regarding ${lead?.company || 'Partnership Opportunity'}`);
        setBody(emailContent);
      }
    } else {
      setSubject('');
      setBody('');
    }
  }, [emailContent, lead]);

  const handleSave = () => {
    const updatedContent = JSON.stringify({ subject, body });
    onEmailUpdate(lead?.id!, updatedContent);
    setIsEditing(false);
    toast({
      title: "Email saved",
      description: "Your changes have been saved",
    });
  };

  const handleRegenerate = async () => {
    if (!lead) return;
    
    setIsRegenerating(true);
    try {
      const response = await fetch('https://divverse-community.app.n8n.cloud/webhook-test/email-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_data: {
            name: lead.name,
            title: lead.title,
            company: lead.company,
            location: lead.location,
            snippet: lead.snippet,
          },
          tone: currentTone,
          user_id: user?.id
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate email');

      const result = await response.json();
      const newEmailContent = result.email_content || result.message || JSON.stringify(result);
      
      onEmailUpdate(lead.id, newEmailContent);
      
      toast({
        title: "Email regenerated",
        description: "A new email has been generated",
      });
    } catch (error: any) {
      toast({
        title: "Error regenerating email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSend = async () => {
    if (!lead || !subject || !body) return;

    setIsSending(true);
    try {
      const response = await fetch('https://divverse-community.app.n8n.cloud/webhook-test/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: lead.email,
          to_name: lead.name,
          subject,
          body,
          user_id: user?.id,
          lead_id: lead.id
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      onEmailSent(lead.id);
      onOpenChange(false);
      toast({
        title: "Email sent successfully",
        description: `Email sent to ${lead.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Email Preview - {lead?.name}</span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Regenerate
              </Button>
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Email Tone</Label>
              <Select value={currentTone} onValueChange={setCurrentTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!isEditing}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!isEditing}
              className="min-h-[300px]"
              placeholder="Email content"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !subject || !body}
            >
              {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}