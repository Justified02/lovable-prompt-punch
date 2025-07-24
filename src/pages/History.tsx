import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Search, Filter, Mail, RefreshCw, Loader2, CheckCircle, XCircle, History as HistoryIcon, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import EmailPreviewModal from '@/components/dashboard/EmailPreviewModal';
import ToneSelectionDialog from '@/components/dashboard/ToneSelectionDialog';

interface LeadHistory {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedin: string;
  snippet: string;
  generated_email: string | null;
  email_sent: boolean;
  sent_at: string | null;
  created_at: string;
  image: string | null;
  company_domain: string;
}

// Helper functions to extract subject and body from email content
const extractSubjectFromEmail = (emailContent: string | null): string => {
  if (!emailContent) return '';
  
  try {
    const parsed = JSON.parse(emailContent);
    
    // Handle N8N webhook response format
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].output) {
      return parsed[0].output['Subject Line'] || '';
    }
    
    // Handle direct object format
    if (parsed['Subject Line']) return parsed['Subject Line'];
    if (parsed.subject) return parsed.subject;
  } catch (error) {
    // Try text parsing
    const subjectMatch = emailContent.match(/(?:subject|SUBJECT|Subject Line):\s*(.+?)(?:\n|$)/i);
    return subjectMatch ? subjectMatch[1].trim() : '';
  }
  
  return '';
};

