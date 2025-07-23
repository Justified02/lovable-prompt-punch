import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Zap, Loader2, Search, Users } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import LeadCard from '@/components/dashboard/LeadCard';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedLead {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedin: string;
  snippet: string;
  image?: string | null;
  company_domain?: string;
  generated_email?: string | null;
  email_sent?: boolean;
}

export default function GenerateLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [description, setDescription] = useState('');
  const [leadCount, setLeadCount] = useState('10');
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([]);
  const [generatingEmailFor, setGeneratingEmailFor] = useState<string | null>(null);

  const examples = [
    "Find CTOs at AI startups in San Francisco",
    "Marketing directors at SaaS companies with 50-200 employees",
    "Founders of e-commerce companies in New York",
    "VPs of Sales at fintech companies"
  ];

  const handleExampleClick = (example: string) => {
    setDescription(example);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe your ideal prospects.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch('https://divverse-community.app.n8n.cloud/webhook-test/lead-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          leadCount,
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate leads');
      }

      const result = await response.json();
      
      // The webhook returns an array of leads directly, not wrapped in an object
      if (Array.isArray(result) && result.length > 0) {
        setGeneratedLeads(result);
        
        // Save leads to database for history
        try {
          for (const lead of result) {
            await supabase
              .from('lead_history')
              .insert({
                id: lead.id,
                user_id: user?.id,
                name: lead.name,
                title: lead.title,
                company: lead.company,
                location: lead.location,
                email: lead.email,
                linkedin: lead.linkedin,
                snippet: lead.snippet,
                image: lead.image,
                company_domain: lead.company_domain,
                generated_email: null,
                email_sent: false
              });
          }
        } catch (dbError) {
          console.warn('Error saving leads to database:', dbError);
        }
      }
      
      toast({
        title: "Leads generated successfully!",
        description: `Found ${result.length || 'some'} potential leads.`,
      });

      // Reset form
      setDescription('');
      setLeadCount('10');

    } catch (error: any) {
      console.error('Error generating leads:', error);
      toast({
        title: "Error generating leads",
        description: error.message || "Failed to generate leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateEmailForLead = async (lead: GeneratedLead, tone: string) => {
    setGeneratingEmailFor(lead.id);

    try {
      // Call the N8n webhook for email generation
      const response = await fetch('https://divverse-community.app.n8n.cloud/webhook-test/email-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_data: {
            name: lead.name,
            title: lead.title,
            company: lead.company,
            location: lead.location,
            snippet: lead.snippet,
          },
          tone: tone,
          user_id: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate email');
      }

      const result = await response.json();
      
      // Store the complete response to handle N8N format properly
      const emailContent = JSON.stringify(result);

      // Update the lead in the database if it exists there
      try {
        await supabase
          .from('lead_history')
          .update({ generated_email: emailContent })
          .eq('id', lead.id)
          .eq('user_id', user?.id);
      } catch (dbError) {
        console.warn('Lead may not be in database yet:', dbError);
      }

      // Update local state and show modal immediately
      setGeneratedLeads(prev => prev.map(l => 
        l.id === lead.id ? { ...l, generated_email: emailContent } : l
      ));

      toast({
        title: "Email generated successfully",
        description: "Email preview opened automatically.",
      });

    } catch (error: any) {
      console.error('Error generating email:', error);
      toast({
        title: "Error generating email",
        description: error.message || "Failed to generate email",
        variant: "destructive",
      });
    } finally {
      setGeneratingEmailFor(null);
    }
  };

  const handleEmailUpdate = (leadId: string, emailContent: string) => {
    setGeneratedLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, generated_email: emailContent } : l
    ));
  };

  const handleEmailSent = (leadId: string) => {
    setGeneratedLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, email_sent: true } : l
    ));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Generate Leads</h1>
          <p className="text-muted-foreground">
            Use AI to find your ideal prospects with natural language.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Lead Generation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Describe your ideal prospects</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Find CTOs at AI startups in San Francisco with 10-50 employees"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Try these examples:</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {examples.map((example, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                      onClick={() => handleExampleClick(example)}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="leadCount">Number of Leads:</Label>
                  <Input
                    id="leadCount"
                    type="number"
                    min="1"
                    max="100"
                    value={leadCount}
                    onChange={(e) => setLeadCount(e.target.value)}
                    className="w-32"
                    placeholder="10"
                  />
                </div>

                <Button type="submit" disabled={isGenerating} className="min-w-[150px]">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Generate Leads
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Generated Leads Results */}
        {generatedLeads.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Generated Leads ({generatedLeads.length})</span>
              </CardTitle>
              <CardDescription>
                Your freshly generated leads are ready for outreach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onGenerateEmail={generateEmailForLead}
                    isGenerating={generatingEmailFor === lead.id}
                    onEmailUpdate={handleEmailUpdate}
                    onEmailSent={handleEmailSent}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}