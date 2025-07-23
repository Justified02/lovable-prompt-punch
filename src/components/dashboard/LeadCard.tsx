import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Mail, Building, MapPin, User, Loader2 } from 'lucide-react';
import ToneSelectionDialog from './ToneSelectionDialog';

interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedin: string;
  snippet: string;
  generated_email?: string | null;
  email_sent?: boolean;
}

interface LeadCardProps {
  lead: Lead;
  onGenerateEmail: (lead: Lead, tone: string) => void;
  isGenerating?: boolean;
}

export default function LeadCard({ lead, onGenerateEmail, isGenerating = false }: LeadCardProps) {
  const [showToneDialog, setShowToneDialog] = useState(false);

  const handleGenerateEmailClick = () => {
    setShowToneDialog(true);
  };

  const handleToneSelected = (tone: string) => {
    setShowToneDialog(false);
    onGenerateEmail(lead, tone);
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{lead.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{lead.company}</span>
              </div>
            </div>
            {lead.linkedin && (
              <Button size="sm" variant="outline" asChild>
                <a href={lead.linkedin} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{lead.title}</p>
            {lead.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{lead.location}</span>
              </div>
            )}
          </div>
          
          {lead.snippet && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground line-clamp-3">{lead.snippet}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              {lead.email_sent ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Email Sent
                </Badge>
              ) : lead.generated_email ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Email Generated
                </Badge>
              ) : (
                <Badge variant="secondary">
                  No Email
                </Badge>
              )}
            </div>
            
            {!lead.generated_email && (
              <Button
                size="sm"
                onClick={handleGenerateEmailClick}
                disabled={isGenerating}
              >
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
            )}
          </div>
        </CardContent>
      </Card>

      <ToneSelectionDialog
        isOpen={showToneDialog}
        onOpenChange={setShowToneDialog}
        onToneSelected={handleToneSelected}
        leadName={lead.name}
        isGenerating={isGenerating}
      />
    </>
  );
}