const extractBodyFromEmail = (emailContent: string | null): string => {
  if (!emailContent) return '';
  
  try {
    const parsed = JSON.parse(emailContent);
    
    // Handle N8N webhook response format
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].output) {
      return parsed[0].output['Email Body'] || '';
    }
    
    // Handle direct object format
    if (parsed['Email Body']) return parsed['Email Body'];
    if (parsed.body) return parsed.body;
  } catch (error) {
    // Try text parsing
    const bodyMatch = emailContent.match(/(?:body|BODY|Email Body):\s*([\s\S]*?)(?:\n\n|$)/i);
    return bodyMatch ? bodyMatch[1].trim() : emailContent;
  }
  
  return emailContent;
};

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadHistory[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingEmailFor, setGeneratingEmailFor] = useState<string | null>(null);
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadHistory | null>(null);
  const [showToneDialog, setShowToneDialog] = useState(false);
  const [leadForEmailGeneration, setLeadForEmailGeneration] = useState<LeadHistory | null>(null);
  const leadsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchLeadHistory();
    }
  }, [user]);

  useEffect(() => {
    // Listen for custom event when leads are generated
    const handleLeadsGenerated = () => {
      console.log('Leads generated event received, refreshing history...');
      // Add a small delay to ensure database operations complete
      setTimeout(() => {
        fetchLeadHistory();
      }, 1000);
    };
    
    window.addEventListener('leadsGenerated', handleLeadsGenerated);
    
    return () => {
      window.removeEventListener('leadsGenerated', handleLeadsGenerated);
    };
  }, []); // Remove dependency to avoid circular reference

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter]);

  const fetchLeadHistory = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => {
        if (statusFilter === 'sent') return lead.email_sent;
        if (statusFilter === 'generated') return lead.generated_email && !lead.email_sent;
        if (statusFilter === 'no-email') return !lead.generated_email;
        return true;
      });
    }

    setFilteredLeads(filtered);
  };

  const handleGenerateEmailClick = (lead: LeadHistory) => {
    setLeadForEmailGeneration(lead);
    setShowToneDialog(true);
  };

  const handleToneSelected = (tone: string) => {
    if (leadForEmailGeneration) {
      generateEmailForLead(leadForEmailGeneration, tone);
    }
    setShowToneDialog(false);
    setLeadForEmailGeneration(null);
  };

  const generateEmailForLead = async (lead: LeadHistory, tone: string = 'professional') => {
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
      
      // FIX: Store the complete response to handle N8N format properly
      const emailContent = JSON.stringify(result);

      // Update the lead in the database
      const { error: updateError } = await supabase
        .from('lead_history')
        .update({ generated_email: emailContent })
        .eq('id', lead.id)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Update local state
      setLeads(prev => prev.map(l => 
        l.id === lead.id ? { ...l, generated_email: emailContent } : l
      ));

      toast({
        title: "Email generated successfully",
        description: "Email preview opened automatically.",
      });

      // Automatically show email preview
      setTimeout(() => {
        const updatedLead = { ...lead, generated_email: emailContent };
        setSelectedLead(updatedLead);
        setShowEmailPreview(true);
      }, 1000);

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

  const sendEmailToLead = async (lead: LeadHistory) => {
    if (!lead.generated_email) {
      toast({
        title: "No email generated",
        description: "Please generate an email first",
        variant: "destructive",
      });
      return;
    }

    setSendingEmailFor(lead.id);

    try {
      // Call the N8n webhook for email sending
      const response = await fetch('https://divverse-community.app.n8n.cloud/webhook-test/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: lead.email,
          to_name: lead.name,
          subject: extractSubjectFromEmail(lead.generated_email),
          body: extractBodyFromEmail(lead.generated_email),
          user_id: user?.id,
          lead_id: lead.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Update the lead in the database
      const { error: updateError } = await supabase
        .from('lead_history')
        .update({ 
          email_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', lead.id)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Update local state
      setLeads(prev => prev.map(l => 
        l.id === lead.id ? { ...l, email_sent: true, sent_at: new Date().toISOString() } : l
      ));

      toast({
        title: "Email sent successfully",
        description: `Email sent to ${lead.name} at ${lead.email}`,
      });

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error sending email",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSendingEmailFor(null);
    }
  };

  const handlePreviewEmail = (lead: LeadHistory) => {
    setSelectedLead(lead);
    setShowEmailPreview(true);
  };

  const handleEmailUpdate = (leadId: string, emailContent: string) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, generated_email: emailContent } : l
    ));
  };

  const handleEmailSent = (leadId: string) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, email_sent: true, sent_at: new Date().toISOString() } : l
    ));
  };

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * leadsPerPage,
    currentPage * leadsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <HistoryIcon className="w-8 h-8" />
              <span>Lead History</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage your previously generated leads
            </p>
          </div>
          <Button onClick={fetchLeadHistory} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Email Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, company, or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="sent">Email Sent</SelectItem>
                    <SelectItem value="generated">Email Generated</SelectItem>
                    <SelectItem value="no-email">No Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lead History ({filteredLeads.length} total)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading history...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No leads found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-sm text-muted-foreground">{lead.location}</div>
                          </TableCell>
                          <TableCell>{lead.company}</TableCell>
                          <TableCell className="max-w-xs truncate">{lead.title}</TableCell>
                          <TableCell>
                            {lead.email_sent ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sent
                              </Badge>
                            ) : lead.generated_email ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                <Mail className="w-3 h-3 mr-1" />
                                Generated
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />
                                No Email
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(lead.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {lead.linkedin && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={lead.linkedin} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              
                              {!lead.generated_email ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleGenerateEmailClick(lead)}
                                  disabled={generatingEmailFor === lead.id}
                                >
                                  {generatingEmailFor === lead.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Mail className="w-4 h-4 mr-1" />
                                  )}
                                  Generate Email
                                </Button>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePreviewEmail(lead)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Preview
                                  </Button>
                                  
                                  {!lead.email_sent && (
                                    <Button
                                      size="sm"
                                      onClick={() => sendEmailToLead(lead)}
                                      disabled={sendingEmailFor === lead.id}
                                    >
                                      {sendingEmailFor === lead.id ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      ) : (
                                        <Mail className="w-4 h-4 mr-1" />
                                      )}
                                      Send
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * leadsPerPage + 1} to {Math.min(currentPage * leadsPerPage, filteredLeads.length)} of {filteredLeads.length} results
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tone Selection Dialog */}
        <ToneSelectionDialog
          isOpen={showToneDialog}
          onOpenChange={setShowToneDialog}
          onToneSelected={handleToneSelected}
          leadName={leadForEmailGeneration?.name || ''}
          isGenerating={generatingEmailFor === leadForEmailGeneration?.id}
        />

        {/* Email Preview Modal */}
        {selectedLead && (
          <EmailPreviewModal
            isOpen={showEmailPreview}
            onOpenChange={setShowEmailPreview}
            lead={selectedLead}
            emailContent={selectedLead.generated_email || ''}
            tone="professional"
            onEmailUpdate={handleEmailUpdate}
            onEmailSent={handleEmailSent}
          />
        )}
      </div>
    </DashboardLayout>
  );
}